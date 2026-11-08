//! Exploratory probe (wayfinder "Is self-pruning happening in the model, and by which rule?").
//!
//! Replays a params JSON phase by phase as `season::run_season` does. After each tree's
//! allocation (this season's light, P_b, M_b), it reads every first-order limb (a lateral on the
//! trunk) with C5's own measure, light per metamer Q_b/n_b over the crown's Q_top, and R1's
//! deficit run, and applies `c5::shed_branches`'s test to every lateral to label what will be
//! shed and why. After the shed phase and mechanics, first-order limbs gone without being
//! labelled are counted as R3 breakage (or obstacles).
//!
//!     cargo run --release --example prune_probe -- params.json 120 out/prefix
//!
//! Writes prefix_season.csv (one row per tree and season), prefix_sheds.csv (one row per shed
//! branch root) and prefix_limbs.csv (every first-order limb, every 10 seasons).

use std::collections::HashSet;
use std::env;
use std::fs;
use std::io::Write;

use tree_core::json;
use tree_core::season::{
    phase_allocate, phase_commit, phase_deaths, phase_girth, phase_grow, phase_light,
    phase_mechanics, phase_sample, phase_shed,
};
use tree_core::tree::{Tree, slot};
use tree_core::world::World;

struct Limb {
    id: i32,
    base: f64,
    ratio: f64,
    pm: f64,
    run: f64,
    n: i32,
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let params = json::parse(&fs::read_to_string(&args[1]).expect("params")).expect("json");
    let seasons: usize = args[2].parse().expect("seasons");
    let out = &args[3];
    let mut world = World::new(params);
    let mut fs_ = fs::File::create(format!("{out}_season.csv")).unwrap();
    let mut fx = fs::File::create(format!("{out}_sheds.csv")).unwrap();
    let mut fl = fs::File::create(format!("{out}_limbs.csv")).unwrap();
    writeln!(fs_, "season,tree,species,rootX,height,qTop,trel,kShed,limbs,boleLow,lowRatio,lowPM,lowRun,lowN,minRatio,medRatio,shedFirst,shedFirstP,shedFirstQ,shedFirstBoth,brokenFirst,shedMetamers").unwrap();
    writeln!(
        fx,
        "season,tree,species,birthId,order,firstOrder,baseHeight,height,metamers,ratio,pm,run,why"
    )
    .unwrap();
    writeln!(
        fl,
        "season,tree,species,birthId,baseHeight,height,ratio,pm,run,metamers"
    )
    .unwrap();
    for _ in 0..seasons {
        let live = phase_light(&mut world);
        for &i in &live {
            phase_sample(&mut world, i);
            phase_allocate(&mut world, i);
            let s = world.season;
            let (limbs, sheds) = inspect(&world, i);
            let tree = &world.trees[i];
            let p = world.params_of(tree);
            let (trel, kshed) = (p.c5.t_rel, p.r1.k_shed);
            let sp = tree.species.clone();
            let h = height(tree);
            let mut first = [0usize; 3];
            let shed_ids: HashSet<i32> = sheds.iter().map(|r| r.0).collect();
            for (id, order, first_order, base, n, ratio, pm, run, why) in &sheds {
                if *first_order {
                    first[match *why {
                        "P<M" => 0,
                        "light" => 1,
                        _ => 2,
                    }] += 1;
                }
                writeln!(fx, "{s},{},{sp},{id},{order},{first_order},{base},{h},{n},{ratio},{pm},{run},{why}", tree.id).unwrap();
            }
            phase_grow(&mut world, i);
            phase_shed(&mut world, i);
            let shed_m = world.trees[i].shed_count;
            phase_girth(&mut world, i);
            phase_mechanics(&mut world, i);
            phase_commit(&mut world, i);
            let alive: HashSet<i32> = world.trees[i].m.birth_id.iter().copied().collect();
            let broken = limbs
                .iter()
                .filter(|l| !alive.contains(&l.id) && !shed_ids.contains(&l.id))
                .count();
            let tree = &world.trees[i];
            let mut rs: Vec<f64> = limbs.iter().map(|l| l.ratio).collect();
            rs.sort_by(f64::total_cmp);
            let low = limbs.iter().min_by(|a, b| a.base.total_cmp(&b.base));
            let (bl, lr, lpm, lrun, ln) = low
                .map_or((f64::NAN, f64::NAN, f64::NAN, f64::NAN, 0), |l| {
                    (l.base, l.ratio, l.pm, l.run, l.n)
                });
            let med = if rs.is_empty() {
                f64::NAN
            } else {
                rs[rs.len() / 2]
            };
            let mn = rs.first().copied().unwrap_or(f64::NAN);
            writeln!(
                fs_,
                "{s},{},{sp},{},{h},{},{trel},{kshed},{},{bl},{lr},{lpm},{lrun},{ln},{mn},{med},{},{},{},{},{broken},{shed_m}",
                tree.id,
                tree.root_x,
                tree.q_top,
                limbs.len(),
                first.iter().sum::<usize>(),
                first[0],
                first[1],
                first[2]
            )
            .unwrap();
            if (s as i64) % 10 == 0 {
                for l in &limbs {
                    writeln!(
                        fl,
                        "{s},{},{sp},{},{},{h},{},{},{},{}",
                        tree.id, l.id, l.base, l.ratio, l.pm, l.run, l.n
                    )
                    .unwrap();
                }
            }
        }
        phase_deaths(&mut world, &live);
        world.season += 1.0;
    }
}

fn height(tree: &Tree) -> f64 {
    let y0 = tree.m.base_y.first().copied().unwrap_or(0.0);
    (0..tree.m.len()).map(|k| tree.tip_y(k)).fold(0.0, f64::max) - y0
}

type Shed = (i32, u8, bool, f64, usize, f64, f64, f64, &'static str);

/// First-order limbs (with C5's and R1's measures) and the branch roots shed_branches will take.
fn inspect(world: &World, i: usize) -> (Vec<Limb>, Vec<Shed>) {
    let tree = &world.trees[i];
    let params = world.params_of(tree);
    let carbon = params.r1.enabled && params.r1.shed_carbon;
    let c = &tree.m;
    let nm = c.len();
    let y0 = c.base_y.first().copied().unwrap_or(0.0);
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
    let first_order = |k: usize| {
        c.slot[k] != slot::MAIN && c.parent[k] >= 0 && c.order[c.parent[k] as usize] == 0
    };
    let mut limbs = Vec::new();
    for k in 0..nm {
        if first_order(k) {
            limbs.push(Limb {
                id: c.birth_id[k],
                base: c.base_y[k] - y0,
                ratio: if qt > 0.0 { light_of(k) / qt } else { f64::NAN },
                pm: tree.p_sum[k] / tree.m_sum[k],
                run: run_of(k),
                n: c.n_sum[k],
            });
        }
    }
    let mut sheds = Vec::new();
    if !(params.c5.enabled || carbon) {
        return (limbs, sheds);
    }
    let t = params.c5.t.max(params.c5.t_rel * qt);
    let mut taken = vec![false; nm];
    for k in 0..nm {
        let p = c.parent[k];
        if p >= 0 && taken[p as usize] {
            taken[k] = true;
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
            taken[k] = true;
            let why = match (low_p, low_q) {
                (true, true) => "both",
                (true, false) => "P<M",
                _ => "light",
            };
            sheds.push((
                c.birth_id[k],
                c.order[k],
                first_order(k),
                c.base_y[k] - y0,
                c.n_sum[k] as usize,
                if qt > 0.0 { light / qt } else { f64::NAN },
                tree.p_sum[k] / tree.m_sum[k],
                run_of(k),
                why,
            ));
        }
    }
    (limbs, sheds)
}
