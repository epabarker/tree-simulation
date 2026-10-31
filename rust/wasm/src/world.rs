//! The whole Rust world for the page's worker, the Node tools and the tests (I1): params and
//! events as JSON, checkpoints as bytes, and the snapshot as one buffer in linear memory that the
//! caller copies out once (`snapshot_ptr`, `snapshot_len`; layout in tree-core's snapshot.rs).

use tree_core::checkpoint::{load_world, save_world};
use tree_core::form::form_metrics;
use tree_core::hash::hash_world;
use tree_core::json::{self, Value};
use tree_core::metrics::tree_metrics;
use tree_core::metrics::{ground_light, lai};
use tree_core::snapshot::SnapshotBuilder;
use tree_core::tree::{Col, NUMBERS};
use tree_core::world::World as Core;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct World {
    core: Core,
    snap: SnapshotBuilder,
    /// Bumped whenever the params may have changed (an event applied, a restore).
    params_version: u32,
}

#[wasm_bindgen]
extern "C" {
    /// The host's clock (browser or Node), for the timed step: std's Instant panics on wasm32.
    #[wasm_bindgen(js_namespace = performance)]
    fn now() -> f64;
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

    /// One season with each phase timed: [light, sample, allocate, grow, shed, girth,
    /// mechanics, commit, deaths] in ms (the measurement pages; `step` for everything else).
    pub fn step_timed(&mut self, discard: bool) -> Vec<f64> {
        use tree_core::season::{PHASES, Phase};
        let mut ms = vec![0.0; PHASES.len()];
        let mut last = now();
        self.core.step(&mut |phase: Phase| {
            let t = now();
            let k = PHASES.iter().position(|&p| p == phase).unwrap();
            ms[k] += t - last;
            last = t;
        });
        if discard {
            self.core.discard_dead();
        }
        ms
    }

    /// The light's leaf-area field this season (W × H × D floats, rows of W × D), and its top
    /// row: what a light lane in another worker needs (the measurement pages).
    pub fn light_lad(&self) -> Vec<f32> {
        match &self.core.light {
            tree_core::light::Light::Slab(s) => s.sweep.lad().to_vec(),
            _ => Vec::new(),
        }
    }

    pub fn remove_tree(&mut self, tree: f64) {
        self.core.remove_tree(tree);
    }

    /// Sows a tree at (x, z); z absent, the slab's middle.
    pub fn plant_tree(&mut self, x: f64, z: Option<f64>, species: Option<String>) {
        self.core.plant_tree(x, z, species.as_deref());
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

    /// Mean Q/C on the bottom row over columns [x0, x1], through the whole depth (metrics'
    /// groundLight).
    pub fn ground_light(&self, x0: f64, x1: f64) -> f64 {
        ground_light(&self.core, x0, x1, 0.0, self.core.light.depth())
    }

    /// Leaf area index over columns [x0, x1], through the whole depth (metrics' `lai`).
    pub fn lai(&self, x0: f64, x1: f64) -> f64 {
        lai(&self.core.light, x0, x1, 0.0, self.core.light.depth())
    }

    /// Q and V (x, y, z) of this season's light field at (x, y, z).
    pub fn sample(&self, x: f64, y: f64, z: f64) -> Vec<f64> {
        let (q, v) = self.core.light.sample(x, y, z);
        vec![q, v[0], v[1], v[2]]
    }

    // A tree's state, read-only, for the tools and the tests (src/wasm/world.ts's TreeView).

    /// [id, rootX, alive, discarded, sown, metamers, buds, …tree.rs NUMBERS, rootZ].
    pub fn tree_scalars(&self, i: usize) -> Vec<f64> {
        let t = &self.core.trees[i];
        let mut out = vec![
            t.id as f64,
            t.root_x,
            t.alive as u8 as f64,
            t.discarded as u8 as f64,
            t.sown as u8 as f64,
            t.m.len() as f64,
            t.b.len() as f64,
        ];
        out.extend(NUMBERS.iter().map(|&n| t.number(n)));
        out.push(t.root_z);
        out
    }

    /// Column `col` of table 0 (metamers) or 1 (buds) of tree `i`, its rows in use, as bytes.
    pub fn tree_column(&self, i: usize, table: u8, col: usize) -> Vec<u8> {
        let t = &self.core.trees[i];
        let cols: Vec<Col<'_>> = if table == 0 {
            t.m.columns()
        } else {
            t.b.columns()
        };
        cols[col].bytes()
    }

    /// Tree `i`'s crown form (form.rs): FORM_COLUMNS' eleven values, then the profile's bands.
    pub fn tree_form(&self, i: usize) -> Vec<f64> {
        let t = &self.core.trees[i];
        let f = form_metrics(t, self.core.params_of(t));
        let mut out = f.values.to_vec();
        out.extend(f.profile);
        out
    }

    /// R3's stress per metamer this season (σ/σ_target), for the tests.
    pub fn tree_stress(&self, i: usize) -> Vec<f64> {
        let t = &self.core.trees[i];
        t.stress.iter().take(t.m.len()).copied().collect()
    }
}
