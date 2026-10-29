//! C2. The light models (spec §C2.8; `src/core/light/`): `sample(x, y, dir) → (Q, V)` over a
//! field rebuilt each season from the buds' deposits. The world is a closed box in every model:
//! outside the W × H grid Q = 0 and V points up.

pub mod sky_sweep;
pub mod slab_sweep;

use crate::math;
use crate::params::{DEG, LightKind, Params, Rect};
use sky_sweep::{SkyParams, SkySweep};

// One light model per world, so the sky sweep living inline costs nothing worth a box.
#[allow(clippy::large_enum_variant)]
pub enum Light {
    /// C2 off: Q = C everywhere inside the world, V straight up.
    Uniform { width: f64, height: f64, q: f64 },
    /// The §8 ablation (M22): one homogeneous canopy's mean light for every leaf.
    Pooled(Pooled),
    /// The shadow triangle (Palubicki et al. §4.1, in 2D).
    Triangle(ShadowTriangle),
    /// The Beer–Lambert sky sweep (M6, M18).
    Sky(SkySweep),
}

/// `makeLight` (world.ts).
pub fn make_light(params: &Params) -> Light {
    let (w, h) = (params.world.width, params.world.height);
    let c2 = &params.c2;
    if c2.enabled && c2.model == LightKind::Pooled {
        return Light::Pooled(Pooled::new(w, h, c2.k_ext, c2.c));
    }
    if c2.enabled && c2.model == LightKind::Sky {
        let p = SkyParams {
            k: c2.k,
            k_ext: c2.k_ext,
            sky_exponent: c2.sky_exponent,
            sky_tilt: c2.sky_tilt,
            min_elevation: c2.min_elevation,
            c: c2.c,
            rotate: c2.rotate,
            columns: c2.columns,
        };
        return Light::Sky(SkySweep::new(
            w as usize,
            h as usize,
            p,
            params.world.periodic,
        ));
    }
    if c2.enabled {
        return Light::Triangle(ShadowTriangle::new(w, h, params));
    }
    Light::Uniform {
        width: w,
        height: h,
        q: c2.c,
    }
}

fn inside(x: f64, y: f64, w: f64, h: f64) -> bool {
    x >= 0.0 && x < w && y >= 0.0 && y < h
}

impl Light {
    pub fn width(&self) -> f64 {
        match self {
            Light::Uniform { width, .. } => *width,
            Light::Pooled(p) => p.width,
            Light::Triangle(t) => t.width,
            Light::Sky(s) => s.width() as f64,
        }
    }

    pub fn height(&self) -> f64 {
        match self {
            Light::Uniform { height, .. } => *height,
            Light::Pooled(p) => p.height,
            Light::Triangle(t) => t.height,
            Light::Sky(s) => s.height() as f64,
        }
    }

    pub fn clear(&mut self) {
        match self {
            Light::Uniform { .. } => {}
            Light::Pooled(p) => p.area = 0.0,
            Light::Triangle(t) => t.s.fill(0.0),
            Light::Sky(s) => s.clear(),
        }
    }

    pub fn deposit(&mut self, x: f64, y: f64, area: f64) {
        match self {
            Light::Uniform { .. } => {}
            Light::Pooled(p) => {
                if inside(x, y, p.width, p.height) {
                    p.area += area;
                }
            }
            Light::Triangle(t) => t.deposit(x, y, area),
            Light::Sky(s) => s.deposit(x, y, area),
        }
    }

    pub fn add_wall(&mut self, wall: &Rect) {
        match self {
            Light::Triangle(t) => t.add_wall(wall),
            Light::Sky(s) => s.add_wall(wall.x, wall.y, wall.width, wall.height, wall.shade),
            _ => {}
        }
    }

    pub fn compute(&mut self, season: f64) {
        match self {
            Light::Pooled(p) => {
                let kl = (p.k_ext * p.area) / p.width;
                p.q = if kl > 0.0 {
                    (p.c * (1.0 - math::exp(-kl))) / kl
                } else {
                    p.c
                };
            }
            Light::Sky(s) => s.compute(season),
            _ => {}
        }
    }

    /// (Q, V_x, V_y) for a bud at (x, y) whose default direction is `dir` (radians).
    pub fn sample(&self, x: f64, y: f64, dir: f64) -> (f64, f64, f64) {
        match self {
            Light::Uniform { width, height, q } => {
                let q = if inside(x, y, *width, *height) {
                    *q
                } else {
                    0.0
                };
                (q, 0.0, 1.0)
            }
            Light::Pooled(p) => {
                let q = if inside(x, y, p.width, p.height) {
                    p.q
                } else {
                    0.0
                };
                (q, 0.0, 1.0)
            }
            Light::Triangle(t) => t.sample(x, y, dir),
            Light::Sky(s) => s.sample(x, y, dir),
        }
    }

    /// Per-cell shadow for overlays (the field the snapshot and the CLI's light.csv carry).
    pub fn field(&mut self) -> Option<&[f64]> {
        match self {
            Light::Triangle(t) => Some(&t.s),
            Light::Sky(s) => Some(s.field()),
            _ => None,
        }
    }
}

pub struct Pooled {
    width: f64,
    height: f64,
    k_ext: f64,
    c: f64,
    area: f64,
    q: f64,
}

impl Pooled {
    fn new(width: f64, height: f64, k_ext: f64, c: f64) -> Pooled {
        Pooled {
            width,
            height,
            k_ext,
            c,
            area: 0.0,
            q: c,
        }
    }
}

/// `ShadowTriangle` (shadow-triangle.ts): positions stay doubles, as in JavaScript, until they
/// are bounds-checked as cells.
pub struct ShadowTriangle {
    width: f64,
    height: f64,
    w: usize,
    /// Shadow s per cell, row-major, row 0 at the ground.
    pub s: Vec<f64>,
    weights: Vec<f64>,
    a: f64,
    c: f64,
    cos_half_angle: f64,
    radius: f64,
}

impl ShadowTriangle {
    pub fn new(width: f64, height: f64, params: &Params) -> ShadowTriangle {
        let c2 = &params.c2;
        let q_max = math::max(0.0, c2.q_max.floor());
        let weights = (0..=(q_max as usize))
            .map(|q| c2.a * math::pow(c2.b, -(q as f64)))
            .collect();
        ShadowTriangle {
            width,
            height,
            w: width as usize,
            s: vec![0.0; (width * height) as usize],
            weights,
            a: c2.a,
            c: c2.c,
            cos_half_angle: math::cos(c2.perception_angle * DEG),
            radius: math::max(1.0, c2.perception_distance.floor()),
        }
    }

    fn deposit(&mut self, x: f64, y: f64, area: f64) {
        let ci = x.floor();
        let cj = y.floor();
        let (w, h) = (self.width, self.height);
        for (q, &weight) in self.weights.iter().enumerate() {
            let q = q as f64;
            let row = cj - q;
            if row < 0.0 {
                break;
            }
            if row >= h {
                continue;
            }
            let wt = weight * area;
            let lo = math::max(0.0, ci - q);
            let hi = math::min(w - 1.0, ci + q);
            let mut col = lo;
            while col <= hi {
                self.s[row as usize * self.w + col as usize] += wt;
                col += 1.0;
            }
        }
    }

    fn add_wall(&mut self, wall: &Rect) {
        let (w, h) = (self.width, self.height);
        let x0 = math::max(0.0, wall.x.floor());
        let x1 = math::min(w, (wall.x + wall.width).ceil());
        let y0 = math::max(0.0, wall.y.floor());
        let y1 = math::min(h, (wall.y + wall.height).ceil());
        let mut row = y0;
        while row < y1 {
            let mut col = x0;
            while col < x1 {
                self.s[row as usize * self.w + col as usize] += wall.shade;
                col += 1.0;
            }
            row += 1.0;
        }
    }

    fn sample(&self, x: f64, y: f64, dir: f64) -> (f64, f64, f64) {
        let ci = x.floor();
        let cj = y.floor();
        let (w, h) = (self.width, self.height);
        if !(ci >= 0.0 && ci < w && cj >= 0.0 && cj < h) {
            return (0.0, 0.0, 1.0);
        }
        let at = |col: f64, row: f64| self.s[row as usize * self.w + col as usize];
        let q = math::max(self.c - at(ci, cj) + self.a, 0.0);
        // V: the least-shaded cell in the wedge; ties go to the cell best aligned with `dir`.
        let dx = math::cos(dir);
        let dy = math::sin(dir);
        let r = self.radius;
        let mut best = f64::INFINITY;
        let mut best_align = -2.0;
        let (mut vx, mut vy) = (dx, dy);
        let mut row = math::max(0.0, cj - r);
        while row <= math::min(h - 1.0, cj + r) {
            let mut col = math::max(0.0, ci - r);
            while col <= math::min(w - 1.0, ci + r) {
                if !(col == ci && row == cj) {
                    let ex = col + 0.5 - x;
                    let ey = row + 0.5 - y;
                    let d = math::hypot(ex, ey);
                    if !(d > r || d == 0.0) {
                        let align = (ex * dx + ey * dy) / d;
                        if align >= self.cos_half_angle {
                            let sh = at(col, row);
                            if sh < best || (sh == best && align > best_align) {
                                best = sh;
                                best_align = align;
                                vx = ex / d;
                                vy = ey / d;
                            }
                        }
                    }
                }
                col += 1.0;
            }
            row += 1.0;
        }
        (q, vx, vy)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::preset;

    fn params(c2: &str) -> Params {
        Params::from_json(&preset("default", &format!(r#"{{"c2":{c2}}}"#)))
    }

    #[test]
    fn pooled_light_is_a_homogeneous_canopys_mean_light() {
        let p = params(
            r#"{"enabled":true,"model":"pooled","a":0.15,"b":1.5,"qMax":6,"C":1,"perceptionAngle":45,"perceptionDistance":4,"K":7,"kExt":0.5,"skyExponent":1,"skyTilt":0,"minElevation":15,"rotate":false}"#,
        );
        let mut p = p;
        p.world.width = 10.0;
        p.world.height = 20.0;
        let mut light = make_light(&p);
        // 40 units of leaf area over 10 columns: L = 4, kL = 2.
        for i in 0..40 {
            light.deposit((i % 10) as f64 + 0.5, 3.0 + (i % 7) as f64, 1.0);
        }
        light.compute(0.0);
        let expected = (1.0 - (-2.0f64).exp()) / 2.0;
        for (x, y) in [(0.5, 0.5), (5.5, 12.5), (9.5, 19.5)] {
            let (q, vx, vy) = light.sample(x, y, std::f64::consts::FRAC_PI_2);
            assert!((q - expected).abs() < 1e-12);
            assert_eq!((vx, vy), (0.0, 1.0));
        }
        // An empty world gives full light, outside it none; last season is forgotten.
        light.deposit(5.0, 5.0, 50.0);
        light.compute(0.0);
        light.clear();
        light.compute(0.0);
        assert_eq!(light.sample(5.0, 5.0, 0.0).0, 1.0);
        assert_eq!(light.sample(-1.0, 5.0, 0.0).0, 0.0);
        assert_eq!(light.sample(5.0, 25.0, 0.0).0, 0.0);
    }

    fn triangle(w: f64, h: f64, extra: &str) -> ShadowTriangle {
        let p = params(&format!(
            r#"{{"enabled":true,"model":"triangle","a":1,"b":2,"qMax":3,"C":1,"perceptionAngle":45,"perceptionDistance":4{extra}}}"#
        ));
        ShadowTriangle::new(w, h, &p)
    }

    #[test]
    fn the_triangle_deposits_a_b_to_the_minus_q_widening_downwards() {
        let mut g = triangle(21.0, 21.0, "");
        g.deposit(10.5, 10.5, 1.0);
        let at = |g: &ShadowTriangle, col: usize, row: usize| g.s[row * 21 + col];
        assert_eq!(at(&g, 10, 10), 1.0); // own cell, q = 0
        assert_eq!(at(&g, 10, 11), 0.0); // nothing above
        for col in [9, 10, 11] {
            assert_eq!(at(&g, col, 9), 0.5);
        }
        assert_eq!(at(&g, 8, 9), 0.0);
        for col in 8..=12 {
            assert_eq!(at(&g, col, 8), 0.25);
        }
        for col in 7..=13 {
            assert_eq!(at(&g, col, 7), 0.125);
        }
        assert_eq!(at(&g, 6, 7), 0.0);
        assert_eq!(at(&g, 10, 6), 0.0); // beyond qMax
        let total: f64 = g.s.iter().sum();
        assert!((total - (1.0 + 1.5 + 1.25 + 0.875)).abs() < 1e-12);
    }

    #[test]
    fn a_bud_does_not_shade_itself() {
        let mut g = triangle(21.0, 21.0, "");
        let up = std::f64::consts::FRAC_PI_2;
        g.deposit(10.5, 10.5, 1.0);
        assert_eq!(g.sample(10.5, 10.5, up).0, 1.0); // own deposit cancelled
        g.deposit(10.5, 9.5, 1.0); // a second bud one cell below
        assert!((g.sample(10.5, 9.5, up).0 - 0.5).abs() < 1e-12); // C − (a + a/b) + a
        g.deposit(10.5, 9.5, 1.0); // a third sharing that cell
        assert_eq!(g.sample(10.5, 9.5, up).0, 0.0); // clamped at zero
    }

    #[test]
    fn v_points_at_the_least_shaded_cell_in_the_wedge() {
        let mut g = triangle(30.0, 30.0, r#","perceptionAngle":90"#);
        let wall = Rect {
            x: 0.0,
            y: 0.0,
            width: 15.0,
            height: 30.0,
            shade: 5.0,
        };
        g.add_wall(&wall);
        let (_, vx, vy) = g.sample(15.2, 10.5, std::f64::consts::FRAC_PI_2);
        assert!(vx > 0.0);
        assert!((vx.hypot(vy) - 1.0).abs() < 1e-12);
    }

    #[test]
    fn everything_outside_the_world_box_is_opaque() {
        let g = triangle(10.0, 10.0, "");
        for (x, y) in [(-0.5, 5.0), (10.5, 5.0), (5.0, 10.5), (5.0, -0.5)] {
            assert_eq!(g.sample(x, y, std::f64::consts::FRAC_PI_2).0, 0.0);
        }
    }
}
