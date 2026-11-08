//! Exploratory probe (wayfinder #94, "Does treating a takeover as a relay let the open-grown oak
//! divide its top while keeping its spire and low limbs?"), step 1: how does a lateral come to
//! carry the leader? Replays a params JSON phase by phase as `season::run_season` does.
//!
//! Each season, before growth, it notes every metamer's main slot: a main child metamer, a main
//! bud and its state, or nothing (lost: shed or aborted). After growth, each new lateral shoot (a
//! new metamer on an old host, slot ≠ main) is stamped, by its birth id, with its host's main slot
//! as growth began and what that main slot did this season (grew n metamers, or its new state).
//!
//! Every `every` seasons (after the season ends) it walks the leader, the path from the root to
//! the tree's highest tip, and writes each takeover on it (a node whose next leader node is a
//! lateral) to `takeovers.csv`: where it sits (h ÷ H), the pa of the host and of the lateral, the
//! season the lateral was born, its host's main slot at that birth, and the main slot now (with
//! the height the main axis's subtree reaches against the lateral's).
//!
//!     cargo run --release --example takeover_probe -- params.json 101 10 out/prefix

use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{BufWriter, Write};

use tree_core::json;
use tree_core::season::{
    phase_allocate, phase_commit, phase_deaths, phase_girth, phase_grow, phase_light,
    phase_mechanics, phase_sample, phase_shed,
};
use tree_core::tree::{Tree, bud, slot};
use tree_core::world::World;

const M: f64 = 0.25;

fn state_name(s: u8) -> &'static str {
    match s {
        bud::GONE => "gone",
        bud::ACTIVE => "active",
        bud::DORMANT => "dormant",
        bud::TERMINATED => "terminated",
        bud::ABORTED => "aborted",
        bud::SHORT_SHOOT => "short",
        _ => "?",
    }
}

/// Each metamer's main slot: Some(child metamer) and the main bud's index, if any.
fn main_slots(tree: &Tree) -> (Vec<i32>, Vec<i32>) {
    let nm = tree.m.len();
    let mut child = vec![-1i32; nm];
    for k in 0..nm {
        let p = tree.m.parent[k];
        if p >= 0 && tree.m.slot[k] == slot::MAIN {
            child[p as usize] = k as i32;
        }
    }
    let mut mbud = vec![-1i32; nm];
    for j in 0..tree.b.len() {
        let m = tree.b.metamer[j];
        if m >= 0 && tree.b.slot[j] == slot::MAIN && tree.b.state[j] != bud::GONE {
            mbud[m as usize] = j as i32;
        }
    }
    (child, mbud)
}

fn pa(tree: &Tree, k: usize) -> i32 {
    tree.m.order[k] as i32 - tree.m.pa_shift[k] as i32
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let params = json::parse(&fs::read_to_string(&args[1]).expect("params")).expect("json");
    let seasons: usize = args[2].parse().expect("seasons");
    let every: i64 = args[3].parse().expect("every");
    let out = &args[4];
    let mut world = World::new(params);
    let mut ft = BufWriter::new(fs::File::create(format!("{out}_takeovers.csv")).unwrap());
    writeln!(
        ft,
        "season,H,h,hostPa,latPa,latOrder,latBorn,atBirth,mainDid,mainNow,mainTop,latTop,first,bid,overAt,maxRatio"
    )
    .unwrap();
    let mut fbirth = BufWriter::new(fs::File::create(format!("{out}_births.csv")).unwrap());
    writeln!(fbirth, "season,bid,hpos,hostPa,vLat,vMain,nLat,nMain").unwrap();
    // birth id of a lateral child → (first season its flow overtook the main child's, max ratio).
    let mut over: HashMap<u32, (f64, f64)> = HashMap::new();
    let mut fl = BufWriter::new(fs::File::create(format!("{out}_limbs.csv")).unwrap());
    writeln!(
        fl,
        "season,h,hpos,hostPa,latPa,born,overAt,maxRatio,latTop,leader"
    )
    .unwrap();
    // birth id of a lateral shoot's first metamer → (main slot at its birth, what it did).
    let mut stamp: HashMap<u32, (String, String)> = HashMap::new();
    for _ in 0..seasons {
        let live = phase_light(&mut world);
        for &i in &live {
            phase_sample(&mut world, i);
            phase_allocate(&mut world, i);
            let tree = &world.trees[i];
            let before = tree.m.len();
            let (child, mbud) = main_slots(tree);
            // Flow overtake: a lateral child whose resource in exceeds its host's main child's.
            for k in 1..before {
                let u = tree.m.parent[k];
                if u < 0 || tree.m.slot[k] == slot::MAIN {
                    continue;
                }
                let mc = child[u as usize];
                if mc < 0 {
                    continue;
                }
                let r = tree.m.v_in[k] / tree.m.v_in[mc as usize].max(1e-12);
                let e = over
                    .entry(tree.m.birth_id[k] as u32)
                    .or_insert((f64::NAN, 0.0));
                if r > e.1 {
                    e.1 = r;
                }
                if r >= 1.0 && e.0.is_nan() {
                    e.0 = world.season;
                }
            }
            let pre: Vec<String> = (0..before)
                .map(|k| {
                    if child[k] >= 0 {
                        "child".to_string()
                    } else if mbud[k] >= 0 {
                        state_name(tree.b.state[mbud[k] as usize]).to_string()
                    } else {
                        "lost".to_string()
                    }
                })
                .collect();
            let pre_bud: Vec<i32> = mbud.clone();
            let pre_bud_id: Vec<u32> = pre_bud
                .iter()
                .map(|&j| {
                    if j >= 0 {
                        tree.b.birth_id[j as usize] as u32
                    } else {
                        0
                    }
                })
                .collect();
            let mut vslot: HashMap<(usize, u8), f64> = HashMap::new();
            for j in 0..tree.b.len() {
                let m = tree.b.metamer[j];
                if m >= 0 && tree.b.state[j] != bud::GONE {
                    vslot.insert((m as usize, tree.b.slot[j]), tree.b.v[j]);
                }
            }
            let y0 = tree.m.base_y.first().copied().unwrap_or(0.0);
            let hgt = (0..before).map(|k| tree.tip_y(k)).fold(0.0, f64::max) - y0;
            let hpos: Vec<f64> = (0..before)
                .map(|k| (tree.tip_y(k) - y0) / hgt.max(1e-9))
                .collect();
            phase_grow(&mut world, i);
            let tree = &world.trees[i];
            let nm2 = tree.m.len();
            // What each host's main slot did this season: metamers grown on it, or its new state.
            let mut grew = vec![0u32; before];
            for k in before..nm2 {
                let u = tree.m.parent[k];
                if u >= 0 && (u as usize) < before && tree.m.slot[k] == slot::MAIN {
                    // count the new main shoot's metamers along its chain
                    let mut n = 1u32;
                    let mut q = k + 1;
                    while q < nm2
                        && tree.m.parent[q] == (q - 1) as i32
                        && tree.m.slot[q] == slot::MAIN
                    {
                        n += 1;
                        q += 1;
                    }
                    grew[u as usize] = n;
                }
            }
            let bud_state: HashMap<u32, u8> = (0..tree.b.len())
                .map(|j| (tree.b.birth_id[j] as u32, tree.b.state[j]))
                .collect();
            for k in before..nm2 {
                let u = tree.m.parent[k];
                if u < 0 || (u as usize) >= before || tree.m.slot[k] == slot::MAIN {
                    continue;
                }
                let u = u as usize;
                let did = if grew[u] > 0 {
                    format!("grew{}", grew[u])
                } else if pre_bud[u] >= 0 {
                    match bud_state.get(&pre_bud_id[u]) {
                        Some(&s) => state_name(s).to_string(),
                        None => "removed".to_string(),
                    }
                } else {
                    "-".to_string()
                };
                let vl = vslot.get(&(u, tree.m.slot[k])).copied().unwrap_or(f64::NAN);
                let vm = vslot.get(&(u, slot::MAIN)).copied().unwrap_or(f64::NAN);
                let mut nl = 1u32;
                let mut q = k + 1;
                while q < nm2 && tree.m.parent[q] == (q - 1) as i32 {
                    nl += 1;
                    q += 1;
                }
                writeln!(
                    fbirth,
                    "{},{},{:.3},{},{:.4},{:.4},{},{}",
                    world.season,
                    tree.m.birth_id[k] as u32,
                    hpos[u],
                    pa(tree, u),
                    vl,
                    vm,
                    nl,
                    grew[u]
                )
                .unwrap();
                stamp.insert(tree.m.birth_id[k] as u32, (pre[u].clone(), did));
            }
            phase_shed(&mut world, i);
            phase_girth(&mut world, i);
            phase_mechanics(&mut world, i);
            phase_commit(&mut world, i);
        }
        phase_deaths(&mut world, &live);
        let s = world.season;
        if (s as i64) % every == 0 {
            for &i in &live {
                let tree = &world.trees[i];
                if !tree.alive || tree.m.is_empty() {
                    continue;
                }
                let nm = tree.m.len();
                let y0 = tree.m.base_y[0];
                // Subtree top (max tip y) per metamer: children come after parents.
                let mut top: Vec<f64> = (0..nm).map(|k| tree.tip_y(k)).collect();
                for k in (1..nm).rev() {
                    let p = tree.m.parent[k] as usize;
                    if top[k] > top[p] {
                        top[p] = top[k];
                    }
                }
                let hi = (0..nm)
                    .max_by(|&a, &b| tree.tip_y(a).total_cmp(&tree.tip_y(b)))
                    .unwrap();
                let height = (tree.tip_y(hi) - y0) * M;
                let mut path = Vec::new();
                let mut k = hi as i32;
                while k >= 0 {
                    path.push(k as usize);
                    k = tree.m.parent[k as usize];
                }
                path.reverse();
                let (child, mbud) = main_slots(tree);
                let on: std::collections::HashSet<usize> = path.iter().copied().collect();
                #[allow(clippy::needless_range_loop)]
                for c in 1..nm {
                    let u = tree.m.parent[c] as usize;
                    if tree.m.slot[c] == slot::MAIN || pa(tree, u) != 0 || child[u] < 0 {
                        continue;
                    }
                    let e = over
                        .get(&(tree.m.birth_id[c] as u32))
                        .copied()
                        .unwrap_or((f64::NAN, f64::NAN));
                    let h = (tree.tip_y(u) - y0) * M;
                    writeln!(
                        fl,
                        "{s},{h:.2},{:.3},{},{},{},{},{:.3},{:.2},{}",
                        h / height,
                        pa(tree, u),
                        pa(tree, c),
                        tree.m.birth_season[c],
                        e.0,
                        e.1,
                        (top[c] - y0) * M,
                        on.contains(&c) as u8
                    )
                    .unwrap();
                }
                let mut first = true;
                for w in path.windows(2) {
                    let (u, c) = (w[0], w[1]);
                    if tree.m.slot[c] == slot::MAIN {
                        continue;
                    }
                    let h = (tree.tip_y(u) - y0) * M;
                    let (at, did) = stamp
                        .get(&(tree.m.birth_id[c] as u32))
                        .cloned()
                        .unwrap_or(("unseen".into(), "-".into()));
                    let (now, mtop) = if child[u] >= 0 {
                        ("child", (top[child[u] as usize] - y0) * M)
                    } else if mbud[u] >= 0 {
                        (state_name(tree.b.state[mbud[u] as usize]), f64::NAN)
                    } else {
                        ("lost", f64::NAN)
                    };
                    writeln!(
                        ft,
                        "{s},{height:.2},{h:.2},{},{},{},{},{at},{did},{now},{mtop:.2},{:.2},{},{},{},{:.3}",
                        pa(tree, u),
                        pa(tree, c),
                        tree.m.order[c],
                        tree.m.birth_season[c],
                        (top[c] - y0) * M,
                        first as u8,
                        tree.m.birth_id[c] as u32,
                        over.get(&(tree.m.birth_id[c] as u32)).map_or(f64::NAN, |e| e.0),
                        over.get(&(tree.m.birth_id[c] as u32)).map_or(f64::NAN, |e| e.1)
                    )
                    .unwrap();
                    first = false;
                }
            }
        }
        world.season += 1.0;
    }
}
