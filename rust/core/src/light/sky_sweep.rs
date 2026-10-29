//! C2. The Beer–Lambert sky sweep (spec §C2.4, M6; the row march of M18): a port of
//! `src/core/light/sky-sweep.ts`, bit-identical to it (ADR 0024, G2). Read that file for the
//! model; the comments here only mark where the port has to take care to stay identical.
//!
//! Every arithmetic step runs in the TypeScript order, with `Math` as V8 computes it
//! (`crate::math`). Quantities that JavaScript keeps as doubles (floored positions, ring
//! wrapping) stay `f64` here until they are bounds-checked and used as indices.
//!
//! With the `threads` feature (native only), the K directions are swept in parallel into
//! per-direction buffers and then summed in direction order, so the bits do not change.

// The loops index several arrays at once, as the TypeScript does; keeping them alike is the point.
#![allow(clippy::needless_range_loop)]

use crate::math;

/// The `c2` params the sweep reads (`src/core/params.ts`).
#[derive(Clone, Copy, Debug)]
pub struct SkyParams {
    /// Number of sky directions (floored, at least 1).
    pub k: f64,
    pub k_ext: f64,
    pub sky_exponent: f64,
    pub sky_tilt: f64,
    pub min_elevation: f64,
    /// Open-sky light C.
    pub c: f64,
    pub rotate: bool,
    /// `c2.sweep: "columns"`, the M6 sweep; otherwise the row march (M18).
    pub columns: bool,
}

/// φ − 1, as `(Math.sqrt(5) - 1) / 2`.
fn golden() -> f64 {
    (5.0f64.sqrt() - 1.0) / 2.0
}

/// Row-march scratch, one set per sweeping thread.
#[derive(Default)]
struct Scratch {
    line_a: Vec<f64>,
    line_b: Vec<f64>,
    pad_g: Vec<f64>,
    pad_l: Vec<f64>,
    pad_i: Vec<f64>,
}

pub struct SkySweep {
    width: usize,
    height: usize,
    periodic: bool,
    p: SkyParams,
    lad: Vec<f64>,
    q: Vec<f64>,
    vx: Vec<f64>,
    vy: Vec<f64>,
    dir_x: Vec<f64>,
    dir_y: Vec<f64>,
    weight: Vec<f64>,
    depth: Vec<f64>,
    #[cfg_attr(feature = "threads", allow(dead_code))]
    scratch: Scratch,
    top: usize,
    shade: Vec<f64>,
    shade_fresh: bool,
}

impl SkySweep {
    pub fn new(width: usize, height: usize, p: SkyParams, periodic: bool) -> SkySweep {
        let n = width * height;
        let k = math::max(1.0, p.k.floor()) as usize;
        let mut s = SkySweep {
            width,
            height,
            periodic,
            p,
            lad: vec![0.0; n],
            q: vec![0.0; n],
            vx: vec![0.0; n],
            vy: vec![0.0; n],
            dir_x: vec![0.0; k],
            dir_y: vec![0.0; k],
            weight: vec![0.0; k],
            depth: vec![0.0; n],
            scratch: Scratch {
                line_a: vec![0.0; width],
                line_b: vec![0.0; width],
                ..Scratch::default()
            },
            top: 0,
            shade: Vec::new(),
            shade_fresh: false,
        };
        s.set_directions(None);
        s
    }

    pub fn width(&self) -> usize {
        self.width
    }

    pub fn height(&self) -> usize {
        self.height
    }

    pub fn lad(&self) -> &[f64] {
        &self.lad
    }

    pub fn q(&self) -> &[f64] {
        &self.q
    }

    pub fn vx(&self) -> &[f64] {
        &self.vx
    }

    pub fn vy(&self) -> &[f64] {
        &self.vy
    }

    /// The sky directions' unit vectors (x, y), this season's.
    pub fn directions(&self) -> (&[f64], &[f64]) {
        (&self.dir_x, &self.dir_y)
    }

    pub fn weights(&self) -> &[f64] {
        &self.weight
    }

    fn set_directions(&mut self, offset: Option<f64>) {
        let p = self.p;
        let kk = self.weight.len();
        let kf = kk as f64;
        let deg = std::f64::consts::PI / 180.0;
        let lo = math::min(89.0, math::max(1.0, p.min_elevation)) * deg;
        let span = std::f64::consts::PI - 2.0 * lo;
        let mut total = 0.0;
        for k in 0..kk {
            let theta = match offset {
                Some(o) => lo + (span * (k as f64 + o)) / kf,
                None if kk == 1 => std::f64::consts::PI / 2.0,
                None => lo + (span * k as f64) / (kf - 1.0),
            };
            self.dir_x[k] = math::cos(theta);
            self.dir_y[k] = math::sin(theta);
            let w = math::pow(math::sin(theta), p.sky_exponent)
                * math::max(0.0, 1.0 + p.sky_tilt * math::cos(theta));
            self.weight[k] = w;
            total += w;
        }
        for k in 0..kk {
            self.weight[k] = if total > 0.0 {
                (self.weight[k] * p.c) / total
            } else {
                0.0
            };
        }
    }

    pub fn clear(&mut self) {
        let n = self.top * self.width;
        self.lad[..n].fill(0.0);
        self.top = 0;
        self.shade_fresh = false;
    }

    /// The column of x as JavaScript computes it (a double; wrapped on a ring).
    fn column(&self, x: f64) -> f64 {
        let i = x.floor();
        if self.periodic {
            let w = self.width as f64;
            ((i % w) + w) % w
        } else {
            i
        }
    }

    /// The cell of (x, y), or None outside the grid (or for NaN, which JavaScript ignores too).
    fn cell(&self, x: f64, y: f64) -> Option<usize> {
        let i = self.column(x);
        let j = y.floor();
        let (w, h) = (self.width as f64, self.height as f64);
        if !(i >= 0.0 && i < w && j >= 0.0 && j < h) {
            return None;
        }
        Some(j as usize * self.width + i as usize)
    }

    pub fn deposit(&mut self, x: f64, y: f64, area: f64) {
        if let Some(c) = self.cell(x, y) {
            self.lad[c] += area;
            let j = c / self.width;
            if j >= self.top {
                self.top = j + 1;
            }
        }
    }

    pub fn add_wall(&mut self, x: f64, y: f64, width: f64, height: f64, shade: f64) {
        let (w, h) = (self.width as f64, self.height as f64);
        let x0 = math::max(0.0, x.floor());
        let x1 = math::min(w, (x + width).ceil());
        let y0 = math::max(0.0, y.floor());
        let y1 = math::min(h, (y + height).ceil());
        if x0 < x1 && y0 < y1 {
            let (c0, c1) = (x0 as usize, x1 as usize);
            for row in y0 as usize..y1 as usize {
                for col in c0..c1 {
                    self.lad[row * self.width + col] += shade;
                }
            }
        }
        // As in TypeScript, `top` rises even when the wall's rows are all above the grid.
        if x1 > x0 && y1 > self.top as f64 {
            self.top = y1 as usize;
        }
    }

    /// Phase 1 of §6, after all deposits: one sweep per direction, then Q and V per cell.
    pub fn compute(&mut self, season: f64) {
        if self.p.rotate {
            self.set_directions(Some((0.5 + season * golden()) % 1.0));
        }
        let w = self.width;
        let top = self.top;
        let n = top * w;
        if top < self.height {
            self.depth[n..n + w].fill(0.0);
        }
        self.q[..n].fill(0.0);
        self.vx[..n].fill(0.0);
        self.vy[..n].fill(0.0);
        let mut q_open = 0.0;
        let mut vx_open = 0.0;
        let mut vy_open = 0.0;
        #[cfg(feature = "threads")]
        let depths = self.sweep_all();
        for k in 0..self.weight.len() {
            let wk = self.weight[k];
            let dx = self.dir_x[k];
            let dy = self.dir_y[k];
            #[cfg(feature = "threads")]
            let depth = &depths[k][..n];
            #[cfg(not(feature = "threads"))]
            let depth = {
                let geo = self.geometry();
                sweep(&geo, &self.lad, &mut self.depth, &mut self.scratch, dx, dy);
                &self.depth[..n]
            };
            accumulate(
                wk,
                dx,
                dy,
                self.p.k_ext,
                depth,
                &mut self.q,
                &mut self.vx,
                &mut self.vy,
            );
            q_open += wk;
            vx_open += wk * dx;
            vy_open += wk * dy;
        }
        self.q[n..].fill(q_open);
        self.vx[n..].fill(vx_open);
        self.vy[n..].fill(vy_open);
        self.shade_fresh = false;
    }

    fn geometry(&self) -> Geometry {
        Geometry {
            width: self.width,
            height: self.height,
            top: self.top,
            periodic: self.periodic,
            columns: self.p.columns,
        }
    }

    /// Every direction's depth field, swept on all cores (each into its own buffer).
    #[cfg(feature = "threads")]
    fn sweep_all(&self) -> Vec<Vec<f64>> {
        let geo = self.geometry();
        let kk = self.weight.len();
        let rows = (geo.top + 1).min(geo.height);
        let mut depths: Vec<Vec<f64>> = (0..kk).map(|_| vec![0.0; rows * geo.width]).collect();
        let threads = std::thread::available_parallelism()
            .map_or(1, |n| n.get())
            .min(kk);
        let per = kk.div_ceil(threads.max(1));
        let (dir_x, dir_y, lad) = (&self.dir_x, &self.dir_y, &self.lad);
        std::thread::scope(|s| {
            for (t, chunk) in depths.chunks_mut(per).enumerate() {
                s.spawn(move || {
                    let mut scratch = Scratch::default();
                    for (i, depth) in chunk.iter_mut().enumerate() {
                        let k = t * per + i;
                        sweep(&geo, lad, depth, &mut scratch, dir_x[k], dir_y[k]);
                    }
                });
            }
        });
        depths
    }

    /// Light Q and the unit direction V at (x, y); outside the world Q = 0 and V points up.
    pub fn sample(&self, x: f64, y: f64, dir: f64) -> (f64, f64, f64) {
        let Some(c) = self.cell(x, y) else {
            return (0.0, 0.0, 1.0);
        };
        let len = math::hypot(self.vx[c], self.vy[c]);
        if len > 0.0 {
            (self.q[c], self.vx[c] / len, self.vy[c] / len)
        } else {
            (self.q[c], math::cos(dir), math::sin(dir))
        }
    }

    /// Shade per cell for the overlay: 1 − Q/Q_max.
    pub fn field(&mut self) -> &[f64] {
        if self.shade.len() != self.q.len() {
            self.shade = vec![0.0; self.q.len()];
        }
        if !self.shade_fresh {
            let mut full = 0.0;
            for &w in &self.weight {
                full += w;
            }
            for (s, &q) in self.shade.iter_mut().zip(&self.q) {
                *s = if full > 0.0 { 1.0 - q / full } else { 0.0 };
            }
            self.shade_fresh = true;
        }
        &self.shade
    }
}

#[derive(Clone, Copy)]
struct Geometry {
    width: usize,
    height: usize,
    top: usize,
    periodic: bool,
    columns: bool,
}

/// Adds one direction's light to Q and V (the inner loop of `compute`).
#[allow(clippy::too_many_arguments)]
#[inline]
fn accumulate(
    w: f64,
    dx: f64,
    dy: f64,
    k_ext: f64,
    depth: &[f64],
    q: &mut [f64],
    vx: &mut [f64],
    vy: &mut [f64],
) {
    let n = depth.len();
    let cells = q[..n]
        .iter_mut()
        .zip(&mut vx[..n])
        .zip(&mut vy[..n])
        .zip(depth);
    for (((q, vx), vy), &d) in cells {
        let light = if d == 0.0 {
            w
        } else {
            w * math::exp(-k_ext * d)
        };
        *q += light;
        *vx += light * dx;
        *vy += light * dy;
    }
}

/// Fills `depth` (rows 0 … top − 1; row `top` must hold zeros) for one direction.
fn sweep(geo: &Geometry, lad: &[f64], depth: &mut [f64], s: &mut Scratch, dx: f64, dy: f64) {
    if geo.columns {
        sweep_columns(geo, lad, depth, dx, dy);
    } else {
        sweep_rows(geo, lad, depth, s, dx, dy);
    }
}

/// The row march (M18): see `sweepRows` in sky-sweep.ts.
fn sweep_rows(geo: &Geometry, lad: &[f64], depth: &mut [f64], s: &mut Scratch, dx: f64, dy: f64) {
    let w = geo.width;
    let slope = dx / dy;
    let per_row = 1.0 / dy;
    let kf = slope.floor();
    let f = slope - kf;
    let mf = (0.5 + slope).floor();
    let fr = 0.5 + slope - mf;
    let vertical = slope.abs() < 1e-9;
    let k = kf as isize;
    let m = mf as isize;
    let pad = k.unsigned_abs().max(m.unsigned_abs()) + 2;
    let n = w + 2 * pad;
    if s.pad_g.len() < n {
        s.pad_g = vec![0.0; n];
        s.pad_l = vec![0.0; n];
        s.pad_i = vec![0.0; n + 1];
    }
    if s.line_a.len() < w {
        s.line_a = vec![0.0; w];
        s.line_b = vec![0.0; w];
    }
    let (g_pad, l_pad, i_pad) = (&mut s.pad_g, &mut s.pad_l, &mut s.pad_i);
    let mut up = &mut s.line_a;
    let mut next = &mut s.line_b;
    up[..w].fill(0.0);
    let (wi, padi) = (w as isize, pad as isize);
    for row in (0..geo.top).rev() {
        let base = row * w;
        depth[base..base + w].copy_from_slice(&up[..w]);
        if row == 0 {
            break;
        }
        for j in 0..n {
            let mut c = j as isize - padi;
            if geo.periodic {
                c = ((c % wi) + wi) % wi;
            }
            let inside = c >= 0 && c < wi;
            g_pad[j] = if inside { up[c as usize] } else { 0.0 };
            l_pad[j] = if inside { lad[base + c as usize] } else { 0.0 };
        }
        let mut acc = 0.0;
        for j in 0..n {
            i_pad[j] = acc;
            acc += l_pad[j];
        }
        i_pad[n] = acc;
        for col in 0..w {
            let j = col + pad;
            let jk = (j as isize + k) as usize;
            let g = g_pad[jk] * (1.0 - f) + g_pad[jk + 1] * f;
            let mean = if vertical {
                l_pad[j]
            } else {
                let jm = (j as isize + m) as usize;
                let from = i_pad[j] + 0.5 * l_pad[j];
                let to = i_pad[jm] + fr * l_pad[jm];
                (to - from) / slope
            };
            next[col] = g + mean * per_row;
        }
        std::mem::swap(&mut up, &mut next);
    }
}

/// The M6 sweep (`c2.sweep: "columns"`): see `sweepColumns` in sky-sweep.ts.
fn sweep_columns(geo: &Geometry, lad: &[f64], depth: &mut [f64], dx: f64, dy: f64) {
    let (w, h, top, periodic) = (geo.width, geo.height, geo.top, geo.periodic);
    let (wf, wi) = (w as f64, w as isize);
    if dx.abs() <= dy {
        let step = 1.0 / dy;
        let shift = dx / dy;
        for row in (0..top).rev() {
            let base = row * w;
            if row == h - 1 {
                depth[base..base + w].fill(0.0);
                continue;
            }
            let above = base + w;
            for col in 0..w {
                let u = col as f64 + shift;
                let c0 = u.floor();
                let f = u - c0;
                let mut i0 = c0 as isize;
                let mut i1 = i0 + 1;
                if periodic {
                    if i0 < 0 {
                        i0 += wi;
                    } else if i0 >= wi {
                        i0 -= wi;
                    }
                    if i1 >= wi {
                        i1 -= wi;
                    } else if i1 < 0 {
                        i1 += wi;
                    }
                }
                let e = |i: isize| {
                    if i >= 0 && i < wi {
                        let i = above + i as usize;
                        depth[i] + lad[i] * step
                    } else {
                        0.0
                    }
                };
                let (e0, e1) = (e(i0), e(i1));
                depth[base + col] = e0 * (1.0 - f) + e1 * f;
            }
        }
    } else {
        let step = 1.0 / dx.abs();
        let rise = dy / dx.abs();
        let toward: isize = if dx > 0.0 { 1 } else { -1 };
        let hf = h as f64;
        let laps = if periodic {
            ((3.0 * hf) / rise / wf).ceil() as usize + 1
        } else {
            1
        };
        if periodic {
            depth[..top * w].fill(0.0);
        }
        let mut changed = false;
        for n in 0..laps * w {
            let col = if toward > 0 { w - 1 - (n % w) } else { n % w };
            let mut up = col as isize + toward;
            if periodic {
                if up < 0 {
                    up += wi;
                } else if up >= wi {
                    up -= wi;
                }
            }
            if up < 0 || up >= wi {
                for row in 0..top {
                    depth[row * w + col] = 0.0;
                }
            } else {
                let up = up as usize;
                for row in 0..top {
                    let v = row as f64 + rise;
                    let r0f = v.floor();
                    let f = v - r0f;
                    let r0 = r0f as usize;
                    let i0 = r0 * w + up;
                    let e0 = if r0 < h {
                        depth[i0] + lad[i0] * step
                    } else {
                        0.0
                    };
                    let e1 = if r0 + 1 < h {
                        depth[i0 + w] + lad[i0 + w] * step
                    } else {
                        0.0
                    };
                    let d = e0 * (1.0 - f) + e1 * f;
                    let i = row * w + col;
                    if d != depth[i] {
                        depth[i] = d;
                        changed = true;
                    }
                }
            }
            if n % w == w - 1 {
                if !changed {
                    break;
                }
                changed = false;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn params() -> SkyParams {
        SkyParams {
            k: 7.0,
            k_ext: 0.5,
            sky_exponent: 1.0,
            sky_tilt: 0.0,
            min_elevation: 10.0,
            c: 1.0,
            rotate: true,
            columns: false,
        }
    }

    #[test]
    fn open_sky_everywhere_without_foliage() {
        let mut s = SkySweep::new(20, 10, params(), false);
        s.compute(0.0);
        let total: f64 = s.weights().iter().sum();
        assert!(s.q().iter().all(|&q| q == total));
    }

    #[test]
    fn foliage_shades_the_cells_below_it() {
        for columns in [false, true] {
            for periodic in [false, true] {
                let mut s = SkySweep::new(
                    40,
                    20,
                    SkyParams {
                        columns,
                        ..params()
                    },
                    periodic,
                );
                for _ in 0..8 {
                    s.deposit(20.5, 10.5, 1.0);
                }
                s.compute(3.0);
                let (above, _, _) = s.sample(20.5, 15.5, 0.0);
                let (below, _, _) = s.sample(20.5, 3.5, 0.0);
                assert!(below < above, "columns {columns} periodic {periodic}");
            }
        }
    }

    #[test]
    fn outside_the_world_there_is_no_light() {
        let s = SkySweep::new(10, 10, params(), false);
        assert_eq!(s.sample(-0.5, 5.0, 0.0), (0.0, 0.0, 1.0));
        assert_eq!(s.sample(5.0, 10.0, 0.0), (0.0, 0.0, 1.0));
        assert_eq!(s.sample(f64::NAN, 5.0, 0.0), (0.0, 0.0, 1.0));
    }

    #[test]
    fn clear_empties_the_field() {
        let mut s = SkySweep::new(10, 10, params(), true);
        s.deposit(12.5, 4.5, 2.0); // wraps to column 2
        assert_eq!(s.lad()[4 * 10 + 2], 2.0);
        s.clear();
        assert!(s.lad().iter().all(|&l| l == 0.0));
    }

    // The TypeScript sweep's tests (src/core/light/sky-sweep.test.ts until I1), on the default c2.

    const UP: f64 = std::f64::consts::FRAC_PI_2;

    fn base() -> SkyParams {
        SkyParams {
            k: 7.0,
            k_ext: 0.5,
            sky_exponent: 1.0,
            sky_tilt: 0.0,
            min_elevation: 15.0,
            c: 1.0,
            rotate: false,
            columns: false,
        }
    }

    fn sky(w: usize, h: usize, p: SkyParams) -> SkySweep {
        SkySweep::new(w, h, p, false)
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    #[test]
    fn full_light_and_an_upward_v_under_an_empty_symmetric_sky() {
        let mut g = sky(12, 10, base());
        g.clear();
        g.compute(0.0);
        for (x, y) in [(0.5, 0.5), (6.5, 4.5), (11.5, 9.5)] {
            let (q, vx, vy) = g.sample(x, y, UP);
            assert!(close(q, 1.0) && close(vx, 0.0) && close(vy, 1.0));
        }
    }

    #[test]
    fn attenuates_exactly_by_beer_lambert_along_a_vertical_ray() {
        let mut g = sky(11, 10, SkyParams { k: 1.0, ..base() }); // zenith only
        g.deposit(5.5, 8.5, 1.0);
        g.deposit(5.5, 8.5, 1.0);
        g.deposit(5.5, 7.5, 1.0);
        g.compute(0.0);
        assert!(close(g.sample(5.5, 6.5, UP).0, (-0.5f64 * 3.0).exp()));
        assert!(close(g.sample(4.5, 6.5, UP).0, 1.0)); // the next column is unshaded
    }

    #[test]
    fn a_cells_own_foliage_does_not_shade_its_buds() {
        let mut g = sky(11, 10, SkyParams { k: 1.0, ..base() });
        for _ in 0..4 {
            g.deposit(5.5, 5.5, 1.0);
        }
        g.compute(0.0);
        assert!(close(g.sample(5.5, 5.5, UP).0, 1.0));
        assert!(close(g.sample(5.5, 4.5, UP).0, (-0.5f64 * 4.0).exp()));
    }

    #[test]
    fn attenuates_shallow_rays_exactly_through_a_full_height_column() {
        let p = SkyParams {
            k: 2.0,
            min_elevation: 20.0,
            ..base()
        };
        let mut g = sky(20, 12, p); // two shallow rays, 20° and 160°
        for row in 0..12 {
            for _ in 0..3 {
                g.deposit(12.5, row as f64 + 0.5, 1.0);
            }
        }
        g.compute(0.0);
        let (q, vx, _) = g.sample(11.5, 5.5, UP); // just left of the column
        let step = 1.0 / (20.0f64 * (std::f64::consts::PI / 180.0)).cos();
        assert!(close(q, 0.5 * (-0.5 * 3.0 * step).exp() + 0.5));
        assert!(vx < 0.0); // brighter sky to the left
    }

    #[test]
    fn v_turns_away_from_foliage_to_one_side() {
        let mut g = sky(30, 20, base());
        for row in 4..20 {
            for col in 4..12 {
                g.deposit(col as f64 + 0.5, row as f64 + 0.5, 1.0);
            }
        }
        g.compute(0.0);
        let (q, vx, _) = g.sample(14.5, 3.5, UP); // right of and below a dense block
        assert!(q < 1.0 && vx > 0.1);
    }

    #[test]
    fn sky_light_comes_in_through_the_sides_but_nothing_grows_outside() {
        let mut g = sky(20, 20, base());
        for row in 0..20 {
            for col in 2..20 {
                g.deposit(col as f64 + 0.5, row as f64 + 0.5, 1.0);
            }
        }
        g.compute(0.0);
        let (q, vx, _) = g.sample(0.5, 2.5, UP);
        assert!(q > 0.1 && vx < 0.0); // light from beyond the left side
        assert_eq!(g.sample(-0.5, 2.5, UP).0, 0.0);
        assert_eq!(g.sample(5.0, 20.5, UP).0, 0.0);
    }

    #[test]
    fn a_tilted_sky_brightens_its_side() {
        let mut g = sky(
            12,
            10,
            SkyParams {
                sky_tilt: 0.6,
                ..base()
            },
        );
        g.compute(0.0);
        let (q, vx, _) = g.sample(6.5, 4.5, UP);
        assert!(close(q, 1.0)); // weights still sum to C
        assert!(vx > 0.1);
    }

    #[test]
    fn rotation_moves_the_directions_each_season_keeping_the_sum_of_weights() {
        let mut g = sky(
            12,
            10,
            SkyParams {
                rotate: true,
                ..base()
            },
        );
        let lo = 15.0 * std::f64::consts::PI / 180.0;
        let mut angles: Vec<Vec<f64>> = Vec::new();
        for season in [0.0, 1.0, 2.0, 7.0] {
            g.clear();
            g.compute(season);
            assert!(close(g.sample(6.5, 4.5, UP).0, 1.0));
            let (dx, dy) = g.directions();
            let theta: Vec<f64> = dx.iter().zip(dy).map(|(x, y)| y.atan2(*x)).collect();
            for &t in &theta {
                assert!(t >= lo - 1e-12 && t <= std::f64::consts::PI - lo + 1e-12);
            }
            angles.push(theta);
        }
        assert_ne!(angles[1], angles[0]);
        assert_ne!(angles[3], angles[2]);
        // Without rotate the M6 grid stays put whatever the season.
        let mut fixed = sky(12, 10, base());
        fixed.compute(0.0);
        let before = fixed.directions().0.to_vec();
        fixed.compute(5.0);
        assert_eq!(fixed.directions().0, &before[..]);
    }

    #[test]
    fn a_ring_is_translation_invariant_across_the_seam() {
        let (w, h) = (30, 40);
        let mut a = SkySweep::new(w, h, base(), true);
        let mut b = SkySweep::new(w, h, base(), true);
        let shift = 27; // pushes part of the blob across the right edge
        for (x, y) in [(3, 20), (4, 20), (4, 21), (5, 25)] {
            a.deposit(x as f64 + 0.5, y as f64 + 0.5, 2.0);
            b.deposit((x + shift) as f64 + 0.5, y as f64 + 0.5, 2.0);
        }
        a.compute(0.0);
        b.compute(0.0);
        for col in 0..w {
            for row in [0, 10, 19, 30] {
                let q = a.q()[row * w + col];
                assert!((b.q()[row * w + (col + shift) % w] - q).abs() < 1e-9);
            }
        }
    }

    #[test]
    fn no_side_light_under_a_full_width_layer_on_a_ring() {
        let (w, h) = (20, 60);
        let mut g = SkySweep::new(w, h, base(), true);
        let mut open = sky(w, h, base());
        for f in [&mut g, &mut open] {
            for col in 0..w {
                f.deposit(col as f64 + 0.5, 30.5, 1.0);
            }
            f.compute(0.0);
        }
        let q0 = g.q()[5 * w];
        for col in 0..w {
            assert!((g.q()[5 * w + col] - q0).abs() < 1e-9);
        }
        assert!(q0 < 0.75); // the layer shades every ray
        // With open sides, low rays from beyond the edge reach the floor at the edge columns.
        assert!(open.q()[5 * w] > q0 + 0.05);
    }

    #[test]
    fn a_taller_season_is_forgotten() {
        for periodic in [false, true] {
            let mut reused = SkySweep::new(24, 40, base(), periodic);
            let mut fresh = SkySweep::new(24, 40, base(), periodic);
            for row in 10..36 {
                reused.deposit(12.5, row as f64 + 0.5, 2.0);
            }
            reused.compute(0.0);
            reused.clear();
            for f in [&mut reused, &mut fresh] {
                for col in 8..16 {
                    f.deposit(col as f64 + 0.5, 6.5, 2.0);
                }
                f.compute(1.0);
            }
            assert_eq!(reused.q(), fresh.q());
            assert_eq!(reused.vx(), fresh.vx());
            assert_eq!(reused.field().to_vec(), fresh.field().to_vec());
        }
    }

    #[test]
    fn samples_and_deposits_wrap_beyond_the_sides_of_a_ring() {
        let mut g = SkySweep::new(10, 10, base(), true);
        g.deposit(12.5, 5.5, 3.0); // lands in column 2
        g.compute(0.0);
        assert_eq!(g.lad()[5 * 10 + 2], 3.0);
        let (q, _, _) = g.sample(-7.5, 2.5, UP); // column 2
        assert!(close(q, g.q()[2 * 10 + 2]) && q > 0.0);
    }

    /// A patchy canopy: clumps of foliage of varied density, the same in every run.
    fn canopy(s: &mut SkySweep) {
        let mut h: u64 = 7;
        for y in 10..26 {
            for x in 4..s.width() - 4 {
                h = (h * 1103515245 + 12345) % 2147483648;
                if h % 5 < 2 {
                    s.deposit(x as f64 + 0.5, y as f64 + 0.5, 0.5 + (h % 7) as f64 / 4.0);
                }
            }
        }
    }

    /// The exact optical depth from a cell's top edge to the sky, in fine steps along each ray.
    fn exact_q(s: &SkySweep, col: usize, row: usize) -> f64 {
        let (dx, dy) = s.directions();
        let (w, h) = (s.width() as f64, s.height() as f64);
        let mut q = 0.0;
        for k in 0..s.weights().len() {
            let mut t = 0.0;
            let step = 0.01;
            let (mut x, mut y) = (col as f64 + 0.5, row as f64 + 1.0 + 1e-9);
            while y < h && x >= 0.0 && x < w {
                t += s.lad()[y.floor() as usize * s.width() + x.floor() as usize] * step;
                x += dx[k] * step;
                y += dy[k] * step;
            }
            q += s.weights()[k] * (-0.5 * t).exp();
        }
        q
    }

    #[test]
    fn the_row_march_is_closer_to_an_exact_trace_than_the_column_sweep() {
        let error = |columns: bool| {
            let mut s = sky(48, 32, SkyParams { columns, ..base() });
            canopy(&mut s);
            s.compute(0.0);
            let mut sum = 0.0;
            for row in (0..26).step_by(3) {
                for col in (0..s.width()).step_by(3) {
                    sum += (s.q()[row * s.width() + col] - exact_q(&s, col, row)).abs();
                }
            }
            sum
        };
        // Measured: about two thirds of the column sweep's error.
        assert!(error(false) < 0.85 * error(true));
    }

    #[test]
    fn mirrored_foliage_gives_the_mirrored_field() {
        let mut s = sky(40, 30, base());
        for y in 8..18 {
            for x in 14..26 {
                s.deposit(x as f64 + 0.5, y as f64 + 0.5, 1.0);
            }
        }
        s.compute(0.0);
        for y in 0..30 {
            for x in 0..40 {
                let (a, b) = (y * 40 + x, y * 40 + 39 - x);
                assert!((s.q()[a] - s.q()[b]).abs() < 1e-12);
                assert!((s.vx()[a] + s.vx()[b]).abs() < 1e-12);
            }
        }
    }

    #[test]
    fn a_ring_is_swept_in_one_pass_however_far_shallow_rays_run() {
        let p = SkyParams {
            min_elevation: 10.0,
            ..base()
        };
        let mut s = SkySweep::new(6, 40, p, true);
        for x in 0..6 {
            s.deposit(x as f64 + 0.5, 20.5, 1.0);
        }
        s.compute(0.0);
        for x in 1..6 {
            assert!((s.q()[5 * 6 + x] - s.q()[5 * 6]).abs() < 1e-12);
        }
        assert!(s.q()[5 * 6] < 1.0);
    }
}
