//! Exploratory probe (wayfinder "Where does the flat cap come from at HEAD?").
//!
//! Replays a params JSON phase by phase as `season::run_season` does. After each tree's
//! allocation it labels every branch root `shed_branches` will take this season (`P<M`, `light`
//! or `both`, as prune_probe.rs does) and records where it sits (its base relative to the root),
//! its subtree's leaf area, its light per metamer ÷ Q_top and its P/M. After growth it counts the
//! new metamers. Every `every` seasons it dumps every live bud (position, Q ÷ Q_top, leaf area)
//! and every new metamer's tip, so the crown's shape, its light and where it grows can be binned
//! by position afterwards. Bud q is raw: Q_top is 0 when C5 is off, so the analysis normalises
//! by the 0.9 quantile of the leafy buds' Q (C5's topQuantile) in every case (analysis in docs/experiments/code/2026-11-08-flat-cap/).
//!
//!     cargo run --release --example cap_probe -- params.json 150 10 out/prefix
//!
//! Writes prefix_season.csv, prefix_sheds.csv, prefix_buds.csv, prefix_new.csv and (wayfinder
//! #87) prefix_shoots.csv: every shoot grown in a dump season, by its host's height and path length
//! from the root (m), its metamer count, and whether it extends the leader. season.csv gains the
//! trunk's radius at 1.3 m (cells) and the leader shoot's metamers that season. Positions are
//! in cells (4 cells = 1 m): dx, dz from the root, dy above the root's base.

use std::env;
use std::fs;
use std::io::{BufWriter, Write};

use tree_core::json;
use tree_core::principles::r6::deposit_area;
use tree_core::season::{
    phase_allocate, phase_commit, phase_deaths, phase_girth, phase_grow, phase_light,
    phase_mechanics, phase_sample, phase_shed,
};
use tree_core::tree::{Tree, bud, slot};
use tree_core::world::World;

fn main() {
    let args: Vec<String> = env::args().collect();
    let params = json::parse(&fs::read_to_string(&args[1]).expect("params")).expect("json");
    let seasons: usize = args[2].parse().expect("seasons");
    let every: i64 = args[3].parse().expect("every");
    let out = &args[4];
    let mut world = World::new(params);
    let file = |s: &str| BufWriter::new(fs::File::create(format!("{out}_{s}.csv")).unwrap());
    let (mut fs_, mut fx, mut fb, mut fnw, mut fsh) = (
        file("season"),
        file("sheds"),
        file("buds"),
        file("new"),
        file("shoots"),
    );
    writeln!(fsh, "season,tree,species,hostH,hostPath,n,leader,order,dx").unwrap();
    writeln!(
        fs_,
        "season,tree,species,height,qTop,metamers,leaf,newMetamers,shedMetamers,trel,kShed,carbon,outside,maxDx,maxDz,buds,rDbh,leaderN"
    )
    .unwrap();
    writeln!(fx, "season,tree,species,order,dx,dy,dz,metamers,leaf,ratio,pm,run,why,buds,bank,budQmax,budAgeMax,born").unwrap();
    writeln!(fb, "season,tree,species,dx,dy,dz,q,state,leaf").unwrap();
    writeln!(fnw, "season,tree,species,dx,dy,dz,order").unwrap();
    // Per tree, the bud ids its last shed phase made: [next_bud_id before, after).
    let mut banks: std::collections::HashMap<usize, (f64, f64)> = Default::default();
    for _ in 0..seasons {
        let live = phase_light(&mut world);
        for &i in &live {
            phase_sample(&mut world, i);
            phase_allocate(&mut world, i);
            let s = world.season;
            let dump = (s as i64) % every == 0;
            let tree = &world.trees[i];
            let p = world.params_of(tree);
            let sp = tree.species.clone();
            let (x0, z0) = (tree.root_x, tree.root_z);
            let y0 = tree.m.base_y.first().copied().unwrap_or(0.0);
            for r in sheds(&world, i, banks.get(&i).copied().unwrap_or((0.0, 0.0))) {
                writeln!(
                    fx,
                    "{s},{},{sp},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
                    tree.id,
                    r.order,
                    r.x - x0,
                    r.y - y0,
                    r.z - z0,
                    r.n,
                    r.leaf,
                    r.ratio,
                    r.pm,
                    r.run,
                    r.why,
                    r.states
                        .iter()
                        .map(|n| n.to_string())
                        .collect::<Vec<_>>()
                        .join(":"),
                    r.bank,
                    r.qmax,
                    r.agemax,
                    r.born
                )
                .unwrap();
            }
            let qt = tree.q_top;
            let mut leaf = 0.0;
            for j in 0..tree.b.len() {
                let st = tree.b.state[j];
                if st == bud::GONE || st == bud::ABORTED {
                    continue;
                }
                let a = deposit_area(st, &p.r6);
                leaf += a;
                if dump {
                    let m = tree.b.metamer[j] as usize;
                    writeln!(
                        fb,
                        "{s},{},{sp},{},{},{},{},{st},{a}",
                        tree.id,
                        tree.tip_x(m) - x0,
                        tree.tip_y(m) - y0,
                        tree.tip_z(m) - z0,
                        tree.b.q[j]
                    )
                    .unwrap();
                }
            }
            let (trel, kshed, carbon) = (p.c5.t_rel, p.r1.k_shed, p.r1.enabled && p.r1.shed_carbon);
            let before = tree.m.len();
            // Path length from the root to every node, as the season began (cells).
            let mut path = vec![0.0f64; before];
            for k in 0..before {
                let up = tree.m.parent[k];
                path[k] = tree.m.length[k] + if up >= 0 { path[up as usize] } else { 0.0 };
            }
            let trunk_axis = tree.m.axis.first().copied();
            phase_grow(&mut world, i);
            let tree = &world.trees[i];
            let grown = tree.m.len() - before;
            // Shoots: a new metamer whose parent is old starts one; the chain after it is its
            // metamers (grow_shoot appends a shoot's metamers in order).
            let mut leader_n = 0usize;
            let mut k = before;
            while k < tree.m.len() {
                let host = tree.m.parent[k];
                let mut n = 1;
                while k + n < tree.m.len() && tree.m.parent[k + n] == (k + n - 1) as i32 {
                    n += 1;
                }
                if host >= 0 && (host as usize) < before {
                    let h = host as usize;
                    let leader = tree.m.slot[k] == slot::MAIN && Some(tree.m.axis[h]) == trunk_axis;
                    if leader {
                        leader_n = n;
                    }
                    if dump {
                        writeln!(
                            fsh,
                            "{s},{},{sp},{},{},{n},{},{},{}",
                            tree.id,
                            (tree.tip_y(h) - y0) * 0.25,
                            path[h] * 0.25,
                            leader as u8,
                            tree.m.order[k],
                            (tree.tip_x(h) - x0) * 0.25
                        )
                        .unwrap();
                    }
                }
                k += n;
            }
            if dump {
                for k in before..tree.m.len() {
                    writeln!(
                        fnw,
                        "{s},{},{sp},{},{},{},{}",
                        tree.id,
                        tree.tip_x(k) - x0,
                        tree.tip_y(k) - y0,
                        tree.tip_z(k) - z0,
                        tree.m.order[k]
                    )
                    .unwrap();
                }
            }
            let nb0 = world.trees[i].next_bud_id;
            phase_shed(&mut world, i);
            banks.insert(i, (nb0, world.trees[i].next_bud_id));
            let shed_m = world.trees[i].shed_count;
            phase_girth(&mut world, i);
            phase_mechanics(&mut world, i);
            phase_commit(&mut world, i);
            let tree = &world.trees[i];
            // Open-box check (ADR 0062): live buds whose tip lies outside W × H × D, and the
            // crown's reach from the root in x and z, every season.
            let wp = &world.params_of(tree).world;
            let (mut outside, mut nbud, mut mdx, mut mdz) = (0usize, 0usize, 0.0f64, 0.0f64);
            for j in 0..tree.b.len() {
                let st = tree.b.state[j];
                if st == bud::GONE || st == bud::ABORTED {
                    continue;
                }
                nbud += 1;
                let m = tree.b.metamer[j] as usize;
                let (x, y, z) = (tree.tip_x(m), tree.tip_y(m), tree.tip_z(m));
                if x < 0.0 || x >= wp.width || y >= wp.height || z < 0.0 || z >= wp.depth {
                    outside += 1;
                }
            }
            for k in 0..tree.m.len() {
                mdx = mdx.max((tree.tip_x(k) - tree.root_x).abs());
                mdz = mdz.max((tree.tip_z(k) - tree.root_z).abs());
            }
            let y0 = tree.m.base_y.first().copied().unwrap_or(0.0);
            let r_dbh = (0..tree.m.len())
                .find(|&k| Some(tree.m.axis[k]) == trunk_axis && tree.tip_y(k) - y0 >= 5.2)
                .map_or(f64::NAN, |k| tree.m.radius[k]);
            writeln!(
                fs_,
                "{s},{},{sp},{},{qt},{},{leaf},{grown},{shed_m},{trel},{kshed},{carbon},{outside},{mdx},{mdz},{nbud},{r_dbh},{leader_n}",
                tree.id,
                height(tree),
                tree.m.len()
            )
            .unwrap();
        }
        phase_deaths(&mut world, &live);
        world.season += 1.0;
    }
}

fn height(tree: &Tree) -> f64 {
    let y0 = tree.m.base_y.first().copied().unwrap_or(0.0);
    (0..tree.m.len()).map(|k| tree.tip_y(k)).fold(0.0, f64::max) - y0
}

struct Shed {
    order: u8,
    x: f64,
    y: f64,
    z: f64,
    n: i32,
    leaf: f64,
    ratio: f64,
    pm: f64,
    run: f64,
    why: &'static str,
    /// Buds in the subtree by state (bud::GONE … bud::SHORT_SHOOT).
    states: [u32; 6],
    /// Buds in the subtree that last season's shed phase made (R4's bank buds).
    bank: u32,
    qmax: f64,
    agemax: i32,
    /// The root metamer's birth season.
    born: i32,
}

/// The branch roots `shed_branches` will take this season, with their subtrees' leaf area.
fn sheds(world: &World, i: usize, bank: (f64, f64)) -> Vec<Shed> {
    let tree = &world.trees[i];
    let params = world.params_of(tree);
    let carbon = params.r1.enabled && params.r1.shed_carbon;
    let mut out = Vec::new();
    if !(params.c5.enabled || carbon) {
        return out;
    }
    let c = &tree.m;
    let nm = c.len();
    let qt = tree.q_top;
    let run_of = |k: usize| {
        if tree.p_sum[k] < tree.m_sum[k] {
            tree.deficit.get(k).copied().unwrap_or(0.0) + 1.0
        } else {
            0.0
        }
    };
    let light_of = |k: usize| {
        let n = c.n_sum[k] as f64;
        if n > 0.0 { c.q_sum[k] / n } else { 0.0 }
    };
    let t = params.c5.t.max(params.c5.t_rel * qt);
    // root[k]: index in `out` of the shed root k belongs to, or -1.
    let mut root = vec![-1i64; nm];
    for k in 0..nm.min(tree.evaluated) {
        let p = c.parent[k];
        if p >= 0 && root[p as usize] >= 0 {
            root[k] = root[p as usize];
            continue;
        }
        if c.slot[k] == slot::MAIN
            || p < 0
            || world.season - (c.birth_season[k] as f64) < params.c5.g
        {
            continue;
        }
        let light = light_of(k);
        let (low_p, low_q) = if carbon {
            (run_of(k) >= params.r1.k_shed, light < params.c5.t_rel * qt)
        } else {
            (false, c.n_sum[k] > 0 && light < t)
        };
        if low_p || low_q {
            root[k] = out.len() as i64;
            out.push(Shed {
                order: c.order[k],
                x: c.base_x[k],
                y: c.base_y[k],
                z: c.base_z[k],
                n: c.n_sum[k],
                leaf: 0.0,
                ratio: if qt > 0.0 { light / qt } else { f64::NAN },
                pm: tree.p_sum[k] / tree.m_sum[k],
                run: run_of(k),
                why: match (low_p, low_q) {
                    (true, true) => "both",
                    (true, false) => "P<M",
                    _ => "light",
                },
                states: [0; 6],
                bank: 0,
                qmax: 0.0,
                agemax: 0,
                born: c.birth_season[k],
            });
        }
    }
    for j in 0..tree.b.len() {
        let m = tree.b.metamer[j];
        if m >= 0 && (m as usize) < nm && root[m as usize] >= 0 {
            let r = &mut out[root[m as usize] as usize];
            r.leaf += deposit_area(tree.b.state[j], &params.r6);
            r.states[(tree.b.state[j] as usize).min(5)] += 1;
            r.qmax = r.qmax.max(tree.b.q[j]);
            r.agemax = r.agemax.max(tree.b.age[j]);
            let id = tree.b.birth_id[j] as f64;
            if id >= bank.0 && id < bank.1 {
                r.bank += 1;
            }
        }
    }
    out
}
