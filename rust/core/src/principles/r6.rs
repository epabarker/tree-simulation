//! R6. Short shoots (spec §R6, ADR 0006; r6-short-shoots.ts). A bud too weak to extend but lit at
//! Q ≥ Q_ss becomes a leafy short shoot; foliage follows shoot type (active 1, short shoot a_ss,
//! dormant 0), and a short shoot's Q counts a_ss times in the basipetal sum.
//!
//! Params: r6.enabled, r6.qMin (Q_ss), r6.leafArea (a_ss).

use crate::params::R6;
use crate::tree::bud;

/// Leaf area a live bud deposits into the light field.
pub fn deposit_area(state: u8, r6: &R6) -> f64 {
    if !r6.enabled {
        return 1.0;
    }
    if state == bud::SHORT_SHOOT {
        return r6.leaf_area;
    }
    if state == bud::ACTIVE { 1.0 } else { 0.0 }
}

/// Weight of a live bud's Q in the basipetal sum.
pub fn light_weight(state: u8, r6: &R6) -> f64 {
    if r6.enabled && state == bud::SHORT_SHOOT {
        r6.leaf_area
    } else {
        1.0
    }
}

/// Fate of a live bud that grows no shoot this season.
pub fn resting_state(q: f64, r6: &R6) -> u8 {
    if r6.enabled && q >= r6.q_min {
        bud::SHORT_SHOOT
    } else {
        bud::DORMANT
    }
}
