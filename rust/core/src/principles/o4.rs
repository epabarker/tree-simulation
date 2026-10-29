//! O4. Stand dynamics (spec §O4, ADR 0013, ADR 0018; o4-stand.ts). Background deaths m₀
//! [RNG: mortality]; R1's reproductive pool turned into seeds (c_seed each), dispersed by
//! Laplace(0, d) [RNG: dispersal] and established where the ground light is at least Q_est with
//! probability p_est [RNG: establishment], no live trunk within a cell; seed rain from beyond the
//! world per species [RNG: seedRain]. Seedlings start next season; live trees capped at maxTrees.
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
    let spaced =
        |trees: &[Tree], x: f64| trees.iter().any(|t| t.alive && (t.root_x - x).abs() < 1.0);
    for &pi in &parents {
        let own = world.rules.of(&world.trees[pi].species).clone();
        let (c_seed, d, q_est, p_est) = (own.o4.c_seed, own.o4.d, own.o4.q_est, own.o4.p_est);
        let parent = &mut world.trees[pi];
        let n = (parent.seed_pool / c_seed).floor();
        parent.seed_pool -= n * c_seed;
        parent.seeds = n;
        let (pid, root, species) = (parent.id as f64, parent.root_x, parent.species.clone());
        let mut k = 0.0;
        while k < n {
            let u = uniform(seed, purpose::DISPERSAL, pid, k, season, 0.0);
            let mut x = root + laplace(u, d);
            let kk = k;
            k += 1.0;
            if periodic {
                x = ((x % w) + w) % w;
            } else if x < 0.0 || x >= w {
                continue;
            }
            if live >= max_trees {
                return recruits;
            }
            let (q, _, _) = world.light.sample(x, 0.5, PI / 2.0);
            if c <= 0.0 || q / c < q_est {
                continue;
            }
            if uniform(seed, purpose::ESTABLISHMENT, pid, kk, season, 0.0) >= p_est {
                continue;
            }
            if spaced(&world.trees, x) {
                continue;
            }
            let mut seedling = Tree::new(world.trees.len(), x);
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
            let (q, _, _) = world.light.sample(x, 0.5, PI / 2.0);
            if c <= 0.0 || q / c < q_est {
                continue;
            }
            if uniform(seed, purpose::SEED_RAIN, key, 2.0, season, kk) >= p_est {
                continue;
            }
            if spaced(&world.trees, x) {
                continue;
            }
            let mut seedling = Tree::new(world.trees.len(), x);
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
