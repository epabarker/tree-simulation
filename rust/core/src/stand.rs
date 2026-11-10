//! The stand's measures, per world and season (ADR 0063, docs/features/stand-density-and-demography.md).
//!
//! The display threshold is the rule for which stems are **drawn**: a tree is drawn from
//! DISPLAY_THRESHOLD (1.3 m, the forestry convention for counting a stem; one cell is 1 m).
//! Below it is the seedling bank, simulated and not drawn. It is stated here once: the stand's
//! counts use it, and the snapshot or the page must call `is_drawn`, never re-state it.

use crate::math;
use crate::tree::Tree;
use crate::world::World;
use std::collections::BTreeMap;

/// The height from which a stem is drawn and counted (ADR 0063, decision 6), in cells (1 m).
pub const DISPLAY_THRESHOLD: f64 = 1.3;

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
    /// Drawn trees over half the top height (strictly over).
    pub canopy: f64,
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
    let drawn = live.iter().filter(|&&(_, h)| is_drawn(h)).count() as f64;
    let canopy = live
        .iter()
        .filter(|&&(_, h)| is_drawn(h) && h > 0.5 * top)
        .count() as f64;
    let mut by: BTreeMap<&str, (f64, f64)> = BTreeMap::new();
    for &(t, h) in &live {
        let e = by.entry(t.species.as_str()).or_insert((0.0, 0.0));
        e.0 += 1.0;
        if is_drawn(h) {
            e.1 += 1.0;
        }
    }
    let o4 = &world.params().o4;
    StandMetrics {
        live: live.len() as f64,
        drawn,
        canopy,
        top_height: top,
        cap_reached: o4.enabled && live.len() as f64 >= o4.max_trees,
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
        assert!(is_drawn(1.3));
        assert!(!is_drawn(1.299_999));
        assert!(!is_drawn(0.0));
        assert!(is_drawn(20.0));
    }

    /// A tree of one upright metamer of `height`.
    fn stem(id: usize, species: &str, height: f64) -> Tree {
        let mut t = Tree::new(id, id as f64 * 3.0, 0.5);
        t.species = species.into();
        metamer(&mut t, -1, slot::MAIN, std::f64::consts::FRAC_PI_2, height, 0.1, 0.0);
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
        // Live heights 0.5, 1.29, 1.3, 5 (exactly half the top: not canopy), 6 and 10; a dead 30 m
        // stem sets neither the top height nor any count; a planted seedling with no metamer yet
        // is live and not drawn.
        let mut dead = stem(6, "oak", 30.0);
        dead.alive = false;
        let mut seedling = Tree::new(7, 21.0, 0.5);
        seedling.species = "beech".into();
        let w = stand(
            vec![
                stem(0, "beech", 0.5),
                stem(1, "beech", 1.29),
                stem(2, "beech", 1.3),
                stem(3, "oak", 5.0),
                stem(4, "oak", 6.0),
                stem(5, "beech", 10.0),
                dead,
                seedling,
            ],
            100.0,
        );
        let s = stand_metrics(&w);
        assert_eq!(s.live, 7.0);
        assert_eq!(s.drawn, 4.0);
        assert_eq!(s.canopy, 2.0);
        assert_eq!(s.top_height, 10.0);
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
        let trees = || vec![stem(0, "oak", 0.5), stem(1, "oak", 8.0)];
        assert!(stand_metrics(&stand(trees(), 2.0)).cap_reached);
        assert!(!stand_metrics(&stand(trees(), 3.0)).cap_reached);
    }

    #[test]
    fn a_stand_with_nothing_drawn_has_no_canopy_and_zero_shares() {
        let s = stand_metrics(&stand(vec![stem(0, "oak", 1.0)], 100.0));
        assert_eq!((s.live, s.drawn, s.canopy), (1.0, 0.0, 0.0));
        assert_eq!(s.species[0].share, 0.0);
    }
}
