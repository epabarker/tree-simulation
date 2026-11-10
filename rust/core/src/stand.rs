//! The stand's measures, per world and season (ADR 0063, docs/features/stand-density-and-demography.md).
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
        // Live heights in cells: 2, 5.16 (1.29 m), 5.2 (1.3 m), 20 (exactly half the top: not canopy),
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

    #[test]
    fn a_stand_with_nothing_drawn_has_no_canopy_and_zero_shares() {
        let s = stand_metrics(&stand(vec![stem(0, "oak", 4.0)], 100.0));
        assert_eq!((s.live, s.drawn, s.canopy), (1.0, 0.0, 0.0));
        assert_eq!(s.species[0].share, 0.0);
    }
}
