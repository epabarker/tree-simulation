//! The wasm-bindgen wrapper around tree-core: nothing but the boundary. `World` is the whole
//! simulation for the page's worker and the Node tools (src/wasm/world.ts); `SlabSweep` the 3D
//! light (G3).

pub mod slab;
pub mod world;
