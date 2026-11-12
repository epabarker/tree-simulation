//! The stand's measures, per world and season (ADR 0063, ADR 0065,
//! docs/features/stand-density-and-demography.md).
//!
//! The display threshold is the rule for which stems are **drawn**: a tree is drawn from
//! DISPLAY_THRESHOLD (1.3 m, the forestry convention for counting a stem; a cell is CELL_METRES).
//! Below it is the seedling bank, simulated and not drawn. It is stated here once: the stand's
//! counts use it, and the snapshot or the page must call `is_drawn`, never re-state it.

use crate::math;
use crate::tree::Tree;
use crate::world::World;
use std::collections::BTreeMap;

/// Metres per cell, the one scale between the grid and the playbook's metres and hectares. ADR 0062
/// reads the garden's 64-cell depth as 16 m and the stand-density page the 160-cell garden as
/// ≈ 0.064 ha: a cell is 0.25 m.
pub const CELL_METRES: f64 = 0.25;

/// The height from which a stem is drawn and counted (ADR 0063, decision 6): 1.3 m, in cells.
pub const DISPLAY_THRESHOLD: f64 = 1.3 / CELL_METRES;

/// Whether a stem of this height is drawn: at or above the display threshold.
pub fn is_drawn(height: f64) -> bool {
    height >= DISPLAY_THRESHOLD
}

/// A tree's height as metrics.csv's `height` reads it: its highest metamer tip, 0 with none.
pub fn stem_height(tree: &Tree) -> f64 {
    let mut height = 0.0;
    for i in 0..tree.m.len() {
        height = math::max(height, tree.tip_y(i));
    }
    height
}

/// Whether the cap is reached: O4 on and the live trees, the seedling bank included, fill
/// `o4.maxTrees` (the test establishment stops at). The cap is a compute guard only (ADR 0063,
/// decision 2); reaching it is a reported count of seasons, not a failure (ADR 0065, decision 2),
/// so it is a measure and a notice.
pub fn cap_reached(world: &World) -> bool {
    let o4 = &world.params().o4;
    o4.enabled && world.trees.iter().filter(|t| t.alive).count() as f64 >= o4.max_trees
}

/// The canopy's reference height (ADR 0065, decision 3): the 90th percentile of the drawn stems'
/// `heights`, by nearest rank, the ⌈0.9·n⌉-th smallest (1-based); 0 with none. A canopy stem is
/// over half of it. Not the single tallest tree: one 40–45 m leader halved the canopy count for
/// decades (docs/experiments/2026-11-11-garden-pathlength-probe.md §5). Below ten drawn stems
/// the nearest rank is the tallest, so a small stand (the phone's) reads as before.
pub fn canopy_height(heights: &[f64]) -> f64 {
    if heights.is_empty() {
        return 0.0;
    }
    let mut sorted = heights.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));
    // ⌈9n/10⌉ in integers, so no float rounding moves the rank.
    let rank = (9 * sorted.len()).div_ceil(10);
    sorted[rank - 1]
}

/// One species' stems in the stand.
pub struct SpeciesStems {
    pub species: String,
    pub live: f64,
    pub drawn: f64,
    /// Its share of the stand's drawn stems; 0 when nothing is drawn.
    pub share: f64,
}

/// The stand at the end of a season (stand.csv and stand-species.csv in the CLI).
pub struct StandMetrics {
    /// Live trees, the seedling bank included: what the cap (`o4.maxTrees`) counts.
    pub live: f64,
    /// Live trees at or above the display threshold.
    pub drawn: f64,
    /// Drawn trees over half the canopy height (strictly over; ADR 0065).
    pub canopy: f64,
    /// The canopy's reference height: the drawn stems' 90th-percentile height (`canopy_height`).
    pub canopy_height: f64,
    /// The tallest live tree's height.
    pub top_height: f64,
    /// O4 on and the live trees fill `o4.maxTrees`, the test establishment stops at.
    pub cap_reached: bool,
    /// By species name, in name order; species with no live tree are left out.
    pub species: Vec<SpeciesStems>,
}

pub fn stand_metrics(world: &World) -> StandMetrics {
    let live: Vec<(&Tree, f64)> = world
        .trees
        .iter()
        .filter(|t| t.alive)
        .map(|t| (t, stem_height(t)))
        .collect();
    let top = live.iter().fold(0.0, |m, &(_, h)| math::max(m, h));
    let drawn_heights: Vec<f64> = live
        .iter()
        .map(|&(_, h)| h)
        .filter(|&h| is_drawn(h))
        .collect();
    let drawn = drawn_heights.len() as f64;
    let reference = canopy_height(&drawn_heights);
    let canopy = drawn_heights
        .iter()
        .filter(|&&h| h > 0.5 * reference)
        .count() as f64;
    let mut by: BTreeMap<&str, (f64, f64)> = BTreeMap::new();
    for &(t, h) in &live {
        let e = by.entry(t.species.as_str()).or_insert((0.0, 0.0));
        e.0 += 1.0;
        if is_drawn(h) {
            e.1 += 1.0;
        }
    }
    StandMetrics {
        live: live.len() as f64,
        drawn,
        canopy,
        canopy_height: reference,
        top_height: top,
        cap_reached: cap_reached(world),
        species: by
            .into_iter()
            .map(|(s, (l, d))| SpeciesStems {
                species: s.to_string(),
                live: l,
                drawn: d,
                share: if drawn > 0.0 { d / drawn } else { 0.0 },
            })
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::metamer;
    use crate::tree::slot;

    #[test]
    fn a_stem_is_drawn_from_the_display_threshold_and_not_just_below_it() {
        // 1.3 m is 5.2 cells.
        assert!(is_drawn(5.2));
        assert!(!is_drawn(5.199_999));
        assert!(!is_drawn(0.0));
        assert!(!is_drawn(1.3));
        assert!(is_drawn(20.0));
    }

    /// A tree of one upright metamer of `height`.
    fn stem(id: usize, species: &str, height: f64) -> Tree {
        let mut t = Tree::new(id, id as f64 * 3.0, 0.5);
        t.species = species.into();
        metamer(
            &mut t,
            -1,
            slot::MAIN,
            std::f64::consts::FRAC_PI_2,
            height,
            0.1,
            0.0,
        );
        t
    }

    fn stand(trees: Vec<Tree>, max_trees: f64) -> World {
        let patch = format!(r#"{{"o4":{{"enabled":true,"maxTrees":{max_trees}}}}}"#);
        let mut w = World::new(crate::testing::preset("default", &patch));
        w.trees = trees;
        w
    }

    #[test]
    fn a_fixed_stand_gives_its_live_drawn_and_canopy_counts_and_species_shares() {
        // Live heights in cells: 2, 5.16 (1.29 m), 5.2 (1.3 m), 20 (exactly half the canopy height,
        // which with four drawn stems is the tallest: not canopy),
        // 24 and 40; a dead 120-cell
        // stem sets neither the top height nor any count; a planted seedling with no metamer yet
        // is live and not drawn.
        let mut dead = stem(6, "oak", 120.0);
        dead.alive = false;
        let mut seedling = Tree::new(7, 21.0, 0.5);
        seedling.species = "beech".into();
        let w = stand(
            vec![
                stem(0, "beech", 2.0),
                stem(1, "beech", 5.16),
                stem(2, "beech", 5.2),
                stem(3, "oak", 20.0),
                stem(4, "oak", 24.0),
                stem(5, "beech", 40.0),
                dead,
                seedling,
            ],
            100.0,
        );
        let s = stand_metrics(&w);
        assert_eq!(s.live, 7.0);
        assert_eq!(s.drawn, 4.0);
        assert_eq!(s.canopy, 2.0);
        assert_eq!(s.top_height, 40.0);
        assert!(!s.cap_reached);
        let by: Vec<(&str, f64, f64, f64)> = s
            .species
            .iter()
            .map(|p| (p.species.as_str(), p.live, p.drawn, p.share))
            .collect();
        assert_eq!(by, vec![("beech", 5.0, 2.0, 0.5), ("oak", 2.0, 2.0, 0.5)]);
    }

    #[test]
    fn the_cap_is_reached_when_the_live_stems_fill_it_seedling_bank_included() {
        let trees = || vec![stem(0, "oak", 2.0), stem(1, "oak", 32.0)];
        assert!(stand_metrics(&stand(trees(), 2.0)).cap_reached);
        assert!(!stand_metrics(&stand(trees(), 3.0)).cap_reached);
    }

    /// The seasons (as stand.csv numbers them, after the season ran) with a capReached notice,
    /// and the first season stand_metrics flags the cap, over `seasons` seasons.
    fn cap_run(patch: &str, seasons: usize) -> (Vec<f64>, Option<f64>) {
        let mut w = crate::principles::o4::tests::world(patch);
        let mut first = None;
        for _ in 0..seasons {
            w.step(&mut |_| {});
            if first.is_none() && stand_metrics(&w).cap_reached {
                first = Some(w.season);
            }
        }
        let record = w.record();
        let notices = match record.get("notices") {
            Some(crate::json::Value::Arr(n)) => n.clone(),
            other => panic!("no notices in the record: {other:?}"),
        };
        let seasons = notices
            .iter()
            .map(|e| {
                assert_eq!(e.get("type").and_then(|t| t.as_str()), Some("capReached"));
                e.get("season").and_then(|s| s.as_f64()).unwrap()
            })
            .collect();
        (seasons, first)
    }

    #[test]
    fn reaching_the_cap_emits_one_notice_at_the_season_the_measure_first_flags_it() {
        // One tree, planted at season 3, fills a cap of one from then on.
        let (notices, first) = cap_run(
            r#"{"trees":[{"x":50,"plantSeason":3}],"o4":{"maxTrees":1}}"#,
            8,
        );
        assert_eq!(first, Some(4.0));
        assert_eq!(notices, vec![4.0]);
        // Never reached, never noticed.
        assert_eq!(cap_run("{}", 8), (vec![], None));
    }

    #[test]
    fn one_tall_outlier_does_not_halve_the_canopy_count() {
        // ADR 0065: canopy is over half the 90th-percentile height of the drawn stems, not half
        // the single tallest tree. Nine 20-cell (5 m) stems and one 100-cell (25 m) leader: half
        // the tallest (50) would leave the leader alone in the canopy; the 90th percentile (the
        // 9th of 10 by nearest rank) is 20, so every stem over 10 cells is canopy.
        let mut trees: Vec<Tree> = (0..9).map(|i| stem(i, "beech", 20.0)).collect();
        trees.push(stem(9, "oak", 100.0));
        // The seedling bank does not set the percentile: twenty 2-cell seedlings change nothing.
        trees.extend((10..30).map(|i| stem(i, "hornbeam", 2.0)));
        let s = stand_metrics(&stand(trees, 100.0));
        assert_eq!(s.drawn, 10.0);
        assert_eq!(s.canopy_height, 20.0);
        assert_eq!(s.canopy, 10.0);
        assert_eq!(s.top_height, 100.0);
    }

    #[test]
    fn the_canopy_height_is_the_nearest_rank_90th_percentile_of_drawn_heights() {
        // Worked: the ⌈0.9·n⌉-th smallest drawn height (1-based). n = 20 → the 18th; n = 5 → the
        // 5th (the tallest: below ten drawn stems the percentile is the top); none drawn → 0.
        let heights: Vec<f64> = (1..=20).map(|k| 5.0 + k as f64).collect();
        assert_eq!(canopy_height(&heights), 23.0);
        assert_eq!(canopy_height(&[30.0, 6.0, 10.0, 8.0, 7.0]), 30.0);
        assert_eq!(canopy_height(&[]), 0.0);
    }

    #[test]
    fn a_stand_with_nothing_drawn_has_no_canopy_and_zero_shares() {
        let s = stand_metrics(&stand(vec![stem(0, "oak", 4.0)], 100.0));
        assert_eq!((s.live, s.drawn, s.canopy), (1.0, 0.0, 0.0));
        assert_eq!(s.species[0].share, 0.0);
    }
}
