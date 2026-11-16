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
//! Params: o4.stubs (the world's), o4.stubLight, o4.stubDeath and o4.stubDemote (species-merged),
//! with o4.qEst,
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

/// One more stub of `species` in the cell at (x, z).
pub fn add(stubs: &mut Stubs, species: &str, x: f64, z: f64, width: f64) {
    let n = stubs
        .entry(species.to_string())
        .or_default()
        .entry(cell(x, z, width))
        .or_insert(0);
    *n += 1;
}

/// The stubs in the pool, every species.
pub fn total(stubs: &Stubs) -> f64 {
    stubs
        .values()
        .map(|cells| cells.values().map(|&n| n as f64).sum::<f64>())
        .sum()
}

/// This season's stub deaths: each stub that began the season draws once against its species'
/// rate. Stubs are exchangeable, so the k-th stub of a cell's count is keyed by k.
pub fn deaths(world: &mut World) {
    let (seed, season) = (world.rules.params.seed, world.season);
    let rates: Vec<(String, f64, f64)> = world
        .stubs
        .keys()
        .map(|sp| (sp.clone(), death_rate(world.rules.of(sp)), species_key(sp)))
        .collect();
    for (sp, rate, key) in rates {
        if !(rate > 0.0) {
            continue;
        }
        let Some(cells) = world.stubs.get_mut(&sp) else {
            continue;
        };
        for (&c, n) in cells.iter_mut() {
            let mut alive = 0;
            for k in 0..*n {
                if uniform(seed, purpose::STUB_DEATH, c as f64, key, season, k as f64) >= rate {
                    alive += 1;
                }
            }
            *n = alive;
        }
        cells.retain(|_, n| *n > 0);
    }
    world.stubs.retain(|_, cells| !cells.is_empty());
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
    let cells: std::collections::BTreeSet<u32> = world
        .stubs
        .values()
        .flat_map(|m| m.keys().copied())
        .collect();
    let mut lit: Vec<(f64, u32)> = cells
        .into_iter()
        .filter(|&k| !taken.get(k as usize).copied().unwrap_or(true))
        .map(|k| {
            let (x, z) = centre(k, width);
            (world.light.sample(x, 0.5, z).0 / c, k)
        })
        .collect();
    lit.sort_by(|a, b| b.0.total_cmp(&a.0).then(a.1.cmp(&b.1)));
    let thresholds: Vec<(String, f64)> = world
        .stubs
        .keys()
        .map(|sp| (sp.clone(), threshold(world.rules.of(sp))))
        .collect();
    let mut planted = 0.0;
    for (q, k) in lit {
        if *live >= max_trees {
            break;
        }
        let eligible: Vec<(&str, u32)> = thresholds
            .iter()
            .filter(|(_, at)| q >= *at)
            .filter_map(|(sp, _)| {
                let n = world.stubs.get(sp)?.get(&k).copied()?;
                Some((sp.as_str(), n))
            })
            .collect();
        let sum: u32 = eligible.iter().map(|e| e.1).sum();
        if sum == 0 {
            continue;
        }
        let mut pick = (uniform(seed, purpose::STUB_PROMOTION, k as f64, 0.0, season, 0.0)
            * sum as f64)
            .floor() as u32;
        let mut species = eligible[eligible.len() - 1].0.to_string();
        for (sp, n) in &eligible {
            if pick < *n {
                species = sp.to_string();
                break;
            }
            pick -= n;
        }
        let cells = world.stubs.get_mut(&species).unwrap();
        let n = cells.get_mut(&k).unwrap();
        *n -= 1;
        if *n == 0 {
            cells.remove(&k);
            if cells.is_empty() {
                world.stubs.remove(&species);
            }
        }
        let (x, z) = centre(k, width);
        let own = world.rules.of(&species).clone();
        let mut seedling = crate::tree::Tree::new(world.trees.len(), x, z);
        seedling.species = species;
        let azimuth = seedling_azimuth(&own, seedling.id);
        plant_seedling(&mut seedling, &own, season + 1.0, 0.0, azimuth);
        world.trees.push(seedling);
        *live += 1.0;
        planted += 1.0;
    }
    planted
}

/// Returns to the pool every bank tree (age ≥ 1, not drawn) whose top light Q_top/C is below its
/// species' `stubDemote`. Returns how many left the stand.
pub fn demote(world: &mut World) -> f64 {
    let (width, c) = (world.rules.params.world.width, world.rules.params.c2.c);
    if c <= 0.0 {
        return 0.0;
    }
    let mut gone = 0.0;
    for i in 0..world.trees.len() {
        let t = &world.trees[i];
        let at = world.rules.of(&t.species).o4.stub_demote;
        if !(t.alive && t.age >= 1.0 && at > 0.0) || t.q_top / c >= at {
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
        for &k in w.stubs[""].keys() {
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
        w.stubs
            .entry(String::new())
            .or_default()
            .insert(cell(x, z, 100.0), n);
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
        assert_eq!(w.stubs[""][&cell(x, z, 100.0)], 1);
        // At or above stubDemote, or with none set, it stays a tree.
        for (patch, q) in [(r#"{"o4":{"stubDemote":0.075}}"#, 0.075), ("{}", 0.0)] {
            let mut w = shaded(patch, q);
            stand_dynamics(&mut w);
            assert!(w.trees[0].alive && w.stubs.is_empty(), "{patch} {q}");
        }
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
        w.stubs
            .get_mut("")
            .unwrap()
            .insert(cell(10.0, 3.0, 100.0), 1);
        assert_eq!(stand_dynamics(&mut w), 1.0);
        assert_eq!((w.trees[1].root_x, w.trees[1].root_z), (10.5, 3.5));
        assert!(w.stubs[""].contains_key(&cell(80.0, 40.0, 100.0)));
    }
}
