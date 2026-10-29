//! The tree simulation's core in Rust (ADR 0024): the whole simulation (I1, ported from the
//! TypeScript core, which is archived at the tag `golden-2d-ts`) and the 3D slab sweep (G3).

// The port kept the TypeScript's shape: index loops over several arrays at once, and comparisons
// written as `!(a > b)` where JavaScript's NaN rules need them.
#![allow(clippy::needless_range_loop, clippy::neg_cmp_op_on_partial_ord)]

pub mod checkpoint;
pub mod form;
pub mod geom;
pub mod hash;
pub mod json;
pub mod light;
pub mod math;
pub mod metrics;
pub mod params;
pub mod principles;
pub mod rng;
pub mod season;
pub mod snapshot;
pub mod tree;
pub mod world;

/// Test helpers: presets and the default params from rust/presets.json (the TypeScript ones).
#[cfg(test)]
pub(crate) mod testing {
    use crate::json::{self, Value};

    fn presets() -> Value {
        json::parse(include_str!("../../presets.json")).unwrap()
    }

    /// A preset's (or fixture's) params JSON, with `patch` merged as mergeParams does.
    pub fn preset(name: &str, patch: &str) -> Value {
        let all = presets();
        let base = all
            .get("presets")
            .and_then(|t| t.get(name))
            .or_else(|| all.get("fixtures").and_then(|t| t.get(name)))
            .or_else(|| (name == "default").then(|| all.get("defaultParams").unwrap()))
            .unwrap_or_else(|| panic!("no preset {name}"))
            .clone();
        json::merge(&base, &json::parse(patch).unwrap())
    }

    /// A preset's typed params.
    pub fn params(name: &str) -> crate::params::Params {
        crate::params::Params::from_json(&preset(name, "{}"))
    }

    // Trees built by hand in the picture's plane (the 2D tests' shapes): headings at an angle in
    // the x–y plane, reference +z, laterals on the left (counter-clockwise, azimuth −π/2) and the
    // right (π/2).
    use crate::tree::Tree;

    pub const LEFT: u8 = 1;
    pub const RIGHT: u8 = 2;

    /// A planar frame: heading at `angle` in the x–y plane, reference +z.
    pub fn planar(angle: f64) -> ([f64; 3], [f64; 3]) {
        ([angle.cos(), angle.sin(), 0.0], [0.0, 0.0, 1.0])
    }

    fn side(slot: u8) -> f64 {
        match slot {
            LEFT => -std::f64::consts::FRAC_PI_2,
            RIGHT => std::f64::consts::FRAC_PI_2,
            _ => 0.0,
        }
    }

    /// `add_metamer` with a planar frame.
    pub fn metamer(
        t: &mut Tree,
        parent: i32,
        slot: u8,
        angle: f64,
        length: f64,
        radius: f64,
        season: f64,
    ) -> usize {
        let (h, l) = planar(angle);
        crate::principles::c1::add_metamer(
            t,
            parent,
            slot,
            h,
            l,
            side(slot),
            length,
            radius,
            season,
        )
    }

    /// `add_bud` with a planar frame.
    pub fn bud(t: &mut Tree, m: usize, slot: u8, angle: f64, order: f64) -> usize {
        let (h, l) = planar(angle);
        crate::principles::c1::add_bud(t, m, slot, h, l, side(slot), order)
    }

    /// Metamer `i`'s heading as a planar angle.
    pub fn angle(t: &Tree, i: usize) -> f64 {
        t.m.hy[i].atan2(t.m.hx[i])
    }

    /// Bud `j`'s heading as a planar angle.
    pub fn bud_angle(t: &Tree, j: usize) -> f64 {
        t.b.hy[j].atan2(t.b.hx[j])
    }
}
