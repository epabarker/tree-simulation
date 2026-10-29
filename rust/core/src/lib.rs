//! The tree simulation's core in Rust (ADR 0024). I1: the whole 2D core, a port of `src/core/`
//! held to its goldens bit for bit in parity mode, and the 3D slab sweep (G3).

// The ports keep the TypeScript's shape so they stay bit-identical: index loops over several
// arrays at once, and comparisons written as `!(a > b)` where JavaScript's NaN rules need them.
#![allow(clippy::needless_range_loop, clippy::neg_cmp_op_on_partial_ord)]

pub mod checkpoint;
pub mod hash;
pub mod json;
pub mod light;
pub mod math;
pub mod params;
pub mod principles;
pub mod rng;
pub mod season;
pub mod tree;
pub mod world;
