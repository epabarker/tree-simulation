//! C4. Shoot direction as a weighted sum (spec §C4; I2, ADR 0025): d = normalize(w_d·d_prev +
//! ξ·V + η·t(A_set) + ε·u), all 3-vectors. t(A_set) lies in the vertical plane through d_prev's
//! heading, A_set from vertical; u is d_prev turned by N(0, σ²) about an axis perpendicular to it,
//! at an azimuth drawn round it [RNG: directionNoise, keyed by the new metamer and season].
//!
//! Per-axis set-point offset (prototype, agent A9; ADR 0053's option (b)): with `c4.axisSD` (s_ax)
//! above 0, every axis but the trunk's own draws one offset N(0, s_ax²), degrees, when it starts
//! [RNG: axisOffset, keyed by the axis, i.e. its first metamer's birthId], added to its set point
//! wherever the form offsets are (C4's tropism here and R3's posture), so it persists as the axis
//! grows and thickens. Why: u is white and mean-reverting, and R3's posture restores every axis
//! to its level's A_set, so limbs come out alike and straight; a persistent per-axis draw lets
//! limbs differ and keep their course. Off (absent or 0): no draw.
//!
//! Params: c4.wd, c4.xi (ξ), c4.eta (η), c4.setPoint (A_set), c4.epsilon (ε), c4.sigma (σ),
//! c4.axisSD (s_ax).

use crate::geom::{V3, any_perpendicular, cross, normalize_or, reject, rotate};
use crate::math;
use crate::params::{C4, DEG};
use crate::rng::{normal, purpose};

/// The horizontal unit heading of `d`, or of `l` when `d` is vertical, or +x.
pub fn horizontal_heading(d: V3, l: V3) -> V3 {
    let flat = normalize_or([d[0], 0.0, d[2]], [0.0; 3]);
    if flat != [0.0; 3] {
        return flat;
    }
    normalize_or([l[0], 0.0, l[2]], [1.0, 0.0, 0.0])
}

/// The tropism target at `set_point` (radians from vertical) on `d`'s side.
pub fn set_point_direction(d: V3, l: V3, set_point: f64) -> V3 {
    let h = horizontal_heading(d, l);
    [
        math::sin(set_point) * h[0],
        math::cos(set_point),
        math::sin(set_point) * h[2],
    ]
}

/// `prev` turned by `angle` about the axis perpendicular to it at `azimuth` around it, measured
/// from `l` (prev's reference).
pub fn noise_turn(prev: V3, l: V3, angle: f64, azimuth: f64) -> V3 {
    let l = normalize_or(reject(l, prev), any_perpendicular(prev));
    let m = cross(prev, l);
    let axis = [
        math::cos(azimuth) * l[0] + math::sin(azimuth) * m[0],
        math::cos(azimuth) * l[1] + math::sin(azimuth) * m[1],
        math::cos(azimuth) * l[2] + math::sin(azimuth) * m[2],
    ];
    rotate(prev, axis, angle)
}

/// The new direction from `prev` (reference `l`), the light direction `v` and the noise turn
/// (`angle` = σ·N(0, 1), `azimuth` of its axis).
pub fn shoot_direction(prev: V3, l: V3, v: V3, angle: f64, azimuth: f64, c4: &C4) -> V3 {
    let t = set_point_direction(prev, l, c4.set_point * DEG);
    let u = noise_turn(prev, l, angle, azimuth);
    let mut d = [0.0; 3];
    for (k, x) in d.iter_mut().enumerate() {
        *x = c4.wd * prev[k] + c4.xi * v[k] + c4.eta * t[k] + c4.epsilon * u[k];
    }
    normalize_or(d, prev)
}

/// The offset, degrees, of axis `axis` (its first metamer's birthId) to its set point: s_ax·N(0, 1)
/// [RNG: axisOffset, keyed by the axis only, so it holds for the axis's life]; 0 on the trunk's
/// own axis and when s_ax = 0 (no draw).
pub fn axis_offset(trunk: bool, seed: f64, tree_id: f64, axis: f64, sd: f64) -> f64 {
    if trunk || sd <= 0.0 {
        return 0.0;
    }
    sd * normal(seed, purpose::AXIS_OFFSET, tree_id, axis, 0.0, 0.0)
}

/// Elevation of a direction above the horizontal, radians.
pub fn elevation(d: V3) -> f64 {
    math::asin(math::max(-1.0, math::min(1.0, d[1])))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geom::{UP, angle_between, dot, norm};

    const C4: C4 = C4 {
        enabled: true,
        wd: 1.0,
        xi: 0.3,
        eta: 0.15,
        set_point: 0.0,
        epsilon: 0.5,
        sigma: 20.0,
        axis_sd: 0.0,
    };
    const X: V3 = [1.0, 0.0, 0.0];
    const Z: V3 = [0.0, 0.0, 1.0];

    fn close(a: V3, b: V3) -> bool {
        (0..3).all(|i| (a[i] - b[i]).abs() < 1e-12)
    }

    #[test]
    fn keeps_the_default_direction_when_only_wd_acts() {
        let only = C4 {
            xi: 0.0,
            eta: 0.0,
            epsilon: 0.0,
            ..C4
        };
        let d = normalize_or([0.3, 0.8, -0.2], UP);
        assert!(close(shoot_direction(d, Z, X, 0.0, 0.0, &only), d));
    }

    #[test]
    fn turns_toward_the_light_direction_with_weight_xi() {
        let light = C4 {
            eta: 0.0,
            epsilon: 0.0,
            xi: 1.0,
            ..C4
        };
        // Light from +z: an upright shoot leans 45° toward it, in depth.
        let d = shoot_direction(UP, X, Z, 0.0, 0.0, &light);
        assert!(close(d, normalize_or([0.0, 1.0, 1.0], UP)));
    }

    #[test]
    fn bends_toward_the_set_point_in_its_own_vertical_plane() {
        let t = C4 {
            xi: 0.0,
            epsilon: 0.0,
            eta: 0.5,
            set_point: 0.0,
            ..C4
        };
        // Nearly horizontal, heading into +x+z: it rises, and keeps its azimuth.
        let d0 = normalize_or([1.0, 0.1, 1.0], UP);
        let d = shoot_direction(d0, UP, [0.0; 3], 0.0, 0.0, &t);
        assert!(d[1] > d0[1]);
        assert!((d[0] - d[2]).abs() < 1e-12);
        let away = C4 { eta: -0.5, ..t };
        assert!(shoot_direction(d0, UP, [0.0; 3], 0.0, 0.0, &away)[1] < d0[1]);
    }

    #[test]
    fn noise_turns_the_previous_direction_by_its_angle_about_a_perpendicular_axis() {
        let noisy = C4 {
            xi: 0.0,
            eta: 0.0,
            wd: 0.0,
            epsilon: 1.0,
            ..C4
        };
        for azimuth in [0.0, 1.0, 2.5, 4.0] {
            let d = shoot_direction(UP, X, [0.0; 3], 0.2, azimuth, &noisy);
            assert!((angle_between(d, UP) - 0.2).abs() < 1e-12);
            assert!((norm(d) - 1.0).abs() < 1e-12);
        }
        // Different azimuths turn it different ways.
        let a = shoot_direction(UP, X, [0.0; 3], 0.2, 0.0, &noisy);
        let b = shoot_direction(UP, X, [0.0; 3], 0.2, 1.5, &noisy);
        assert!(dot(a, b) < 0.999);
    }

    #[test]
    fn an_axis_offset_is_drawn_once_per_axis_and_spares_the_trunk() {
        assert_eq!(axis_offset(false, 1.0, 0.0, 12.0, 0.0), 0.0);
        assert_eq!(axis_offset(true, 1.0, 0.0, 12.0, 12.0), 0.0);
        // The same axis gets the same offset whenever it is asked (it persists as the axis grows).
        let a = axis_offset(false, 1.0, 0.0, 12.0, 12.0);
        assert_eq!(a, axis_offset(false, 1.0, 0.0, 12.0, 12.0));
        assert_ne!(a, axis_offset(false, 1.0, 0.0, 13.0, 12.0));
        // N(0, s_ax²) over many axes.
        let n = 20_000;
        let (mut s1, mut s2) = (0.0, 0.0);
        for k in 0..n {
            let x = axis_offset(false, 3.0, 1.0, k as f64, 12.0);
            s1 += x;
            s2 += x * x;
        }
        let (mean, sd) = (
            s1 / n as f64,
            (s2 / n as f64 - (s1 / n as f64).powi(2)).sqrt(),
        );
        assert!(mean.abs() < 0.3, "mean {mean}");
        assert!((sd - 12.0).abs() < 0.3, "sd {sd}");
    }
}
