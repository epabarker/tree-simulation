//! The 3D slab sweep (ADR 0024, G3), for the 3D experiments and tests/wasm-slab.test.ts.

use wasm_bindgen::prelude::*;

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
