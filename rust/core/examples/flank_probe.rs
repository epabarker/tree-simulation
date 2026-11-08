//! Exploratory probe (wayfinder #90, "What keeps the oak's upper laterals from spreading into its
//! flank?"). Replays a params JSON phase by phase as `season::run_season` does and traces the
//! leader: the path from the root to the tree's highest node that season (the trunk's own axis
//! may end and hand over, so the leader is found by height, as the turgor notes do).
//!
//! Every season, after allocation and before growth, it records:
//! - `leader.csv`: each leader node's resource in (vIn), the share C3 passes to its main slot and
//!   to its laterals, the light in its main slot and laterals (q_slot), the nominal λ (R2's
//!   `lambda_at`) and the node's shade (R5), and the effective λ that reproduces the split;
//! - `lbuds.csv`: each live lateral bud on a leader node: its state, age, light (q ÷ Q_top), its
//!   resource v and R4's threshold, and after growth its fate: `grew` (metamers, length, the new
//!   shoot's angle from vertical), `refused` (v ≥ threshold but c1.budBreak's draw said no),
//!   `rest` (as a short shoot or dormant), `abort` (R4's L_dorm);
//! - `branches.csv`: each lateral branch rooted on a leader node: its subtree's size, leaf, light
//!   per metamer ÷ Q_top, P/M and deficit run, the root's angle from vertical and where the
//!   subtree's tips sit relative to its base, how many of its live buds pass their threshold,
//!   how many metamers it grew, and whether the shed phase took it (`P<M`, `light`, `both`).
//!
//! Every `every` seasons it dumps live buds and the season's new metamers tagged by origin:
//! 0 other, 1 a subtree of a lateral on the leader's upper half (≥ 0.5 H), 2 the leader itself,
//! 3 a subtree of a lateral on the leader's lower half. Positions are in cells (4 cells = 1 m)
//! from the root, as in cap_probe.rs.
//!
//!     cargo run --release --example flank_probe -- params.json 101 10 out/prefix

use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{BufWriter, Write};

use tree_core::json;
use tree_core::principles::r2::lambda_at;
use tree_core::principles::r4::growth_threshold;
use tree_core::principles::r5::shade_of;
use tree_core::principles::r6::deposit_area;
use tree_core::season::{
    phase_allocate, phase_commit, phase_deaths, phase_girth, phase_grow, phase_light,
    phase_mechanics, phase_sample, phase_shed,
};
use tree_core::tree::{SLOTS, Tree, bud, slot};
use tree_core::world::World;

const M: f64 = 0.25;

fn main() {
    let args: Vec<String> = env::args().collect();
    let params = json::parse(&fs::read_to_string(&args[1]).expect("params")).expect("json");
    let seasons: usize = args[2].parse().expect("seasons");
    let every: i64 = args[3].parse().expect("every");
    let out = &args[4];
    let mut world = World::new(params);
    let file = |s: &str| BufWriter::new(fs::File::create(format!("{out}_{s}.csv")).unwrap());
    let (mut fs_, mut fl, mut fb, mut fr, mut fd, mut fnw) = (
        file("season"),
        file("leader"),
        file("lbuds"),
        file("branches"),
        file("buds"),
        file("new"),
    );
    writeln!(
        fs_,
        "season,height,qTop,vBase,leaf,metamers,newMetamers,reserve"
    )
    .unwrap();
    writeln!(fl, "season,H,h,born,vIn,vMain,vLat,qMain,qLat,lamNom,lamEff,shade,latKids,latBuds,order,pa,enter,trunk").unwrap();
    writeln!(fb, "season,H,h,bid,state,age,qr,v,thr,fate,n,ext,ang").unwrap();
    writeln!(
        fr,
        "season,H,h,born,bid,n,leaf,qr,pm,run,ang,cx,cy,reach,budsLive,budsPass,grown,shed"
    )
    .unwrap();
    writeln!(fd, "season,tag,dx,dy,dz,q,state,leaf").unwrap();
    writeln!(fnw, "season,tag,dx,dy,dz").unwrap();
    for _ in 0..seasons {
        let live = phase_light(&mut world);
        for &i in &live {
            phase_sample(&mut world, i);
            phase_allocate(&mut world, i);
            let s = world.season;
            let dump = (s as i64) % every == 0;
            let tree = &world.trees[i];
            let p = world.params_of(tree);
            let nm = tree.m.len();
            let y0 = tree.m.base_y.first().copied().unwrap_or(0.0);
            let (x0, z0) = (tree.root_x, tree.root_z);
            let h_of = |k: usize| (tree.tip_y(k) - y0) * M;
            let height = (0..nm).map(h_of).fold(0.0, f64::max);
            let qt = tree.q_top;
            let qr = |q: f64| if qt > 0.0 { q / qt } else { f64::NAN };
            // The leader: root → the highest node.
            let mut on_leader = vec![false; nm];
            if nm > 0 {
                let mut k = (0..nm)
                    .max_by(|&a, &b| tree.tip_y(a).total_cmp(&tree.tip_y(b)))
                    .unwrap() as i32;
                while k >= 0 {
                    on_leader[k as usize] = true;
                    k = tree.m.parent[k as usize];
                }
            }
            // Origin tag of every metamer (parents come first).
            let mut tag = vec![0u8; nm];
            // The lateral branch root each metamer belongs to (a metamer index), or usize::MAX.
            let mut root = vec![usize::MAX; nm];
            for k in 0..nm {
                if on_leader[k] {
                    tag[k] = 2;
                    continue;
                }
                let up = tree.m.parent[k];
                if up < 0 {
                    continue;
                }
                let u = up as usize;
                if on_leader[u] && tree.m.slot[k] != slot::MAIN {
                    tag[k] = if h_of(u) >= 0.5 * height { 1 } else { 3 };
                    root[k] = k;
                } else {
                    tag[k] = tag[u];
                    root[k] = root[u];
                }
            }
            // Leader nodes: the split C3 made.
            let mut lat_kids = vec![0u32; nm];
            for k in 0..nm {
                let up = tree.m.parent[k];
                if up >= 0 && on_leader[up as usize] && tree.m.slot[k] != slot::MAIN {
                    lat_kids[up as usize] += 1;
                }
            }
            let mut lat_buds = vec![0u32; nm];
            for j in 0..tree.b.len() {
                let st = tree.b.state[j];
                let m = tree.b.metamer[j] as usize;
                if st != bud::GONE
                    && st != bud::ABORTED
                    && on_leader[m]
                    && tree.b.slot[j] != slot::MAIN
                {
                    lat_buds[m] += 1;
                }
            }
            for k in 0..nm {
                if !on_leader[k] {
                    continue;
                }
                let at = SLOTS * k;
                let (q_main, q_lat) = if tree.q_slot.len() >= at + SLOTS {
                    (
                        tree.q_slot[at],
                        tree.q_slot[at + 1..at + SLOTS].iter().sum::<f64>(),
                    )
                } else {
                    (f64::NAN, f64::NAN)
                };
                let (v_main, v_lat) = if tree.v_slot.len() >= at + SLOTS {
                    (
                        tree.v_slot[at],
                        tree.v_slot[at + 1..at + SLOTS].iter().sum::<f64>(),
                    )
                } else {
                    (f64::NAN, f64::NAN)
                };
                let pa = tree.m.order[k] as f64 - tree.m.pa_shift[k] as f64;
                // The λ that reproduces v_main = v·λq_m / (λq_m + (1−λ)q_l) (acrotony folded in).
                let lam_eff = if v_lat > 0.0 && v_main > 0.0 && q_main > 0.0 {
                    // v_main / v_lat = λ q_m / ((1 − λ) w q_l); with w = 1 (single-metamer
                    // shoots) x = λ / (1 − λ).
                    let x = (v_main / v_lat) * (q_lat / q_main);
                    x / (1.0 + x)
                } else {
                    f64::NAN
                };
                let shade = tree.node_shade.get(k).copied().unwrap_or(f64::NAN);
                writeln!(
                    fl,
                    "{s},{height},{},{},{},{v_main},{v_lat},{q_main},{q_lat},{},{lam_eff},{shade},{},{},{},{pa},{},{}",
                    h_of(k),
                    tree.m.birth_season[k],
                    tree.m.v_in[k],
                    lambda_at(pa, tree.age, p),
                    lat_kids[k],
                    lat_buds[k],
                    tree.m.order[k],
                    tree.m.slot[k],
                    (tree.m.axis[k] == tree.m.axis[0]) as u8
                )
                .unwrap();
            }
            // Lateral buds on the leader, before growth.
            struct Pre {
                bid: i32,
                host: usize,
                slot_: u8,
                state: u8,
                age: i32,
                q: f64,
                v: f64,
                thr: f64,
            }
            let mut pre = Vec::new();
            for j in 0..tree.b.len() {
                let st = tree.b.state[j];
                if st == bud::GONE || st == bud::ABORTED || tree.b.slot[j] == slot::MAIN {
                    continue;
                }
                let m = tree.b.metamer[j] as usize;
                if !on_leader[m] {
                    continue;
                }
                let shade = if !p.r5.enabled {
                    0.0
                } else if p.r5.neighbours {
                    tree.node_shade[m]
                } else {
                    shade_of(tree.b.q[j], p.c2.c)
                };
                pre.push(Pre {
                    bid: tree.b.birth_id[j],
                    host: m,
                    slot_: tree.b.slot[j],
                    state: st,
                    age: tree.b.age[j],
                    q: tree.b.q[j],
                    v: tree.b.v[j],
                    thr: growth_threshold(st, tree.b.age[j] as f64, shade, p),
                });
            }
            // Branches on the leader, before growth: their subtrees' buds.
            let mut br: HashMap<usize, (u32, u32, f64)> = HashMap::new(); // live, pass, leaf
            for j in 0..tree.b.len() {
                let st = tree.b.state[j];
                if st == bud::GONE || st == bud::ABORTED {
                    continue;
                }
                let m = tree.b.metamer[j] as usize;
                let r = root[m];
                if r == usize::MAX {
                    continue;
                }
                let shade = if p.r5.enabled && p.r5.neighbours {
                    tree.node_shade[m]
                } else {
                    shade_of(tree.b.q[j], p.c2.c)
                };
                let e = br.entry(r).or_insert((0, 0, 0.0));
                e.0 += 1;
                if tree.b.v[j] >= growth_threshold(st, tree.b.age[j] as f64, shade, p) {
                    e.1 += 1;
                }
                e.2 += deposit_area(st, &p.r6);
            }
            // Shed classification, as shed_branches will decide this season (cap_probe's rule).
            let carbon = p.r1.enabled && p.r1.shed_carbon;
            let why_of = |k: usize| -> &'static str {
                if !(p.c5.enabled || carbon) || k >= tree.evaluated {
                    return "";
                }
                if world.season - (tree.m.birth_season[k] as f64) < p.c5.g {
                    return "";
                }
                let n = tree.m.n_sum[k] as f64;
                let light = if n > 0.0 { tree.m.q_sum[k] / n } else { 0.0 };
                let run = if tree.p_sum[k] < tree.m_sum[k] {
                    tree.deficit.get(k).copied().unwrap_or(0.0) + 1.0
                } else {
                    0.0
                };
                let (lp, lq) = if carbon {
                    (run >= p.r1.k_shed, light < p.c5.t_rel * qt)
                } else {
                    let t = p.c5.t.max(p.c5.t_rel * qt);
                    (false, tree.m.n_sum[k] > 0 && light < t)
                };
                match (lp, lq) {
                    (true, true) => "both",
                    (true, false) => "P<M",
                    (false, true) => "light",
                    _ => "",
                }
            };
            struct Br {
                bid: i32,
                row: String,
                why: &'static str,
            }
            let mut branches = Vec::new();
            for k in 0..nm {
                if root[k] != k {
                    continue;
                }
                let u = tree.m.parent[k] as usize;
                // The subtree's tips relative to the branch base (m): horizontal centroid distance
                // from the trunk node, centroid height above the base, and the farthest reach.
                let (bx, by, bz) = (tree.m.base_x[k], tree.m.base_y[k], tree.m.base_z[k]);
                let (mut sx, mut sy, mut c, mut reach) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
                #[allow(clippy::needless_range_loop)]
                for q in k..nm {
                    if root[q] == k {
                        let d =
                            ((tree.tip_x(q) - bx).powi(2) + (tree.tip_z(q) - bz).powi(2)).sqrt();
                        sx += d;
                        sy += tree.tip_y(q) - by;
                        c += 1.0;
                        reach = reach.max(d);
                    }
                }
                let n = tree.m.n_sum[k] as f64;
                let light = if n > 0.0 { tree.m.q_sum[k] / n } else { 0.0 };
                let run = if k < tree.p_sum.len() && tree.p_sum[k] < tree.m_sum[k] {
                    tree.deficit.get(k).copied().unwrap_or(0.0) + 1.0
                } else {
                    0.0
                };
                let pm = if k < tree.p_sum.len() {
                    tree.p_sum[k] / tree.m_sum[k]
                } else {
                    f64::NAN
                };
                let (live, pass, leaf) = br.get(&k).copied().unwrap_or((0, 0, 0.0));
                let ang = tree.m.hy[k].clamp(-1.0, 1.0).acos().to_degrees();
                branches.push(Br {
                    bid: tree.m.birth_id[k],
                    row: format!(
                        "{s},{height},{},{},{},{},{leaf},{},{pm},{run},{ang},{},{},{},{live},{pass}",
                        h_of(u),
                        tree.m.birth_season[k],
                        tree.m.birth_id[k],
                        tree.m.n_sum[k],
                        qr(light),
                        sx / c.max(1.0) * M,
                        sy / c.max(1.0) * M,
                        reach * M
                    ),
                    why: why_of(k),
                });
            }
            let qt_leafy = qt;
            let before = nm;
            let tag_before = tag.clone();
            let root_before = root.clone();
            let bid_before: Vec<i32> = tree.m.birth_id.clone();
            if dump {
                for j in 0..tree.b.len() {
                    let st = tree.b.state[j];
                    if st == bud::GONE || st == bud::ABORTED {
                        continue;
                    }
                    let m = tree.b.metamer[j] as usize;
                    writeln!(
                        fd,
                        "{s},{},{},{},{},{},{st},{}",
                        tag[m],
                        tree.tip_x(m) - x0,
                        tree.tip_y(m) - y0,
                        tree.tip_z(m) - z0,
                        tree.b.q[j],
                        deposit_area(st, &p.r6)
                    )
                    .unwrap();
                }
            }
            let _ = qt_leafy;
            phase_grow(&mut world, i);
            let tree = &world.trees[i];
            let p = world.params_of(tree);
            // New metamers: origin tag (inherited), and the shoots grown from leader laterals.
            let nm2 = tree.m.len();
            let mut tag2 = tag_before.clone();
            tag2.resize(nm2, 0);
            let mut root2 = root_before.clone();
            root2.resize(nm2, usize::MAX);
            let mut grown_by_root: HashMap<usize, u32> = HashMap::new();
            // Shoots from leader laterals: host index + slot → (n, ext, ang).
            let mut shoot: HashMap<(usize, u8), (u32, f64, f64)> = HashMap::new();
            for k in before..nm2 {
                let u = tree.m.parent[k] as usize;
                if u < before && on_leader[u] {
                    if tree.m.slot[k] == slot::MAIN {
                        tag2[k] = 2;
                    } else {
                        tag2[k] = if (tree.tip_y(u) - y0) * M >= 0.5 * height {
                            1
                        } else {
                            3
                        };
                        root2[k] = k;
                        let ext: f64 = {
                            let mut e = tree.m.length[k];
                            let mut q = k + 1;
                            while q < nm2 && tree.m.parent[q] == (q - 1) as i32 {
                                e += tree.m.length[q];
                                q += 1;
                            }
                            e * M
                        };
                        let mut n = 1u32;
                        while k + (n as usize) < nm2
                            && tree.m.parent[k + n as usize] == (k + n as usize - 1) as i32
                        {
                            n += 1;
                        }
                        let last = k + n as usize - 1;
                        let ang = tree.m.hy[last].clamp(-1.0, 1.0).acos().to_degrees();
                        shoot.insert((u, tree.m.slot[k]), (n, ext, ang));
                    }
                } else {
                    tag2[k] = tag2[u];
                    root2[k] = root2[u];
                }
                if root2[k] != usize::MAX {
                    *grown_by_root.entry(root2[k]).or_insert(0) += 1;
                }
                if dump {
                    writeln!(
                        fnw,
                        "{s},{},{},{},{}",
                        tag2[k],
                        tree.tip_x(k) - x0,
                        tree.tip_y(k) - y0,
                        tree.tip_z(k) - z0
                    )
                    .unwrap();
                }
            }
            // Fates of the leader's lateral buds.
            let mut by_bid: HashMap<i32, usize> = HashMap::new();
            for j in 0..tree.b.len() {
                by_bid.insert(tree.b.birth_id[j], j);
            }
            for b in &pre {
                let j = by_bid.get(&b.bid).copied();
                let (fate, n, ext, ang) =
                    if let Some(&(n, ext, ang)) = shoot.get(&(b.host, b.slot_)) {
                        ("grew", n, ext, ang)
                    } else {
                        let st = j.map_or(bud::GONE, |j| tree.b.state[j]);
                        let f = if st == bud::GONE || st == bud::ABORTED {
                            "abort"
                        } else if b.v >= b.thr {
                            "refused"
                        } else if st == bud::SHORT_SHOOT {
                            "restSS"
                        } else {
                            "restD"
                        };
                        (f, 0, 0.0, f64::NAN)
                    };
                writeln!(
                    fb,
                    "{s},{height},{},{},{},{},{},{},{},{fate},{n},{ext},{ang}",
                    (tree.tip_y(b.host) - y0) * M,
                    b.bid,
                    b.state,
                    b.age,
                    qr(b.q),
                    b.v,
                    b.thr
                )
                .unwrap();
            }
            let _ = p;
            phase_shed(&mut world, i);
            let tree = &world.trees[i];
            let mut alive: std::collections::HashSet<i32> = Default::default();
            for k in 0..tree.m.len() {
                alive.insert(tree.m.birth_id[k]);
            }
            for b in &branches {
                let k = bid_before.iter().position(|&x| x == b.bid).unwrap();
                let grown = grown_by_root.get(&k).copied().unwrap_or(0);
                let shed = if alive.contains(&b.bid) {
                    ""
                } else if b.why.is_empty() {
                    "other"
                } else {
                    b.why
                };
                writeln!(fr, "{},{grown},{shed}", b.row).unwrap();
            }
            phase_girth(&mut world, i);
            phase_mechanics(&mut world, i);
            phase_commit(&mut world, i);
            let tree = &world.trees[i];
            let p = world.params_of(tree);
            let mut leaf = 0.0;
            for j in 0..tree.b.len() {
                let st = tree.b.state[j];
                if st != bud::GONE && st != bud::ABORTED {
                    leaf += deposit_area(st, &p.r6);
                }
            }
            writeln!(
                fs_,
                "{s},{},{},{},{leaf},{},{},{}",
                height_of(tree),
                tree.q_top,
                tree.v_base,
                tree.m.len(),
                nm2 - before,
                tree.reserve
            )
            .unwrap();
        }
        phase_deaths(&mut world, &live);
        world.season += 1.0;
    }
}

fn height_of(tree: &Tree) -> f64 {
    let y0 = tree.m.base_y.first().copied().unwrap_or(0.0);
    ((0..tree.m.len()).map(|k| tree.tip_y(k)).fold(0.0, f64::max) - y0) * M
}
