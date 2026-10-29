//! The tree simulation's core in Rust (ADR 0024): the whole simulation (I1, ported from the
//! TypeScript core, which is archived at the tag `golden-2d-ts`) and the 3D slab sweep (G3).

// The port kept the TypeScript's shape: index loops over several arrays at once, and comparisons
// written as `!(a > b)` where JavaScript's NaN rules need them.
#![allow(clippy::needless_range_loop, clippy::neg_cmp_op_on_partial_ord)]

pub mod checkpoint;
pub mod form;
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
}
