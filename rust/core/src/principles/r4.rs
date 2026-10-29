//! R4. Dormancy, release and reiteration (spec §R4, ADR 0012; r4-dormancy.ts). An active bud
//! keeps growing while v ≥ v_cont; a dormant one needs v ≥ v_break·(1 + δ·age)·(1 + δ_b·s), or is
//! released by its own light Q ≥ Q_rel·(1 + δ·age); one older than L_dorm aborts. A released bud
//! reiterates: its shoot takes a younger physiological age.
//!
//! Params: r4.enabled, r4.vBreak, r4.qRel, r4.vCont, r4.delta (δ), r4.lDorm, r4.juvenile,
//! r4.bank; r5.dB (δ_b).

use crate::math;
use crate::params::{Params, R4};
use crate::tree::bud;

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

/// The light trigger: Q ≥ Q_rel·(1 + δ·age).
pub fn light_releases(q: f64, age: f64, params: &Params) -> bool {
    let r4 = &params.r4;
    r4.enabled && q >= r4.q_rel * (1.0 + r4.delta * age)
}

/// A resting dormant bud older than L_dorm aborts.
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
    use crate::principles::c1::{add_bud, add_metamer, form_axillary_buds, plant_seedling};
    use crate::principles::c5::remove_branches;
    use crate::season::grow_buds;
    use crate::testing::preset;
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
        let mut t = Tree::new(0, 10.0);
        plant_seedling(&mut t, p, 0.0, 0.0);
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
        let lateral = add_metamer(&mut t, 0, slot::RIGHT, 0.0, 1.0, 0.02, 1.0);
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
        let limb = add_metamer(&mut t, 0, slot::LEFT, PI / 2.0 + 0.7, 1.0, 0.02, 1.0);
        add_bud(&mut t, limb, slot::MAIN, PI / 2.0 + 0.7, 1.0);
        t.ensure_scratch();
        let mut dead = vec![0u8; t.m.len()];
        dead[limb] = 1;
        let before = t.b.len();
        remove_branches(&mut t, &mut dead, &p, &mut []);
        let banked = t.b.len() - 1;
        assert_eq!(t.b.len(), before + 1);
        assert_eq!(t.b.state[banked], bud::DORMANT);
        assert_eq!(t.b.metamer[banked], 0);
        assert_eq!(t.b.slot[banked], slot::LEFT);
        assert_eq!(t.b.order[banked], 1);
        assert!(close(t.b.angle[banked], PI / 2.0 + (45.0 * PI) / 180.0));
        assert!(close(t.m.scar_sum_n[0], 0.02f64.powi(2)));

        let p = params(r#"{"r4":{"bank":false}}"#);
        let mut t = seedling(&p, 0.0);
        let limb = add_metamer(&mut t, 0, slot::LEFT, 1.0, 1.0, 0.02, 1.0);
        t.ensure_scratch();
        let mut dead = vec![0u8; t.m.len()];
        dead[limb] = 1;
        let n = t.b.len();
        remove_branches(&mut t, &mut dead, &p, &mut []);
        assert_eq!(t.b.len(), n);
    }
}
