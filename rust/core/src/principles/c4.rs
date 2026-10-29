//! C4. Shoot direction as a weighted sum (spec §C4; c4-direction.ts): d = normalize(w_d·d_prev +
//! ξ·V + η·t(A_set) + ε·u), u = d_prev rotated by N(0, σ²) noise. In 2D a direction is an angle.
//!
//! Params: c4.wd, c4.xi (ξ), c4.eta (η), c4.setPoint (A_set), c4.epsilon (ε), c4.sigma (σ).

use crate::math;
use crate::params::{C4, DEG};

/// The new direction (radians) from `prev`, the light direction (vx, vy) and a noise angle.
pub fn shoot_direction(prev: f64, vx: f64, vy: f64, noise: f64, c4: &C4) -> f64 {
    let dx = math::cos(prev);
    let dy = math::sin(prev);
    let set_point = c4.set_point * DEG;
    let side = if dx >= 0.0 { 1.0 } else { -1.0 };
    let tx = math::sin(set_point) * side;
    let ty = math::cos(set_point);
    let ux = math::cos(prev + noise);
    let uy = math::sin(prev + noise);
    let x = c4.wd * dx + c4.xi * vx + c4.eta * tx + c4.epsilon * ux;
    let y = c4.wd * dy + c4.xi * vy + c4.eta * ty + c4.epsilon * uy;
    if x == 0.0 && y == 0.0 {
        prev
    } else {
        math::atan2(y, x)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const UP: f64 = std::f64::consts::FRAC_PI_2;
    const C4: C4 = C4 {
        enabled: true,
        wd: 1.0,
        xi: 0.3,
        eta: 0.15,
        set_point: 0.0,
        epsilon: 0.5,
        sigma: 20.0,
    };

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    #[test]
    fn keeps_the_default_direction_when_only_wd_acts() {
        let only = C4 {
            xi: 0.0,
            eta: 0.0,
            epsilon: 0.0,
            ..C4
        };
        assert!(close(shoot_direction(0.3, 1.0, 0.0, 0.0, &only), 0.3));
    }

    #[test]
    fn turns_toward_the_light_direction_with_weight_xi() {
        let light = C4 {
            eta: 0.0,
            epsilon: 0.0,
            xi: 1.0,
            ..C4
        };
        // Light from the right.
        assert!(close(
            shoot_direction(UP, 1.0, 0.0, 0.0, &light),
            std::f64::consts::FRAC_PI_4
        ));
    }

    #[test]
    fn bends_toward_the_set_point_and_a_negative_eta_away() {
        let t = C4 {
            xi: 0.0,
            epsilon: 0.0,
            eta: 0.5,
            set_point: 0.0,
            ..C4
        };
        let horizontal = 0.1; // nearly horizontal, heading right
        assert!(shoot_direction(horizontal, 0.0, 0.0, 0.0, &t) > horizontal);
        let away = C4 { eta: -0.5, ..t };
        assert!(shoot_direction(horizontal, 0.0, 0.0, 0.0, &away) < horizontal);
    }

    #[test]
    fn adds_noise_as_a_rotated_copy_of_the_default_direction() {
        let noisy = C4 {
            xi: 0.0,
            eta: 0.0,
            wd: 0.0,
            epsilon: 1.0,
            ..C4
        };
        assert!(close(shoot_direction(UP, 0.0, 1.0, 0.2, &noisy), UP + 0.2));
    }
}
