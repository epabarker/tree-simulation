//! The whole Rust world for the page's worker, the Node tools and the tests (I1): params and
//! events as JSON, checkpoints as bytes, and the snapshot as one buffer in linear memory that the
//! caller copies out once (`snapshot_ptr`, `snapshot_len`; layout in tree-core's snapshot.rs).

use tree_core::checkpoint::{load_world, save_world};
use tree_core::hash::hash_world;
use tree_core::json::{self, Value};
use tree_core::metrics::tree_metrics;
use tree_core::snapshot::SnapshotBuilder;
use tree_core::world::World as Core;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct World {
    core: Core,
    snap: SnapshotBuilder,
    /// Bumped whenever the params may have changed (an event applied, a restore).
    params_version: u32,
}

fn parse(text: &str) -> Result<Value, JsError> {
    json::parse(text).map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
impl World {
    #[wasm_bindgen(constructor)]
    pub fn new(params: &str) -> Result<World, JsError> {
        Ok(World {
            core: Core::new(parse(params)?),
            snap: SnapshotBuilder::default(),
            params_version: 0,
        })
    }

    /// A world from checkpoint bytes (the TypeScript core's layout).
    pub fn load(bytes: &[u8]) -> Result<World, JsError> {
        let core = load_world(bytes).map_err(|e| JsError::new(&e.to_string()))?;
        Ok(World {
            core,
            snap: SnapshotBuilder::default(),
            params_version: 0,
        })
    }

    pub fn save(&self) -> Vec<u8> {
        save_world(&self.core)
    }

    /// Runs `seasons` seasons; with `discard`, frees dead trees after each (the page's worker).
    pub fn step(&mut self, seasons: usize, discard: bool) {
        for _ in 0..seasons {
            if !self.core.pending.is_empty() {
                self.params_version += 1;
            }
            self.core.step(&mut |_| {});
            if discard {
                self.core.discard_dead();
            }
        }
    }

    /// Runs `seasons` seasons applying recorded events (JSON array) at their seasons.
    pub fn run(&mut self, seasons: usize, events: &str) -> Result<(), JsError> {
        let events = parse(events)?;
        let list = events.as_array().unwrap_or(&[]).to_vec();
        self.core.run(seasons, &list);
        self.params_version += 1;
        Ok(())
    }

    pub fn hash(&self) -> String {
        hash_world(&self.core)
    }

    pub fn season(&self) -> f64 {
        self.core.season
    }

    pub fn params_version(&self) -> u32 {
        self.params_version
    }

    /// The world's current params, as JSON.
    pub fn params(&self) -> String {
        json::stringify(&self.core.params_json, false)
    }

    pub fn set_params(&mut self, patch: &str) -> Result<(), JsError> {
        let p = parse(patch)?;
        self.core.set_params(&p);
        Ok(())
    }

    pub fn remove_tree(&mut self, tree: f64) {
        self.core.remove_tree(tree);
    }

    pub fn plant_tree(&mut self, x: f64, species: Option<String>) {
        self.core.plant_tree(x, species.as_deref());
    }

    /// The run record (initial params, applied events, seasons), as JSON.
    pub fn record(&self) -> String {
        json::stringify(&self.core.record(), false)
    }

    pub fn discard_dead(&mut self) -> usize {
        self.core.discard_dead()
    }

    pub fn tree_count(&self) -> usize {
        self.core.trees.len()
    }

    /// Every tree's metrics (dead ones too), METRIC_NUMBERS per tree, for the Node tools.
    pub fn metrics(&self) -> Vec<f64> {
        let mut out = Vec::new();
        for t in &self.core.trees {
            out.extend(tree_metrics(t, Some(&self.core)).values);
        }
        out
    }

    pub fn species_of(&self, tree: usize) -> String {
        self.core.trees[tree].species.clone()
    }

    pub fn reset_snapshots(&mut self) {
        self.snap.reset();
    }

    /// Builds the season's snapshot into the buffer at `snapshot_ptr`.
    pub fn snapshot(&mut self, junctions: bool, field: bool) {
        self.snap.build(&mut self.core, junctions, field);
    }

    pub fn snapshot_ptr(&self) -> *const u8 {
        self.snap.bytes.as_ptr()
    }

    pub fn snapshot_len(&self) -> usize {
        self.snap.bytes.len()
    }

    /// [trees, metamers, buds, junctions, shadow cells] of the last snapshot.
    pub fn snapshot_counts(&self) -> Vec<u32> {
        let s = &self.snap;
        [s.trees, s.metamers, s.buds, s.junctions, s.shadow]
            .iter()
            .map(|&n| n as u32)
            .collect()
    }

    /// The live trees' species, in the snapshot's metrics order.
    pub fn snapshot_species(&self) -> Vec<String> {
        self.snap.species.clone()
    }

    pub fn storm(&self) -> bool {
        self.core.storm
    }
}
