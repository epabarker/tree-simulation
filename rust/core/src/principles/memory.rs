//! O4's light memory (ADR 0073; #137): establishment and the understorey read a running mean of
//! light, not one season's.
//!
//! Rule: with the world's `o4.lightMemory` τ > 0 (seasons), stand dynamics (spec §O4, phase 3)
//! first folds this season's light into two exponential running means, m ← m + a·(x − m) with
//! a = 1 − e^(−1/τ), so a reading's weight falls by e every τ seasons. (1) Per live tree, of its
//! crown-top light Q_top/C (C5's, phase 2): a tree with no mean yet starts from its ground cell's
//! mean as it stood before this season's fold (where cells have one; else from this season's
//! reading), then folds this season's in. (2) Per ground cell (x and z floored, `stubs::cell`), of
//! the ground light Q/C sampled at the cell's centre at `o4.stubLightY` (absent 0.5): cells start
//! from their first season's light. Then O4 reads the means where it read one season: the
//! establishment test (q_est, and stubs' stubLight) and stub promotion read the cell's mean; stub
//! demotion and the `topLight` suppression signal (ADR 0068's ramp) read the tree's. Staging (spec
//! §6): every reading is of the start-of-season light field; a tree planted this season has no
//! mean until the next season's fold. Turned off by a params patch the means freeze (still saved
//! and hashed) and every rule reads one season again, as HEAD.
//!
//! Why: under a closed canopy the garden's rotating 16-direction sky makes each cell's floor light
//! a fresh draw every season (rank correlation 0.02 from one season to the next;
//! docs/experiments/2026-11-16-stub-churn-and-hornbeam-ceiling.md, B.1), so a test of one season
//! selects the season's luckiest cells and the next season undoes it. Seedling survival responds
//! to light integrated over years (ADR 0073's sources).
//!
//! Params: o4.lightMemory (the world's; absent or 0: off, bit-identical), o4.stubLightY; c2.C.
//! No randomness.

use super::stubs::{cell, centre};
use crate::math;
use crate::params::Params;
use crate::tree::Tree;
use crate::world::World;

/// The weight of a new reading, 1 − e^(−1/τ); 0 when the memory is off (τ ≤ 0 or absent).
pub fn rate(tau: f64) -> f64 {
    if tau > 0.0 {
        1.0 - math::exp(-1.0 / tau)
    } else {
        0.0
    }
}

/// One season of an exponential running mean: m + a·(x − m).
pub fn fold(mean: f64, x: f64, a: f64) -> f64 {
    mean + a * (x - mean)
}

/// Whether the world's light memory is on.
pub fn on(params: &Params) -> bool {
    params.o4.light_memory > 0.0
}

/// The ground cells of the world, ⌈width⌉ × ⌈depth⌉.
fn cells(params: &Params) -> usize {
    let depth = crate::light::depth_of(params);
    (params.world.width.ceil() * depth.ceil()) as usize
}

/// Folds this season's light into the trees' and the cells' means (the module's rule, (1) then
/// (2)). Does nothing with the memory off or C ≤ 0.
pub fn update(world: &mut World) {
    let params = &world.rules.params;
    let (c, width, y) = (params.c2.c, params.world.width, params.o4.stub_light_y);
    let a = rate(params.o4.light_memory);
    if !(a > 0.0 && c > 0.0) {
        return;
    }
    let n = cells(params);
    for i in 0..world.trees.len() {
        let t = &world.trees[i];
        if !t.alive {
            continue;
        }
        let x = t.q_top / c;
        let start = t.light_mean.or_else(|| {
            let k = cell(t.root_x, t.root_z, width) as usize;
            world.ground_light.get(k).copied()
        });
        world.trees[i].light_mean = Some(match start {
            Some(m) => fold(m, x, a),
            None => x,
        });
    }
    let fresh = world.ground_light.len() != n;
    if fresh {
        world.ground_light = vec![0.0; n];
    }
    for k in 0..n {
        let (x, z) = centre(k as u32, width);
        // A fractional width's last column is read at its middle inside the world.
        let x = math::min(x, (x - 0.5 + width) / 2.0);
        let q = world.light.sample(x, y, z).0 / c;
        let m = &mut world.ground_light[k];
        *m = if fresh { q } else { fold(*m, q, a) };
    }
}

/// The ground light (Q/C) O4 reads at (x, z): the cell's running mean with the memory on (and
/// filled), else this season's sample at height `y`.
pub fn ground(world: &World, x: f64, y: f64, z: f64) -> f64 {
    let params = &world.rules.params;
    let c = params.c2.c;
    if on(params) {
        let k = cell(x, z, params.world.width) as usize;
        if let Some(&m) = world.ground_light.get(k) {
            return m;
        }
    }
    world.light.sample(x, y, z).0 / c
}

/// The crown-top light (Q_top/C) stub demotion and the `topLight` signal read: the tree's running
/// mean with the memory on (and filled), else this season's. #132's ramp reads it through here.
pub fn top(params: &Params, t: &Tree) -> f64 {
    match t.light_mean {
        Some(m) if on(params) => m,
        _ => t.q_top / params.c2.c,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::principles::o4::stand_dynamics;
    use crate::principles::o4::tests::world;

    #[test]
    fn the_rate_is_one_less_e_to_the_minus_one_over_tau_and_off_is_zero() {
        assert_eq!(rate(0.0), 0.0);
        assert_eq!(rate(-3.0), 0.0);
        assert!((rate(1.0) - 0.632_120_558_8).abs() < 1e-9);
        // After τ seasons of a step from 0 to 1, the mean has come 1 − 1/e of the way.
        let a = rate(5.0);
        let mut m = 0.0;
        for _ in 0..5 {
            m = fold(m, 1.0, a);
        }
        assert!((m - (1.0 - math::exp(-1.0))).abs() < 1e-12, "{m}");
    }

    #[test]
    fn a_params_patch_that_changes_the_ground_layout_restarts_the_cells() {
        // 100 × D to 50 × 2D keeps the cell count but not the layout: the means restart.
        let mut w = world(r#"{"o4":{"lightMemory":4}}"#);
        update(&mut w);
        w.ground_light[0] = 0.25;
        let d = crate::light::depth_of(w.params());
        let patch = format!(r#"{{"world":{{"width":50,"depth":{}}}}}"#, 2.0 * d);
        let e = format!(r#"{{"season":0,"type":"params","patch":{patch}}}"#);
        w.apply(crate::json::parse(&e).unwrap());
        assert!(w.ground_light.is_empty());
        // A patch that leaves the layout keeps them.
        update(&mut w);
        w.ground_light[0] = 0.25;
        w.apply(
            crate::json::parse(r#"{"season":0,"type":"params","patch":{"o4":{"lightMemory":5}}}"#)
                .unwrap(),
        );
        assert_eq!(w.ground_light[0], 0.25);
    }

    #[test]
    fn off_nothing_is_kept_and_every_read_is_this_seasons() {
        let mut w = world("{}");
        let c = w.params().c2.c;
        w.trees[0].q_top = 0.3 * c;
        stand_dynamics(&mut w);
        assert!(w.ground_light.is_empty() && w.trees[0].light_mean.is_none());
        assert_eq!(top(w.params(), &w.trees[0]), 0.3);
        assert_eq!(ground(&w, 10.0, 0.5, 10.0), 1.0);
    }

    #[test]
    fn cells_start_from_their_first_seasons_light_then_fold() {
        let mut w = world(r#"{"o4":{"lightMemory":4}}"#);
        update(&mut w);
        let n = w.ground_light.len();
        assert_eq!(n, 100 * crate::light::depth_of(w.params()).ceil() as usize);
        assert!(w.ground_light.iter().all(|&m| m == 1.0)); // the test world is lit everywhere
        // A cell darker than this season's field comes toward it by a.
        w.ground_light[7] = 0.0;
        update(&mut w);
        assert!((w.ground_light[7] - rate(4.0)).abs() < 1e-12);
    }

    #[test]
    fn a_tree_without_a_mean_starts_from_its_cells_and_folds_its_top_light_in() {
        let mut w = world(r#"{"o4":{"lightMemory":4}}"#);
        let c = w.params().c2.c;
        // No cell means yet: the first reading is the mean.
        w.trees[0].q_top = 0.2 * c;
        update(&mut w);
        assert_eq!(w.trees[0].light_mean, Some(0.2));
        // A new tree with cell means: from its cell's mean (0.5 here), then this season's 0.
        let k = cell(w.trees[0].root_x, w.trees[0].root_z, 100.0) as usize;
        w.ground_light[k] = 0.5;
        w.trees[0].light_mean = None;
        w.trees[0].q_top = 0.0;
        update(&mut w);
        let expect = fold(0.5, 0.0, rate(4.0));
        assert!((w.trees[0].light_mean.unwrap() - expect).abs() < 1e-12);
        assert_eq!(top(w.params(), &w.trees[0]), w.trees[0].light_mean.unwrap());
    }

    #[test]
    fn establishment_reads_the_cells_mean_so_a_dark_history_keeps_a_lit_season_out() {
        // Every cell is lit this season (Q/C 1, q_est 0.5), but with τ 10 a cell whose mean was
        // 0 is still dark after one season's fold (a ≈ 0.095): no seed establishes.
        let mut lit = world(r#"{"o4":{"lightMemory":10}}"#);
        lit.trees[0].seed_pool = 20.0;
        assert!(
            stand_dynamics(&mut lit) > 0.0,
            "the first season's cells are this season's"
        );
        let mut dark = world(r#"{"o4":{"lightMemory":10}}"#);
        update(&mut dark);
        for m in dark.ground_light.iter_mut() {
            *m = 0.0;
        }
        dark.trees[0].seed_pool = 20.0;
        assert_eq!(stand_dynamics(&mut dark), 0.0);
    }

    #[test]
    fn demotion_reads_the_trees_mean_so_one_dark_season_does_not_return_a_lit_tree() {
        let patch = r#"{"o4":{"stubs":true,"stubDemote":0.075,"lightMemory":5}}"#;
        let mut w = world(patch);
        let c = w.params().c2.c;
        (w.trees[0].age, w.trees[0].q_top) = (1.0, 0.0);
        w.trees[0].light_mean = Some(0.2); // lit until now
        stand_dynamics(&mut w);
        assert!(w.trees[0].alive, "mean {:?}", w.trees[0].light_mean);
        // Without the memory the same dark season demotes it.
        let mut off = world(r#"{"o4":{"stubs":true,"stubDemote":0.075}}"#);
        (off.trees[0].age, off.trees[0].q_top) = (1.0, 0.0 * c);
        stand_dynamics(&mut off);
        assert!(!off.trees[0].alive);
    }

    #[test]
    fn the_top_light_signal_reads_the_trees_mean() {
        let patch = |tau: f64| {
            format!(
                r#"{{"o4":{{"mortality":"twoPart","mSuppression":1,"suppressionSlope":1,
                   "shadeTolerance":1,"suppressionSignal":"topLight","topLightThreshold":0.25,
                   "lightMemory":{tau}}}}}"#
            )
        };
        // A dark top this season (a deficit of 1 kills at m_s 1, T 1) after lit seasons.
        let mut w = world(&patch(20.0));
        (w.trees[0].age, w.trees[0].q_top) = (3.0, 0.0);
        w.trees[0].light_mean = Some(1.0);
        stand_dynamics(&mut w);
        assert!(w.trees[0].alive);
        let mut off = world(&patch(0.0));
        (off.trees[0].age, off.trees[0].q_top) = (3.0, 0.0);
        off.trees[0].light_mean = Some(1.0); // kept but frozen: ignored with the memory off
        stand_dynamics(&mut off);
        assert!(!off.trees[0].alive);
    }
}
