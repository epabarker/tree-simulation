//! R5. Shade-avoidance elongation (spec §R5, ADR 0012; r5-shade.ts). With s = 1 − Q/C: internodes
//! l0·(1 + e_s·s), λ + δλ·s at a node, v_break·(1 + δ_b·s) (R4), set-point A_set·(1 − δ_A·s). With
//! the neighbour signal (M19), s is scaled by the share of the foliage above owned by others.
//!
//! Params: r5.enabled, r5.eS, r5.dLambda, r5.dB, r5.dA, r5.signal; c2.C.

use crate::math;
use crate::params::R5;

/// s = 1 − Q/C, clamped to [0, 1].
pub fn shade_of(q: f64, c: f64) -> f64 {
    if c > 0.0 {
        math::min(1.0, math::max(0.0, 1.0 - q / c))
    } else {
        0.0
    }
}

pub fn elongation(shade: f64, r5: &R5) -> f64 {
    if r5.enabled {
        1.0 + r5.e_s * shade
    } else {
        1.0
    }
}

pub fn shaded_lambda(lambda: f64, shade: f64, r5: &R5) -> f64 {
    if r5.enabled {
        math::min(0.99, lambda + r5.d_lambda * shade)
    } else {
        lambda
    }
}

pub fn set_point_scale(shade: f64, r5: &R5) -> f64 {
    if r5.enabled {
        math::max(0.0, 1.0 - r5.d_a * shade)
    } else {
        1.0
    }
}

const SHARE_ROWS: f64 = 12.0;
const SHARE_COLS: f64 = 1.0;

/// The share of the foliage above (x, y) owned by trees other than `id` (owner grid, O2).
pub fn neighbour_share(
    owner: &[i32],
    w: f64,
    h: f64,
    periodic: bool,
    x: f64,
    y: f64,
    id: f64,
) -> f64 {
    let row0 = y.floor() + 1.0;
    let col0 = x.floor();
    let mut own = 0.0;
    let mut others = 0.0;
    let mut row = row0;
    while row < math::min(h, row0 + SHARE_ROWS) {
        let mut dc = -SHARE_COLS;
        while dc <= SHARE_COLS {
            let mut col = col0 + dc;
            dc += 1.0;
            if periodic {
                col = ((col % w) + w) % w;
            } else if col < 0.0 || col >= w {
                continue;
            }
            let o = owner[(row * w + col) as usize];
            if o == -1 {
                continue;
            }
            if o as f64 == id {
                own += 1.0;
            } else if o == -2 {
                own += 0.5;
                others += 0.5;
            } else {
                others += 1.0;
            }
        }
        row += 1.0;
    }
    if own + others > 0.0 {
        others / (own + others)
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::Params;
    use crate::principles::c1::plant_seedling;
    use crate::season::grow_buds;
    use crate::testing::preset;
    use crate::tree::{Tree, bud};

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    #[test]
    fn maps_shade_to_elongation_leader_bias_and_a_more_upright_set_point() {
        let off = Params::from_json(&preset("default", "{}")).r5;
        let r5 = R5 {
            enabled: true,
            e_s: 0.4,
            d_lambda: 0.05,
            d_a: 0.5,
            ..off.clone()
        };
        assert_eq!(shade_of(0.25, 1.0), 0.75);
        assert_eq!(shade_of(2.0, 1.0), 0.0);
        assert!(close(elongation(0.5, &r5), 1.2));
        assert!(close(shaded_lambda(0.5, 0.5, &r5), 0.525));
        assert_eq!(shaded_lambda(0.98, 1.0, &r5), 0.99);
        assert!(close(set_point_scale(0.5, &r5), 0.75));
        assert_eq!(elongation(1.0, &off), 1.0);
        assert_eq!(shaded_lambda(0.5, 1.0, &off), 0.5);
        assert_eq!(set_point_scale(1.0, &off), 1.0);
    }

    #[test]
    fn lengthens_a_shaded_buds_internodes() {
        let p = Params::from_json(&preset("default", r#"{"r5":{"enabled":true,"eS":0.5}}"#));
        let mut t = Tree::new(0, 10.0);
        plant_seedling(&mut t, &p, 0.0, 0.0);
        t.ensure_scratch();
        t.b.state[1] = bud::ACTIVE;
        t.b.q[0] = 1.0; // open sky: s = 0
        t.b.q[1] = 0.2; // s = 0.8
        t.b.v[0] = 1.0;
        t.b.v[1] = 1.0;
        grow_buds(&mut t, &p, 0.0);
        let mut lengths = [t.m.length[1], t.m.length[2]];
        lengths.sort_by(|a, b| a.partial_cmp(b).unwrap());
        assert!(close(lengths[0], 1.0));
        assert!(close(lengths[1], 1.4));
    }
}
