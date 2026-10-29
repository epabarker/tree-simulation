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
