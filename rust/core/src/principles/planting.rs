//! O4's planting at a density (spec §O4; ADR 0063, decision 5; ADR 0058, the periodic depth).
//!
//! Rule: with `o4.planting` set, the world's starting trees are not `trees` but a stand of
//! `density` saplings per hectare over the whole width × depth, the same per area at every width.
//! Positions are darts from the keyed RNG (purpose PLANTING, the attempt as the entity): a dart
//! closer than `spacing` cells to a planted tree is discarded. Distances wrap across x when
//! `world.sides` is periodic and across z when `world.sidesZ` is. Tree k of the planting takes
//! `species[(k + seed) mod n]`, the cycle `forestParams` turns by the seed today.
//!
//! Params: `o4.planting` { density (stems/ha), spacing (cells), species (names, cycled) };
//! absent, today's planting (`trees`), bit for bit. `seed`, `world.width`, `world.depth`,
//! `world.sides`, `world.sidesZ`.

use crate::light::depth_of;
use crate::math;
use crate::params::{Params, TreeSpec};
use crate::rng::{purpose, uniform};
use crate::stand::plot_hectares;

/// The planted stand's trees, in planting order.
pub fn plant(params: &Params) -> Vec<TreeSpec> {
    let Some(p) = &params.o4.planting else {
        return params.trees.clone();
    };
    let (w, d) = (params.world.width, depth_of(params));
    let hectares = plot_hectares(params);
    let n = math::max(0.0, math::round(p.density * hectares)) as usize;
    // Distance along one axis, the short way round when that axis wraps.
    let along = |a: f64, b: f64, size: f64, wraps: bool| {
        let gap = (a - b).abs();
        if wraps {
            math::min(gap, size - gap)
        } else {
            gap
        }
    };
    let mut trees: Vec<TreeSpec> = Vec::with_capacity(n);
    // A bounded number of darts, so a spacing too wide for the density plants fewer trees
    // rather than looping for ever; the count is then a pure function of the params too.
    let attempts = 1000 * n.max(1);
    for k in 0..attempts {
        if trees.len() == n {
            break;
        }
        let draw = |axis: f64| uniform(params.seed, purpose::PLANTING, 0.0, k as f64, 0.0, axis);
        let (x, z) = (w * draw(0.0), d * draw(1.0));
        let near = trees.iter().any(|t| {
            let dx = along(x, t.x, w, params.world.periodic);
            let dz = along(z, t.z, d, params.world.periodic_z);
            math::hypot(dx, dz) < p.spacing
        });
        if near {
            continue;
        }
        let species = if p.species.is_empty() {
            String::new()
        } else {
            let len = p.species.len() as f64;
            let at = ((trees.len() as f64 + params.seed.floor()) % len + len) % len;
            p.species[at as usize].clone()
        };
        trees.push(TreeSpec {
            x,
            z,
            species,
            plant_season: 0.0,
            lean: 0.0,
        });
    }
    trees
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::preset;

    /// The garden's ring at `width` with a periodic depth, planted at `density`. mergeParams
    /// merges a group's keys one level deep, so `patch` must not touch `o4`.
    fn stand(width: f64, density: f64, patch: &str) -> Params {
        let base = format!(
            r#"{{"world": {{"width": {width}, "height": 200, "depth": 64, "faces": [0.2, 0.2],
                           "walls": [], "sides": "periodic", "sidesZ": "periodic"}},
              "o4": {{"planting": {{"density": {density}, "spacing": 10,
                "species": ["birch", "oak", "willow", "beech", "birch", "hornbeam", "rowan",
                            "birch", "holly", "maple"]}}}}}}"#
        );
        let json = crate::json::merge(
            &preset("mixedWood", &base),
            &crate::json::parse(patch).unwrap(),
        );
        Params::from_json(&json)
    }

    fn garden(width: f64, patch: &str) -> Params {
        stand(width, 400.0, patch)
    }

    #[test]
    fn plants_about_400_per_hectare_at_desktop_and_phone_widths() {
        // 400/ha over 160 × 64 cells of 0.25 m (0.064 ha) is 25.6; over 66 × 64 (0.0264 ha), 10.6.
        assert_eq!(plant(&garden(160.0, "{}")).len(), 26);
        assert_eq!(plant(&garden(66.0, "{}")).len(), 11);
    }

    /// The least distance between two trees, measured across both wraps (a torus).
    fn closest_on_torus(trees: &[TreeSpec], w: f64, d: f64) -> f64 {
        let mut least = f64::INFINITY;
        for (i, a) in trees.iter().enumerate() {
            for b in &trees[..i] {
                let dx = (a.x - b.x).abs();
                let dz = (a.z - b.z).abs();
                let gap = math::hypot(dx.min(w - dx), dz.min(d - dz));
                least = least.min(gap);
            }
        }
        least
    }

    // Dense enough that darts land near every face: 800/ha over 160 × 64 cells is 51 trees.
    const DENSE: f64 = 800.0;

    #[test]
    fn no_two_trees_closer_than_the_spacing_across_the_wraps() {
        let trees = plant(&stand(160.0, DENSE, "{}"));
        assert_eq!(trees.len(), 51);
        assert!(closest_on_torus(&trees, 160.0, 64.0) >= 10.0);
        assert!(
            trees
                .iter()
                .all(|t| t.x >= 0.0 && t.x < 160.0 && t.z >= 0.0 && t.z < 64.0)
        );
    }

    #[test]
    fn an_open_depth_does_not_space_across_its_faces() {
        // The same planting with open z faces: some pair straddles z = 0 / z = D closer than the
        // spacing, which only the wrap forbids. So the test above does test the wrap.
        let open = r#"{"world": {"width": 160, "height": 200, "depth": 64, "faces": [0.2, 0.2],
                                 "walls": [], "sides": "periodic", "sidesZ": "open"}}"#;
        let trees = plant(&stand(160.0, DENSE, open));
        assert!(closest_on_torus(&trees, 160.0, 64.0) < 10.0);
    }

    #[test]
    fn positions_are_a_pure_function_of_the_seed() {
        let at = |seed: &str| {
            let t = plant(&garden(160.0, &format!(r#"{{"seed": {seed}}}"#)));
            t.iter().map(|t| (t.x, t.z)).collect::<Vec<_>>()
        };
        assert_eq!(at("3"), at("3"));
        assert_ne!(at("3"), at("4"));
    }

    #[test]
    fn keeps_todays_species_mix() {
        // Today's garden cycles the ten-name mix from the seed: seed 1's 26 trees are names 1..=26
        // of the cycle, so birch (places 0, 4, 7) at 4, 7, 10, 14, 17, 20, 24: seven of them.
        let trees = plant(&garden(160.0, r#"{"seed": 1}"#));
        let count = |s: &str| trees.iter().filter(|t| t.species == s).count();
        assert_eq!(count("birch"), 7);
        assert_eq!(trees[0].species, "oak");
        for s in [
            "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple",
        ] {
            assert!((2..=3).contains(&count(s)), "{s}: {}", count(s));
        }
    }

    #[test]
    fn absent_it_plants_todays_trees() {
        // `succession` has no `o4.planting` (mixedWood has since #121).
        let params = crate::testing::params("succession");
        let trees = plant(&params);
        assert_eq!(trees.len(), params.trees.len());
        assert!(
            trees
                .iter()
                .zip(&params.trees)
                .all(|(a, b)| a.x == b.x && a.z == b.z)
        );
    }

    #[test]
    fn a_world_plants_the_stand_and_replays_it() {
        let json = preset(
            "mixedWood",
            r#"{"world": {"width": 66, "sidesZ": "periodic"},
                "o4": {"planting": {"density": 400, "spacing": 10, "species": ["oak", "beech"]}}}"#,
        );
        let mut world = crate::world::World::new(json.clone());
        let planted = plant(&Params::from_json(&json));
        assert_eq!(world.trees.len(), 11);
        assert!(world.trees.iter().zip(&planted).all(|(t, p)| {
            t.alive && t.root_x == p.x && t.root_z == p.z && t.species == p.species
        }));
        // A params patch mid-run keeps the planted trees; a replay of the record matches.
        world.set_params(&crate::json::parse(r#"{"o4": {"m0": 0.01}}"#).unwrap());
        world.run(3, &[]);
        let record = world.record();
        let mut replay = crate::world::World::new(record.get("params").unwrap().clone());
        let events: Vec<_> = record.get("events").unwrap().as_array().unwrap().to_vec();
        replay.run(3, &events);
        assert_eq!(
            crate::hash::hash_world(&world),
            crate::hash::hash_world(&replay)
        );
        assert_eq!(world.params().trees.len(), 11);
    }
}
