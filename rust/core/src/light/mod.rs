//! C2. The light models (spec §C2.8; I2, ADR 0025): `sample(x, y, z) → (Q, V)` over a field rebuilt
//! each season from the buds' deposits. The world is a slab W × H × D, a closed box in every model:
//! outside it Q = 0 and V points up (beyond the z faces too: growth stops there, light passes).
//!
//! - **Slab** (the default): the 3D Beer–Lambert sky sweep (G3, `slab_sweep`), K directions,
//!   rotated each season with `c2.rotate`, τ at the z faces, computed in fixed lanes
//!   (`SlabSweep::compute_lanes`). Walls (`world.walls`) are leaf area through the whole depth.
//! - **Pooled** (the §8 ablation, M22): one homogeneous canopy's mean light for every leaf.
//! - **Uniform**: C2 off, Q = C everywhere inside.
//!
//! With `world.fade` > 0, Q falls linearly to 0 over that many cells before each z face.

pub mod slab_sweep;

use crate::geom::{UP, V3};
use crate::math;
use crate::params::{LightKind, Params, Rect};
use slab_sweep::{SlabParams, SlabSweep};

/// The slab's own state: the sweep, and what sampling needs from the world.
pub struct Slab {
    pub sweep: SlabSweep,
    fade: f64,
    depth: f64,
}

// One light model per world.
#[allow(clippy::large_enum_variant)]
pub enum Light {
    Uniform {
        width: f64,
        height: f64,
        depth: f64,
        q: f64,
    },
    Pooled(Pooled),
    Slab(Slab),
}

/// The world's depth D, at least one cell.
pub fn depth_of(params: &Params) -> f64 {
    let d = params.world.depth;
    if d >= 1.0 { d.floor() } else { 1.0 }
}

/// `makeLight` (world.ts).
pub fn make_light(params: &Params) -> Light {
    let (w, h, d) = (params.world.width, params.world.height, depth_of(params));
    let c2 = &params.c2;
    if c2.enabled && c2.model == LightKind::Pooled {
        return Light::Pooled(Pooled::new(w, h, d, c2.k_ext, c2.c));
    }
    if c2.enabled {
        let p = SlabParams {
            k: math::max(1.0, c2.k.floor()) as usize,
            k_ext: c2.k_ext,
            sky_exponent: c2.sky_exponent,
            min_elevation: c2.min_elevation,
            c: c2.c,
            rotate: c2.rotate,
            face_tau: params.world.faces,
            sky_tilt: c2.sky_tilt,
            periodic_x: params.world.periodic,
        };
        return Light::Slab(Slab {
            sweep: SlabSweep::new(w as usize, h as usize, d as usize, p),
            fade: params.world.fade,
            depth: d,
        });
    }
    Light::Uniform {
        width: w,
        height: h,
        depth: d,
        q: c2.c,
    }
}

fn inside(x: f64, y: f64, z: f64, w: f64, h: f64, d: f64) -> bool {
    x >= 0.0 && x < w && y >= 0.0 && y < h && z >= 0.0 && z < d
}

impl Light {
    pub fn width(&self) -> f64 {
        match self {
            Light::Uniform { width, .. } => *width,
            Light::Pooled(p) => p.width,
            Light::Slab(s) => s.sweep.dims().0 as f64,
        }
    }

    pub fn height(&self) -> f64 {
        match self {
            Light::Uniform { height, .. } => *height,
            Light::Pooled(p) => p.height,
            Light::Slab(s) => s.sweep.dims().1 as f64,
        }
    }

    pub fn depth(&self) -> f64 {
        match self {
            Light::Uniform { depth, .. } => *depth,
            Light::Pooled(p) => p.depth,
            Light::Slab(s) => s.depth,
        }
    }

    pub fn clear(&mut self) {
        match self {
            Light::Uniform { .. } => {}
            Light::Pooled(p) => p.area = 0.0,
            Light::Slab(s) => s.sweep.clear(),
        }
    }

    pub fn deposit(&mut self, x: f64, y: f64, z: f64, area: f64) {
        match self {
            Light::Uniform { .. } => {}
            Light::Pooled(p) => {
                if inside(x, y, z, p.width, p.height, p.depth) {
                    p.area += area;
                }
            }
            Light::Slab(s) => s.sweep.deposit(x, y, z, area as f32),
        }
    }

    /// A wall: `shade` units of leaf area in every cell it covers, through the slab's depth.
    pub fn add_wall(&mut self, wall: &Rect) {
        let Light::Slab(s) = self else {
            return;
        };
        let (w, h, d) = s.sweep.dims();
        let x0 = math::max(0.0, wall.x.floor()) as usize;
        let x1 = math::min(w as f64, (wall.x + wall.width).ceil()) as usize;
        let y0 = math::max(0.0, wall.y.floor()) as usize;
        let y1 = math::min(h as f64, (wall.y + wall.height).ceil()) as usize;
        let lad = s.sweep.lad_mut();
        for row in y0..y1 {
            for z in 0..d {
                for col in x0..x1 {
                    lad[(row * d + z) * w + col] += wall.shade as f32;
                }
            }
        }
        s.sweep.refresh_top();
    }

    pub fn compute(&mut self, season: f64) {
        match self {
            Light::Pooled(p) => {
                // Leaf area per column of the slab: the canopy's mean light (Monsi–Saeki).
                let kl = (p.k_ext * p.area) / (p.width * p.depth);
                p.q = if kl > 0.0 {
                    (p.c * (1.0 - math::exp(-kl))) / kl
                } else {
                    p.c
                };
            }
            Light::Slab(s) => s.sweep.compute_lanes(season),
            Light::Uniform { .. } => {}
        }
    }

    /// (Q, V) at (x, y, z).
    pub fn sample(&self, x: f64, y: f64, z: f64) -> (f64, V3) {
        match self {
            Light::Uniform {
                width,
                height,
                depth,
                q,
            } => {
                let q = if inside(x, y, z, *width, *height, *depth) {
                    *q
                } else {
                    0.0
                };
                (q, UP)
            }
            Light::Pooled(p) => {
                let q = if inside(x, y, z, p.width, p.height, p.depth) {
                    p.q
                } else {
                    0.0
                };
                (q, UP)
            }
            Light::Slab(s) => {
                let [q, vx, vy, vz] = s.sweep.sample(x, y, z);
                let mut q = q as f64;
                if s.fade > 0.0 && q > 0.0 {
                    let edge = math::min(z, s.depth - z);
                    if edge < s.fade {
                        q *= math::max(0.0, edge / s.fade);
                    }
                }
                (q, [vx as f64, vy as f64, vz as f64])
            }
        }
    }

    /// The shade overlay W × H, row 0 at the ground: 1 − Q/C averaged across the depth (the
    /// snapshot's field and the CLI's light.csv). None without a field.
    pub fn field(&self, c: f64) -> Option<Vec<f64>> {
        let Light::Slab(s) = self else {
            return None;
        };
        let (w, h, d) = s.sweep.dims();
        let mut out = vec![0.0; w * h];
        for row in 0..h {
            for z in 0..d {
                for col in 0..w {
                    out[row * w + col] += s.sweep.q_at((row * d + z) * w + col) as f64;
                }
            }
        }
        for v in &mut out {
            *v = if c > 0.0 {
                1.0 - *v / (d as f64 * c)
            } else {
                0.0
            };
        }
        Some(out)
    }
}

pub struct Pooled {
    width: f64,
    height: f64,
    depth: f64,
    k_ext: f64,
    c: f64,
    area: f64,
    q: f64,
}

impl Pooled {
    fn new(width: f64, height: f64, depth: f64, k_ext: f64, c: f64) -> Pooled {
        Pooled {
            width,
            height,
            depth,
            k_ext,
            c,
            area: 0.0,
            q: c,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::preset;

    fn params(patch: &str) -> Params {
        Params::from_json(&preset("default", patch))
    }

    #[test]
    fn pooled_light_is_a_homogeneous_canopys_mean_light() {
        let p = params(
            r#"{"world":{"width":10,"height":20,"depth":4,"walls":[]},"c2":{"enabled":true,"model":"pooled","C":1,"kExt":0.5}}"#,
        );
        let mut light = make_light(&p);
        // 80 units of leaf area over 10 × 4 columns: L = 2, kL = 1.
        for i in 0..80 {
            light.deposit(
                (i % 10) as f64 + 0.5,
                3.0 + (i % 7) as f64,
                (i % 4) as f64 + 0.5,
                1.0,
            );
        }
        light.compute(0.0);
        let expected = 1.0 - (-1.0f64).exp();
        for (x, y, z) in [(0.5, 0.5, 0.5), (5.5, 12.5, 2.5), (9.5, 19.5, 3.5)] {
            let (q, v) = light.sample(x, y, z);
            assert!((q - expected).abs() < 1e-12);
            assert_eq!(v, UP);
        }
        // Outside the slab, none; last season is forgotten.
        assert_eq!(light.sample(5.0, 5.0, 4.5).0, 0.0);
        light.clear();
        light.compute(0.0);
        assert_eq!(light.sample(5.0, 5.0, 1.0).0, 1.0);
    }

    fn slab(extra: &str) -> Light {
        let p = params(&format!(
            r#"{{"world":{{"width":20,"height":20,"depth":10,"walls":[]{extra}}},"c2":{{"enabled":true,"model":"slab","K":8,"C":1,"kExt":0.5,"skyExponent":1,"minElevation":15,"rotate":false}}}}"#
        ));
        make_light(&p)
    }

    #[test]
    fn the_slab_shades_below_foliage_and_stops_at_its_faces() {
        let mut light = slab("");
        light.compute(0.0);
        let (open, _) = light.sample(10.5, 1.5, 5.5);
        for _ in 0..40 {
            light.deposit(10.5, 10.5, 5.5, 1.0);
        }
        light.compute(0.0);
        let (shaded, v) = light.sample(10.5, 1.5, 5.5);
        assert!(shaded < 0.95 * open, "{shaded} vs {open}");
        assert!((v[0] * v[0] + v[1] * v[1] + v[2] * v[2] - 1.0).abs() < 1e-5);
        // Beyond a face (and outside the box) Q is 0.
        assert_eq!(light.sample(10.5, 1.5, -0.5).0, 0.0);
        assert_eq!(light.sample(10.5, 1.5, 10.5).0, 0.0);
        assert_eq!(light.sample(10.5, 25.0, 5.0).0, 0.0);
    }

    #[test]
    fn the_fade_takes_q_to_zero_at_the_faces() {
        let mut light = slab(r#","fade":3"#);
        light.compute(0.0);
        let (mid, _) = light.sample(10.5, 5.5, 5.0);
        let (near, _) = light.sample(10.5, 5.5, 1.5);
        assert!((near / mid - 0.5).abs() < 0.05, "{near} vs {mid}");
    }

    #[test]
    fn a_wall_shades_through_the_whole_depth() {
        let p = params(
            r#"{"world":{"width":30,"height":20,"depth":6,"walls":[{"x":10,"y":0,"width":3,"height":20,"shade":4}]},"c2":{"enabled":true,"model":"slab","K":8,"C":1,"kExt":0.5,"skyExponent":1,"minElevation":15,"rotate":false}}"#,
        );
        let mut light = make_light(&p);
        for wall in &p.world.walls {
            light.add_wall(wall);
        }
        light.compute(0.0);
        for z in [0.5, 3.0, 5.5] {
            let (q, v) = light.sample(14.5, 2.5, z);
            assert!(q < 0.9 && v[0] > 0.0, "z {z}: q {q}, v {v:?}"); // light comes from +x
        }
    }
}
