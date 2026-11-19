//! C1's crown-extent limit (spec §C1, bud fate; ADR 0074, proposed; #129, #135). With
//! `c1.extentLimit`, a live bud that would extend this season does so with a chance p, drawn once
//! per live bud and season whatever its resource (keyed, so a draw that decides nothing changes
//! nothing) [RNG: extentLimit, keyed by the tree, the bud's birthId and the season]:
//! g(L) = max(g_min, 1 / (1 + (L / L_x)^k)), L read at the bud's node as the season began (§6), and
//! with `c1.extentSpare` p = u² + (1 − u²)·g, u the upward part of the bud's heading (an upright
//! shoot, the leader whatever its order, is spared; a level or drooping one takes g in full),
//! else p = g. L is the tree's height above its stem base ("height", ADR 0074: a whole-tree size
//! signal, §C1 item 1's exception, after Choi et al. 2001's crown-margin rates, which fall with
//! tree height to a floor), or, as comparisons outside the ADR, the node's horizontal distance from
//! the stem base ("reach", #121's yardstick: an imposed radius) or its path length from the base
//! ("path": local). It acts at the tip after C3's allocation (a sink limit, #83's reading), as a
//! chance and not on the internode length: a shoot is one metamer from season ≈ 30, and shorter
//! internodes keep their leaf and buds (the path-length note §2). A barred bud that would have
//! extended is *held* (ADR 0074 decision 3): an active bud stays active, so it neither turns
//! dormant, ages toward L_dorm, meets R4's higher break threshold, nor becomes an R6 short shoot
//! with its larger leaf; a barred dormant bud rests and ages as any dormant bud does, and is not
//! light-released; a barred R6 short shoot rests as a short shoot does (R6 may turn it dormant
//! in the dark, as it would below its threshold). A held bud's v is unspent (R1's bank, with
//! `r1.unspent`), as any bud's that grows nothing. A bud that would not have extended rests as it
//! would without the rule. No
//! state: L is one pass in `grow_buds`. Off (absent or "off"): no pass, no draw.
//!
//! Params: c1.extentLimit ("off" | "height" | "reach" | "path"), c1.extentSpare, c1.extentScale
//! (L_x, cells; absent 60), c1.extentSteepness (k; absent 2), c1.extentFloor (g_min, held in
//! [0, 1]; absent 0). L_x or k at or under 0 is no limit. ADR 0074's calibration `H40k2f`: L_x 40,
//! k 2, g_min 0.1, sparing on (g 0.5, 0.2 and 0.1 at 10, 20 and 30 m).

use crate::math;
use crate::params::{C1, ExtentLimit, Params};
use crate::rng::{purpose, uniform};
use crate::tree::Tree;

/// g(L) = max(g_min, 1 / (1 + (L / L_x)^k)), the chance a shoot
/// extends at size `l` (cells): 1 at L = 0, one half at L_x, falling as L^-k beyond until it
/// meets the floor (held in [0, 1]). Exactly 1 with the rule off, or with L_x or k ≤ 0.
pub fn extent_g(l: f64, c1: &C1) -> f64 {
    if c1.extent_limit == ExtentLimit::Off || c1.extent_scale <= 0.0 || c1.extent_steepness <= 0.0 {
        return 1.0;
    }
    let floor = math::max(0.0, math::min(1.0, c1.extent_floor));
    math::max(
        floor,
        1.0 / (1.0 + math::pow(l / c1.extent_scale, c1.extent_steepness)),
    )
}

/// the chance that a shoot extends, from g at its node and `up`, the upward part
/// of its bud's heading. With `spare`, p = u² + (1 − u²)·g, u = max(0, up): an upright shoot (the
/// leader, whatever its order) is spared, a level or drooping one takes g in full. Without, p = g.
pub fn extent_chance(g: f64, up: f64, spare: bool) -> f64 {
    if !spare {
        return g;
    }
    let u = math::max(0.0, up);
    u * u + (1.0 - u * u) * g
}

/// L (cells) at each metamer's tip, as the season began. One pass; nothing is
/// stored on the tree. `Reach`: the tip's horizontal distance from the stem base. `Height`: the
/// tree's height above its base, for every metamer alike. `Path`: the path length from the stem
/// base (R1's L_path, which is filled only with R1 on).
pub fn extent_sizes(tree: &Tree, of: ExtentLimit) -> Vec<f64> {
    let c = &tree.m;
    let mut size = vec![0.0; c.len()];
    match of {
        ExtentLimit::Off => {}
        ExtentLimit::Reach => {
            for (i, l) in size.iter_mut().enumerate() {
                let [x, _, z] = tree.tip(i);
                *l = math::hypot(x - tree.root_x, z - tree.root_z);
            }
        }
        ExtentLimit::Height => {
            let mut top = 0.0;
            for i in 0..c.len() {
                top = math::max(top, tree.tip_y(i) - c.base_y[0]);
            }
            size.fill(top);
        }
        ExtentLimit::Path => {
            // Parent before child: one forward pass.
            for i in 0..c.len() {
                let p = c.parent[i];
                let before = if p >= 0 { size[p as usize] } else { 0.0 };
                size[i] = before + c.length[i];
            }
        }
    }
    size
}

/// whether the shoot of bud `bud_id` extends this season, with probability `p`
/// [RNG: extentLimit, keyed by the bud and the season]. No draw at p ≥ 1.
pub fn extends(p: f64, params: &Params, tree_id: f64, bud_id: f64, season: f64) -> bool {
    p >= 1.0
        || uniform(
            params.seed,
            purpose::EXTENT_LIMIT,
            tree_id,
            bud_id,
            season,
            0.0,
        ) < p
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::principles::c1::{add_metamer, plant_seedling};
    use crate::testing::preset;
    use crate::tree::{bud, slot};

    fn params(patch: &str) -> Params {
        Params::from_json(&preset("default", patch))
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    /// The state hash of the default lone tree, `patch` on top, after `seasons`.
    fn hashed(patch: &str, seasons: usize) -> String {
        let mut w = crate::world::World::new(preset("default", patch));
        w.run(seasons, &[]);
        crate::hash::hash_world(&w)
    }

    #[test]
    fn the_extent_chance_is_half_at_l_x_falls_as_the_steepness_says_and_keeps_its_floor() {
        // g(L) = max(g_min, 1 / (1 + (L / L_x)^k)), worked by hand.
        let c1 = |patch: &str| params(&format!(r#"{{"c1":{patch}}}"#)).c1;
        let k2 = c1(r#"{"extentLimit":"height","extentScale":40,"extentSteepness":2}"#);
        assert_eq!(extent_g(0.0, &k2), 1.0);
        assert!(close(extent_g(40.0, &k2), 0.5));
        assert!(close(extent_g(80.0, &k2), 0.2)); // 1 / (1 + 2²)
        assert!(close(extent_g(120.0, &k2), 0.1)); // 1 / (1 + 3²)
        let k8 = c1(r#"{"extentLimit":"reach","extentScale":16,"extentSteepness":8}"#);
        assert!(close(extent_g(16.0, &k8), 0.5));
        assert!(close(extent_g(32.0, &k8), 1.0 / 257.0)); // 1 / (1 + 2⁸)
        // The floor holds g up; above 1 it is no limit, below 0 no floor.
        let floor = |f: f64| {
            c1(&format!(
                r#"{{"extentLimit":"reach","extentScale":16,"extentSteepness":8,"extentFloor":{f}}}"#
            ))
        };
        assert_eq!(extent_g(32.0, &floor(0.1)), 0.1);
        assert!(close(extent_g(16.0, &floor(0.1)), 0.5));
        assert_eq!(extent_g(32.0, &floor(3.0)), 1.0);
        assert!(close(extent_g(32.0, &floor(-1.0)), 1.0 / 257.0));
        // A steepness of 0 or less is no limit (g would not fall from 1 at the base); so is off.
        let flat = c1(r#"{"extentLimit":"reach","extentScale":16,"extentSteepness":0}"#);
        assert_eq!(extent_g(32.0, &flat), 1.0);
        let off = c1(r#"{"extentScale":16,"extentSteepness":8}"#);
        assert_eq!(extent_g(32.0, &off), 1.0);
    }

    #[test]
    fn an_upright_shoot_is_spared_the_extent_limit_and_a_level_one_takes_it_in_full() {
        // p = u² + (1 − u²)·g, u the upward part of the bud's heading.
        let g = 0.2;
        assert_eq!(extent_chance(g, 1.0, true), 1.0); // the leader
        assert_eq!(extent_chance(g, 0.0, true), g); // a level limb
        assert!(close(extent_chance(g, 0.5, true), 0.4)); // 60° off vertical: ¼ + ¾·0.2
        let diagonal = std::f64::consts::FRAC_1_SQRT_2;
        assert!(close(extent_chance(g, diagonal, true), 0.6)); // 45°: ½ + ½·0.2
        // A drooping shoot is as level: it gains no height.
        assert_eq!(extent_chance(g, -0.8, true), g);
        // Without sparing every shoot takes g, the leader too (#121's reach, #89's path).
        assert_eq!(extent_chance(g, 1.0, false), g);
        assert_eq!(extent_chance(g, 0.0, false), g);
        // No limit: no chance to take, whatever the heading.
        assert_eq!(extent_chance(1.0, 0.0, true), 1.0);
    }

    #[test]
    fn an_extent_size_is_the_reach_the_tree_height_or_the_path_from_the_base() {
        // L on a stem of three metamers with a level limb of two on its first node.
        // The stem stands at (10, 0, 32); the limb runs along +x at height 1.
        let mut t = Tree::new(0, 10.0, 32.0);
        let (up, x, z) = ([0.0, 1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]);
        let s0 = add_metamer(&mut t, -1, slot::MAIN, up, x, 0.0, 1.0, 0.1, 0.0);
        let s1 = add_metamer(&mut t, s0 as i32, slot::MAIN, up, x, 0.0, 1.0, 0.1, 0.0);
        let s2 = add_metamer(&mut t, s1 as i32, slot::MAIN, up, x, 0.0, 1.0, 0.1, 0.0);
        let l0 = add_metamer(&mut t, s0 as i32, 1, x, z, 0.0, 2.0, 0.1, 0.0);
        let l1 = add_metamer(&mut t, l0 as i32, slot::MAIN, x, z, 0.0, 1.5, 0.1, 0.0);
        assert_eq!((s2, l1), (2, 4));
        assert_eq!(
            extent_sizes(&t, ExtentLimit::Reach),
            [0.0, 0.0, 0.0, 2.0, 3.5]
        );
        assert_eq!(extent_sizes(&t, ExtentLimit::Height), [3.0; 5]);
        assert_eq!(
            extent_sizes(&t, ExtentLimit::Path),
            [1.0, 2.0, 3.0, 3.0, 4.5]
        );
    }

    #[test]
    fn a_bud_the_extent_limit_bars_rests_alive_and_a_spared_upright_one_grows() {
        // in the season loop's bud phase. A seedling whose terminal bud (upright)
        // and lateral bud (level: β = 90°) each hold resource for one metamer; its node is one
        // internode along its path, so with L_x tiny g is 0 to rounding.
        let grown = |extent: &str| {
            let p = params(&format!(r#"{{"c1":{{"branchAngle":90{extent}}}}}"#));
            let mut t = Tree::new(0, 10.0, 32.0);
            plant_seedling(&mut t, &p, 0.0, 0.0, 0.0);
            let terminal = (0..t.b.len()).find(|&j| t.b.slot[j] == slot::MAIN).unwrap();
            let lateral = (0..t.b.len()).find(|&j| t.b.slot[j] != slot::MAIN).unwrap();
            t.b.v.iter_mut().for_each(|v| *v = 1.0);
            let before = t.m.len();
            crate::season::grow_buds(&mut t, &p, 1.0);
            // A barred active bud that would have grown is held active (ADR 0074 decision 3).
            let rests = |j: usize| t.b.state[j] == bud::ACTIVE;
            (t.m.len() - before, rests(terminal), rests(lateral))
        };
        // Off: both grow, and neither bud is left.
        assert_eq!(grown(""), (2, false, false));
        let limit = r#","extentLimit":"path","extentScale":1e-6,"extentSteepness":4"#;
        // Every shoot takes g: both are barred and held active, to try again next season.
        assert_eq!(grown(limit), (0, true, true));
        // Upright shoots spared: the leader grows, the level lateral is barred.
        assert_eq!(
            grown(&format!(r#"{limit},"extentSpare":true"#)),
            (1, false, true)
        );
        // No limit (L_x huge): both grow.
        let free = r#","extentLimit":"path","extentScale":1e9,"extentSpare":true"#;
        assert_eq!(grown(free), (2, false, false));
    }

    #[test]
    fn a_barred_active_bud_that_would_have_grown_is_held_active_and_one_that_would_not_rests() {
        // ADR 0074 decision 3, the crown-extent probe's defects 1 and 2: with R4 and R6 on, a
        // barred level lateral that holds resource to extend stays active at age 0 (not a short
        // shoot with r6.leafArea, nor dormant toward L_dorm and R4's higher threshold). One with
        // no resource rests as it does without the rule.
        let fate = |extent: &str, v: f64| {
            let p = params(&format!(
                r#"{{"c1":{{"branchAngle":90{extent}}},"r4":{{"enabled":true}},
                   "r6":{{"enabled":true,"qMin":0}}}}"#
            ));
            let mut t = Tree::new(0, 10.0, 32.0);
            plant_seedling(&mut t, &p, 0.0, 0.0, 0.0);
            let lateral = (0..t.b.len()).find(|&j| t.b.slot[j] != slot::MAIN).unwrap();
            t.b.v.iter_mut().for_each(|x| *x = 0.0);
            t.b.v[lateral] = v;
            t.b.q[lateral] = 1.0;
            crate::season::grow_buds(&mut t, &p, 1.0);
            (t.b.state[lateral], t.b.age[lateral])
        };
        let bar =
            r#","extentLimit":"path","extentScale":1e-6,"extentSteepness":4,"extentSpare":true"#;
        assert_eq!(fate(bar, 5.0), (bud::ACTIVE, 0));
        assert_eq!(fate(bar, 0.0), fate("", 0.0));
        assert_eq!(fate("", 0.0).0, bud::SHORT_SHOOT);
        // Without the rule the bud grows: it is gone from its slot.
        assert_eq!(fate("", 5.0).0, bud::GONE);
    }

    #[test]
    fn the_extent_draw_bars_a_shoot_at_its_chance_and_is_keyed_by_tree_bud_and_season() {
        // in the bud phase. A seedling's node is one internode along its path, so
        // with L_x = 1 its terminal bud extends with a chance of one half. Over 4,000 seedlings
        // (tree ids 0..4000) about half grow; the same tree and season always draw alike, and
        // another season draws afresh.
        let p = params(r#"{"c1":{"extentLimit":"path","extentScale":1,"extentSteepness":3}}"#);
        let grows = |id: usize, season: f64| {
            let mut t = Tree::new(id, 10.0, 32.0);
            plant_seedling(&mut t, &p, 0.0, 0.0, 0.0);
            let terminal = (0..t.b.len()).find(|&j| t.b.slot[j] == slot::MAIN).unwrap();
            t.b.v.iter_mut().for_each(|v| *v = 0.0);
            t.b.v[terminal] = 1.0;
            let before = t.m.len();
            crate::season::grow_buds(&mut t, &p, season);
            t.m.len() > before
        };
        let first: Vec<bool> = (0..4000).map(|id| grows(id, 1.0)).collect();
        let grown = first.iter().filter(|&&g| g).count();
        assert!((1880..=2120).contains(&grown), "{grown} of 4000"); // ± 3.8 SD
        assert!((0..4000).all(|id| grows(id, 1.0) == first[id]));
        let changed = (0..4000).filter(|&id| grows(id, 2.0) != first[id]).count();
        assert!(
            (1880..=2120).contains(&changed),
            "{changed} of 4000 changed"
        );
    }

    #[test]
    fn the_extent_limit_is_off_by_default_and_written_out_is_bit_identical() {
        // `off` written out, with every other extent param set, hashes as a run
        // that leaves the rule absent; so does a limit whose L_x is 0 (no limit). A reach limit
        // of half a cell bars every shoot off the stem, so that run differs.
        let absent = hashed("{}", 12);
        let off = r#"{"c1":{"extentLimit":"off","extentSpare":true,"extentScale":0.5,
                     "extentSteepness":8,"extentFloor":0.1}}"#;
        assert_eq!(hashed(off, 12), absent);
        let no_scale = r#"{"c1":{"extentLimit":"reach","extentScale":0}}"#;
        assert_eq!(hashed(no_scale, 12), absent);
        let reach = r#"{"c1":{"extentLimit":"reach","extentScale":0.5,"extentSteepness":8}}"#;
        assert_ne!(hashed(reach, 12), absent);
    }
}
