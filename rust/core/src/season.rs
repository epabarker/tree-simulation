//! The per-season loop of spec §6, phase by phase (season.ts). Every tree reads the same
//! start-of-season light field; girth before mechanics; shedding after growth; deaths last.
//! Loops over a table run only over the rows that existed when their phase began (new rows are
//! appended past them), and consumed buds are compacted at the end of each tree's pass.
//!
//! The phases are separate functions so that I1 could port them one at a time behind the
//! TypeScript core (the bridge in `rust/wasm`) and so that `bench` can time them.

use crate::geom::V3;
use crate::light::{Light, depth_of};
use crate::math;
use crate::params::{DEG, Params};
use crate::principles::c1::{
    beta_offset, grow_shoot, juvenile_cap, lateral_frame, offset_frame, shoot_length_factor,
    shoot_size,
};
use crate::principles::c3::{CELL_M, allocate, gather_light, is_live_bud, turgor_scale};
use crate::principles::c4::{axis_offset, shoot_direction};
use crate::principles::c5::{crown_top_light, shed_branches};
use crate::principles::c6::update_girth;
use crate::principles::o2::{EMPTY, Grid, abrade, tag_owner};
use crate::principles::o4::stand_dynamics;
use crate::principles::obstacles::clear_obstacles;
use crate::principles::r1::{carbon_balance, starved_to_death};
use crate::principles::r2::{
    aged_offset, arm_set_point, curve_offset, curved, direction_params, light_set_point,
    pendulous_set_point, relay_depth, relay_nodes, relay_on, relay_overtopped, relay_shift,
    vigour_forks,
};
use crate::principles::r3::update_mechanics;
use crate::principles::r4::{aborts, breaks, growth_threshold, light_releases, released_shift};
use crate::principles::r5::{elongation, neighbour_share, set_point_scale, shade_of};
use crate::principles::r6::{deposit_area, outlived, resting_state};
use crate::rng::{normal, purpose, uniform};
use crate::tree::{Tree, bud, slot, store_i32};
use crate::world::World;

/// The phases as they end within a season (`PHASES` in season.ts; `npm run bench` times them).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Phase {
    Light,
    Sample,
    Allocate,
    Grow,
    Shed,
    Girth,
    Mechanics,
    Commit,
    Deaths,
}

pub const PHASES: [Phase; 9] = [
    Phase::Light,
    Phase::Sample,
    Phase::Allocate,
    Phase::Grow,
    Phase::Shed,
    Phase::Girth,
    Phase::Mechanics,
    Phase::Commit,
    Phase::Deaths,
];

impl Phase {
    pub fn name(self) -> &'static str {
        match self {
            Phase::Light => "light",
            Phase::Sample => "sample",
            Phase::Allocate => "allocate",
            Phase::Grow => "grow",
            Phase::Shed => "shed",
            Phase::Girth => "girth",
            Phase::Mechanics => "mechanics",
            Phase::Commit => "commit",
            Phase::Deaths => "deaths",
        }
    }
}

pub fn run_season(world: &mut World, mark: &mut dyn FnMut(Phase)) {
    let live = phase_light(world);
    mark(Phase::Light);
    for &i in &live {
        phase_sample(world, i);
        mark(Phase::Sample);
        phase_allocate(world, i);
        mark(Phase::Allocate);
        phase_grow(world, i);
        mark(Phase::Grow);
        phase_shed(world, i);
        mark(Phase::Shed);
        phase_girth(world, i);
        mark(Phase::Girth);
        phase_mechanics(world, i);
        mark(Phase::Mechanics);
        phase_commit(world, i);
        mark(Phase::Commit);
    }
    phase_deaths(world, &live);
    mark(Phase::Deaths);
}

/// The trees alive at the start of the season, by index: the phases run over these.
pub fn live_trees(world: &World) -> Vec<usize> {
    (0..world.trees.len())
        .filter(|&i| world.trees[i].alive)
        .collect()
}

/// Phase 1 (C2): the storm draw, obstacle clearance, then the environment from the start-of-
/// season snapshot. Returns the live trees the season's later phases run over.
pub fn phase_light(world: &mut World) -> Vec<usize> {
    let mut live = live_trees(world);
    let season = world.season;
    let params = &world.rules.params;
    // A storm season (M16, §O2 wind events): one draw per season, keyed so it replays.
    let storm_p = params.o2.storm_p.unwrap_or(0.0);
    world.storm =
        storm_p > 0.0 && uniform(params.seed, purpose::WIND, 0.0, 0.0, season, 0.0) < storm_p;
    let owners = params.o2.enabled || params.r5.neighbours || params.species_neighbours;
    world.owners_tagged = owners;
    let World {
        rules,
        trees,
        light,
        owner,
        ..
    } = world;
    let params = &rules.params;
    // Obstacles first (ADR 0015): a branch the page's layout now covers is shed before it
    // deposits foliage or shade.
    if params
        .world
        .obstacles
        .as_ref()
        .is_some_and(|o| !o.is_empty())
    {
        for &i in &live {
            let own = rules.of(&trees[i].species);
            trees[i].shed_count = clear_obstacles(&mut trees[i], own, &mut []);
        }
        live.retain(|&i| trees[i].alive);
    }
    light.clear();
    if owners {
        owner.fill(EMPTY);
    }
    if params.c2.enabled {
        for wall in &params.world.walls {
            light.add_wall(wall);
        }
        for &i in &live {
            deposit_buds(
                params,
                rules.of(&trees[i].species),
                light,
                owner,
                owners,
                &trees[i],
            );
        }
    }
    light.compute(season);
    live
}

fn deposit_buds(
    world_params: &Params,
    own: &Params,
    light: &mut Light,
    owner: &mut [i32],
    owners: bool,
    tree: &Tree,
) {
    let b = &tree.b;
    for i in 0..b.len() {
        if !is_live_bud(b.state[i]) {
            continue;
        }
        let area = deposit_area(b.state[i], &own.r6);
        if area == 0.0 {
            continue;
        }
        let m = b.metamer[i] as usize;
        let [x, y, z] = tree.tip(m);
        light.deposit(x, y, z, area);
        if owners {
            tag_foliage(world_params, owner, tree, x, y, z);
        }
    }
}

/// O2: tags the cell at (x, y, z) as holding foliage of `tree`.
fn tag_foliage(params: &Params, owner: &mut [i32], tree: &Tree, x: f64, y: f64, z: f64) {
    let (w, h, d) = (params.world.width, params.world.height, depth_of(params));
    let mut col = x.floor();
    let (row, mut layer) = (y.floor(), z.floor());
    if params.world.periodic {
        col = ((col % w) + w) % w;
    }
    if params.world.periodic_z {
        layer = ((layer % d) + d) % d;
    }
    if col < 0.0 || col >= w || row < 0.0 || row >= h || layer < 0.0 || layer >= d {
        return;
    }
    tag_owner(
        owner,
        (w as usize, d as usize),
        (col as usize, row as usize, layer as usize),
        tree.id as i32,
    );
}

/// Phase 2 begins: counters reset, Q and V at every bud (C2), R5's shade at every node, and the
/// crown-top light C5 compares against.
pub fn phase_sample(world: &mut World, i: usize) {
    let World {
        rules,
        trees,
        light,
        owner,
        ..
    } = world;
    let wp = &rules.params;
    let tree = &mut trees[i];
    let params = rules.of(&tree.species);
    let carbon_shedding = params.r1.enabled && params.r1.shed_carbon;
    tree.ensure_scratch();
    tree.shed_count = 0.0;
    tree.released = 0.0;
    tree.epicormic = 0.0;
    tree.aborted = 0.0;
    tree.broken = 0.0;
    sample_buds(light, tree);
    if params.r5.enabled {
        sample_nodes(wp, params, light, owner, tree);
    }
    // R2's relay gate (r2.relayCrowd): the tree's shade-avoidance state, the mean of R5's
    // neighbour shade over its metamers (0 for a tree without neighbours).
    tree.relay_crowd = if params.r2.relay_crowd.is_some() && params.r5.enabled {
        let nm = tree.m.len();
        let sum: f64 = tree.node_shade[..nm].iter().sum();
        if nm > 0 { sum / nm as f64 } else { 0.0 }
    } else {
        0.0
    };
    if (params.c5.enabled || carbon_shedding) && params.c5.t_rel > 0.0 {
        tree.q_top = crown_top_light(tree, params.c5.top_quantile);
    }
}

fn sample_buds(light: &Light, tree: &mut Tree) {
    let mut sum = 0.0;
    let mut count = 0.0;
    for i in 0..tree.b.len() {
        if !is_live_bud(tree.b.state[i]) {
            continue;
        }
        let m = tree.b.metamer[i] as usize;
        let [x, y, z] = tree.tip(m);
        let (q, v) = light.sample(x, y, z);
        tree.b.q[i] = q;
        (tree.b.vx[i], tree.b.vy[i], tree.b.vz[i]) = (v[0], v[1], v[2]);
        sum += q;
        count += 1.0;
    }
    tree.mean_bud_q = if count > 0.0 { sum / count } else { 0.0 };
}

/// R5: shade s = 1 − Q/C at every metamer's tip; with the neighbour signal, scaled by the share
/// of the foliage above that other trees own.
fn sample_nodes(wp: &Params, own: &Params, light: &Light, owner: &[i32], tree: &mut Tree) {
    let c = wp.c2.c;
    let by_neighbours = own.r5.neighbours;
    let grid = Grid::of(wp);
    for i in 0..tree.m.len() {
        let [x, y, z] = tree.tip(i);
        let (q, _) = light.sample(x, y, z);
        let mut s = shade_of(q, c);
        if by_neighbours && s > 0.0 {
            s *= neighbour_share(owner, &grid, [x, y, z], tree.id as f64);
        }
        tree.node_shade[i] = s;
    }
}

/// C3 basipetal (and R1's CARBON step), then C3 acropetal: v at every bud.
pub fn phase_allocate(world: &mut World, i: usize) {
    let World { rules, trees, .. } = world;
    let tree = &mut trees[i];
    let params = rules.of(&tree.species);
    gather_light(tree, &params.r6);
    if params.r1.enabled {
        carbon_balance(tree, params);
    }
    allocate(tree, params);
}

/// Bud fate and growth (C1, C4; R2, R4, R5, R6).
pub fn phase_grow(world: &mut World, i: usize) {
    let season = world.season;
    let World { rules, trees, .. } = world;
    let tree = &mut trees[i];
    tree.evaluated = tree.m.len(); // rows that took part in this season's passes
    let params = rules.of(&tree.species);
    if params.r2.enabled && params.r2.relay_overtop {
        relay_overtopped(tree);
    }
    grow_buds(tree, params, season);
}

/// C5 shedding (or R1's, by carbon), on this season's Q_sum and n_b.
pub fn phase_shed(world: &mut World, i: usize) {
    let season = world.season;
    let World { rules, trees, .. } = world;
    let tree = &mut trees[i];
    let params = rules.of(&tree.species);
    if params.c5.enabled || (params.r1.enabled && params.r1.shed_carbon) {
        let evaluated = tree.evaluated;
        tree.shed_count = shed_branches(tree, params, season, evaluated);
    }
}

/// C6 girth, after shedding so scars count (R3 first keeps the radii before it).
pub fn phase_girth(world: &mut World, i: usize) {
    let World { rules, trees, .. } = world;
    let tree = &mut trees[i];
    let params = rules.of(&tree.species);
    if params.r3.enabled {
        tree.ensure_scratch();
        let nm = tree.m.len();
        tree.prev_radius[..nm].copy_from_slice(&tree.m.radius[..nm]);
    }
    if params.c6.enabled {
        update_girth(tree, params);
    }
}

/// R3 mechanics (girth first, §6 rule 2), then obstacles again for limbs that sagged into one.
pub fn phase_mechanics(world: &mut World, i: usize) {
    let (season, storm) = (world.season, world.storm);
    let World { rules, trees, .. } = world;
    let tree = &mut trees[i];
    let params = rules.of(&tree.species);
    if params.r3.enabled {
        update_mechanics(tree, params, storm, season);
    }
    if params
        .world
        .obstacles
        .as_ref()
        .is_some_and(|o| !o.is_empty())
    {
        let shed = if params.r3.enabled {
            let mut stress = std::mem::take(&mut tree.stress);
            let n = clear_obstacles(tree, params, &mut [&mut stress]);
            tree.stress = stress;
            n
        } else {
            clear_obstacles(tree, params, &mut [])
        };
        tree.shed_count += shed;
    }
}

/// COMMIT_STAGING: consumed buds compacted away; the tree ages a season.
pub fn phase_commit(world: &mut World, i: usize) {
    let tree = &mut world.trees[i];
    let keep: Vec<u8> = tree
        .b
        .state
        .iter()
        .map(|&s| if s == bud::GONE { 0 } else { 1 })
        .collect();
    tree.b.compact(&keep);
    tree.age += 1.0;
}

/// Phase 3: abrasion (O2), starvation deaths (R1), then O4's stand dynamics. Deaths last (§6).
pub fn phase_deaths(world: &mut World, live: &[usize]) {
    let season = world.season;
    {
        let World {
            rules,
            trees,
            owner,
            ..
        } = &mut *world;
        let wp = &rules.params;
        let grid = Grid::of(wp);
        let abrasion = wp.o2.enabled;
        for &i in live {
            let own = rules.of(&trees[i].species);
            trees[i].abraded = if abrasion {
                abrade(&mut trees[i], owner, &grid, own, season)
            } else {
                0.0
            };
        }
        for &i in live {
            let own = rules.of(&trees[i].species);
            if starved_to_death(&trees[i], &own.r1) {
                trees[i].alive = false;
            }
        }
        for &i in live {
            trees[i].seeds = 0.0;
        }
    }
    if world.rules.params.o4.enabled {
        world.recruits = stand_dynamics(world);
    }
}

/// Bud fate and growth: a bud whose resource reaches its threshold grows a shoot; any other live
/// bud rests (a short shoot if lit enough with R6, else dormant, aborting after L_dorm with R4).
pub fn grow_buds(tree: &mut Tree, params: &Params, season: f64) {
    let (c4, r4, r5) = (&params.c4, &params.r4, &params.r5);
    let c = params.c2.c;
    let sigma = c4.sigma * DEG;
    let count = tree.b.len();
    let mut cap = params.c1.max_metamers_per_shoot;
    if params.r2.enabled && params.r2.h_j.unwrap_or(0.0) > 0.0 {
        let mut height = 0.0;
        for j in 0..tree.m.len() {
            height = math::max(height, tree.tip_y(j));
        }
        cap = juvenile_cap(height, params);
    }
    // R2's relay (ADR 0033): the nodes under an ended pa-0 apex, as the season began.
    let depth = if relay_on(params) {
        relay_depth(tree, tree.m.len(), count)
    } else {
        Vec::new()
    };
    let mut shoot_length = 0.0;
    // The sink limit's inputs, as the season began: path length from the root (R1's, or summed
    // here without R1) and the root's height.
    let path: Vec<f64> = if !(params.c3.sink_turgor || params.c3.sink_length) {
        Vec::new()
    } else if params.r1.enabled && tree.path_len.len() >= tree.m.len() {
        tree.path_len[..tree.m.len()].to_vec()
    } else {
        let mut p = vec![0.0; tree.m.len()];
        for j in 0..tree.m.len() {
            let up = tree.m.parent[j];
            p[j] = tree.m.length[j] + if up >= 0 { p[up as usize] } else { 0.0 };
        }
        p
    };
    let root_y = tree.m.base_y.first().copied().unwrap_or(0.0);
    for i in 0..count {
        if !is_live_bud(tree.b.state[i]) {
            continue;
        }
        let shade = if !r5.enabled {
            0.0
        } else if r5.neighbours {
            tree.node_shade[tree.b.metamer[i] as usize]
        } else {
            shade_of(tree.b.q[i], c)
        };
        let state = tree.b.state[i];
        let age = tree.b.age[i] as f64;
        let threshold = growth_threshold(state, age, shade, params);
        let v = tree.b.v[i];
        // A stochastic break (c1.budBreak) may refuse a lateral that passed: it rests below, and
        // is not released by light either this season.
        let refused = v >= threshold
            && !breaks(
                v,
                threshold,
                tree.b.slot[i],
                tree.id as f64,
                tree.b.birth_id[i] as f64,
                season,
                params,
            );
        // The length form's scale on this shoot's internodes (1 when off).
        let mut sink_s = 1.0;
        let mut n = if v >= threshold && !refused {
            if params.c3.sink_turgor {
                // The sink limit (wayfinder #87): the tip uses a share s of what C3 gave it; the
                // rest goes to R1's reserve, up to its cap, and is never re-split.
                let host = tree.b.metamer[i] as usize;
                let h = (tree.tip_y(host) - root_y) * CELL_M;
                let s = turgor_scale(h, path[host] * CELL_M, &params.c3);
                let full = math::min(v, cap);
                let n = shoot_size(full * s, params, &mut shoot_length, cap);
                let unused = if n > 0.0 { full * (1.0 - s) } else { full };
                if params.r1.enabled && unused > 0.0 {
                    let store = params.r1.store * tree.maintenance;
                    tree.reserve = math::max(tree.reserve, math::min(tree.reserve + unused, store));
                }
                n
            } else if params.c3.sink_length {
                // The length form (wayfinder #89): the shoot keeps its metamers and buds, and its
                // internodes are s as long; the carbon of the missing length goes to R1's reserve.
                // At s = 0 the bud does not grow and all of it goes there.
                let host = tree.b.metamer[i] as usize;
                let h = (tree.tip_y(host) - root_y) * CELL_M;
                let s = turgor_scale(h, path[host] * CELL_M, &params.c3);
                let full = math::min(v, cap);
                let n = if s > 0.0 {
                    sink_s = s;
                    shoot_size(v, params, &mut shoot_length, cap)
                } else {
                    0.0
                };
                let unused = if n > 0.0 { full * (1.0 - s) } else { full };
                if params.r1.enabled && unused > 0.0 {
                    let store = params.r1.store * tree.maintenance;
                    tree.reserve = math::max(tree.reserve, math::min(tree.reserve + unused, store));
                }
                n
            } else {
                shoot_size(v, params, &mut shoot_length, cap)
            }
        } else {
            0.0
        };
        if n == 0.0 && !refused && state == bud::DORMANT && light_releases(tree.b.q[i], age, params)
        {
            // R4's light trigger: the first metamer is paid from the reserve (free without R1).
            let cost = 1.0;
            if !params.r1.enabled || tree.reserve >= cost {
                if params.r1.enabled {
                    tree.reserve -= cost;
                }
                n = 1.0;
                shoot_length = params.c1.internode_length;
                sink_s = 1.0;
            }
        }
        if n > 0.0 {
            let host = tree.b.metamer[i] as usize;
            let released = state == bud::DORMANT;
            if released {
                tree.released += 1.0;
                if tree.m.order[host] == 0 && season - tree.m.birth_season[host] as f64 >= 10.0 {
                    tree.epicormic += 1.0;
                }
            }
            let reiterates = released && r4.enabled;
            let bud_order = tree.b.order[i] as f64;
            let host_shift = tree.m.pa_shift[host] as f64;
            let mut shift = if reiterates {
                released_shift(bud_order, host_shift, r4)
            } else {
                host_shift
            };
            // A relay takes pa 0 (its shift is its order), a reiteration at most as young.
            let relay = if depth.is_empty() {
                None
            } else {
                relay_shift(tree, i, &depth, params)
            };
            if let Some(r) = relay {
                shift = math::max(shift, r);
            }
            let pa = bud_order - shift;
            // The trunk's own axis is exempt from the form offsets (ADR 0034, 0035, 0038).
            let trunk = tree.b.slot[i] == slot::MAIN && tree.m.axis[host] == tree.m.axis[0];
            let upright = set_point_scale(shade, r5);
            // R2's curve (ADR 0034): the node along its own axis each new metamer will take.
            let mut node = if tree.b.slot[i] == slot::MAIN {
                tree.m.axis_node[host] as f64 + 1.0
            } else {
                0.0
            };
            // R2's pendulous twigs (ADR 0035): a continuation is as thick as its host; a new axis
            // as thin as can be.
            let girth_of_host = if tree.b.slot[i] == slot::MAIN {
                tree.m.radius[host]
            } else {
                0.0
            };
            let mut length = shoot_length * elongation(shade, r5) * sink_s;
            if params.c1.shoot_length_sd > 0.0 {
                length *=
                    shoot_length_factor(params, tree.id as f64, tree.b.birth_id[i] as f64, season);
            }
            // The axis this shoot extends or starts (a lateral's: the id its first metamer takes),
            // and its offset to the set point (c4.axisSD), kept for the axis's life.
            let axis = if tree.b.slot[i] == slot::MAIN {
                tree.m.axis[host] as f64
            } else {
                tree.next_metamer_id
            };
            let axis_bend = axis_offset(trunk, params.seed, tree.id as f64, axis, c4.axis_sd);
            let mut direct = |tree: &Tree, prev: V3, b: usize, id: f64| -> V3 {
                if !c4.enabled {
                    return prev;
                }
                let (tid, seed) = (tree.id as f64, params.seed);
                // normal() takes keys 0 and 1; the turn's axis is key 2.
                let noise = sigma * normal(seed, purpose::DIRECTION_NOISE, tid, id, season, 0.0);
                let around = 2.0
                    * std::f64::consts::PI
                    * uniform(seed, purpose::DIRECTION_NOISE, tid, id, season, 2.0);
                let mut dir = direction_params(params, pa);
                // The vigour fork's arms hold the angle they were born at (a new arm: its bud's).
                if params.r2.fork_at > 0.0 && pa == 0.0 && !trunk {
                    let born = if tree.b.slot[b] == slot::MAIN {
                        arm_set_point(tree, trunk, pa, tree.b.metamer[b] as usize, params)
                    } else {
                        None
                    };
                    let h = born.unwrap_or_else(|| {
                        math::acos(math::max(-1.0, math::min(1.0, tree.b.hy[b])))
                            * (180.0 / std::f64::consts::PI)
                    });
                    dir.set_point = h;
                }
                // Light orthotropy: a lateral in full light grows erect, one in shade level.
                dir.set_point =
                    light_set_point(dir.set_point, pa, tree.b.q[b], 0.0, tree.v_base, &params.r2);
                let bend = curve_offset(trunk, pa, node, params)
                    + aged_offset(trunk, pa, 0.0, tree.age, params)
                    + axis_bend;
                dir.set_point = curved(dir.set_point, bend);
                dir.set_point =
                    pendulous_set_point(dir.set_point, trunk, pa, girth_of_host, params);
                node += 1.0;
                if upright != 1.0 {
                    dir.set_point *= upright;
                }
                let v = [tree.b.vx[b], tree.b.vy[b], tree.b.vz[b]];
                shoot_direction(prev, tree.bud_reference(b), v, noise, around, &dir)
            };
            // A relay is stored at the order of the axis it replaces (ADR 0033, fix A): one less
            // order, one less shift, the same pa.
            let (pa_shift, first_order) = if relay.is_some() {
                (shift - 1.0, bud_order - 1.0)
            } else if reiterates {
                (shift, -1.0)
            } else {
                (-1.0, -1.0)
            };
            let first_new_bud = tree.b.len();
            let first_new_metamer = tree.m.len();
            // A new axis leaves at its own branch angle (c1.betaSD): the bud's frame is turned
            // away from its host's heading before it grows, and restored if nothing grew.
            let unturned = if params.c1.beta_sd > 0.0 && tree.b.slot[i] != slot::MAIN {
                let (h, l) = (tree.bud_heading(i), tree.bud_reference(i));
                let off = beta_offset(params, tree.id as f64, tree.next_metamer_id) * DEG;
                let (th, tl) = offset_frame(tree.heading(host), h, l, off);
                tree.set_bud_frame(i, th, tl);
                Some((h, l))
            } else {
                None
            };
            grow_shoot(
                tree,
                i,
                n,
                length,
                params,
                season,
                &mut direct,
                pa_shift,
                first_order,
            );
            if let Some((h, l)) = unturned
                && tree.b.state[i] != bud::GONE
            {
                tree.set_bud_frame(i, h, l);
            }
            // The vigour fork: a pa-0 shoot grown at full vigour ends its apex; next season the
            // relay makes the laterals on its top nodes co-dominant arms.
            if vigour_forks(pa, v, cap, tree.age, params) {
                let nodes = relay_nodes(0.0, params).floor() as usize;
                let top = tree.m.len().saturating_sub(nodes).max(first_new_metamer);
                for j in first_new_bud..tree.b.len() {
                    let m = tree.b.metamer[j] as usize;
                    if tree.b.slot[j] == slot::MAIN && tree.b.state[j] == bud::ACTIVE {
                        tree.b.state[j] = bud::TERMINATED;
                    } else if let Some(a) = params.r2.fork_angle
                        && tree.b.slot[j] != slot::MAIN
                        && m >= top
                    {
                        // The arms leave at the fork's own angle, not the laterals' β.
                        let (h, l) = lateral_frame(tree, m, tree.b.azimuth[j], a * DEG);
                        tree.set_bud_frame(j, h, l);
                    }
                }
            }
        } else {
            tree.b.state[i] = resting_state(tree.b.q[i], &params.r6);
            // ADR 0044: a short shoot on wood past its lifespan rests leafless, and R4 ages it.
            let wood = season - tree.m.birth_season[tree.b.metamer[i] as usize] as f64;
            if outlived(tree.b.state[i], wood, &params.r6) {
                tree.b.state[i] = bud::DORMANT;
            }
            // R4's age counts the seasons a bud rests dormant (§R4: dormant buds have a finite
            // lifespan): a leafy short shoot (R6) does not age toward L_dorm or a higher break.
            if tree.b.state[i] == bud::DORMANT {
                tree.b.age[i] = store_i32(age + 1.0);
            }
            if aborts(tree.b.state[i], tree.b.age[i] as f64, r4) {
                tree.b.state[i] = bud::GONE;
                tree.aborted += 1.0;
            }
        }
    }
}
