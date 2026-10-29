//! The wasm-bindgen wrapper around tree-core: nothing but the boundary. The TypeScript side
//! (`src/wasm/`) implements `LightModel` on top of these exports.

use tree_core::light::sky_sweep::{SkyParams, SkySweep as Core};
use tree_core::math;
use wasm_bindgen::prelude::*;

/// The sky sweep (C2), one per world.
#[wasm_bindgen]
pub struct SkySweep {
    core: Core,
    /// The last `sample`: Q, V_x, V_y, read by the caller through `sample_ptr`.
    out: [f64; 3],
}

#[wasm_bindgen]
impl SkySweep {
    #[allow(clippy::too_many_arguments)]
    #[wasm_bindgen(constructor)]
    pub fn new(
        width: usize,
        height: usize,
        k: f64,
        k_ext: f64,
        sky_exponent: f64,
        sky_tilt: f64,
        min_elevation: f64,
        c: f64,
        rotate: bool,
        columns: bool,
        periodic: bool,
    ) -> SkySweep {
        let p = SkyParams {
            k,
            k_ext,
            sky_exponent,
            sky_tilt,
            min_elevation,
            c,
            rotate,
            columns,
        };
        SkySweep {
            core: Core::new(width, height, p, periodic),
            out: [0.0; 3],
        }
    }

    pub fn clear(&mut self) {
        self.core.clear();
    }

    pub fn deposit(&mut self, x: f64, y: f64, area: f64) {
        self.core.deposit(x, y, area);
    }

    pub fn add_wall(&mut self, x: f64, y: f64, width: f64, height: f64, shade: f64) {
        self.core.add_wall(x, y, width, height, shade);
    }

    pub fn compute(&mut self, season: f64) {
        self.core.compute(season);
    }

    /// Writes Q, V_x, V_y into the buffer at `sample_ptr`.
    pub fn sample(&mut self, x: f64, y: f64, dir: f64) {
        let (q, vx, vy) = self.core.sample(x, y, dir);
        self.out = [q, vx, vy];
    }

    pub fn sample_ptr(&self) -> *const f64 {
        self.out.as_ptr()
    }

    /// The overlay's shade field (W × H doubles), refreshed by this call.
    pub fn field_ptr(&mut self) -> *const f64 {
        self.core.field().as_ptr()
    }

    pub fn lad_ptr(&self) -> *const f64 {
        self.core.lad().as_ptr()
    }

    pub fn q_ptr(&self) -> *const f64 {
        self.core.q().as_ptr()
    }

    pub fn vx_ptr(&self) -> *const f64 {
        self.core.vx().as_ptr()
    }

    pub fn vy_ptr(&self) -> *const f64 {
        self.core.vy().as_ptr()
    }
}

/// The core's `Math`, exported so the tests can hold it to V8's bit for bit.
#[wasm_bindgen]
pub fn math_sin(x: f64) -> f64 {
    math::sin(x)
}

#[wasm_bindgen]
pub fn math_cos(x: f64) -> f64 {
    math::cos(x)
}

#[wasm_bindgen]
pub fn math_exp(x: f64) -> f64 {
    math::exp(x)
}

#[wasm_bindgen]
pub fn math_pow(x: f64, y: f64) -> f64 {
    math::pow(x, y)
}

#[wasm_bindgen]
pub fn math_hypot(x: f64, y: f64) -> f64 {
    math::hypot(x, y)
}

/// The 3D slab sweep (ADR 0024, G3): Float32, the production build's light.
#[wasm_bindgen]
pub struct SlabSweep {
    core: tree_core::light::slab_sweep::SlabSweep,
    out: [f32; 4],
}

#[wasm_bindgen]
impl SlabSweep {
    #[allow(clippy::too_many_arguments)]
    #[wasm_bindgen(constructor)]
    pub fn new(
        width: usize,
        height: usize,
        depth: usize,
        k: usize,
        k_ext: f64,
        sky_exponent: f64,
        min_elevation: f64,
        c: f64,
        rotate: bool,
        tau_front: f64,
        tau_back: f64,
        periodic_x: bool,
    ) -> SlabSweep {
        let p = tree_core::light::slab_sweep::SlabParams {
            k,
            k_ext,
            sky_exponent,
            min_elevation,
            c,
            rotate,
            face_tau: [tau_front, tau_back],
            periodic_x,
        };
        SlabSweep {
            core: tree_core::light::slab_sweep::SlabSweep::new(width, height, depth, p),
            out: [0.0; 4],
        }
    }

    pub fn clear(&mut self) {
        self.core.clear();
    }

    pub fn deposit(&mut self, x: f64, y: f64, z: f64, area: f32) {
        self.core.deposit(x, y, z, area);
    }

    /// The leaf-area field (W × H × D floats, rows of W × D): fill it, then `refresh_top`.
    pub fn lad_ptr(&mut self) -> *mut f32 {
        self.core.lad_mut().as_mut_ptr()
    }

    pub fn refresh_top(&mut self) {
        self.core.refresh_top();
    }

    pub fn top(&self) -> usize {
        self.core.top()
    }

    pub fn compute(&mut self, season: f64) {
        self.core.compute(season);
    }

    /// One lane's share (directions k ≡ lane mod lanes) into this sweep's own fields.
    pub fn compute_part(&mut self, season: f64, lane: usize, lanes: usize) {
        self.core.compute_part(season, lane, lanes);
    }

    pub fn q_ptr(&self) -> *const f32 {
        self.core.q().as_ptr()
    }

    /// Writes Q, V_x, V_y, V_z at (x, y, z) into the buffer at `sample_ptr`.
    pub fn sample(&mut self, x: f64, y: f64, z: f64) {
        self.out = self.core.sample(x, y, z);
    }

    pub fn sample_ptr(&self) -> *const f32 {
        self.out.as_ptr()
    }

    pub fn fingerprint(&self) -> u32 {
        self.core.fingerprint()
    }
}

/// The slab's same-bits fixture (tests/wasm-slab.test.ts).
#[wasm_bindgen]
pub fn slab_fixture_fingerprint() -> u32 {
    tree_core::light::slab_sweep::fixture_fingerprint()
}

/// Whether this build may use WASM SIMD (LLVM vectorises the slab's loops with it).
#[wasm_bindgen]
pub fn slab_has_simd() -> bool {
    cfg!(target_feature = "simd128")
}
