//! R4. Dormancy, release and reiteration (spec §R4, ADR 0012; r4-dormancy.ts). An active bud
//! keeps growing while v ≥ v_cont; a dormant one needs v ≥ v_break·(1 + δ·age)·(1 + δ_b·s), or is
//! released by its own light Q ≥ Q_rel·(1 + δ·age); one older than L_dorm aborts. Age is the
//! seasons a bud has rested dormant: a leafy short shoot (R6) does not age. A released bud
//! reiterates: its shoot takes a younger physiological age.
//!
//! Stochastic break (prototype, agent A9; §R4.4's "optional stochastic break [RNG]", §6's
//! BUD_FATE [RNG]): with `c1.budBreak` stochastic, a lateral bud whose v reaches its threshold θ
//! grows only with probability p = 1/(1 + exp(−(v − θ)/w)) [RNG: budBreak, keyed by the bud's
//! birthId and the season]; one that is refused rests as any bud below θ does (R6's short shoot
//! or R4's bank), so it can break in a later season. Why: a deterministic test forms a lateral at
//! every lit node, the herringbone the blinded judge names; a bud fate drawn with a probability
//! rising in its signal is how bud-fate models (Costes & Guédon's Markov models of lateral fate)
//! leave nodes empty. Main-slot buds are exempt: a refused apex would go dormant and need v_break
//! (hysteresis), so the leader would stop for good. Off (absent or 'deterministic'): no draw.
//!
//! Params: r4.enabled, r4.vBreak, r4.qRel, r4.vCont, r4.delta (δ), r4.lDorm, r4.juvenile,
//! r4.bank; r5.dB (δ_b); c1.budBreak (mode, width w).

use crate::math;
use crate::params::{Params, R4};
use crate::rng::{purpose, uniform};
use crate::tree::{bud, slot};

/// The resource a live bud needs to grow this season (1 without R4).
pub fn growth_threshold(state: u8, age: f64, shade: f64, params: &Params) -> f64 {
    let r4 = &params.r4;
    if !r4.enabled {
        return 1.0;
    }
    if state != bud::DORMANT {
        return r4.v_cont;
    }
    let suppressed = if params.r5.enabled {
        1.0 + params.r5.d_b * shade
    } else {
        1.0
    };
    r4.v_break * (1.0 + r4.delta * age) * suppressed
}

/// The probability a bud with resource `v` at threshold `threshold` breaks: a logistic of width
/// `width` through the threshold (1/2 at θ), 1 for a width ≤ 0.
pub fn break_probability(v: f64, threshold: f64, width: f64) -> f64 {
    if width <= 0.0 {
        return 1.0;
    }
    1.0 / (1.0 + math::exp(-(v - threshold) / width))
}

/// Whether a bud in `slot_` (birth id `bud_id`) that passed its threshold breaks this season:
/// always, unless `c1.budBreak` is stochastic and the bud is a lateral; then with
/// `break_probability` [RNG: budBreak, keyed by the bud and season].
pub fn breaks(
    v: f64,
    threshold: f64,
    slot_: u8,
    tree_id: f64,
    bud_id: f64,
    season: f64,
    params: &Params,
) -> bool {
    let Some(width) = params.c1.bud_break_width else {
        return true;
    };
    if slot_ == slot::MAIN {
        return true;
    }
    let u = uniform(
        params.seed,
        purpose::BUD_BREAK,
        tree_id,
        bud_id,
        season,
        0.0,
    );
    u < break_probability(v, threshold, width)
}

/// The light trigger: Q ≥ Q_rel·(1 + δ·age).
pub fn light_releases(q: f64, age: f64, params: &Params) -> bool {
    let r4 = &params.r4;
    r4.enabled && q >= r4.q_rel * (1.0 + r4.delta * age)
}

/// A resting dormant bud older than L_dorm (seasons rested dormant) aborts.
pub fn aborts(state: u8, age: f64, r4: &R4) -> bool {
    r4.enabled && state == bud::DORMANT && age > r4.l_dorm
}

/// paShift of a shoot of order `order` released from a dormant bud on an axis with `shift`.
pub fn released_shift(order: f64, shift: f64, r4: &R4) -> f64 {
    math::min(order, shift + r4.juvenile)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::principles::c1::{form_axillary_buds, plant_seedling};
    use crate::principles::c5::remove_branches;
    use crate::season::grow_buds;
    use crate::testing::preset;
    use crate::testing::{LEFT, RIGHT, bud, metamer};
    use crate::tree::{Tree, slot};
    use std::f64::consts::PI;

    fn params(patch: &str) -> Params {
        let base = preset("default", r#"{"r4":{"enabled":true}}"#);
        Params::from_json(&crate::json::merge(
            &base,
            &crate::json::parse(patch).unwrap(),
        ))
    }

    /// A seedling at x = 10; its lateral bud (index 1) is made dormant at light q.
    fn seedling(p: &Params, q: f64) -> Tree {
        let mut t = Tree::new(0, 10.0, 0.5);
        plant_seedling(&mut t, p, 0.0, 0.0, 0.0);
        t.ensure_scratch();
        for j in 0..t.b.len() {
            t.b.v[j] = 0.0;
        }
        t.b.state[1] = bud::DORMANT;
        t.b.q[1] = q;
        t
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    #[test]
    fn needs_v_cont_to_continue_but_more_to_break() {
        let p = params(r#"{"r4":{"vBreak":2,"vCont":1.2,"delta":0.1}}"#);
        let off = params(r#"{"r4":{"enabled":false}}"#);
        assert_eq!(growth_threshold(bud::ACTIVE, 5.0, 0.5, &off), 1.0);
        assert_eq!(growth_threshold(bud::ACTIVE, 5.0, 0.5, &p), 1.2);
        assert_eq!(growth_threshold(bud::SHORT_SHOOT, 5.0, 0.5, &p), 1.2);
        assert!(close(growth_threshold(bud::DORMANT, 5.0, 0.5, &p), 3.0));
        let shaded =
            params(r#"{"r4":{"vBreak":2,"vCont":1.2,"delta":0.1},"r5":{"enabled":true,"dB":2}}"#);
        assert!(close(
            growth_threshold(bud::DORMANT, 5.0, 0.5, &shaded),
            6.0
        ));
    }

    #[test]
    fn a_stochastic_break_rises_through_the_threshold_and_spares_the_apex() {
        assert!(close(break_probability(1.0, 1.0, 0.25), 0.5));
        assert!(break_probability(1.5, 1.0, 0.25) > 0.85);
        assert!(break_probability(1.1, 1.0, 0.25) < break_probability(1.3, 1.0, 0.25));
        assert_eq!(break_probability(1.0, 1.0, 0.0), 1.0);
        let off = params("{}");
        let on = params(r#"{"c1":{"budBreak":{"mode":"stochastic","width":0.25}}}"#);
        let (mut at_threshold, mut well_above) = (0.0f64, 0.0f64);
        for id in 0..4000 {
            let id = id as f64;
            assert!(breaks(1.0, 1.0, slot::LATERAL, 0.0, id, 3.0, &off));
            assert!(breaks(1.0, 1.0, slot::MAIN, 0.0, id, 3.0, &on));
            if breaks(1.0, 1.0, slot::LATERAL, 0.0, id, 3.0, &on) {
                at_threshold += 1.0;
            }
            if breaks(2.0, 1.0, slot::LATERAL, 0.0, id, 3.0, &on) {
                well_above += 1.0;
            }
        }
        assert!((at_threshold / 4000.0 - 0.5).abs() < 0.03);
        assert!(well_above / 4000.0 > 0.96);
        // Keyed by the bud and the season: the same bud draws afresh next season.
        let draws: Vec<bool> = (0..64)
            .map(|s| breaks(1.0, 1.0, slot::LATERAL, 0.0, 7.0, s as f64, &on))
            .collect();
        assert!(draws.iter().any(|&b| b) && draws.iter().any(|&b| !b));
    }

    #[test]
    fn releases_a_dormant_bud_by_its_own_light() {
        let p = params(r#"{"r4":{"qRel":0.1,"delta":0.1}}"#);
        assert!(!light_releases(0.19, 10.0, &p));
        assert!(light_releases(0.2, 10.0, &p));
        assert!(!light_releases(
            1.0,
            0.0,
            &params(r#"{"r4":{"enabled":false}}"#)
        ));
    }

    #[test]
    fn aborts_dormant_buds_older_than_l_dorm_and_only_dormant_ones() {
        let r4 = R4 {
            l_dorm: 10.0,
            ..params("{}").r4
        };
        assert!(!aborts(bud::DORMANT, 10.0, &r4));
        assert!(aborts(bud::DORMANT, 11.0, &r4));
        assert!(!aborts(bud::SHORT_SHOOT, 50.0, &r4));
    }

    #[test]
    fn a_short_shoot_does_not_age_toward_l_dorm() {
        // Q_rel 2: no light release, so the bud only rests.
        let p = params(r#"{"r4":{"lDorm":10,"qRel":2},"r6":{"enabled":true,"qMin":0.2}}"#);
        let mut t = seedling(&p, 0.5);
        // Thirty leafy seasons: a short shoot, still age 0 (it used to reach 30 and abort at its
        // first dark season).
        for s in 0..30 {
            grow_buds(&mut t, &p, s as f64);
            assert_eq!(t.b.state[1], bud::SHORT_SHOOT);
        }
        assert_eq!(t.b.age[1], 0);
        // Then shaded below Q_ss: dormant, and it aborts after L_dorm dormant seasons, not before.
        t.b.q[1] = 0.05;
        for s in 30..40 {
            grow_buds(&mut t, &p, s as f64);
            assert_eq!(t.b.state[1], bud::DORMANT, "season {s}");
        }
        assert_eq!(t.b.age[1], 10);
        grow_buds(&mut t, &p, 40.0);
        assert_eq!(t.b.state[1], bud::GONE);
    }

    #[test]
    fn pays_a_light_released_shoot_from_the_reserve_and_reiterates_it() {
        let p = params(r#"{"r1":{"enabled":true},"r4":{"qRel":0.1,"juvenile":1}}"#);
        let mut t = seedling(&p, 0.5);
        t.reserve = 3.0;
        grow_buds(&mut t, &p, 0.0);
        assert_eq!(t.released, 1.0);
        assert_eq!(t.reserve, 2.0);
        let sprout = t.m.len() - 1;
        assert_eq!(t.m.order[sprout], 1);
        assert_eq!(t.m.pa_shift[sprout], 1); // pa 0: a trunk-like shoot
        assert_eq!(released_shift(1.0, 0.0, &p.r4), 1.0);
        assert_eq!(released_shift(1.0, 1.0, &p.r4), 1.0); // never below pa 0

        let mut p2 = p.clone();
        p2.r4.l_dorm = 3.0;
        let mut broke = seedling(&p2, 0.5);
        broke.reserve = 0.5; // cannot pay
        broke.b.age[1] = 3; // only this one passes L_dorm
        grow_buds(&mut broke, &p2, 0.0);
        assert_eq!(broke.released, 0.0);
        assert_eq!(broke.aborted, 1.0);

        let off = params(r#"{"r1":{"enabled":true},"r4":{"enabled":false,"qRel":0.1}}"#);
        let mut t = seedling(&off, 0.5);
        grow_buds(&mut t, &off, 0.0);
        assert_eq!(t.b.state[1], bud::DORMANT);
    }

    #[test]
    fn looks_up_r2_rows_by_order_minus_pa_shift() {
        let row = |g: &str| {
            format!(
                r#"{{"lambda":0.5,"setPoint":0,"eta":0.15,"branchAngle":45,"generator":"{g}","tierEvery":0,"pTerm":0}}"#
            )
        };
        let p = params(&format!(
            r#"{{"r2":{{"enabled":true,"levels":[{},{}]}}}}"#,
            row("opposite"),
            row("none")
        ));
        let mut t = seedling(&p, 0.0);
        let lateral = metamer(&mut t, 0, RIGHT, 0.0, 1.0, 0.02, 1.0);
        let before = t.b.len();
        form_axillary_buds(&mut t, lateral, &p, false);
        assert_eq!(t.b.len(), before); // pa 1: no laterals
        t.m.pa_shift[lateral] = 1;
        form_axillary_buds(&mut t, lateral, &p, false);
        assert_eq!(t.b.len(), before + 2); // pa 0: opposite
    }

    #[test]
    fn leaves_a_dormant_bud_in_the_slot_of_a_shed_branch() {
        let p = params("{}");
        let mut t = seedling(&p, 0.0);
        let limb = metamer(&mut t, 0, LEFT, PI / 2.0 + 0.7, 1.0, 0.02, 1.0);
        bud(&mut t, limb, slot::MAIN, PI / 2.0 + 0.7, 1.0);
        t.ensure_scratch();
        let mut dead = vec![0u8; t.m.len()];
        dead[limb] = 1;
        let before = t.b.len();
        remove_branches(&mut t, &mut dead, &p, &mut []);
        let banked = t.b.len() - 1;
        assert_eq!(t.b.len(), before + 1);
        assert_eq!(t.b.state[banked], bud::DORMANT);
        assert_eq!(t.b.metamer[banked], 0);
        assert_eq!(t.b.slot[banked], LEFT);
        assert_eq!(t.b.order[banked], 1);
        // Back where the limb was: 45° from the trunk, at its azimuth around it.
        let h = t.bud_heading(banked);
        assert!(close(
            crate::geom::angle_between(h, crate::geom::UP),
            PI / 4.0
        ));
        assert!(close(t.b.azimuth[banked], -PI / 2.0));
        let (want, _) = crate::principles::c1::lateral_frame(&t, 0, -PI / 2.0, PI / 4.0);
        assert!((0..3).all(|k| (h[k] - want[k]).abs() < 1e-12));
        assert!(close(t.m.scar_sum_n[0], 0.02f64.powi(2)));

        let p = params(r#"{"r4":{"bank":false}}"#);
        let mut t = seedling(&p, 0.0);
        let limb = metamer(&mut t, 0, LEFT, 1.0, 1.0, 0.02, 1.0);
        t.ensure_scratch();
        let mut dead = vec![0u8; t.m.len()];
        dead[limb] = 1;
        let n = t.b.len();
        remove_branches(&mut t, &mut dead, &p, &mut []);
        assert_eq!(t.b.len(), n);
    }
}
