//! Where an understorey sapling's carbon surplus goes, season by season (#138).
//!
//! Replays a garden's params with `World::step`, as the CLI does, and after each season from
//! `from` writes one CSV row per live tree between `lo` and `hi` cells tall: R1's production P,
//! maintenance M, reserve and its cap (r1.store·M), the surplus's shares (reserve s_r·N, v_base),
//! and what C3 made of v_base at the buds: the live buds, their v (sum, largest, the top bud's),
//! each bud's own growth threshold (R4), how many buds reached it, and the v left at buds below it,
//! which buys nothing and is not carried over. `grew` counts the metamers born this season.
//!
//! Read-only. Bud v is read after the season: a bud that grew has been replaced, so `sumV` is
//! short of v_base by what growing buds spent; for a tree that did not grow it is all of it.
//!
//!     cargo run --release --example sapling_probe -- params.json 200 60 4 40 > saplings.csv

use std::env;
use std::fs;

use tree_core::json;
use tree_core::principles::c3::is_live_bud;
use tree_core::principles::r4::growth_threshold;
use tree_core::stand::stem_height;
use tree_core::world::World;

fn main() {
    let args: Vec<String> = env::args().collect();
    let params = json::parse(&fs::read_to_string(&args[1]).expect("params")).expect("json");
    let seasons: usize = args[2].parse().expect("seasons");
    let from: f64 = args[3].parse().expect("from");
    let lo: f64 = args[4].parse().expect("lo");
    let hi: f64 = args[5].parse().expect("hi");
    let mut world = World::new(params);
    println!(
        "season,tree,species,age,height,metamers,liveBuds,dormant,P,M,reserve,reserveCap,toReserve,vBase,sumV,maxV,topV,topThreshold,minThreshold,reached,belowV,grew,meanBudQ,qTop"
    );
    for _ in 0..seasons {
        let season = world.season;
        world.step(&mut |_| {});
        if season < from {
            continue;
        }
        for tree in world.trees.iter().filter(|t| t.alive) {
            let height = stem_height(tree);
            if height < lo || height > hi {
                continue;
            }
            let params = world.params_of(tree);
            let (mut live, mut dormant, mut reached) = (0, 0, 0);
            let (mut sum_v, mut max_v, mut below_v) = (0.0f64, 0.0f64, 0.0f64);
            let (mut top_y, mut top_v, mut top_t) = (f64::NEG_INFINITY, 0.0, 0.0);
            let mut min_t = f64::INFINITY;
            for i in 0..tree.b.len() {
                let state = tree.b.state[i];
                if !is_live_bud(state) {
                    continue;
                }
                let m = tree.b.metamer[i] as usize;
                let shade = if params.r5.enabled && m < tree.node_shade.len() {
                    tree.node_shade[m]
                } else {
                    0.0
                };
                let t = growth_threshold(state, tree.b.age[i] as f64, shade, params);
                let v = tree.b.v[i];
                live += 1;
                if t > params.r4.v_cont {
                    dormant += 1;
                }
                sum_v += v;
                max_v = max_v.max(v);
                min_t = min_t.min(t);
                if v >= t {
                    reached += 1;
                } else {
                    below_v += v;
                }
                let y = tree.tip_y(m);
                if y > top_y {
                    top_y = y;
                    top_v = v;
                    top_t = t;
                }
            }
            let grew = (0..tree.m.len())
                .filter(|&k| tree.m.birth_season[k] as f64 == season)
                .count();
            let net = tree.production - tree.maintenance;
            println!(
                "{season},{},{},{},{height:.2},{},{live},{dormant},{:.4},{:.4},{:.4},{:.4},{:.4},{:.4},{sum_v:.4},{max_v:.4},{top_v:.4},{top_t:.3},{min_t:.3},{reached},{below_v:.4},{grew},{:.4},{:.4}",
                tree.id,
                tree.species,
                tree.age,
                tree.m.len(),
                tree.production,
                tree.maintenance,
                tree.reserve,
                params.r1.store * tree.maintenance,
                (params.r1.sr * net).max(0.0),
                tree.v_base,
                tree.mean_bud_q,
                tree.q_top,
            );
        }
    }
}
