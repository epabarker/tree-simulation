//! O4's seedling stubs (spec §O4.11 "keep seedlings as stubs until lit", ADR 0072).
//!
//! Rule: with the world's `o4.stubs` on, a seed that passes p_est but cannot become a tree (the
//! cap full, its ground light below max(q_est, stubLight), or a live trunk within a cell) joins a
//! count of stubs of its species in its ground cell (x and z floored), outside `maxTrees`. A stub
//! has no metamers, takes no light and is not drawn. Each season, before the season's seeds land
//! (staging, spec §6), every stub dies with min(m_stub·e^(−β_s(T − 1)), 1) [RNG: stubDeath], the
//! suppression rate's tolerance scaling at a full deficit (a stub is by definition unlit); then the
//! cells holding stubs, with no live trunk within a cell of their centre, are visited brightest
//! first, and while the cap has room a cell lit to a stub species' threshold promotes one stub of
//! the species so lit, drawn by count [RNG: stubPromotion], to a seedling at the cell's centre,
//! next season, as an established seed is. At most one a cell a season. Then, "until lit" read
//! both ways (ADR 0072's addendum), each live tree of age ≥ 1 below the display threshold whose
//! crown-top light Q_top/C (C5's, phase 2) is below `o4.stubDemote` leaves the stand and joins its
//! root cell's stubs; it draws no stub death this season.
//!
//! Two probe params (#137's churn note, docs/experiments/2026-11-16-stub-churn-and-hornbeam-
//! ceiling.md), whose absence is the rule above: `o4.stubLightY` (the world's; absent 0.5) is the
//! height at which a stub's cell and a seed's landing point are sampled for stubLight, and
//! `o4.stubDemoteAge` (species-merged; absent 1) the age from which a bank tree can be demoted.
//!
//! Params: o4.stubs (the world's), o4.stubLight, o4.stubDeath and o4.stubDemote (species-merged),
//! o4.stubLightY and o4.stubDemoteAge, with o4.qEst,
//! o4.suppressionSlope, o4.shadeTolerance and o4.maxTrees; c2.C.

use super::c1::{plant_seedling, seedling_azimuth};
use super::o4::{species_key, tolerance_scaled};
use crate::math;
use crate::params::Params;
use crate::rng::{purpose, uniform};
use crate::world::{Stubs, World};

/// The ground cell a point falls in: floor(z)·⌈width⌉ + floor(x).
pub fn cell(x: f64, z: f64, width: f64) -> u32 {
    let cols = width.ceil() as u32;
    (z.floor() as u32) * cols + x.floor() as u32
}

/// A cell's centre on the ground plane, (x, z).
pub fn centre(cell: u32, width: f64) -> (f64, f64) {
    let cols = width.ceil() as u32;
    ((cell % cols) as f64 + 0.5, (cell / cols) as f64 + 0.5)
}

/// The ground light (Q/C) a seed or stub of these params needs to become a tree with stubs on.
pub fn threshold(own: &Params) -> f64 {
    math::max(own.o4.q_est, own.o4.stub_light)
}

/// A stub's death rate per season: m_stub·e^(−β_s(T − 1)), clamped to a probability.
pub fn death_rate(own: &Params) -> f64 {
    tolerance_scaled(
        1.0,
        own.o4.stub_death,
        own.o4.suppression_slope,
        own.o4.shade_tolerance,
    )
}

/// The counts of `species`, added in name order if it has none yet.
fn counts<'a>(stubs: &'a mut Stubs, species: &str) -> &'a mut Vec<u32> {
    let at = match stubs.binary_search_by(|(sp, _)| sp.as_str().cmp(species)) {
        Ok(at) => at,
        Err(at) => {
            stubs.insert(at, (species.to_string(), Vec::new()));
            at
        }
    };
    &mut stubs[at].1
}

/// Sets the count of `species` in cell `k` (the checkpoint's reader and the tests).
pub fn set(stubs: &mut Stubs, species: &str, k: u32, n: u32) {
    let v = counts(stubs, species);
    if v.len() <= k as usize {
        v.resize(k as usize + 1, 0);
    }
    v[k as usize] = n;
    prune(stubs);
}

/// The count of `species` in cell `k`.
pub fn count(stubs: &Stubs, species: &str, k: u32) -> u32 {
    stubs
        .iter()
        .find(|(sp, _)| sp == species)
        .and_then(|(_, v)| v.get(k as usize).copied())
        .unwrap_or(0)
}

/// The cells holding stubs of `species`, ascending.
pub fn cells_of(stubs: &Stubs, species: &str) -> Vec<u32> {
    stubs
        .iter()
        .filter(|(sp, _)| sp == species)
        .flat_map(|(_, v)| (0..v.len() as u32).filter(|&k| v[k as usize] > 0))
        .collect()
}

/// Leaves out every species with no stub left, so an empty pool is an empty list.
fn prune(stubs: &mut Stubs) {
    stubs.retain(|(_, v)| v.iter().any(|&n| n > 0));
}

/// One more stub of `species` in the cell at (x, z).
pub fn add(stubs: &mut Stubs, species: &str, x: f64, z: f64, width: f64) {
    let k = cell(x, z, width) as usize;
    let v = counts(stubs, species);
    if v.len() <= k {
        v.resize(k + 1, 0);
    }
    v[k] += 1;
}

/// The stubs in the pool, every species.
pub fn total(stubs: &Stubs) -> f64 {
    let mut n = 0.0;
    for (_, v) in stubs {
        for &c in v {
            n += c as f64;
        }
    }
    n
}

/// This season's stub deaths: each stub that began the season draws once against its species'
/// rate. Stubs are exchangeable, so the k-th stub of a cell's count is keyed by k.
pub fn deaths(world: &mut World) {
    let (seed, season) = (world.rules.params.seed, world.season);
    for i in 0..world.stubs.len() {
        let sp = &world.stubs[i].0;
        let (rate, key) = (death_rate(world.rules.of(sp)), species_key(sp));
        if !(rate > 0.0) {
            continue;
        }
        let v = &mut world.stubs[i].1;
        for (c, n) in v.iter_mut().enumerate() {
            let mut alive = 0;
            for k in 0..*n {
                if uniform(seed, purpose::STUB_DEATH, c as f64, key, season, k as f64) >= rate {
                    alive += 1;
                }
            }
            *n = alive;
        }
    }
    prune(&mut world.stubs);
}

/// Which cells have a live trunk within a cell of their centre (O4's spacing test, per cell).
fn blocked(world: &World, width: f64, depth: f64) -> Vec<bool> {
    let cols = width.ceil() as i64;
    let rows = depth.ceil() as i64;
    let mut out = vec![false; (cols * rows) as usize];
    for t in world.trees.iter().filter(|t| t.alive) {
        let (ix, iz) = (t.root_x.floor() as i64, t.root_z.floor() as i64);
        for cz in iz - 1..=iz + 1 {
            for cx in ix - 1..=ix + 1 {
                if cx < 0 || cz < 0 || cx >= cols || cz >= rows {
                    continue;
                }
                let (x, z) = (cx as f64 + 0.5, cz as f64 + 0.5);
                if math::hypot(t.root_x - x, t.root_z - z) < 1.0 {
                    out[(cz * cols + cx) as usize] = true;
                }
            }
        }
    }
    out
}

/// Promotes stubs in lit, free cells to seedlings while live trees are below `maxTrees`, brightest
/// cell first. Returns the trees planted; `live` counts them.
pub fn promote(world: &mut World, live: &mut f64) -> f64 {
    let params = &world.rules.params;
    let (seed, season, width, c) = (params.seed, world.season, params.world.width, params.c2.c);
    let max_trees = params.o4.max_trees;
    if world.stubs.is_empty() || *live >= max_trees || c <= 0.0 {
        return 0.0;
    }
    let depth = crate::light::depth_of(params);
    let taken = blocked(world, width, depth);
    let cells = world.stubs.iter().map(|(_, v)| v.len()).max().unwrap_or(0);
    // The free cells holding stubs and their ground light, as two columns.
    let (mut qs, mut ks) = (Vec::new(), Vec::new());
    for k in 0..cells {
        let held = world
            .stubs
            .iter()
            .any(|(_, v)| v.get(k).is_some_and(|&n| n > 0));
        if held && !taken.get(k).copied().unwrap_or(true) {
            let (x, z) = centre(k as u32, width);
            // ADR 0073: the cell's running mean with the light memory on.
            qs.push(super::memory::ground(world, x, params.o4.stub_light_y, z));
            ks.push(k as u32);
        }
    }
    let thresholds: Vec<f64> = world
        .stubs
        .iter()
        .map(|(sp, _)| threshold(world.rules.of(sp)))
        .collect();
    let mut planted = 0.0;
    // Brightest first, ties to the lower cell: a selection rather than a sort, since only as many
    // cells as the cap has room for are taken, and a sort's code would cost the garden's WASM.
    while *live < max_trees && !qs.is_empty() {
        let mut best = 0;
        for j in 1..qs.len() {
            let order = qs[j].total_cmp(&qs[best]);
            if order.is_gt() || (order.is_eq() && ks[j] < ks[best]) {
                best = j;
            }
        }
        let (q, k) = (qs.swap_remove(best), ks.swap_remove(best));
        // The species lit here, in name order, with their counts in this cell.
        let stubs = &world.stubs;
        let eligible = |i: usize| {
            if q >= thresholds[i] {
                stubs[i].1.get(k as usize).copied().unwrap_or(0)
            } else {
                0
            }
        };
        let mut sum = 0;
        for i in 0..stubs.len() {
            sum += eligible(i);
        }
        if sum == 0 {
            continue;
        }
        // floor(u·sum) < sum, so the walk always ends on an eligible species.
        let mut pick = (uniform(seed, purpose::STUB_PROMOTION, k as f64, 0.0, season, 0.0)
            * sum as f64)
            .floor() as u32;
        let mut chosen = 0;
        for i in 0..stubs.len() {
            let n = eligible(i);
            if n == 0 {
                continue;
            }
            chosen = i;
            if pick < n {
                break;
            }
            pick -= n;
        }
        world.stubs[chosen].1[k as usize] -= 1;
        let species = world.stubs[chosen].0.clone();
        let (x, z) = centre(k, width);
        let own = world.rules.of(&species);
        let mut seedling = crate::tree::Tree::new(world.trees.len(), x, z);
        let azimuth = seedling_azimuth(own, seedling.id);
        plant_seedling(&mut seedling, own, season + 1.0, 0.0, azimuth);
        seedling.species = species;
        world.trees.push(seedling);
        *live += 1.0;
        planted += 1.0;
    }
    prune(&mut world.stubs);
    planted
}

/// Returns to the pool every bank tree (age ≥ max(1, stubDemoteAge), not drawn) whose top light Q_top/C is below its
/// species' `stubDemote`. Returns how many left the stand.
pub fn demote(world: &mut World) -> f64 {
    let (width, c) = (world.rules.params.world.width, world.rules.params.c2.c);
    if c <= 0.0 {
        return 0.0;
    }
    let mut gone = 0.0;
    for i in 0..world.trees.len() {
        let t = &world.trees[i];
        let own = &world.rules.of(&t.species).o4;
        let (at, from) = (own.stub_demote, math::max(1.0, own.stub_demote_age));
        let q = super::memory::top(&world.rules.params, t); // ADR 0073: the mean, if kept
        if !(t.alive && t.age >= from && at > 0.0) || q >= at {
            continue;
        }
        if crate::stand::is_drawn(crate::stand::stem_height(t)) {
            continue;
        }
        let (x, z, species) = (t.root_x, t.root_z, t.species.clone());
        world.trees[i].alive = false;
        add(&mut world.stubs, &species, x, z, width);
        gone += 1.0;
    }
    gone
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::principles::o4::stand_dynamics;
    use crate::principles::o4::tests::world;

    /// The test world (every cell lit, p_est 1) with stubs on and `patch` over it.
    fn on(patch: &str) -> World {
        let w = world(r#"{"o4":{"stubs":true}}"#);
        World::new(crate::json::merge(
            &w.initial_params,
            &crate::json::parse(patch).unwrap(),
        ))
    }

    #[test]
    fn seeds_that_find_the_cap_full_join_the_pool_and_are_not_lost() {
        // The parent fills a cap of 1: off, every seed is lost; on, each seed that lands in the
        // world (p_est 1) is a stub in its cell, and no tree is added.
        let mut off = world(r#"{"o4":{"maxTrees":1}}"#);
        off.trees[0].seed_pool = 20.0;
        stand_dynamics(&mut off);
        assert!(off.stubs.is_empty());
        let mut w = on(r#"{"o4":{"maxTrees":1}}"#);
        w.trees[0].seed_pool = 20.0; // ten seeds at c_seed 2
        assert_eq!(stand_dynamics(&mut w), 0.0);
        assert_eq!(w.trees.len(), 1);
        let n = total(&w.stubs);
        assert!(n > 5.0 && n <= 10.0, "{n}");
    }

    #[test]
    fn seeds_on_ground_darker_than_stub_light_are_stubs_and_lit_ones_trees() {
        // Every cell is lit (Q/C 1). stubLight 2: nothing is lit enough, so every seed is a stub
        // although the cap has room; stubLight 0.5 (q_est's): the seeds are trees, as off.
        let mut dark = on(r#"{"o4":{"stubLight":2}}"#);
        dark.trees[0].seed_pool = 20.0;
        assert_eq!(stand_dynamics(&mut dark), 0.0);
        assert!(total(&dark.stubs) > 5.0);
        let mut off = world("{}");
        off.trees[0].seed_pool = 20.0;
        let mut lit = on(r#"{"o4":{"stubLight":0.5}}"#);
        lit.trees[0].seed_pool = 20.0;
        let n = stand_dynamics(&mut off);
        assert!(n > 0.0);
        assert_eq!(stand_dynamics(&mut lit), n);
        let xs = |w: &World| w.trees.iter().map(|t| t.root_x).collect::<Vec<_>>();
        assert_eq!(xs(&lit), xs(&off));
    }

    #[test]
    fn a_seed_within_a_cell_of_a_live_trunk_is_a_stub() {
        // Every seed lands on its parent (d → 0): off they are lost, on they are stubs.
        let mut w = on(r#"{"o4":{"d":1e-9}}"#);
        w.trees[0].seed_pool = 20.0;
        assert_eq!(stand_dynamics(&mut w), 0.0);
        assert_eq!(total(&w.stubs), 10.0);
        let (x, z) = (w.trees[0].root_x, w.trees[0].root_z);
        // The parent stands on a cell corner, so the seeds fall in the four cells around it.
        for k in cells_of(&w.stubs, "") {
            let (cx, cz) = centre(k, 100.0);
            assert!((cx - x).abs() < 1.0 && (cz - z).abs() < 1.0, "{k}");
        }
    }

    #[test]
    fn the_death_rate_is_the_suppression_rates_tolerance_scaling_at_a_full_deficit() {
        let rate = |patch: &str| death_rate(on(patch).params());
        assert_eq!(rate("{}"), 0.0); // stubDeath absent: no stub dies
        // Hornbeam's T 3.97 and β_s 0.92 at m_stub 1: e^(−0.92·2.97) ≈ 0.065 (ADR 0068's Context).
        let hornbeam =
            rate(r#"{"o4":{"stubDeath":1,"suppressionSlope":0.92,"shadeTolerance":3.97}}"#);
        assert!((hornbeam - 0.0651).abs() < 1e-4, "{hornbeam}");
        assert_eq!(rate(r#"{"o4":{"stubDeath":5,"shadeTolerance":1}}"#), 1.0); // clamped
    }

    /// A world with stubs on, no parent seed and `n` stubs of no species in the cell at (x, z).
    fn pooled(patch: &str, n: u32, x: f64, z: f64) -> World {
        let mut w = on(patch);
        set(&mut w.stubs, "", cell(x, z, 100.0), n);
        w
    }

    #[test]
    fn stubs_die_at_their_rate_and_none_without_one() {
        let mut keep = pooled("{}", 1000, 10.0, 10.0);
        stand_dynamics(&mut keep);
        // The cell is lit and free and the cap has room, so one of them was promoted.
        assert_eq!(total(&keep.stubs), 999.0);
        let mut half = pooled(
            r#"{"o4":{"stubDeath":0.5,"shadeTolerance":1}}"#,
            1000,
            10.0,
            10.0,
        );
        stand_dynamics(&mut half);
        let n = total(&half.stubs);
        assert!((440.0..560.0).contains(&n), "{n}");
        let mut all = pooled(
            r#"{"o4":{"stubDeath":1,"shadeTolerance":1}}"#,
            1000,
            10.0,
            10.0,
        );
        stand_dynamics(&mut all);
        assert!(all.stubs.is_empty());
        assert_eq!(all.trees.len(), 1); // none was left to promote
    }

    #[test]
    fn a_lit_free_cell_promotes_one_stub_to_a_seedling_at_its_centre_next_season() {
        let mut w = pooled("{}", 3, 10.2, 20.7);
        assert_eq!(stand_dynamics(&mut w), 1.0);
        assert_eq!(total(&w.stubs), 2.0);
        let t = &w.trees[1];
        assert_eq!((t.root_x, t.root_z), (10.5, 20.5));
        assert_eq!(t.m.birth_season[0] as f64, w.season + 1.0);
    }

    #[test]
    fn no_promotion_at_the_cap_in_the_dark_or_beside_a_live_trunk() {
        let at_parent = {
            let w = on("{}");
            (w.trees[0].root_x, w.trees[0].root_z)
        };
        for (patch, (x, z)) in [
            (r#"{"o4":{"maxTrees":1}}"#, (10.0, 10.0)),
            (r#"{"o4":{"stubLight":2}}"#, (10.0, 10.0)),
            ("{}", at_parent),
        ] {
            let mut w = pooled(patch, 3, x, z);
            assert_eq!(stand_dynamics(&mut w), 0.0, "{patch} {x}");
            assert_eq!(total(&w.stubs), 3.0, "{patch} {x}");
        }
    }

    /// The test world's parent as a bank tree of age 1 whose top sees `q` of open sky.
    fn shaded(patch: &str, q: f64) -> World {
        let mut w = on(patch);
        let c = w.params().c2.c;
        (w.trees[0].age, w.trees[0].q_top) = (1.0, q * c);
        w
    }

    #[test]
    fn a_bank_tree_whose_top_is_darker_than_stub_demote_returns_to_its_cells_stubs() {
        let mut w = shaded(r#"{"o4":{"stubDemote":0.075}}"#, 0.05);
        assert!(!crate::stand::is_drawn(crate::stand::stem_height(
            &w.trees[0]
        )));
        let (x, z) = (w.trees[0].root_x, w.trees[0].root_z);
        stand_dynamics(&mut w);
        assert!(!w.trees[0].alive);
        assert_eq!(count(&w.stubs, "", cell(x, z, 100.0)), 1);
        // At or above stubDemote, or with none set, it stays a tree.
        for (patch, q) in [(r#"{"o4":{"stubDemote":0.075}}"#, 0.075), ("{}", 0.0)] {
            let mut w = shaded(patch, q);
            stand_dynamics(&mut w);
            assert!(w.trees[0].alive && w.stubs.is_empty(), "{patch} {q}");
        }
    }

    #[test]
    fn with_stub_demote_age_k_a_bank_tree_younger_than_k_stays_a_tree() {
        let gated = r#"{"o4":{"stubDemote":0.075,"stubDemoteAge":3}}"#;
        let mut young = shaded(gated, 0.0);
        young.trees[0].age = 2.0;
        stand_dynamics(&mut young);
        assert!(young.trees[0].alive && young.stubs.is_empty());
        let mut old = shaded(gated, 0.0);
        old.trees[0].age = 3.0;
        stand_dynamics(&mut old);
        assert!(!old.trees[0].alive);
        assert_eq!(total(&old.stubs), 1.0);
    }

    #[test]
    fn stub_light_y_moves_where_a_seed_and_a_stubs_cell_are_sampled() {
        // The test world is lit inside the slab and dark above it: sampled above the slab's top,
        // no seed is lit (every seed is a stub) and no stub is promoted.
        let high = r#"{"o4":{"stubLightY":1e6}}"#;
        let mut w = on(high);
        w.trees[0].seed_pool = 20.0;
        assert_eq!(stand_dynamics(&mut w), 0.0);
        assert!(total(&w.stubs) > 5.0);
        let mut p = pooled(high, 3, 10.0, 10.0);
        assert_eq!(stand_dynamics(&mut p), 0.0);
        assert_eq!(total(&p.stubs), 3.0);
        // Within the slab it is lit at any height: as the default.
        let mut low = pooled(r#"{"o4":{"stubLightY":2.5}}"#, 3, 10.0, 10.0);
        assert_eq!(stand_dynamics(&mut low), 1.0);
    }

    #[test]
    fn a_drawn_tree_or_a_seedling_of_this_season_is_never_demoted() {
        let mut young = shaded(r#"{"o4":{"stubDemote":0.075}}"#, 0.0);
        young.trees[0].age = 0.0;
        stand_dynamics(&mut young);
        assert!(young.trees[0].alive);
        let mut tall = shaded(r#"{"o4":{"stubDemote":0.075}}"#, 0.0);
        let t = &mut tall.trees[0];
        for i in 0..t.m.len() {
            t.m.length[i] = 10.0; // well over 1.3 m (5.2 cells)
        }
        assert!(crate::stand::is_drawn(crate::stand::stem_height(t)));
        stand_dynamics(&mut tall);
        assert!(tall.trees[0].alive);
    }

    #[test]
    fn with_room_for_one_the_brightest_cell_wins_and_ties_go_to_the_lower_cell() {
        // Every cell is equally lit here, so the tie-break decides: cell (10, 3) before (80, 40).
        let mut w = pooled(r#"{"o4":{"maxTrees":2}}"#, 1, 80.0, 40.0);
        set(&mut w.stubs, "", cell(10.0, 3.0, 100.0), 1);
        assert_eq!(stand_dynamics(&mut w), 1.0);
        assert_eq!((w.trees[1].root_x, w.trees[1].root_z), (10.5, 3.5));
        assert_eq!(count(&w.stubs, "", cell(80.0, 40.0, 100.0)), 1);
    }
}
