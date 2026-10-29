//! The wasm-bindgen wrapper around tree-core: nothing but the boundary. `World` is the whole
//! simulation for the page's worker and the Node tools (src/wasm/world.ts); `SlabSweep` the 3D
//! light (G3). With the `testing` feature (the parity build only) it also carries I1's phase
//! bridge (src/wasm/hybrid.ts), G2's sky sweep and the core's Math, for the tests.

#[cfg(feature = "testing")]
pub mod bridge;
pub mod slab;
#[cfg(feature = "testing")]
pub mod testing;
pub mod world;
