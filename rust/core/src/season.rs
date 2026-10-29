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
use crate::principles::c1::{grow_shoot, juvenile_cap, shoot_size};
use crate::principles::c3::{allocate, gather_light, is_live_bud};
use crate::principles::c4::shoot_direction;
use crate::principles::c5::{crown_top_light, shed_branches};
use crate::principles::c6::update_girth;
use crate::principles::o2::{EMPTY, Grid, abrade, tag_owner};
use crate::principles::o4::stand_dynamics;
use crate::principles::obstacles::clear_obstacles;
use crate::principles::r1::{carbon_balance, starved_to_death};
use crate::principles::r2::direction_params;
use crate::principles::r3::update_mechanics;
use crate::principles::r4::{aborts, growth_threshold, light_releases, released_shift};
use crate::principles::r5::{elongation, neighbour_share, set_point_scale, shade_of};
use crate::principles::r6::{deposit_area, resting_state};
use crate::rng::{normal, purpose, uniform};
use crate::tree::{Tree, bud, store_i32};
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
    let (row, layer) = (y.floor(), z.floor());
    if params.world.periodic {
        col = ((col % w) + w) % w;
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
    let mut shoot_length = 0.0;
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
        let mut n = if v >= threshold {
            shoot_size(v, params, &mut shoot_length, cap)
        } else {
            0.0
        };
        if n == 0.0 && state == bud::DORMANT && light_releases(tree.b.q[i], age, params) {
            // R4's light trigger: the first metamer is paid from the reserve (free without R1).
            let cost = 1.0;
            if !params.r1.enabled || tree.reserve >= cost {
                if params.r1.enabled {
                    tree.reserve -= cost;
                }
                n = 1.0;
                shoot_length = params.c1.internode_length;
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
            let shift = if reiterates {
                released_shift(bud_order, host_shift, r4)
            } else {
                host_shift
            };
            let pa = bud_order - shift;
            let upright = set_point_scale(shade, r5);
            let length = shoot_length * elongation(shade, r5);
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
                if upright != 1.0 {
                    dir.set_point *= upright;
                }
                let v = [tree.b.vx[b], tree.b.vy[b], tree.b.vz[b]];
                shoot_direction(prev, tree.bud_reference(b), v, noise, around, &dir)
            };
            let pa_shift = if reiterates { shift } else { -1.0 };
            grow_shoot(tree, i, n, length, params, season, &mut direct, pa_shift);
        } else {
            tree.b.state[i] = resting_state(tree.b.q[i], &params.r6);
            tree.b.age[i] = store_i32(age + 1.0);
            if aborts(tree.b.state[i], tree.b.age[i] as f64, r4) {
                tree.b.state[i] = bud::GONE;
                tree.aborted += 1.0;
            }
        }
    }
}
