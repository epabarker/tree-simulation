//! C2 in 3D (ADR 0024, G3): the Beer–Lambert sky sweep over a slab W × H × D, the row march of
//! the 2D sweep (M18) with the segment's mean taken over a box. Float32, the production build's
//! light; it is not held to the TypeScript core (it gets its own goldens at I1 stage 2).
//!
//! **Sky.** K directions over the hemisphere above `min_elevation`: sin(elevation) in K equal
//! bands, azimuth stepped by the golden angle (a spherical Fibonacci set), weights ∝
//! sin(elevation)^p normalised to Σw = C. With `rotate`, each season moves every direction
//! within its band (f = frac(½ + s·φ⁻¹), as the 2D sweep's c2.rotate) and turns every azimuth by
//! frac(s·(√2 − 1)) of a circle, so the streaks a small K leaves fall elsewhere each season.
//!
//! **The march.** Rows are swept from the highest leafy row down. Going down one row, a ray that
//! reaches (x, z) entered the row's top at (x + s_x, z + s_z), s = d_xz/d_y, and crossed the row's
//! foliage between: G_y(x, z) = G_{y+1}(x + s_x, z + s_z) + (mean ℓ over the box) / d_y. The mean
//! comes from separable prefix sums of the row (along x, then z); G_{y+1} is read bilinearly.
//! A cell's light is that entering its top: Q = Σ w_k e^(−k_ext G_k), V = normalise(Σ w_k e^(…) d_k).
//!
//! **The world's edges** (ADR 0024): periodic in x (the ring) or open; **open in z.** Beyond each
//! z face the sky is seen through a transmission τ (front = z < 0, the viewer's side; back = z ≥ D):
//! a ray entering through a face below the stand's top carries depth −ln τ / k_ext, as if a wood as
//! tall as the stand stood there (τ = 1 open, 0 dark). Buds outside the slab get Q = 0.
//!
//! **One formula for scalar and SIMD.** The exp is a polynomial (Taylor to r⁶ after 2ⁿ range
//! reduction, relative error ≈ 1.2·10⁻⁷), and every step is written in the order the WASM SIMD
//! path computes it, so the scalar and SIMD paths give the same bits.
//!
//! Params: K, k_ext, the sky exponent p, minimum elevation, C, rotation, τ front and back.

// The loops index several arrays at once, as the 2D sweep's do.
#![allow(clippy::needless_range_loop, clippy::too_many_arguments)]

use crate::math;

/// φ − 1 and √2 − 1: the per-season steps of the bands and the azimuth.
const GOLDEN: f64 = 0.618_033_988_749_894_9;
const SILVER: f64 = 0.414_213_562_373_095_1;

#[derive(Clone, Copy, Debug)]
pub struct SlabParams {
    pub k: usize,
    pub k_ext: f64,
    pub sky_exponent: f64,
    pub min_elevation: f64,
    pub c: f64,
    pub rotate: bool,
    /// Transmission of the sky beyond the front (z < 0) and back (z ≥ D) faces.
    pub face_tau: [f64; 2],
    pub periodic_x: bool,
}

/// Unit vectors toward the sky and their weights.
#[derive(Clone, Debug, Default)]
pub struct Directions {
    pub x: Vec<f64>,
    pub y: Vec<f64>,
    pub z: Vec<f64>,
    pub w: Vec<f64>,
}

/// The sky for one season: band offset f in [0, 1), azimuth turn a in [0, 1).
pub fn sky(k: usize, min_elevation: f64, sky_exponent: f64, c: f64, f: f64, a: f64) -> Directions {
    let deg = std::f64::consts::PI / 180.0;
    let lo = math::sin(min_elevation.clamp(1.0, 89.0) * deg);
    let mut d = Directions {
        x: vec![0.0; k],
        y: vec![0.0; k],
        z: vec![0.0; k],
        w: vec![0.0; k],
    };
    let mut total = 0.0;
    for i in 0..k {
        let sin_e = if k == 1 {
            1.0
        } else {
            lo + ((1.0 - lo) * (i as f64 + f)) / k as f64
        };
        let cos_e = (1.0 - sin_e * sin_e).sqrt();
        let az = 2.0 * std::f64::consts::PI * ((i as f64 * GOLDEN + a) % 1.0);
        d.x[i] = cos_e * math::cos(az);
        d.y[i] = sin_e;
        d.z[i] = cos_e * math::sin(az);
        d.w[i] = math::pow(sin_e, sky_exponent);
        total += d.w[i];
    }
    for w in d.w.iter_mut() {
        *w = if total > 0.0 { *w * c / total } else { 0.0 };
    }
    d
}

/// The season's band offset and azimuth turn (the static sky when rotation is off).
pub fn sky_offsets(rotate: bool, season: f64) -> (f64, f64) {
    if rotate {
        ((0.5 + season * GOLDEN) % 1.0, (season * SILVER) % 1.0)
    } else {
        (0.5, 0.0)
    }
}

/// ln 2 split (Cody–Waite): the high part has 9 trailing zero bits, so n·LN2_HI is exact for
/// every |n| the clamp allows.
const LN2_HI: f32 = 0.693_145_75;
const LN2_LO: f32 = 1.428_606_8e-6;

/// e^x for x ≤ 0 in Float32: 2ⁿ·e^r, |r| ≤ ln2/2, Taylor to r⁶; relative error under 3·10⁻⁷ on
/// [−80, 0] (G3 note). Written step for step as the SIMD `vexp`, so the two give the same bits.
#[inline(always)]
pub fn fexp(x: f32) -> f32 {
    let x = if x < -80.0 { -80.0 } else { x };
    let n = (x * std::f32::consts::LOG2_E + 0.5).floor();
    let r = (x - n * LN2_HI) - n * LN2_LO;
    let mut p = 1.0f32 / 720.0;
    for c in [1.0 / 120.0, 1.0 / 24.0, 1.0 / 6.0, 0.5, 1.0, 1.0] {
        p = p * r + c;
    }
    p * f32::from_bits(((n as i32 + 127) as u32) << 23)
}

/// Row-march scratch: G on two planes per direction, one row of ℓ padded, its prefix sums.
#[derive(Default)]
struct Scratch {
    up: Vec<f32>,
    next: Vec<f32>,
    g: Vec<f32>,
    l: Vec<f32>,
    i: Vec<f32>,
    r: Vec<f32>,
    s: Vec<f32>,
}

pub struct SlabSweep {
    w: usize,
    h: usize,
    d: usize,
    p: SlabParams,
    /// Leaf area per cell, rows of W × D (index (y·D + z)·W + x).
    lad: Vec<f32>,
    q: Vec<f32>,
    vx: Vec<f32>,
    vy: Vec<f32>,
    vz: Vec<f32>,
    dirs: Directions,
    /// Directions fixed by the caller (tests), never rotated.
    fixed: bool,
    face_g: [f32; 2],
    pad: usize,
    top: usize,
    scratch: Scratch,
    /// March with WASM SIMD where it is built in (the same bits either way).
    pub simd: bool,
    /// Integrate each row's segment exactly (a DDA over the cells it crosses) instead of taking
    /// the mean over its box: G3's fallback, scalar only.
    pub exact_segments: bool,
    /// Shift G by whole cells each row (Bresenham: the cumulative shift is round(y·s)) instead of
    /// reading it bilinearly (the default, G3). Bilinear reads blend four depths every row, which
    /// blurs shadows into gaps and, e^(−kT) being convex, darkens the field: at τ = 1 on a mature
    /// stand mean |ΔQ|/C was 0.095 bilinear against 0.053 shifted (G3 note).
    pub integer_shifts: bool,
}

impl SlabSweep {
    pub fn new(w: usize, h: usize, d: usize, p: SlabParams) -> SlabSweep {
        let (f, a) = sky_offsets(false, 0.0);
        let dirs = sky(p.k, p.min_elevation, p.sky_exponent, p.c, f, a);
        let mut s = SlabSweep::with_directions(w, h, d, p, dirs);
        s.fixed = false;
        s
    }

    /// A slab with the caller's directions (unit vectors toward the sky, d_y > 0) and weights.
    pub fn with_directions(w: usize, h: usize, d: usize, p: SlabParams, dirs: Directions) -> Self {
        let n = w * h * d;
        let g = |t: f64| -> f32 {
            if t >= 1.0 {
                0.0
            } else if t <= 0.0 {
                (50.0 / p.k_ext) as f32
            } else {
                (-math::ln(t) / p.k_ext) as f32
            }
        };
        // The steepest a ray can lean: at the lowest band's elevation, rotated or not.
        let lo = (p.min_elevation.clamp(1.0, 89.0) * std::f64::consts::PI / 180.0).sin();
        let mut slope = ((1.0 - lo * lo).sqrt() / lo).ceil() as usize;
        for k in 0..dirs.w.len() {
            let s = (dirs.x[k].abs().max(dirs.z[k].abs()) / dirs.y[k]).ceil() as usize;
            slope = slope.max(s);
        }
        SlabSweep {
            w,
            h,
            d,
            p,
            lad: vec![0.0; n],
            q: vec![0.0; n],
            vx: vec![0.0; n],
            vy: vec![0.0; n],
            vz: vec![0.0; n],
            dirs,
            fixed: true,
            face_g: [g(p.face_tau[0]), g(p.face_tau[1])],
            pad: slope + 3,
            top: 0,
            scratch: Scratch::default(),
            simd: true,
            exact_segments: false,
            integer_shifts: true,
        }
    }

    pub fn dims(&self) -> (usize, usize, usize) {
        (self.w, self.h, self.d)
    }

    pub fn directions(&self) -> &Directions {
        &self.dirs
    }

    pub fn lad(&self) -> &[f32] {
        &self.lad
    }

    pub fn q(&self) -> &[f32] {
        &self.q
    }

    pub fn v(&self) -> (&[f32], &[f32], &[f32]) {
        (&self.vx, &self.vy, &self.vz)
    }

    pub fn top(&self) -> usize {
        self.top
    }

    pub fn clear(&mut self) {
        let n = self.top * self.w * self.d;
        self.lad[..n].fill(0.0);
        self.top = 0;
    }

    /// The leaf-area field, to fill directly (then `refresh_top`).
    pub fn lad_mut(&mut self) -> &mut [f32] {
        &mut self.lad
    }

    /// Sets `top` to one above the highest row holding leaf area.
    pub fn refresh_top(&mut self) {
        let plane = self.w * self.d;
        self.top = (0..self.h)
            .rev()
            .find(|&r| {
                self.lad[r * plane..(r + 1) * plane]
                    .iter()
                    .any(|&v| v != 0.0)
            })
            .map_or(0, |r| r + 1);
    }

    /// FNV-1a over the bits of Q and V: the same on native, scalar WASM and SIMD WASM.
    pub fn fingerprint(&self) -> u32 {
        let mut h: u32 = 0x811c9dc5;
        for f in [&self.q, &self.vx, &self.vy, &self.vz] {
            for v in f.iter() {
                for b in v.to_bits().to_le_bytes() {
                    h = (h ^ b as u32).wrapping_mul(0x01000193);
                }
            }
        }
        h
    }

    /// The cell of (x, y, z), x wrapped on a ring; None outside the slab.
    pub fn cell(&self, x: f64, y: f64, z: f64) -> Option<usize> {
        let (w, h, d) = (self.w as f64, self.h as f64, self.d as f64);
        let mut i = x.floor();
        if self.p.periodic_x {
            i = ((i % w) + w) % w;
        }
        let (j, l) = (y.floor(), z.floor());
        if !(i >= 0.0 && i < w && j >= 0.0 && j < h && l >= 0.0 && l < d) {
            return None;
        }
        Some((j as usize * self.d + l as usize) * self.w + i as usize)
    }

    pub fn deposit(&mut self, x: f64, y: f64, z: f64, area: f32) {
        if let Some(c) = self.cell(x, y, z) {
            self.lad[c] += area;
            let row = c / (self.w * self.d);
            if row >= self.top {
                self.top = row + 1;
            }
        }
    }

    /// The season's directions (with rotation), then the whole field.
    pub fn compute(&mut self, season: f64) {
        self.compute_part(season, 0, 1);
    }

    /// One lane's share: directions k ≡ lane (mod lanes), into this sweep's own fields, which then
    /// hold that lane's partial light (open sky above the foliage included). Summing every lane's
    /// fields gives the whole field.
    pub fn compute_part(&mut self, season: f64, lane: usize, lanes: usize) {
        if !self.fixed {
            let (f, a) = sky_offsets(self.p.rotate, season);
            let p = self.p;
            self.dirs = sky(p.k, p.min_elevation, p.sky_exponent, p.c, f, a);
        }
        let ks: Vec<usize> = (0..self.dirs.w.len())
            .filter(|k| k % lanes == lane)
            .collect();
        self.march(&ks);
        let n = self.top * self.w * self.d;
        let (mut q, mut x, mut y, mut z) = (0.0f64, 0.0, 0.0, 0.0);
        for &k in &ks {
            let wk = self.dirs.w[k];
            q += wk;
            x += wk * self.dirs.x[k];
            y += wk * self.dirs.y[k];
            z += wk * self.dirs.z[k];
        }
        self.q[n..].fill(q as f32);
        self.vx[n..].fill(x as f32);
        self.vy[n..].fill(y as f32);
        self.vz[n..].fill(z as f32);
    }

    /// Q and the unit direction V at (x, y, z); outside the slab Q = 0 and V points up.
    pub fn sample(&self, x: f64, y: f64, z: f64) -> [f32; 4] {
        let Some(c) = self.cell(x, y, z) else {
            return [0.0, 0.0, 1.0, 0.0];
        };
        let (vx, vy, vz) = (self.vx[c], self.vy[c], self.vz[c]);
        let len = (vx * vx + vy * vy + vz * vz).sqrt();
        if len > 0.0 {
            [self.q[c], vx / len, vy / len, vz / len]
        } else {
            [self.q[c], 0.0, 1.0, 0.0]
        }
    }

    fn march(&mut self, ks: &[usize]) {
        let (w, d, top, pad) = (self.w, self.d, self.top, self.pad);
        let plane = w * d;
        let n = top * plane;
        let (nx, nz) = (w + 2 * pad, d + 2 * pad);
        let kk = ks.len();
        let sc = &mut self.scratch;
        if sc.up.len() < kk * plane {
            sc.up = vec![0.0; kk * plane];
            sc.next = vec![0.0; kk * plane];
        }
        if sc.g.len() < nx * nz {
            sc.g = vec![0.0; nx * nz];
            sc.l = vec![0.0; nx * nz];
            sc.i = vec![0.0; (nx + 1) * nz];
            sc.r = vec![0.0; w * nz];
            sc.s = vec![0.0; w * (nz + 1)];
        }
        self.q[..n].fill(0.0);
        self.vx[..n].fill(0.0);
        self.vy[..n].fill(0.0);
        self.vz[..n].fill(0.0);
        if top == 0 {
            return;
        }
        let Scratch {
            up,
            next,
            g,
            l,
            i,
            r,
            s,
        } = sc;
        let (mut up, mut next) = (up, next);
        up[..kk * plane].fill(0.0);
        let kext = self.p.k_ext as f32;
        let simd = self.simd && kernels::HAS_SIMD;
        for row in (0..top).rev() {
            let base = row * plane;
            // This row's light from every direction: its entry depth is G on the line above.
            for (j, &k) in ks.iter().enumerate() {
                let dir = [
                    self.dirs.w[k] as f32,
                    self.dirs.x[k] as f32,
                    self.dirs.y[k] as f32,
                    self.dirs.z[k] as f32,
                ];
                let u = &up[j * plane..(j + 1) * plane];
                let out = (
                    &mut self.q[base..base + plane],
                    &mut self.vx[base..base + plane],
                    &mut self.vy[base..base + plane],
                    &mut self.vz[base..base + plane],
                );
                if simd {
                    kernels::light_simd(u, dir, kext, out);
                } else {
                    kernels::light(u, dir, kext, out);
                }
            }
            if row == 0 {
                break;
            }
            // ℓ of this row, padded (zero beyond the z faces; wrapped or zero in x), and its
            // prefix sums along x: shared by every direction.
            for zi in 0..nz {
                let z = zi as isize - pad as isize;
                let d0 = zi * nx;
                if z < 0 || z >= d as isize {
                    l[d0..d0 + nx].fill(0.0);
                } else {
                    pad_line(
                        &self.lad,
                        base + z as usize * w,
                        w,
                        l,
                        d0,
                        pad,
                        self.p.periodic_x,
                    );
                }
                let i0 = zi * (nx + 1);
                let mut acc = 0.0f32;
                for j in 0..nx {
                    i[i0 + j] = acc;
                    acc += l[d0 + j];
                }
                i[i0 + nx] = acc;
            }
            for (j, &k) in ks.iter().enumerate() {
                let (dx, dy, dz) = (self.dirs.x[k], self.dirs.y[k], self.dirs.z[k]);
                let geo = if self.integer_shifts {
                    // From the line above this row (row + 1) down to this row's: whole cells.
                    let shift =
                        |s: f64| ((row as f64 + 1.0) * s).round() - (row as f64 * s).round();
                    Step::shifted(shift(dx / dy), shift(dz / dy), dy)
                } else {
                    Step::new(dx, dy, dz)
                };
                let u0 = j * plane;
                // G on the line above, padded: beyond a z face, the face's depth.
                for zi in 0..nz {
                    let z = zi as isize - pad as isize;
                    let d0 = zi * nx;
                    if z < 0 {
                        g[d0..d0 + nx].fill(self.face_g[0]);
                    } else if z >= d as isize {
                        g[d0..d0 + nx].fill(self.face_g[1]);
                    } else {
                        pad_line(up, u0 + z as usize * w, w, g, d0, pad, self.p.periodic_x);
                    }
                }
                let args = (w, d, pad, nx, nz);
                if self.exact_segments {
                    kernels::row_dda(&geo, args, g, l, &mut next[u0..u0 + plane]);
                } else if simd {
                    kernels::row_simd(&geo, args, g, l, i, r, s, &mut next[u0..u0 + plane]);
                } else {
                    kernels::row(&geo, args, g, l, i, r, s, &mut next[u0..u0 + plane]);
                }
            }
            std::mem::swap(&mut up, &mut next);
        }
    }

    /// The exact light entering the top of cell (col, row, zc), for G3: each of the K rays traced
    /// in steps of `h` from the top edge at the cell's centre, summing ℓ·h until it leaves the
    /// foliage (the stand's top) or crosses a z face, where the face's depth is added.
    pub fn exact_q(&self, col: usize, row: usize, zc: usize, h: f64) -> f64 {
        let (w, d, top) = (self.w as f64, self.d as f64, self.top as f64);
        let kext = self.p.k_ext;
        let mut q = 0.0;
        for k in 0..self.dirs.w.len() {
            let (dx, dy, dz) = (self.dirs.x[k], self.dirs.y[k], self.dirs.z[k]);
            let (mut x, mut y, mut z) =
                (col as f64 + 0.5, row as f64 + 1.0 + 1e-9, zc as f64 + 0.5);
            let mut t = 0.0f64;
            while y < top {
                if z < 0.0 {
                    t += self.face_g[0] as f64;
                    break;
                }
                if z >= d {
                    t += self.face_g[1] as f64;
                    break;
                }
                let mut xi = x.floor();
                if self.p.periodic_x {
                    xi = ((xi % w) + w) % w;
                } else if xi < 0.0 || xi >= w {
                    break;
                }
                let c = (y.floor() as usize * self.d + z.floor() as usize) * self.w + xi as usize;
                t += self.lad[c] as f64 * h;
                x += dx * h;
                y += dy * h;
                z += dz * h;
            }
            q += self.dirs.w[k] * math::exp(-kext * t);
        }
        q
    }
}

/// Copies one W-long line into a padded line, wrapping or zero-filling the x pads.
fn pad_line(src: &[f32], s0: usize, w: usize, dst: &mut [f32], d0: usize, pad: usize, ring: bool) {
    dst[d0 + pad..d0 + pad + w].copy_from_slice(&src[s0..s0 + w]);
    for j in 0..pad {
        if ring {
            let cl = (j as isize - pad as isize).rem_euclid(w as isize) as usize;
            dst[d0 + j] = src[s0 + cl];
            dst[d0 + pad + w + j] = src[s0 + (w + j) % w];
        } else {
            dst[d0 + j] = 0.0;
            dst[d0 + pad + w + j] = 0.0;
        }
    }
}

/// One direction's per-row geometry: the offset split once for every cell.
struct Step {
    sx: f64,
    sz: f64,
    kx: isize,
    mx: isize,
    kz: isize,
    mz: isize,
    frx: f32,
    frz: f32,
    inv_sx: f32,
    inv_sz: f32,
    vert_x: bool,
    vert_z: bool,
    per_row: f32,
    /// Bilinear weights of G at (x + s_x, z + s_z): [00, 01, 10, 11] (z, x).
    a: [f32; 4],
    /// Whole-cell shifts: G is copied, not blended (the same bits as the blend with weights 1, 0).
    shift_only: bool,
}

impl Step {
    fn new(dx: f64, dy: f64, dz: f64) -> Step {
        Step::shifted(dx / dy, dz / dy, dy)
    }

    /// A row step of (sx, sz) cells across, at d_y (the path length across the row is 1/d_y).
    fn shifted(sx: f64, sz: f64, dy: f64) -> Step {
        let (kx, kz) = (sx.floor(), sz.floor());
        let (fx, fz) = ((sx - kx) as f32, (sz - kz) as f32);
        let (mx, mz) = ((0.5 + sx).floor(), (0.5 + sz).floor());
        Step {
            sx,
            sz,
            kx: kx as isize,
            mx: mx as isize,
            kz: kz as isize,
            mz: mz as isize,
            frx: (0.5 + sx - mx) as f32,
            frz: (0.5 + sz - mz) as f32,
            inv_sx: (1.0 / sx) as f32,
            inv_sz: (1.0 / sz) as f32,
            vert_x: sx.abs() < 1e-9,
            vert_z: sz.abs() < 1e-9,
            per_row: (1.0 / dy) as f32,
            a: [
                (1.0 - fz) * (1.0 - fx),
                (1.0 - fz) * fx,
                fz * (1.0 - fx),
                fz * fx,
            ],
            shift_only: fx == 0.0 && fz == 0.0,
        }
    }
}

/// The inner loops, scalar and SIMD, step for step alike.
mod kernels {
    use super::{Step, fexp};

    pub const HAS_SIMD: bool = cfg!(all(target_arch = "wasm32", target_feature = "simd128"));

    type Out<'a> = (&'a mut [f32], &'a mut [f32], &'a mut [f32], &'a mut [f32]);

    /// Adds one direction's light (w, d) to a row of cells, from their entry depths `u`.
    pub fn light(u: &[f32], dir: [f32; 4], kext: f32, (q, vx, vy, vz): Out) {
        let [w, dx, dy, dz] = dir;
        for c in 0..u.len() {
            let l = w * fexp(-kext * u[c]);
            q[c] += l;
            vx[c] += l * dx;
            vy[c] += l * dy;
            vz[c] += l * dz;
        }
    }

    /// One direction's next row of G from the padded G above (g), ℓ (l) and its prefix sums (i):
    /// the x-means R, their z prefix sums S, then G = bilinear(g) + box mean / d_y.
    pub fn row(
        st: &Step,
        (w, d, pad, nx, nz): (usize, usize, usize, usize, usize),
        g: &[f32],
        l: &[f32],
        i: &[f32],
        r: &mut [f32],
        s: &mut [f32],
        next: &mut [f32],
    ) {
        for zi in 0..nz {
            let (d0, i0, r0) = (zi * nx, zi * (nx + 1), zi * w);
            if st.vert_x {
                r[r0..r0 + w].copy_from_slice(&l[d0 + pad..d0 + pad + w]);
            } else {
                let (a0, l0) = (i0 + pad, d0 + pad);
                let a1 = (a0 as isize + st.mx) as usize;
                let l1 = (l0 as isize + st.mx) as usize;
                for col in 0..w {
                    let from = i[a0 + col] + 0.5 * l[l0 + col];
                    let to = i[a1 + col] + st.frx * l[l1 + col];
                    r[r0 + col] = (to - from) * st.inv_sx;
                }
            }
        }
        if !st.vert_z {
            s[..w].fill(0.0);
            for zi in 0..nz {
                let s0 = zi * w;
                for col in 0..w {
                    s[s0 + w + col] = s[s0 + col] + r[s0 + col];
                }
            }
        }
        let [a00, a01, a10, a11] = st.a;
        for z in 0..d {
            let zj = z + pad;
            let g0 = ((zj as isize + st.kz) * nx as isize + pad as isize + st.kx) as usize;
            let g1 = g0 + nx;
            let rr = zj * w;
            let rm = (zj as isize + st.mz) as usize * w;
            let o = z * w;
            for col in 0..w {
                let gv = if st.shift_only {
                    g[g0 + col]
                } else {
                    (a00 * g[g0 + col] + a01 * g[g0 + col + 1])
                        + (a10 * g[g1 + col] + a11 * g[g1 + col + 1])
                };
                let mean = if st.vert_z {
                    r[rr + col]
                } else {
                    let from = s[rr + col] + 0.5 * r[rr + col];
                    let to = s[rm + col] + st.frz * r[rm + col];
                    (to - from) * st.inv_sz
                };
                next[o + col] = gv + mean * st.per_row;
            }
        }
    }

    /// `row` with the exact segment integral: for each cell, the mean of ℓ along the segment
    /// from its centre to where the ray entered the row (Amanatides–Woo across the padded row).
    pub fn row_dda(
        st: &Step,
        (w, d, pad, nx, _nz): (usize, usize, usize, usize, usize),
        g: &[f32],
        l: &[f32],
        next: &mut [f32],
    ) {
        let (sx, sz) = (st.sx, st.sz);
        let [a00, a01, a10, a11] = st.a;
        for z in 0..d {
            let zj = z + pad;
            let g0 = ((zj as isize + st.kz) * nx as isize + pad as isize + st.kx) as usize;
            let g1 = g0 + nx;
            for col in 0..w {
                let gv = if st.shift_only {
                    g[g0 + col]
                } else {
                    (a00 * g[g0 + col] + a01 * g[g0 + col + 1])
                        + (a10 * g[g1 + col] + a11 * g[g1 + col + 1])
                };
                let (px, pz) = ((col + pad) as f64 + 0.5, zj as f64 + 0.5);
                let (mut i, mut k) = (px.floor() as isize, pz.floor() as isize);
                let (di, dk) = (if sx > 0.0 { 1 } else { -1 }, if sz > 0.0 { 1 } else { -1 });
                let edge = |p: f64, c: isize, s: f64| {
                    if s.abs() < 1e-12 {
                        f64::INFINITY
                    } else if s > 0.0 {
                        ((c + 1) as f64 - p) / s
                    } else {
                        (p - c as f64) / -s
                    }
                };
                let (mut tx, mut tz) = (edge(px, i, sx), edge(pz, k, sz));
                let (dtx, dtz) = (1.0 / sx.abs(), 1.0 / sz.abs());
                let (mut t, mut acc) = (0.0f64, 0.0f64);
                loop {
                    let t1 = tx.min(tz).min(1.0);
                    acc += l[k as usize * nx + i as usize] as f64 * (t1 - t);
                    t = t1;
                    if t >= 1.0 {
                        break;
                    }
                    if tx <= tz {
                        i += di;
                        tx += dtx;
                    } else {
                        k += dk;
                        tz += dtz;
                    }
                }
                next[z * w + col] = gv + acc as f32 * st.per_row;
            }
        }
    }

    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    pub use simd::{light_simd, row_simd};

    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    pub fn light_simd(u: &[f32], dir: [f32; 4], kext: f32, out: Out) {
        light(u, dir, kext, out);
    }

    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    pub fn row_simd(
        st: &Step,
        dims: (usize, usize, usize, usize, usize),
        g: &[f32],
        l: &[f32],
        i: &[f32],
        r: &mut [f32],
        s: &mut [f32],
        next: &mut [f32],
    ) {
        row(st, dims, g, l, i, r, s, next);
    }

    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    mod simd {
        use super::{Out, Step, fexp};
        use core::arch::wasm32::*;

        #[inline(always)]
        unsafe fn ld(p: &[f32], i: usize) -> v128 {
            debug_assert!(i + 4 <= p.len());
            unsafe { v128_load(p.as_ptr().add(i) as *const v128) }
        }

        #[inline(always)]
        unsafe fn st(p: &mut [f32], i: usize, v: v128) {
            debug_assert!(i + 4 <= p.len());
            unsafe { v128_store(p.as_mut_ptr().add(i) as *mut v128, v) }
        }

        /// `fexp`, four lanes at a time, step for step.
        #[inline(always)]
        fn vexp(x: v128) -> v128 {
            let x = f32x4_pmax(x, f32x4_splat(-80.0));
            let n = f32x4_floor(f32x4_add(
                f32x4_mul(x, f32x4_splat(core::f32::consts::LOG2_E)),
                f32x4_splat(0.5),
            ));
            let r = f32x4_sub(
                f32x4_sub(x, f32x4_mul(n, f32x4_splat(super::super::LN2_HI))),
                f32x4_mul(n, f32x4_splat(super::super::LN2_LO)),
            );
            let mut p = f32x4_splat(1.0 / 720.0);
            for c in [1.0 / 120.0, 1.0 / 24.0, 1.0 / 6.0, 0.5, 1.0, 1.0] {
                p = f32x4_add(f32x4_mul(p, r), f32x4_splat(c));
            }
            let e = i32x4_shl(i32x4_add(i32x4_trunc_sat_f32x4(n), i32x4_splat(127)), 23);
            f32x4_mul(p, e)
        }

        pub fn light_simd(u: &[f32], dir: [f32; 4], kext: f32, (q, vx, vy, vz): Out) {
            let [w, dx, dy, dz] = dir;
            let n = u.len();
            let n4 = n & !3;
            let (vw, vdx, vdy, vdz) = (
                f32x4_splat(w),
                f32x4_splat(dx),
                f32x4_splat(dy),
                f32x4_splat(dz),
            );
            let vk = f32x4_splat(-kext);
            let mut c = 0;
            unsafe {
                while c < n4 {
                    let l = f32x4_mul(vw, vexp(f32x4_mul(vk, ld(u, c))));
                    st(q, c, f32x4_add(ld(q, c), l));
                    st(vx, c, f32x4_add(ld(vx, c), f32x4_mul(l, vdx)));
                    st(vy, c, f32x4_add(ld(vy, c), f32x4_mul(l, vdy)));
                    st(vz, c, f32x4_add(ld(vz, c), f32x4_mul(l, vdz)));
                    c += 4;
                }
            }
            while c < n {
                let l = w * fexp(-kext * u[c]);
                q[c] += l;
                vx[c] += l * dx;
                vy[c] += l * dy;
                vz[c] += l * dz;
                c += 1;
            }
        }

        pub fn row_simd(
            st_: &Step,
            (w, d, pad, nx, nz): (usize, usize, usize, usize, usize),
            g: &[f32],
            l: &[f32],
            i: &[f32],
            r: &mut [f32],
            s: &mut [f32],
            next: &mut [f32],
        ) {
            let w4 = w & !3;
            let half = f32x4_splat(0.5);
            let (vfrx, vfrz) = (f32x4_splat(st_.frx), f32x4_splat(st_.frz));
            let (isx, isz) = (f32x4_splat(st_.inv_sx), f32x4_splat(st_.inv_sz));
            unsafe {
                for zi in 0..nz {
                    let (d0, i0, r0) = (zi * nx, zi * (nx + 1), zi * w);
                    if st_.vert_x {
                        r[r0..r0 + w].copy_from_slice(&l[d0 + pad..d0 + pad + w]);
                        continue;
                    }
                    let (a0, l0) = (i0 + pad, d0 + pad);
                    let a1 = (a0 as isize + st_.mx) as usize;
                    let l1 = (l0 as isize + st_.mx) as usize;
                    let mut col = 0;
                    while col < w4 {
                        let from = f32x4_add(ld(i, a0 + col), f32x4_mul(half, ld(l, l0 + col)));
                        let to = f32x4_add(ld(i, a1 + col), f32x4_mul(vfrx, ld(l, l1 + col)));
                        st(r, r0 + col, f32x4_mul(f32x4_sub(to, from), isx));
                        col += 4;
                    }
                    while col < w {
                        let from = i[a0 + col] + 0.5 * l[l0 + col];
                        let to = i[a1 + col] + st_.frx * l[l1 + col];
                        r[r0 + col] = (to - from) * st_.inv_sx;
                        col += 1;
                    }
                }
                if !st_.vert_z {
                    s[..w].fill(0.0);
                    for zi in 0..nz {
                        let s0 = zi * w;
                        let mut col = 0;
                        while col < w4 {
                            let v = f32x4_add(ld(s, s0 + col), ld(r, s0 + col));
                            st(s, s0 + w + col, v);
                            col += 4;
                        }
                        while col < w {
                            s[s0 + w + col] = s[s0 + col] + r[s0 + col];
                            col += 1;
                        }
                    }
                }
                let [a00, a01, a10, a11] = st_.a;
                let (v00, v01, v10, v11) = (
                    f32x4_splat(a00),
                    f32x4_splat(a01),
                    f32x4_splat(a10),
                    f32x4_splat(a11),
                );
                let vpr = f32x4_splat(st_.per_row);
                for z in 0..d {
                    let zj = z + pad;
                    let g0 =
                        ((zj as isize + st_.kz) * nx as isize + pad as isize + st_.kx) as usize;
                    let g1 = g0 + nx;
                    let rr = zj * w;
                    let rm = (zj as isize + st_.mz) as usize * w;
                    let o = z * w;
                    let mut col = 0;
                    while col < w4 {
                        let gv = if st_.shift_only {
                            ld(g, g0 + col)
                        } else {
                            f32x4_add(
                                f32x4_add(
                                    f32x4_mul(v00, ld(g, g0 + col)),
                                    f32x4_mul(v01, ld(g, g0 + col + 1)),
                                ),
                                f32x4_add(
                                    f32x4_mul(v10, ld(g, g1 + col)),
                                    f32x4_mul(v11, ld(g, g1 + col + 1)),
                                ),
                            )
                        };
                        let mean = if st_.vert_z {
                            ld(r, rr + col)
                        } else {
                            let from = f32x4_add(ld(s, rr + col), f32x4_mul(half, ld(r, rr + col)));
                            let to = f32x4_add(ld(s, rm + col), f32x4_mul(vfrz, ld(r, rm + col)));
                            f32x4_mul(f32x4_sub(to, from), isz)
                        };
                        st(next, o + col, f32x4_add(gv, f32x4_mul(mean, vpr)));
                        col += 4;
                    }
                    while col < w {
                        let gv = if st_.shift_only {
                            g[g0 + col]
                        } else {
                            (a00 * g[g0 + col] + a01 * g[g0 + col + 1])
                                + (a10 * g[g1 + col] + a11 * g[g1 + col + 1])
                        };
                        let mean = if st_.vert_z {
                            r[rr + col]
                        } else {
                            let from = s[rr + col] + 0.5 * r[rr + col];
                            let to = s[rm + col] + st_.frz * r[rm + col];
                            (to - from) * st_.inv_sz
                        };
                        next[o + col] = gv + mean * st_.per_row;
                        col += 1;
                    }
                }
            }
        }
    }
}

/// A fixed patchy canopy over rows 8–20 (tests, and the WASM build's same-bits check).
pub fn fixture(w: usize, h: usize, d: usize, p: SlabParams) -> SlabSweep {
    let mut s = SlabSweep::new(w, h, d, p);
    let mut seed: u64 = 7;
    for y in 8..20.min(h) {
        for z in 0..d {
            for x in 0..w {
                seed = (seed * 1103515245 + 12345) % 2147483648;
                if seed % 5 < 2 {
                    let a = 0.5 + (seed % 7) as f32 / 4.0;
                    s.deposit(x as f64 + 0.5, y as f64 + 0.5, z as f64 + 0.5, a);
                }
            }
        }
    }
    s
}

/// The fixture the same-bits check uses: 37 × 26 × 11, K = 16, rotating, τ = (1, 0.2), season 3.
pub fn fixture_fingerprint(simd: bool) -> u32 {
    let p = SlabParams {
        k: 16,
        k_ext: 0.5,
        sky_exponent: 1.0,
        min_elevation: 15.0,
        c: 1.0,
        rotate: true,
        face_tau: [1.0, 0.2],
        periodic_x: true,
    };
    let mut s = fixture(37, 26, 11, p);
    s.simd = simd;
    s.compute(3.0);
    s.fingerprint()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::light::sky_sweep::{SkyParams, SkySweep};

    fn params(tau: [f64; 2]) -> SlabParams {
        SlabParams {
            k: 16,
            k_ext: 0.5,
            sky_exponent: 1.0,
            min_elevation: 15.0,
            c: 1.0,
            rotate: false,
            face_tau: tau,
            periodic_x: true,
        }
    }

    /// The shared fixture's canopy, deposited into an existing sweep.
    fn canopy(s: &mut SlabSweep) {
        let (w, h, d) = s.dims();
        let f = fixture(w, h, d, params([1.0, 1.0]));
        s.lad_mut().copy_from_slice(f.lad());
        s.refresh_top();
    }

    #[test]
    fn fexp_is_close_to_exp() {
        for i in 0..2000 {
            let x = -(i as f32) * 0.02;
            let (a, b) = (fexp(x) as f64, (x as f64).exp());
            assert!((a - b).abs() <= 3e-7 * b, "x {x}: {a} vs {b}");
        }
        assert_eq!(fexp(0.0), 1.0);
    }

    #[test]
    fn with_flat_directions_and_the_same_foliage_on_every_z_line_it_is_the_2d_sweep() {
        // The 2D sweep's K = 7 directions, laid in the x–y plane (d_z = 0), over a slab whose every
        // z line carries the same foliage: each z line must see the 2D field.
        let (w, h, d) = (48, 30, 6);
        let sp = SkyParams {
            k: 7.0,
            k_ext: 0.5,
            sky_exponent: 1.0,
            sky_tilt: 0.0,
            min_elevation: 15.0,
            c: 1.0,
            rotate: false,
            columns: false,
        };
        let mut flat = SkySweep::new(w, h, sp, true);
        let mut dirs = Directions::default();
        let lo = 15.0f64.to_radians();
        let span = std::f64::consts::PI - 2.0 * lo;
        let mut total = 0.0;
        for k in 0..7 {
            let th = lo + span * k as f64 / 6.0;
            dirs.x.push(math::cos(th));
            dirs.y.push(math::sin(th));
            dirs.z.push(0.0);
            dirs.w.push(math::sin(th));
            total += math::sin(th);
        }
        for v in dirs.w.iter_mut() {
            *v /= total;
        }
        let mut slab = SlabSweep::with_directions(w, h, d, params([1.0, 1.0]), dirs);
        slab.integer_shifts = false; // the 2D sweep reads G linearly
        let mut seed: u64 = 3;
        for y in 6..22 {
            for x in 0..w {
                seed = (seed * 1103515245 + 12345) % 2147483648;
                if seed.is_multiple_of(3) {
                    let a = 0.4 + (seed % 5) as f64 * 0.3;
                    flat.deposit(x as f64 + 0.5, y as f64 + 0.5, a);
                    for z in 0..d {
                        slab.deposit(x as f64 + 0.5, y as f64 + 0.5, z as f64 + 0.5, a as f32);
                    }
                }
            }
        }
        flat.compute(0.0);
        slab.compute(0.0);
        let (vx3, vy3, _) = slab.v();
        let mut worst = 0.0f64;
        for y in 0..h {
            for z in 0..d {
                for x in 0..w {
                    let c2 = y * w + x;
                    let c3 = (y * d + z) * w + x;
                    worst = worst.max((slab.q()[c3] as f64 - flat.q()[c2]).abs());
                    worst = worst.max((vx3[c3] as f64 - flat.vx()[c2]).abs());
                    worst = worst.max((vy3[c3] as f64 - flat.vy()[c2]).abs());
                }
            }
        }
        assert!(worst < 2e-5, "largest difference {worst}");
    }

    #[test]
    fn scalar_and_simd_paths_agree_bit_for_bit() {
        // Natively both run the scalar kernel; on wasm32 with simd128 (tests/wasm-slab.test.ts
        // repeats this there) the second is SIMD.
        let mut a = SlabSweep::new(37, 26, 11, params([1.0, 0.2]));
        canopy(&mut a);
        let mut b = SlabSweep::new(37, 26, 11, params([1.0, 0.2]));
        canopy(&mut b);
        a.simd = false;
        b.simd = true;
        a.compute(3.0);
        b.compute(3.0);
        assert!(
            a.q()
                .iter()
                .zip(b.q())
                .all(|(x, y)| x.to_bits() == y.to_bits())
        );
    }

    #[test]
    fn the_same_bits_on_every_target() {
        // tests/wasm-slab.test.ts holds the WASM build, scalar and SIMD, to this constant.
        assert_eq!(fixture_fingerprint(false), FIXTURE_FINGERPRINT);
        assert_eq!(fixture_fingerprint(true), FIXTURE_FINGERPRINT);
    }

    const FIXTURE_FINGERPRINT: u32 = 0xd3060733;

    #[test]
    fn darker_faces_darken_the_cells_near_them() {
        let run = |tau: f64| {
            let mut s = SlabSweep::new(30, 26, 12, params([tau, tau]));
            canopy(&mut s);
            s.compute(0.0);
            s
        };
        let (open, dark) = (run(1.0), run(0.0));
        let near = (10 * 12) * 30 + 5; // row 10, z 0, x 5
        assert!(dark.q()[near] < 0.8 * open.q()[near]);
        // Above the foliage the sky is open whatever the faces.
        let above = (24 * 12 + 6) * 30 + 5;
        assert_eq!(dark.q()[above], open.q()[above]);
    }

    #[test]
    fn the_lanes_sum_to_the_whole_field() {
        let mut whole = SlabSweep::new(
            30,
            26,
            10,
            SlabParams {
                rotate: true,
                ..params([1.0, 0.2])
            },
        );
        canopy(&mut whole);
        whole.compute(5.0);
        let mut sum = vec![0.0f64; whole.q().len()];
        for lane in 0..4 {
            let mut part = SlabSweep::new(
                30,
                26,
                10,
                SlabParams {
                    rotate: true,
                    ..params([1.0, 0.2])
                },
            );
            canopy(&mut part);
            part.compute_part(5.0, lane, 4);
            for (s, q) in sum.iter_mut().zip(part.q()) {
                *s += *q as f64;
            }
        }
        for (s, q) in sum.iter().zip(whole.q()) {
            assert!((s - *q as f64).abs() < 1e-6);
        }
    }

    #[test]
    fn the_sweep_is_close_to_the_exact_trace() {
        let mut s = SlabSweep::new(30, 26, 12, params([1.0, 0.2]));
        canopy(&mut s);
        s.compute(0.0);
        let (mut err, mut n) = (0.0, 0);
        for row in (8..20).step_by(3) {
            for z in (0..12).step_by(3) {
                for x in (0..30).step_by(3) {
                    let c = (row * 12 + z) * 30 + x;
                    err += (s.q()[c] as f64 - s.exact_q(x, row, z, 0.01)).abs();
                    n += 1;
                }
            }
        }
        // M18's 2D row march: 0.035–0.049 mean |ΔQ|/C.
        assert!(err / (n as f64) < 0.08, "mean |ΔQ|/C {}", err / n as f64);
    }

    #[test]
    fn rotation_moves_the_sky_each_season_and_season_zero_is_the_static_sky() {
        let p = SlabParams {
            rotate: true,
            ..params([1.0, 1.0])
        };
        let mut s = SlabSweep::new(10, 10, 10, p);
        s.compute(0.0);
        let d0 = s.directions().clone();
        let fixed = sky(16, 15.0, 1.0, 1.0, 0.5, 0.0);
        assert_eq!(d0.x, fixed.x);
        s.compute(1.0);
        assert_ne!(s.directions().x, d0.x);
        let total: f64 = s.directions().w.iter().sum();
        assert!((total - 1.0).abs() < 1e-12);
    }
}
#[cfg(test)]
mod probe {
    #[test]
    #[ignore]
    fn fexp_worst() {
        let mut worst = 0.0f64;
        let mut i = 0u32;
        loop {
            let x = -f32::from_bits(i);
            if x < -80.0 {
                break;
            }
            let (a, b) = (super::fexp(x) as f64, (x as f64).exp());
            worst = worst.max((a - b).abs() / b);
            i += 97;
        }
        println!("worst relative error {worst:e}");
    }
}
