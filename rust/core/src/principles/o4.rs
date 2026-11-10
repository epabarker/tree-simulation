//! O4. Stand dynamics (spec §O4, ADR 0013, ADR 0018; on the ground plane, ADR 0025). Deaths by
//! `o4.mortality` (the world's): `sizeBlind` (the default, the ablation) kills each tree with the
//! background risk m₀ [RNG: mortality]; `twoPart` (ADR 0063) with a canopy rate
//! m_c·(H/H_c)^γ_c that rises with the tree's height H, plus a suppression rate
//! m_s·(1 − P/M)₊·e^(−β_s(T − 1)) from R1's carbon balance this season (P/M, read only with R1 on)
//! and the species' shade tolerance T, one draw against the sum [RNG: standMortality]. A tree that
//! pays its maintenance is never suppressed; a starved one dies the faster the less tolerant it is.
//! The anchors (docs/research/2026-11-08-regeneration.md): below its survival light a birch
//! seedling lasts 1–2 seasons (Walters & Reich 1996), so m_s = 1 at T = 1 gives birch (T 2.03)
//! about 0.39 a season fully starved; shade-tolerant juveniles die at 3–5% a year in deep shade
//! (Petrovska et al. 2022), so β_s = 0.92 (≈ ln 10 / 2.5, a tenth over the 2.5 units from birch to
//! beech) gives beech (T 4.56) about 0.04. An order of magnitude and a ranking, not a fit.
//! R1's reproductive pool turned into seeds (c_seed each), dispersed
//! a Laplace(0, d) distance at a random azimuth [RNG: dispersal; seeds beyond a z face are lost]
//! and established where the ground light is at least Q_est with probability p_est [RNG:
//! establishment], no live trunk within a cell; seed rain from beyond the world per species,
//! anywhere on the ground [RNG: seedRain]. Seedlings start next season; live trees capped at
//! maxTrees. Local seeds and seed rain establish anywhere in the depth (ADR 0063, decision 4: the
//! garden's establishment band is gone), so pioneers arrive in gaps wherever they open. Seeding
//! starts at R1's maturity height alone (R1 feeds the seed pool only above it), with no start
//! season: a species whose trees stay below maturity (goat willow, 22.5 m) recruits by rain alone.
//!
//! Params: o4.mortality; sizeBlind reads o4.m0, twoPart reads o4.mCanopy, o4.hCanopy,
//! o4.gammaCanopy, o4.mSuppression, o4.suppressionSlope and o4.shadeTolerance (per species, as m₀
//! is) and r1.enabled; then o4.cSeed, d, qEst, pEst, maxTrees, rain, r1.fRep and
//! r1.maturity (the seed supply), c2.C.

use super::c1::{plant_seedling, seedling_azimuth};
use crate::math;
use crate::params::Mortality;
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

/// The canopy rate (ADR 0063): m_c·(H/H_c)^γ_c a season, clamped to a probability. Zero on the
/// ground, m_c at the reference height H_c, and rising with height, so a seedling is not killed
/// by it and an old canopy tree is replaced gradually (senescence).
pub fn canopy_rate(height: f64, m_c: f64, h_c: f64, gamma: f64) -> f64 {
    if !(height > 0.0 && m_c > 0.0 && h_c > 0.0) {
        return 0.0;
    }
    math::min(m_c * math::pow(height / h_c, gamma), 1.0)
}

/// The suppression rate (ADR 0063): m_s·(1 − P/M)₊·e^(−β_s(T − 1)) a season, clamped to a
/// probability. Zero for a tree whose production P meets its maintenance M, and for M ≤ 0 (R1 off:
/// no vigour to read); for a starved tree it rises with the share of M left unpaid and falls with
/// shade tolerance T, so at equal starvation a light-demander dies first.
pub fn suppression_rate(p: f64, m: f64, m_s: f64, slope: f64, tolerance: f64) -> f64 {
    if !(m > 0.0 && m_s > 0.0) {
        return 0.0;
    }
    let deficit = math::max(1.0 - p / m, 0.0);
    math::min(m_s * deficit * math::exp(-slope * (tolerance - 1.0)), 1.0)
}

/// A tree's height in cells: its highest metamer tip (as R1's maturity reads it).
pub fn tree_height(t: &Tree) -> f64 {
    let mut height = 0.0;
    for i in 0..t.m.len() {
        let y = t.tip_y(i);
        if y > height {
            height = y;
        }
    }
    height
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
    let periodic_z = params.world.periodic_z;
    let max_trees = params.o4.max_trees;
    let mortality = params.o4.mortality;
    for i in 0..world.trees.len() {
        let t = &world.trees[i];
        if !(t.alive && t.age > 0.0) {
            continue;
        }
        let rules = world.rules.of(&t.species);
        let own = &rules.o4;
        let dies = match mortality {
            Mortality::SizeBlind => {
                uniform(seed, purpose::MORTALITY, t.id as f64, 0.0, season, 0.0) < own.m0
            }
            Mortality::TwoPart => {
                let canopy =
                    canopy_rate(tree_height(t), own.m_canopy, own.h_canopy, own.gamma_canopy);
                // R1 ran this season (allocate precedes deaths), so P and M are this season's.
                let suppression = if rules.r1.enabled {
                    suppression_rate(
                        t.production,
                        t.maintenance,
                        own.m_suppression,
                        own.suppression_slope,
                        own.shade_tolerance,
                    )
                } else {
                    0.0
                };
                let p = math::min(canopy + suppression, 1.0);
                uniform(
                    seed,
                    purpose::STAND_MORTALITY,
                    t.id as f64,
                    0.0,
                    season,
                    0.0,
                ) < p
            }
        };
        if dies {
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
            let mut z = root_z + r * math::sin(around);
            let kk = k;
            k += 1.0;
            if periodic {
                x = ((x % w) + w) % w;
            } else if x < 0.0 || x >= w {
                continue;
            }
            if periodic_z {
                z = ((z % depth) + depth) % depth; // round a periodic depth (ADR 0058)
            } else if z < 0.0 || z >= depth {
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
            let azimuth = seedling_azimuth(&own, seedling.id);
            plant_seedling(&mut seedling, &own, season + 1.0, 0.0, azimuth);
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
            let azimuth = seedling_azimuth(&own, seedling.id);
            plant_seedling(&mut seedling, &own, season + 1.0, 0.0, azimuth);
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
    fn the_seedling_bank_counts_against_the_cap() {
        // A parent and two seedlings, all below the display threshold (none is drawn): with the
        // cap at three nothing more establishes; with room for a fourth, something does.
        let recruits = |max_trees: f64| {
            let mut w = world(&format!(r#"{{"o4":{{"maxTrees":{max_trees}}}}}"#));
            for (id, x) in [(1, 10.0), (2, 90.0)] {
                let mut t = w.trees[0].clone();
                (t.id, t.root_x) = (id, x);
                w.trees.push(t);
            }
            assert_eq!(crate::stand::stand_metrics(&w).drawn, 0.0);
            w.trees[0].seed_pool = 20.0;
            stand_dynamics(&mut w)
        };
        assert_eq!(recruits(3.0), 0.0);
        assert!(recruits(4.0) > 0.0);
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

    /// The recruits' depths, as quarters of the depth they fall in, from a run of `patch`.
    fn quarters(patch: &str, pool: f64) -> [usize; 4] {
        let mut w = world(patch);
        w.trees[0].seed_pool = pool;
        stand_dynamics(&mut w);
        let depth = crate::light::depth_of(w.params());
        let mut q = [0; 4];
        for t in &w.trees[1..] {
            assert!((0.0..depth).contains(&t.root_z), "{}", t.root_z);
            q[((4.0 * t.root_z / depth) as usize).min(3)] += 1;
        }
        q
    }

    #[test]
    fn local_seedlings_establish_across_the_whole_depth() {
        // ADR 0063, decision 4: no band. A parent in the slab's middle (64 deep) with a long
        // dispersal spreads recruits into every quarter of the depth; a `band` key, once the
        // garden's one row (I3), is no longer read.
        for patch in [r#"{"o4":{"d":30}}"#, r#"{"o4":{"d":30,"band":10}}"#] {
            let q = quarters(patch, 400.0);
            assert!(q.iter().all(|&n| n > 0), "{patch} {q:?}");
        }
        // Round a periodic depth (ADR 0058) seeds that cross a z face come back in on the other.
        let q = quarters(
            r#"{"trees":[{"x":50,"z":1}],"o4":{"d":30},
                "world":{"width":100,"height":50,"walls":[],"sidesZ":"periodic"}}"#,
            400.0,
        );
        assert!(q[3] > 0, "{q:?}");
    }

    #[test]
    fn holly_carries_no_species_flag_and_recruits_from_its_seed() {
        // ADR 0063, decision 7: holly's species-level `o4.enabled: false` was never read; it is
        // deleted, and a holly with seed in a stand (the woodland's species table) sets seedlings.
        // `succession`: mixedWood's world and species before #121, whose `o4.planting` would
        // replace this test's `trees`.
        let wood = preset("succession", "{}");
        let holly = wood.get("species").and_then(|s| s.get("holly")).unwrap();
        assert!(holly.get("o4").unwrap().get("enabled").is_none());
        let mut w = World::new(merge(
            &wood,
            &parse(
                r#"{"world":{"width":100,"height":50,"walls":[]},"trees":[{"x":50,"species":"holly"}],
                    "o4":{"maxTrees":100}}"#,
            )
            .unwrap(),
        ));
        w.step(&mut |_| {}); // a season, so the ground has a light field
        w.trees[0].seed_pool = 800.0; // a hundred seeds at holly's c_seed of 8
        stand_dynamics(&mut w);
        assert!(w.trees[1..].iter().filter(|t| t.species == "holly").count() > 5);
    }

    /// Willows recruited in 15 seasons of three planted willows in the woodland (`succession`:
    /// mixedWood's world and species before #121, whose `o4.planting` would replace these
    /// `trees`), with willow's rain at `rain`; asserts on the way that no willow reaches R1's
    /// maturity or sets seed.
    fn willow_recruits(rain: f64) -> usize {
        let wood = preset("succession", "{}");
        let mut willow = wood.get("species").unwrap().get("willow").unwrap().clone();
        let o4 = merge(
            willow.get("o4").unwrap(),
            &parse(&format!(r#"{{"rain":{rain}}}"#)).unwrap(),
        );
        willow.set("o4", o4);
        let mut patch = parse(
            r#"{"world":{"width":100,"height":120,"walls":[]},"o4":{"maxTrees":100},
                "trees":[{"x":15,"species":"willow"},{"x":50,"species":"willow"},
                         {"x":85,"species":"willow"}]}"#,
        )
        .unwrap();
        let mut species = wood.get("species").unwrap().clone();
        species.set("willow", willow);
        patch.set("species", species);
        let mut w = World::new(merge(&wood, &patch));
        let maturity = w.rules.of("willow").r1.maturity;
        assert!(w.rules.of("willow").r1.enabled && maturity > 0.0);
        for _ in 0..15 {
            w.step(&mut |_| {});
            for t in w.trees.iter().filter(|t| t.alive && t.species == "willow") {
                assert!(
                    tree_height(t) < maturity,
                    "a willow matured: {}",
                    tree_height(t)
                );
                assert_eq!(t.seeds, 0.0, "an immature willow set seed");
            }
        }
        w.trees[3..]
            .iter()
            .filter(|t| t.species == "willow")
            .count()
    }

    #[test]
    fn willow_recruits_only_by_rain_while_its_planted_trees_are_immature() {
        // ADR 0063 / the stand-density page: goat willow's maturity (22.5 m) is above what its
        // planted trees reach for many seasons, and R1 feeds no seed pool below it, so every willow
        // recruit in that time came in as rain: with rain there are some, without it none.
        assert!(willow_recruits(1.0) > 0);
        assert_eq!(willow_recruits(0.0), 0);
    }

    #[test]
    fn seed_rain_lands_across_the_whole_depth() {
        for patch in [r#"{"o4":{"rain":40}}"#, r#"{"o4":{"rain":40,"band":10}}"#] {
            let q = quarters(patch, 0.0);
            assert!(q.iter().all(|&n| n > 0), "{patch} {q:?}");
        }
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
    fn the_canopy_rate_is_zero_on_the_ground_and_rises_with_height() {
        // m_c = 0.01 at H_c = 120 cells (30 m), γ = 2: a worked table, not the formula again.
        let rate = |h: f64| canopy_rate(h, 0.01, 120.0, 2.0);
        assert_eq!(rate(0.0), 0.0);
        assert!((rate(60.0) - 0.0025).abs() < 1e-15);
        assert!((rate(120.0) - 0.01).abs() < 1e-15);
        assert!((rate(240.0) - 0.04).abs() < 1e-15);
        let rates: Vec<f64> = [1.0, 10.0, 40.0, 80.0, 120.0, 200.0]
            .iter()
            .map(|&h| rate(h))
            .collect();
        assert!(rates.windows(2).all(|p| p[0] < p[1]), "{rates:?}");
        assert_eq!(canopy_rate(1e6, 0.5, 1.0, 2.0), 1.0); // a probability
    }

    /// Tree 0 grown `n` more cells straight up (one-cell metamers on its main axis), one season old.
    fn tall(w: &mut World, n: usize) {
        let t = &mut w.trees[0];
        t.age = 1.0;
        for _ in 0..n {
            let top = t.m.len() as i32 - 1;
            crate::testing::metamer(t, top, 0, PI / 2.0, 1.0, 0.1, 0.0);
        }
    }

    #[test]
    fn tall_grows_the_tree_to_about_its_height() {
        let mut w = world("{}");
        tall(&mut w, 40);
        let t = &w.trees[0];
        assert!((tree_height(t) - 40.0).abs() < 2.0, "{}", tree_height(t));
    }

    #[test]
    fn in_the_two_part_mode_tall_trees_die_more_often_than_short_ones() {
        // One tree over 2,000 seasons, revived after each: the death rate climbs with height.
        let deaths = |n: usize| {
            let mut w = world(
                r#"{"o4":{"m0":1,"mortality":"twoPart","mCanopy":0.2,"hCanopy":40,"gammaCanopy":2}}"#,
            );
            tall(&mut w, n);
            (1..=2000)
                .filter(|&s| {
                    w.season = s as f64;
                    w.trees[0].alive = true;
                    stand_dynamics(&mut w);
                    !w.trees[0].alive
                })
                .count()
        };
        let (short, mid, high) = (deaths(5), deaths(20), deaths(40));
        // Expected about 2000·0.2·(h/40)² ≈ 3, 50, 400; m₀ = 1 is ignored in this mode.
        assert!(short < mid && mid < high, "{short} {mid} {high}");
        assert!(short < 30 && (300..500).contains(&high), "{short} {high}");
    }

    /// A two-part world with no canopy deaths, R1 on, and the suppression rate set by `o4`.
    fn starving(o4: &str, rest: &str) -> World {
        world(&format!(
            r#"{{"r1":{{"enabled":true}},
                 "o4":{{"mortality":"twoPart","mCanopy":0,{o4}}}{rest}}}"#
        ))
    }

    /// Tree `i` this season: one season old, producing `p` against a maintenance of 1.
    fn vigour(w: &mut World, i: usize, p: f64) {
        let t = &mut w.trees[i];
        t.age = 1.0;
        t.production = p;
        t.maintenance = 1.0;
    }

    #[test]
    fn the_suppression_rate_is_the_deficit_share_scaled_down_by_shade_tolerance() {
        // m_s = 0.5, β = 1: a worked table, not the formula again.
        let rate = |p: f64, m: f64, tol: f64| suppression_rate(p, m, 0.5, 1.0, tol);
        assert_eq!(rate(1.0, 1.0, 1.0), 0.0); // pays its way
        assert_eq!(rate(3.0, 1.0, 1.0), 0.0);
        assert!((rate(0.0, 1.0, 1.0) - 0.5).abs() < 1e-15); // fully starved, least tolerant
        assert!((rate(0.5, 1.0, 1.0) - 0.25).abs() < 1e-15); // half the cost paid
        assert!((rate(0.0, 1.0, 2.0) - 0.5 * (-1.0f64).exp()).abs() < 1e-15);
        assert_eq!(rate(0.0, 0.0, 1.0), 0.0); // no maintenance (R1 off): no vigour to read
        assert_eq!(suppression_rate(0.0, 1.0, 5.0, 0.0, 1.0), 1.0); // a probability
    }

    #[test]
    fn in_the_two_part_mode_a_starved_tree_dies_and_one_that_pays_its_way_does_not() {
        let o4 = r#""mSuppression":1,"suppressionSlope":1,"shadeTolerance":1"#;
        let mut starved = starving(o4, "");
        vigour(&mut starved, 0, 0.0); // P = 0: the rate is 1
        stand_dynamics(&mut starved);
        assert!(!starved.trees[0].alive);
        for s in 1..=500 {
            let mut paying = starving(o4, "");
            paying.season = s as f64;
            vigour(&mut paying, 0, 1.2);
            stand_dynamics(&mut paying);
            assert!(paying.trees[0].alive, "season {s}");
        }
        // R1 off: P/M is not read, so the same starved numbers kill nothing.
        let mut off = world(&format!(
            r#"{{"o4":{{"mortality":"twoPart","mCanopy":0,{o4}}}}}"#
        ));
        vigour(&mut off, 0, 0.0);
        stand_dynamics(&mut off);
        assert!(off.trees[0].alive);
    }

    #[test]
    fn at_equal_starvation_birch_dies_sooner_than_beech_and_holly() {
        // Three trees at P/M = 0.5 over 1,000 seasons, revived after each: deaths per species, with
        // the flora's tolerances (Niinemets & Valladares 2006) and the default rate and slope.
        let mut w = starving(
            r#""mSuppression":1,"suppressionSlope":0.92"#,
            r#","trees":[{"x":20,"species":"birch"},{"x":50,"species":"beech"},
                         {"x":80,"species":"holly"}],
               "species":{"birch":{"o4":{"shadeTolerance":2.03}},
                          "beech":{"o4":{"shadeTolerance":4.56}},
                          "holly":{"o4":{"shadeTolerance":3.86}}}"#,
        );
        let mut deaths = [0; 3];
        for s in 1..=1000 {
            w.season = s as f64;
            w.trees.truncate(3);
            for i in 0..3 {
                w.trees[i].alive = true;
                vigour(&mut w, i, 0.5);
            }
            stand_dynamics(&mut w);
            for (i, d) in deaths.iter_mut().enumerate() {
                *d += !w.trees[i].alive as usize;
            }
        }
        let [birch, beech, holly] = deaths;
        // Expected about 1000·0.5·e^(−0.92(T−1)): birch ≈ 194, holly ≈ 36, beech ≈ 19.
        assert!(
            birch > 2 * holly && birch > 2 * beech,
            "{birch} {beech} {holly}"
        );
        assert!((150..240).contains(&birch), "{birch}");
        assert!(beech < holly, "{beech} {holly}");
    }

    #[test]
    fn the_size_blind_mode_is_the_default_and_ignores_the_canopy_rate() {
        let mut w = world(r#"{"o4":{"m0":0,"mCanopy":1,"hCanopy":1}}"#);
        tall(&mut w, 10);
        stand_dynamics(&mut w);
        assert!(w.trees[0].alive);
    }

    #[test]
    fn kills_trees_of_background_risk_at_rate_m0() {
        let mut w = world(r#"{"o4":{"m0":1}}"#);
        w.trees[0].age = 1.0;
        stand_dynamics(&mut w);
        assert!(!w.trees[0].alive);
    }
}
