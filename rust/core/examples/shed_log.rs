//! Every branch R1/C5 sheds, decomposed at the season it is shed (species round 5, the cap).
//!
//! Replays a run's params (a treesim run.json) phase by phase, as `season::run_season` does, and
//! after each tree's allocation (this season's light, P_b and M_b; `r1::carbon_balance`) applies
//! `c5::shed_branches`'s test to find the laterals it will shed. For each shed branch (a lateral
//! that qualifies and whose parent does not), one CSV row: P_b, M_b's sapwood part (M_b minus the
//! foliage part), its foliage part (m_f·Σ a·g(Q), `r1::leaf_cost`), the leaf area a_b and mean light of its live buds, C5's light per
//! metamer (Q_b/n_b), the path length to its base and its size. After the shed phase each logged
//! branch is checked gone. One lone tree: no seedlings are due after season 0.
//!
//!     cargo run --release --example shed_log -- runs/cap/lone-base/run.json 100 > shed.csv

use std::env;
use std::fs;

use tree_core::json;
use tree_core::principles::c3::is_live_bud;
use tree_core::principles::r1::leaf_cost;
use tree_core::principles::r6::deposit_area;
use tree_core::season::{
    live_trees, phase_allocate, phase_commit, phase_deaths, phase_girth, phase_grow, phase_light,
    phase_mechanics, phase_sample, phase_shed,
};
use tree_core::tree::slot;
use tree_core::world::World;

fn main() {
    let args: Vec<String> = env::args().collect();
    let run = json::parse(&fs::read_to_string(&args[1]).expect("run.json")).expect("json");
    let seasons: usize = args.get(2).map_or(100, |s| s.parse().expect("seasons"));
    let mut world = World::new(run.get("params").expect("params").clone());
    println!(
        "season,tree,birthId,order,metamers,pB,mSap,mLeaf,leafArea,budQ,lightPerMetamer,qTopThreshold,pathLen,why"
    );
    for _ in 0..seasons {
        let live = phase_light(&mut world);
        debug_assert_eq!(live, live_trees(&world));
        for &i in &live {
            phase_sample(&mut world, i);
            phase_allocate(&mut world, i);
            let logged = log_sheds(&world, i);
            phase_grow(&mut world, i);
            phase_shed(&mut world, i);
            let ids = &world.trees[i].m.birth_id;
            for id in &logged {
                assert!(!ids.contains(id), "branch {id} was logged but not shed");
            }
            phase_girth(&mut world, i);
            phase_mechanics(&mut world, i);
            phase_commit(&mut world, i);
        }
        phase_deaths(&mut world, &live);
        world.season += 1.0;
    }
}

/// The branches `shed_branches` will remove this season, as rows; returns their birthIds.
fn log_sheds(world: &World, i: usize) -> Vec<i32> {
    let tree = &world.trees[i];
    let params = world.params_of(tree);
    let carbon = params.r1.enabled && params.r1.shed_carbon;
    if !(params.c5.enabled || carbon) {
        return Vec::new();
    }
    let c = &tree.m;
    let nm = c.len();
    let t = params.c5.t.max(params.c5.t_rel * tree.q_top);
    let mut root = vec![-1i64; nm];
    let mut why = vec![""; nm];
    for k in 0..nm {
        let p = c.parent[k];
        let inherited = if p >= 0 { root[p as usize] } else { -1 };
        if inherited >= 0 {
            root[k] = inherited;
            continue;
        }
        if c.slot[k] == slot::MAIN
            || p < 0
            || world.season - (c.birth_season[k] as f64) < params.c5.g
        {
            continue;
        }
        let n_b = c.n_sum[k] as f64;
        let light = if n_b > 0.0 { c.q_sum[k] / n_b } else { 0.0 };
        let (low_p, low_q) = if carbon {
            // shed_branches counts this season's deficit before it tests (r1.kShed).
            let run = if tree.p_sum[k] < tree.m_sum[k] {
                tree.deficit.get(k).copied().unwrap_or(0.0) + 1.0
            } else {
                0.0
            };
            (
                run >= params.r1.k_shed,
                light < params.c5.t_rel * tree.q_top,
            )
        } else {
            (false, n_b > 0.0 && light < t)
        };
        if low_p || low_q {
            root[k] = k as i64;
            why[k] = match (low_p, low_q) {
                (true, true) => "both",
                (true, false) => "P<M",
                _ => "light",
            };
        }
    }
    let (mut leaf, mut q, mut buds, mut size) = (
        vec![0.0; nm],
        vec![0.0; nm],
        vec![0.0; nm],
        vec![0usize; nm],
    );
    for k in 0..nm {
        if root[k] >= 0 {
            size[root[k] as usize] += 1;
        }
    }
    let mut cost = vec![0.0; nm];
    let b = &tree.b;
    for j in 0..b.len() {
        let m = b.metamer[j] as usize;
        if !is_live_bud(b.state[j]) || root[m] < 0 {
            continue;
        }
        let r = root[m] as usize;
        let a = deposit_area(b.state[j], &params.r6);
        leaf[r] += a;
        cost[r] += a * leaf_cost(b.q[j], &params.r1);
        q[r] += b.q[j];
        buds[r] += 1.0;
    }
    let mut ids = Vec::new();
    for k in 0..nm {
        if root[k] != k as i64 {
            continue;
        }
        let m_leaf = params.r1.mf * cost[k];
        let n_b = c.n_sum[k] as f64;
        println!(
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
            world.season,
            tree.id,
            c.birth_id[k],
            c.order[k],
            size[k],
            tree.p_sum[k],
            tree.m_sum[k] - m_leaf,
            m_leaf,
            leaf[k],
            if buds[k] > 0.0 {
                q[k] / buds[k]
            } else {
                f64::NAN
            },
            if n_b > 0.0 { c.q_sum[k] / n_b } else { 0.0 },
            params.c5.t_rel * tree.q_top,
            tree.path_len[k],
            why[k]
        );
        ids.push(c.birth_id[k]);
    }
    ids
}
