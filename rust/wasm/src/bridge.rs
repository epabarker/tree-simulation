//! I1's bridge (ADR 0024): one season phase at a time in Rust, the rest in the TypeScript core.
//! The TypeScript side (`src/wasm/hybrid.ts`) copies a tree's whole state (tables, scalars and
//! per-season scratch) into this world before a Rust phase and back after it, and samples and
//! deposits into this world's light model, which stands in for the TypeScript one. It is test
//! scaffolding for porting the core phase by phase; the page and the CLI use `World` instead.

use tree_core::json;
use tree_core::light::make_light;
use tree_core::season;
use tree_core::tree::{ColMut, NUMBERS, Tree};
use tree_core::world::{Rules, World};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Bridge {
    world: Option<World>,
    out: [f64; 3],
}

impl Bridge {
    fn w(&mut self) -> &mut World {
        self.world.as_mut().expect("Bridge: set_params first")
    }

    fn r(&self) -> &World {
        self.world.as_ref().expect("Bridge: set_params first")
    }
}

fn col_mut(tree: &mut Tree, table: u8, col: usize) -> ColMut<'_> {
    let mut cols = if table == 0 {
        tree.m.columns_mut()
    } else {
        tree.b.columns_mut()
    };
    cols.swap_remove(col)
}

#[wasm_bindgen]
impl Bridge {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::new_without_default)]
    pub fn new() -> Bridge {
        Bridge {
            world: None,
            out: [0.0; 3],
        }
    }

    /// The params changed (a world made, a params event, a checkpoint): rules and the light
    /// model are rebuilt, as world.ts rebuilds its light model.
    pub fn set_params(&mut self, params: &str) -> Result<(), JsError> {
        let v = json::parse(params).map_err(|e| JsError::new(&e.to_string()))?;
        match &mut self.world {
            None => self.world = Some(World::new(v)),
            Some(w) => {
                w.rules = Rules::new(&v);
                w.light = make_light(&w.rules.params);
                w.params_json = v;
            }
        }
        Ok(())
    }

    pub fn set_world(&mut self, season: f64, storm: bool, owners_tagged: bool, recruits: f64) {
        let w = self.w();
        w.season = season;
        w.storm = storm;
        w.owners_tagged = owners_tagged;
        w.recruits = recruits;
    }

    pub fn storm(&self) -> bool {
        self.r().storm
    }

    pub fn owners_tagged(&self) -> bool {
        self.r().owners_tagged
    }

    pub fn recruits(&self) -> f64 {
        self.r().recruits
    }

    pub fn set_owner(&mut self, owner: &[i32]) {
        let w = self.w();
        w.owner.clear();
        w.owner.extend_from_slice(owner);
    }

    pub fn owner(&self) -> Vec<i32> {
        self.r().owner.clone()
    }

    pub fn set_tree_count(&mut self, n: usize) {
        let trees = &mut self.w().trees;
        trees.truncate(n);
        while trees.len() < n {
            let id = trees.len();
            trees.push(Tree::new(id, 0.0));
        }
    }

    pub fn tree_count(&self) -> usize {
        self.r().trees.len()
    }

    /// A tree's identity, scalars ([alive, discarded, sown, …tree.rs NUMBERS]) and table lengths;
    /// its columns follow by `set_col_*`, its scratch by `set_scratch`.
    #[allow(clippy::too_many_arguments)]
    pub fn set_tree(
        &mut self,
        i: usize,
        id: usize,
        root_x: f64,
        species: &str,
        scalars: &[f64],
        metamers: usize,
        buds: usize,
    ) {
        let t = &mut self.w().trees[i];
        t.id = id;
        t.root_x = root_x;
        t.species = species.to_string();
        t.alive = scalars[0] != 0.0;
        t.discarded = scalars[1] != 0.0;
        t.sown = scalars[2] != 0.0;
        for (k, &name) in NUMBERS.iter().enumerate() {
            t.set_number(name, scalars[3 + k]);
        }
        t.m.set_len(metamers);
        t.b.set_len(buds);
    }

    pub fn tree_scalars(&self, i: usize) -> Vec<f64> {
        let t = &self.r().trees[i];
        let mut out = vec![
            t.alive as u8 as f64,
            t.discarded as u8 as f64,
            t.sown as u8 as f64,
        ];
        out.extend(NUMBERS.iter().map(|&n| t.number(n)));
        out
    }

    pub fn tree_species(&self, i: usize) -> String {
        self.r().trees[i].species.clone()
    }

    pub fn tree_root_x(&self, i: usize) -> f64 {
        self.r().trees[i].root_x
    }

    pub fn tree_id(&self, i: usize) -> usize {
        self.r().trees[i].id
    }

    /// [metamers, buds].
    pub fn tree_lens(&self, i: usize) -> Vec<u32> {
        let t = &self.r().trees[i];
        vec![t.m.len() as u32, t.b.len() as u32]
    }

    pub fn set_col_f64(&mut self, i: usize, table: u8, col: usize, data: &[f64]) {
        if let ColMut::F64(v) = col_mut(&mut self.w().trees[i], table, col) {
            v.copy_from_slice(data);
        }
    }

    pub fn set_col_i32(&mut self, i: usize, table: u8, col: usize, data: &[i32]) {
        if let ColMut::I32(v) = col_mut(&mut self.w().trees[i], table, col) {
            v.copy_from_slice(data);
        }
    }

    pub fn set_col_u8(&mut self, i: usize, table: u8, col: usize, data: &[u8]) {
        if let ColMut::U8(v) = col_mut(&mut self.w().trees[i], table, col) {
            v.copy_from_slice(data);
        }
    }

    pub fn col_f64(&mut self, i: usize, table: u8, col: usize) -> Vec<f64> {
        match col_mut(&mut self.w().trees[i], table, col) {
            ColMut::F64(v) => v.clone(),
            _ => Vec::new(),
        }
    }

    pub fn col_i32(&mut self, i: usize, table: u8, col: usize) -> Vec<i32> {
        match col_mut(&mut self.w().trees[i], table, col) {
            ColMut::I32(v) => v.clone(),
            _ => Vec::new(),
        }
    }

    pub fn col_u8(&mut self, i: usize, table: u8, col: usize) -> Vec<u8> {
        match col_mut(&mut self.w().trees[i], table, col) {
            ColMut::U8(v) => v.clone(),
            _ => Vec::new(),
        }
    }

    /// Scratch array `k` of tree.rs `scratch_mut` (qSlot, vSlot, scratchF, pSum, mSum, pathLen,
    /// prevRadius, loadW, loadS, stress, nodeShade).
    pub fn set_scratch(&mut self, i: usize, k: usize, data: &[f64]) {
        let mut arrays = self.w().trees[i].scratch_mut();
        let v = &mut arrays[k].1;
        v.clear();
        v.extend_from_slice(data);
    }

    pub fn scratch(&mut self, i: usize, k: usize) -> Vec<f64> {
        let arrays = self.w().trees[i].scratch_mut();
        arrays[k].1.clone()
    }

    pub fn phase_light(&mut self) -> Vec<u32> {
        season::phase_light(self.w())
            .into_iter()
            .map(|i| i as u32)
            .collect()
    }

    pub fn phase_sample(&mut self, i: usize) {
        season::phase_sample(self.w(), i);
    }

    pub fn phase_allocate(&mut self, i: usize) {
        season::phase_allocate(self.w(), i);
    }

    pub fn phase_grow(&mut self, i: usize) {
        season::phase_grow(self.w(), i);
    }

    pub fn phase_shed(&mut self, i: usize, evaluated: usize) {
        self.w().trees[i].evaluated = evaluated;
        season::phase_shed(self.w(), i);
    }

    pub fn phase_girth(&mut self, i: usize) {
        season::phase_girth(self.w(), i);
    }

    pub fn phase_mechanics(&mut self, i: usize) {
        season::phase_mechanics(self.w(), i);
    }

    pub fn phase_commit(&mut self, i: usize) {
        season::phase_commit(self.w(), i);
    }

    pub fn phase_deaths(&mut self, live: &[u32]) {
        let live: Vec<usize> = live.iter().map(|&i| i as usize).collect();
        season::phase_deaths(self.w(), &live);
    }

    pub fn light_clear(&mut self) {
        self.w().light.clear();
    }

    pub fn light_deposit(&mut self, x: f64, y: f64, area: f64) {
        self.w().light.deposit(x, y, area);
    }

    pub fn light_add_wall(&mut self, x: f64, y: f64, width: f64, height: f64, shade: f64) {
        let wall = tree_core::params::Rect {
            x,
            y,
            width,
            height,
            shade,
        };
        self.w().light.add_wall(&wall);
    }

    pub fn light_compute(&mut self, season: f64) {
        self.w().light.compute(season);
    }

    /// Writes Q, V_x, V_y at (x, y) into the buffer at `out_ptr`.
    pub fn light_sample(&mut self, x: f64, y: f64, dir: f64) {
        let (q, vx, vy) = self.r().light.sample(x, y, dir);
        self.out = [q, vx, vy];
    }

    pub fn out_ptr(&self) -> *const f64 {
        self.out.as_ptr()
    }

    /// The light model's overlay field, or an empty array when it has none.
    pub fn light_field(&mut self) -> Vec<f64> {
        self.w()
            .light
            .field()
            .map(<[f64]>::to_vec)
            .unwrap_or_default()
    }

    pub fn light_has_field(&mut self) -> bool {
        self.w().light.field().is_some()
    }

    pub fn light_width(&self) -> f64 {
        self.r().light.width()
    }

    pub fn light_height(&self) -> f64 {
        self.r().light.height()
    }
}
