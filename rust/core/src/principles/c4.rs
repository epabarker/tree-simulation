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
