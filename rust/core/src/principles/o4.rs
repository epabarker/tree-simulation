//! O4. Stand dynamics (spec §O4, ADR 0013, ADR 0018; on the ground plane, ADR 0025). Background
//! deaths m₀ [RNG: mortality]; R1's reproductive pool turned into seeds (c_seed each), dispersed
//! a Laplace(0, d) distance at a random azimuth [RNG: dispersal; seeds beyond a z face are lost]
//! and established where the ground light is at least Q_est with probability p_est [RNG:
//! establishment], no live trunk within a cell; seed rain from beyond the world per species,
//! anywhere on the ground [RNG: seedRain]. Seedlings start next season; live trees capped at
//! maxTrees.
//!
//! Params: o4.*, r1.fRep and r1.maturity (the seed supply), c2.C.

use super::c1::plant_seedling;
use crate::math;
use crate::rng::{purpose, uniform};
use crate::tree::Tree;
use crate::world::World;

const PI: f64 = std::f64::consts::PI;

/// A stable number for a species name, to key its seed-rain draws (FNV-1a over UTF-16 units).
pub fn species_key(name: &str) -> f64 {
    let mut h: u32 = 0x811c9dc5;
    for u in name.encode_utf16() {
        h = (h ^ u as u32).wrapping_mul(0x01000193);
    }
    h as f64
}

/// Laplace(0, d) from a uniform u in [0, 1).
pub fn laplace(u: f64, d: f64) -> f64 {
    let v = u - 0.5;
    -d * math::sign(v) * math::ln(1.0 - 2.0 * v.abs())
}

/// Background deaths, seeds, dispersal and establishment. Returns the season's recruits.
pub fn stand_dynamics(world: &mut World) -> f64 {
    let season = world.season;
    let params = &world.rules.params;
    let (seed, w, periodic, c) = (
        params.seed,
        params.world.width,
        params.world.periodic,
        params.c2.c,
    );
    let depth = crate::light::depth_of(params);
    let max_trees = params.o4.max_trees;
    for i in 0..world.trees.len() {
        let t = &world.trees[i];
        if !(t.alive && t.age > 0.0) {
            continue;
        }
        let m0 = world.rules.of(&t.species).o4.m0;
        if uniform(seed, purpose::MORTALITY, t.id as f64, 0.0, season, 0.0) < m0 {
            world.trees[i].alive = false;
        }
    }
    let parents: Vec<usize> = (0..world.trees.len())
        .filter(|&i| world.trees[i].alive)
        .collect();
    let mut live = parents.len() as f64;
    let mut recruits = 0.0;
    // No live trunk within a cell, on the ground plane.
    let spaced = |trees: &[Tree], x: f64, z: f64| {
        trees
            .iter()
            .any(|t| t.alive && math::hypot(t.root_x - x, t.root_z - z) < 1.0)
    };
    for &pi in &parents {
        let own = world.rules.of(&world.trees[pi].species).clone();
        let (c_seed, d, q_est, p_est) = (own.o4.c_seed, own.o4.d, own.o4.q_est, own.o4.p_est);
        let parent = &mut world.trees[pi];
        let n = (parent.seed_pool / c_seed).floor();
        parent.seed_pool -= n * c_seed;
        parent.seeds = n;
        let (pid, root, species) = (parent.id as f64, parent.root_x, parent.species.clone());
        let root_z = parent.root_z;
        let mut k = 0.0;
        while k < n {
            // A Laplace(0, d) distance on the ground plane, at an azimuth of its own.
            let u = uniform(seed, purpose::DISPERSAL, pid, k, season, 0.0);
            let around = 2.0 * PI * uniform(seed, purpose::DISPERSAL, pid, k, season, 1.0);
            let r = laplace(u, d);
            let mut x = root + r * math::cos(around);
            let z = root_z + r * math::sin(around);
            let kk = k;
            k += 1.0;
            if periodic {
                x = ((x % w) + w) % w;
            } else if x < 0.0 || x >= w {
                continue;
            }
            if z < 0.0 || z >= depth {
                continue; // beyond an open face
            }
            if live >= max_trees {
                return recruits;
            }
            let (q, _) = world.light.sample(x, 0.5, z);
            if c <= 0.0 || q / c < q_est {
                continue;
            }
            if uniform(seed, purpose::ESTABLISHMENT, pid, kk, season, 0.0) >= p_est {
                continue;
            }
            if spaced(&world.trees, x, z) {
                continue;
            }
            let mut seedling = Tree::new(world.trees.len(), x, z);
            seedling.species = species.clone();
            plant_seedling(&mut seedling, &own, season + 1.0, 0.0);
            world.trees.push(seedling);
            live += 1.0;
            recruits += 1.0;
        }
    }
    // Seed rain from beyond the world, species by species in the table's order.
    let kinds: Vec<Option<String>> = match &world.rules.params.species {
        Some(names) => names.iter().cloned().map(Some).collect(),
        None => vec![None],
    };
    for species in kinds {
        let own = world.rules.of(species.as_deref().unwrap_or("")).clone();
        let rain = (own.o4.rain.unwrap_or(0.0) * w) / 100.0;
        if !(rain > 0.0) {
            continue;
        }
        let key = match &species {
            Some(s) if !s.is_empty() => species_key(s),
            _ => 0.0,
        };
        let (q_est, p_est) = (own.o4.q_est, own.o4.p_est);
        let extra = if uniform(seed, purpose::SEED_RAIN, key, 0.0, season, 0.0) < rain % 1.0 {
            1.0
        } else {
            0.0
        };
        let n = rain.floor() + extra;
        let mut k = 0.0;
        while k < n {
            let kk = k;
            k += 1.0;
            if live >= max_trees {
                return recruits;
            }
            let x = uniform(seed, purpose::SEED_RAIN, key, 1.0, season, kk) * w;
            let z = uniform(seed, purpose::SEED_RAIN, key, 3.0, season, kk) * depth;
            let (q, _) = world.light.sample(x, 0.5, z);
            if c <= 0.0 || q / c < q_est {
                continue;
            }
            if uniform(seed, purpose::SEED_RAIN, key, 2.0, season, kk) >= p_est {
                continue;
            }
            if spaced(&world.trees, x, z) {
                continue;
            }
            let mut seedling = Tree::new(world.trees.len(), x, z);
            if let Some(s) = species.as_ref().filter(|s| !s.is_empty()) {
                seedling.species = s.clone();
            }
            plant_seedling(&mut seedling, &own, season + 1.0, 0.0);
            world.trees.push(seedling);
            live += 1.0;
            recruits += 1.0;
        }
    }
    recruits
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::json::{merge, parse};
    use crate::testing::preset;

    /// A world with light off (every cell fully lit) and O4 on; patch on top.
    pub(crate) fn world(patch: &str) -> World {
        let base = preset(
            "default",
            r#"{"world":{"width":100,"height":50,"walls":[]},"trees":[{"x":50}],
               "o4":{"enabled":true,"cSeed":2,"d":10,"qEst":0.5,"pEst":1,"m0":0,"maxTrees":100}}"#,
        );
        World::new(merge(&base, &parse(patch).unwrap()))
    }

    #[test]
    fn draws_laplace_distances_median_0_mean_abs_d() {
        assert!(laplace(0.5, 7.0).abs() < 1e-12);
        let n = 20000;
        let sum: f64 = (0..n)
            .map(|k| laplace((k as f64 + 0.5) / n as f64, 7.0).abs())
            .sum();
        assert!((sum / n as f64 - 7.0).abs() < 0.05);
    }

    #[test]
    fn turns_every_c_seed_of_the_pool_into_a_seed_and_establishes_it_on_lit_ground() {
        let mut w = world("{}");
        w.trees[0].seed_pool = 7.0; // three seeds, 1 left over
        let recruits = stand_dynamics(&mut w);
        assert_eq!(w.trees[0].seeds, 3.0);
        assert!((w.trees[0].seed_pool - 1.0).abs() < 1e-12);
        assert!(recruits > 0.0);
        assert_eq!(w.trees.len() as f64, 1.0 + recruits);
        let seedling = &w.trees[1];
        assert!(seedling.alive);
        assert_eq!(seedling.m.len(), 1);
        assert_eq!(seedling.m.birth_season[0] as f64, w.season + 1.0);
    }

    #[test]
    fn establishes_nothing_below_q_est_past_max_trees_or_near_a_live_trunk() {
        for patch in [
            r#"{"o4":{"qEst":2}}"#,
            r#"{"o4":{"maxTrees":1}}"#,
            r#"{"o4":{"d":1e-9}}"#, // every seed lands on its parent
        ] {
            let mut w = world(patch);
            w.trees[0].seed_pool = 20.0;
            assert_eq!(stand_dynamics(&mut w), 0.0, "{patch}");
        }
    }

    #[test]
    fn wraps_seeds_round_periodic_sides_and_loses_them_beyond_open_ones() {
        let mut ring = world(
            r#"{"trees":[{"x":99}],"o4":{"d":30},
                "world":{"width":100,"height":50,"walls":[],"sides":"periodic"}}"#,
        );
        ring.trees[0].seed_pool = 200.0;
        stand_dynamics(&mut ring);
        let xs: Vec<f64> = ring.trees[1..].iter().map(|t| t.root_x).collect();
        assert!(xs.iter().all(|&x| (0.0..100.0).contains(&x)));
        assert!(xs.iter().any(|&x| x < 50.0)); // some crossed the right edge
        let mut open = world(r#"{"trees":[{"x":99}],"o4":{"d":30}}"#);
        open.trees[0].seed_pool = 200.0;
        stand_dynamics(&mut open);
        assert!(open.trees[1..].iter().all(|t| t.root_x < 100.0));
        assert!(open.trees.len() < ring.trees.len());
    }

    #[test]
    fn rains_seeds_in_from_beyond_the_world_per_species() {
        let rained = |rain: f64, species: &str| {
            let mut w = world(&format!(r#"{{"o4":{{"rain":{rain}}}{species}}}"#));
            let recruits = stand_dynamics(&mut w);
            (recruits, w)
        };
        assert_eq!(rained(0.0, "").0, 0.0);
        let (recruits, w) = rained(3.0, "");
        assert_eq!(recruits, 3.0); // every cell lit, p_est 1
        assert_eq!(w.trees.len(), 4);
        let (recruits, w) = rained(0.0, r#","species":{"willow":{"o4":{"rain":3}},"oak":{}}"#);
        assert_eq!(recruits, 3.0);
        assert!(w.trees[1..].iter().all(|t| t.species == "willow"));
        let mut shaded = world(r#"{"o4":{"rain":3,"qEst":2}}"#);
        assert_eq!(stand_dynamics(&mut shaded), 0.0);
    }

    #[test]
    fn kills_trees_of_background_risk_at_rate_m0() {
        let mut w = world(r#"{"o4":{"m0":1}}"#);
        w.trees[0].age = 1.0;
        stand_dynamics(&mut w);
        assert!(!w.trees[0].alive);
    }
}
