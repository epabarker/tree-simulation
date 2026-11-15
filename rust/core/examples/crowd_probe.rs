//! What a crowd gate on the oak's fall of λ would read, season by season (ADR 0069, step 0).
//!
//! Replays a garden's params with `World::step`, as the CLI does, and after each season writes
//! one CSV row per planted tree of the named species: the age C3 read λ at, the tree's mean R5
//! neighbour shade s̄ (`tree.relay_crowd`, phase 2), R2's ontogenetic t and fall Δλ·t, the gate
//! g = max(0, 1 − k·s̄) and the gated fall, the height, the trunk's top (order 0), and the axis
//! that carries the highest tip (the birthId of its first metamer, and its order).
//!
//! Read-only: no rule changes. The core computes s̄ only where `r2.relayCrowd` or
//! `r2.dLambdaCrowd` is set, so the params must set one on the species. With `relayCrowd` and the
//! relay off nothing reads it (the run's hash is the unpatched run's, checked by the driver); with
//! `dLambdaCrowd` the rule under test is on, and the `gate` columns are what it applied.
//!
//!     cargo run --release --example crowd_probe -- params.json 150 26 oak 10 > probe.csv
//!
//! Args: the params (plain params JSON), seasons, the planted count (tree ids below it are
//! planted), the species, k.

use std::env;
use std::fs;

use tree_core::json;
use tree_core::stand::stem_height;
use tree_core::tree::{Tree, slot};
use tree_core::world::World;

fn main() {
    let args: Vec<String> = env::args().collect();
    let params = json::parse(&fs::read_to_string(&args[1]).expect("params")).expect("json");
    let seasons: usize = args[2].parse().expect("seasons");
    let planted: usize = args[3].parse().expect("planted");
    let species = args[4].as_str();
    let k: f64 = args[5].parse().expect("k");
    let mut world = World::new(params);
    println!(
        "season,tree,alive,age,metamers,crowd,t,fall,gate,gatedFall,height,trunkTop,leaderAxis,leaderOrder,meanBudQ,seeds"
    );
    let mut reported_dead = vec![false; planted];
    for _ in 0..seasons {
        let season = world.season;
        // The age C3 reads λ at this season: the commit phase adds the year afterwards.
        let ages: Vec<f64> = world.trees.iter().map(|t| t.age).collect();
        world.step(&mut |_| {});
        for (i, tree) in world.trees.iter().enumerate() {
            if tree.id >= planted || tree.species != species || i >= ages.len() {
                continue;
            }
            if !tree.alive {
                if !reported_dead[tree.id] {
                    reported_dead[tree.id] = true;
                    println!("{season},{},0,{},0,,,,,,,,,,,", tree.id, ages[i]);
                }
                continue;
            }
            let r2 = &world.params_of(tree).r2;
            let age = ages[i];
            let t = if age <= r2.a_c {
                0.0
            } else {
                ((age - r2.a_c) / r2.ramp.max(1.0)).min(1.0)
            };
            let fall = r2.d_lambda * t;
            let crowd = tree.relay_crowd;
            let gate = (1.0 - k * crowd).max(0.0);
            let (axis, order) = leader(tree);
            println!(
                "{season},{},1,{age},{},{crowd:.5},{t:.4},{fall:.5},{gate:.4},{:.5},{:.2},{:.2},{axis},{order},{:.4},{}",
                tree.id,
                tree.m.len(),
                fall * gate,
                stem_height(tree),
                trunk_top(tree),
                tree.mean_bud_q,
                tree.seeds,
            );
        }
    }
}

/// The highest tip among the trunk's own metamers (order 0).
fn trunk_top(tree: &Tree) -> f64 {
    let mut top = 0.0f64;
    for i in 0..tree.m.len() {
        if tree.m.order[i] == 0 {
            top = top.max(tree.tip_y(i));
        }
    }
    top
}

/// The axis carrying the tree's highest tip: the birthId of its first metamer, and its order.
fn leader(tree: &Tree) -> (i32, u8) {
    let c = &tree.m;
    let n = c.len();
    if n == 0 {
        return (-1, 0);
    }
    let mut best = 0;
    let mut height = f64::NEG_INFINITY;
    for i in 0..n {
        let y = tree.tip_y(i);
        if y > height {
            height = y;
            best = i;
        }
    }
    let mut k = best;
    while c.slot[k] == slot::MAIN && c.parent[k] >= 0 {
        k = c.parent[k] as usize;
    }
    (c.birth_id[k], c.order[best])
}
