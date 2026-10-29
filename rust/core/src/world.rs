//! The simulated world (spec §5 "Global state"; world.ts): params, trees, the shared light
//! model, the season counter and the event log, so any session replays exactly.
//!
//! Params live as JSON (`params_json`, merged exactly as the TypeScript merges them) and as the
//! typed `Rules` the passes read: the world's params and each species' merged over them.

use crate::json::{self, Value};
use crate::light::{Light, make_light};
use crate::params::{Params, species_params};
use crate::principles::c1::plant_seedling;
use crate::tree::Tree;

/// The typed params a season reads: the world's, and each species' (ADR 0016).
pub struct Rules {
    pub params: Params,
    species: Vec<(String, Params)>,
}

impl Rules {
    pub fn new(json: &Value) -> Rules {
        let params = Params::from_json(json);
        let species = params
            .species
            .iter()
            .flatten()
            .map(|name| (name.clone(), Params::from_json(&species_params(json, name))))
            .collect();
        Rules { params, species }
    }

    /// The params a tree of `species` grows by: the world's for "" or an unknown species.
    pub fn of(&self, species: &str) -> &Params {
        if species.is_empty() {
            return &self.params;
        }
        self.species
            .iter()
            .find(|(n, _)| n == species)
            .map_or(&self.params, |(_, p)| p)
    }
}

pub struct World {
    pub initial_params: Value,
    pub params_json: Value,
    pub rules: Rules,
    pub season: f64,
    /// Planted trees in params order, then O4 recruits and sown trees in order of arrival.
    pub trees: Vec<Tree>,
    pub recruits: f64,
    pub storm: bool,
    /// O2: which tree's foliage holds each cell this season (−1 none, −2 several).
    pub owner: Vec<i32>,
    pub owners_tagged: bool,
    pub light: Light,
    /// Events applied so far, as JSON ({season, type, …}).
    pub log: Vec<Value>,
    pub pending: Vec<Value>,
}

/// The owner grid (O2, R5): one cell per light cell, W × H × D.
fn grid(params: &Params) -> Vec<i32> {
    let d = crate::light::depth_of(params);
    vec![0; (params.world.width * params.world.height * d) as usize]
}

fn event(season: f64, kind: &str) -> Value {
    Value::Obj(vec![
        ("season".into(), Value::Num(season)),
        ("type".into(), Value::Str(kind.into())),
    ])
}

impl World {
    pub fn new(params: Value) -> World {
        let rules = Rules::new(&params);
        let trees = rules
            .params
            .trees
            .iter()
            .enumerate()
            .map(|(id, spec)| {
                let mut t = Tree::new(id, spec.x, spec.z);
                t.species = spec.species.clone();
                t.alive = false; // planted when its season comes
                t
            })
            .collect();
        let mut world = World {
            initial_params: params.clone(),
            light: make_light(&rules.params),
            owner: grid(&rules.params),
            params_json: params,
            rules,
            season: 0.0,
            trees,
            recruits: 0.0,
            storm: false,
            owners_tagged: false,
            log: Vec::new(),
            pending: Vec::new(),
        };
        world.plant_due();
        world
    }

    pub fn params(&self) -> &Params {
        &self.rules.params
    }

    pub fn params_of(&self, tree: &Tree) -> &Params {
        self.rules.of(&tree.species)
    }

    /// Queues a params patch for the next season boundary (`trees` cannot change mid-run).
    pub fn set_params(&mut self, patch: &Value) {
        let mut rest = patch.clone();
        rest.remove("trees");
        let mut e = event(self.season, "params");
        e.set("patch", rest);
        self.pending.push(e);
    }

    pub fn remove_tree(&mut self, tree: f64) {
        let mut e = event(self.season, "removeTree");
        e.set("tree", Value::Num(tree));
        self.pending.push(e);
    }

    /// Queues a sown tree at (x, z); z absent, the slab's middle.
    pub fn plant_tree(&mut self, x: f64, z: Option<f64>, species: Option<&str>) {
        let mut e = event(self.season, "plantTree");
        e.set("x", Value::Num(x));
        if let Some(z) = z {
            e.set("z", Value::Num(z));
        }
        if let Some(s) = species.filter(|s| !s.is_empty()) {
            e.set("species", Value::Str(s.into()));
        }
        self.pending.push(e);
    }

    /// Applies queued events, plants due seedlings and runs one season.
    pub fn step(&mut self, mark: &mut dyn FnMut(crate::season::Phase)) {
        for mut e in std::mem::take(&mut self.pending) {
            e.set("season", Value::Num(self.season));
            self.apply(e);
        }
        self.plant_due();
        crate::season::run_season(self, mark);
        self.season += 1.0;
    }

    /// Runs `seasons` seasons, applying recorded events at their seasons (CLI replay).
    pub fn run(&mut self, seasons: usize, events: &[Value]) {
        let mut queue: Vec<&Value> = events.iter().collect();
        let at = |e: &Value| e.get("season").and_then(Value::as_f64).unwrap_or(0.0);
        queue.sort_by(|a, b| at(a).total_cmp(&at(b))); // stable, as Array.prototype.sort
        let mut next = 0;
        for _ in 0..seasons {
            while next < queue.len() && at(queue[next]) <= self.season {
                self.apply(queue[next].clone());
                next += 1;
            }
            self.step(&mut |_| {});
        }
    }

    /// Frees dead trees' tables (a page running for hours). Returns how many.
    pub fn discard_dead(&mut self) -> usize {
        let mut n = 0;
        for t in &mut self.trees {
            if t.alive || t.discarded || t.m.is_empty() {
                continue;
            }
            t.discard();
            n += 1;
        }
        n
    }

    /// `record()`: the initial params, every applied event and the season count.
    pub fn record(&self) -> Value {
        Value::Obj(vec![
            ("params".into(), self.initial_params.clone()),
            ("events".into(), Value::Arr(self.log.clone())),
            ("seasons".into(), Value::Num(self.season)),
        ])
    }

    /// Takes over a saved state (checkpoint): the light model and species params are rebuilt.
    pub fn restore(&mut self, params: Value, season: f64, recruits: f64, storm: bool) {
        self.rules = Rules::new(&params);
        self.params_json = params;
        self.season = season;
        self.recruits = recruits;
        self.storm = storm;
        self.light = make_light(&self.rules.params);
        self.owner = grid(&self.rules.params);
    }

    fn apply(&mut self, e: Value) {
        let kind = e
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        self.log.push(e.clone());
        match kind.as_str() {
            "params" => {
                let patch = e.get("patch").cloned().unwrap_or(Value::obj());
                self.params_json = json::merge(&self.params_json, &patch);
                self.rules = Rules::new(&self.params_json);
                self.light = make_light(&self.rules.params);
            }
            "plantTree" => {
                let p = &self.rules.params;
                let (w, d) = (p.world.width, crate::light::depth_of(p));
                let x0 = e.get("x").and_then(Value::as_f64).unwrap_or(f64::NAN);
                let z = e.get("z").and_then(Value::as_f64).unwrap_or(d / 2.0);
                let x = if p.world.periodic {
                    ((x0 % w) + w) % w
                } else {
                    x0
                };
                if x < 0.0 || x >= w || !(z >= 0.0 && z < d) {
                    return;
                }
                let gap = |t: &Tree| crate::math::hypot(t.root_x - x, t.root_z - z);
                if self.trees.iter().any(|t| t.alive && gap(t) < 1.0) {
                    return;
                }
                let mut tree = Tree::new(self.trees.len(), x, z);
                tree.sown = true;
                let mut nearest: Option<&Tree> = None;
                for t in &self.trees {
                    if t.alive && nearest.is_none_or(|n| gap(t) < gap(n)) {
                        nearest = Some(t);
                    }
                }
                tree.species = match e.get("species").and_then(Value::as_str) {
                    Some(s) => s.to_string(),
                    None => nearest.map(|n| n.species.clone()).unwrap_or_default(),
                };
                let season = self.season;
                let params = self.rules.of(&tree.species).clone();
                plant_seedling(&mut tree, &params, season, 0.0);
                self.trees.push(tree);
            }
            _ => {
                let id = e.get("tree").and_then(Value::as_f64).unwrap_or(f64::NAN);
                if id >= 0.0
                    && id.fract() == 0.0
                    && let Some(t) = self.trees.get_mut(id as usize)
                {
                    t.alive = false;
                }
            }
        }
    }

    fn plant_due(&mut self) {
        let season = self.season;
        for id in 0..self.rules.params.trees.len() {
            let removed = self.log.iter().any(|e| {
                e.get("type").and_then(Value::as_str) == Some("removeTree")
                    && e.get("tree").and_then(Value::as_f64) == Some(id as f64)
            });
            let spec = &self.rules.params.trees[id];
            let Some(tree) = self.trees.get(id) else {
                continue;
            };
            let unplanted = tree.m.is_empty() && !tree.discarded;
            if unplanted && spec.plant_season <= season && !removed {
                let lean = spec.lean;
                let params = self.rules.of(&tree.species).clone();
                let tree = &mut self.trees[id];
                tree.alive = true;
                plant_seedling(tree, &params, season, lean);
            }
        }
    }
}
