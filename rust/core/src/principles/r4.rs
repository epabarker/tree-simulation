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
