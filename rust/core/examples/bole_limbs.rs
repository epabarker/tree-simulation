//! The bare-bole probe's lowest-limb light (#126; the bare-bole page's diagnostic 2), exploratory.
//!
//! Runs a params JSON as the headless runner does (`World::new`, then `World::step` each season,
//! no events) and after every season writes one row per live tree: the core's feature measures
//! (`tree_metrics`: liveCrownBase, crownLength, topFifthLeaf, leafBelowSixth and the shed causes)
//! and the first-order limbs read with C5's own measure, light per metamer Q_b/n_b over the crown's
//! Q_top (`c5::shed_branches`). The ratio is this season's, read after the shed phase, so it is
//! the light of the limbs that survived it. `lowRatio` is the lowest living limb's (the limb that
//! sets the live crown base); `minRatio` and `medRatio` are over every living limb. `bigBase` and
//! `bigRatio` are the lowest living limb's of at least 10 metamers, under any one-shoot sprouts.
//!
//!     cargo run --release --example bole_limbs -- params.json 150 out.csv [minHeightCells]
//!
//! Trees below minHeightCells (default 5.2, the 1.3 m display threshold) are not written.

use std::env;
use std::fs;
use std::io::{BufWriter, Write};

use tree_core::json;
use tree_core::metrics::tree_metrics;
use tree_core::principles::c3::is_live_bud;
use tree_core::tree::Tree;
use tree_core::world::World;

/// A limb this many metamers or more is a scaffold limb (`bigBase`), not a sprout.
const BIG: i32 = 10;

const MEASURES: [&str; 12] = [
    "height",
    "liveCrownBase",
    "crownLength",
    "topFifthLeaf",
    "leafBelowSixth",
    "shedRelative",
    "shedCarbon",
    "shedBoth",
    "boleSprouts",
    "buds",
    "crownWidth",
    "budsOutside",
];

fn main() {
    let args: Vec<String> = env::args().collect();
    let params = json::parse(&fs::read_to_string(&args[1]).expect("params")).expect("json");
    let seasons: usize = args[2].parse().expect("seasons");
    let min_h: f64 = args.get(4).map_or(5.2, |s| s.parse().expect("minHeight"));
    let mut out = BufWriter::new(fs::File::create(&args[3]).expect("out"));
    writeln!(
        out,
        "season,tree,species,rootX,rootZ,{},qTop,trel,krel,limbs,lowBase,lowRatio,lowN,lowDark,minRatio,medRatio,darkShare,bigBase,bigRatio",
        MEASURES.join(",")
    )
    .unwrap();
    let mut world = World::new(params);
    for _ in 0..seasons {
        world.step(&mut |_| {});
        let s = world.season;
        for tree in world.trees.iter().filter(|t| t.alive) {
            let m = tree_metrics(tree, Some(&world));
            if m.get("height").is_nan() || m.get("height") < min_h {
                continue;
            }
            let p = world.params_of(tree);
            let rel = p.c5.t_rel * tree.q_top;
            let limbs = living_limbs(tree);
            let mut rs: Vec<f64> = limbs.iter().map(|l| l.ratio).collect();
            rs.sort_by(f64::total_cmp);
            let low = limbs.iter().min_by(|a, b| a.base.total_cmp(&b.base));
            let (lb, lr, ln, ld) = low.map_or((f64::NAN, f64::NAN, 0, 0.0), |l| {
                (l.base, l.ratio, l.n, l.dark)
            });
            // The lowest living limb of at least BIG metamers: the scaffold under any sprouts.
            let big = limbs
                .iter()
                .filter(|l| l.n >= BIG)
                .min_by(|a, b| a.base.total_cmp(&b.base));
            let (bb, br) = big.map_or((f64::NAN, f64::NAN), |l| (l.base, l.ratio));
            let med = rs.get(rs.len() / 2).copied().unwrap_or(f64::NAN);
            let mn = rs.first().copied().unwrap_or(f64::NAN);
            let dark = if rs.is_empty() {
                f64::NAN
            } else {
                rs.iter().filter(|&&r| r * tree.q_top < rel).count() as f64 / rs.len() as f64
            };
            let vals: Vec<String> = MEASURES.iter().map(|k| m.get(k).to_string()).collect();
            writeln!(
                out,
                "{s},{},{},{},{},{},{},{},{},{},{lb},{lr},{ln},{ld},{mn},{med},{dark},{bb},{br}",
                tree.id,
                tree.species,
                tree.root_x,
                tree.root_z,
                vals.join(","),
                tree.q_top,
                p.c5.t_rel,
                p.c5.k_rel,
                limbs.len()
            )
            .unwrap();
        }
    }
}

struct Limb {
    base: f64,
    ratio: f64,
    n: i32,
    dark: f64,
}

/// Every living first-order limb (an order-1 metamer off the trunk carrying a live bud somewhere,
/// as `metrics::live_crown_base` reads it), with C5's light per metamer over Q_top.
fn living_limbs(tree: &Tree) -> Vec<Limb> {
    let c = &tree.m;
    let mut limb = vec![-1i32; c.len()];
    for i in 0..c.len() {
        let p = c.parent[i];
        if p < 0 {
            continue;
        }
        limb[i] = if c.order[i] == 1 && c.order[p as usize] == 0 {
            i as i32
        } else {
            limb[p as usize]
        };
    }
    let mut living = vec![false; c.len()];
    for j in 0..tree.b.len() {
        if is_live_bud(tree.b.state[j]) {
            let l = limb[tree.b.metamer[j] as usize];
            if l >= 0 {
                living[l as usize] = true;
            }
        }
    }
    (0..c.len())
        .filter(|&i| living[i])
        .map(|i| {
            let n = c.n_sum[i];
            let light = if n > 0 { c.q_sum[i] / n as f64 } else { 0.0 };
            Limb {
                base: c.base_y[i],
                ratio: if tree.q_top > 0.0 {
                    light / tree.q_top
                } else {
                    f64::NAN
                },
                n,
                dark: tree.dark.get(i).copied().unwrap_or(0.0),
            }
        })
        .collect()
}
