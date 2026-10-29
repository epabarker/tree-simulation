//! 3D vectors and rotations for the growing tree (I2, ADR 0025). A metamer's direction is a frame:
//! its heading H (unit) and a reference L ⟂ H, carried from parent to child by parallel
//! transport, so the azimuths of laterals (C1's phyllotaxis) are measured around the axis itself
//! and do not depend on how the axis happens to lie in the world. y is up; the slab's depth is z.
//!
//! Everything goes through `crate::math`, so native and WASM give the same bits.

use crate::math;

pub type V3 = [f64; 3];

pub const UP: V3 = [0.0, 1.0, 0.0];

pub fn add(a: V3, b: V3) -> V3 {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

pub fn sub(a: V3, b: V3) -> V3 {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

pub fn scale(a: V3, s: f64) -> V3 {
    [a[0] * s, a[1] * s, a[2] * s]
}

pub fn dot(a: V3, b: V3) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

pub fn cross(a: V3, b: V3) -> V3 {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

pub fn norm(a: V3) -> f64 {
    dot(a, a).sqrt()
}

/// `a` scaled to unit length, or `fallback` when `a` is (nearly) zero.
pub fn normalize_or(a: V3, fallback: V3) -> V3 {
    let n = norm(a);
    if n > 1e-12 {
        scale(a, 1.0 / n)
    } else {
        fallback
    }
}

/// The component of `a` perpendicular to the unit vector `h`.
pub fn reject(a: V3, h: V3) -> V3 {
    sub(a, scale(h, dot(a, h)))
}

/// Some unit vector perpendicular to the unit vector `h`: horizontal where `h` is not vertical.
pub fn any_perpendicular(h: V3) -> V3 {
    // h × up, else x.
    normalize_or([-h[2], 0.0, h[0]], [1.0, 0.0, 0.0])
}

/// `v` rotated by `angle` about the unit `axis` (Rodrigues).
pub fn rotate(v: V3, axis: V3, angle: f64) -> V3 {
    let (s, c) = (math::sin(angle), math::cos(angle));
    let k_v = cross(axis, v);
    let k_dot = dot(axis, v) * (1.0 - c);
    [
        v[0] * c + k_v[0] * s + axis[0] * k_dot,
        v[1] * c + k_v[1] * s + axis[1] * k_dot,
        v[2] * c + k_v[2] * s + axis[2] * k_dot,
    ]
}

/// A rotation as a matrix, rows first.
pub type M3 = [[f64; 3]; 3];

pub const IDENTITY: M3 = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];

/// The rotation by |w| about w/|w| (a rotation vector); the identity for w = 0.
pub fn rotation(w: V3) -> M3 {
    let angle = norm(w);
    if angle == 0.0 {
        return IDENTITY;
    }
    let k = scale(w, 1.0 / angle);
    let (s, c) = (math::sin(angle), math::cos(angle));
    let t = 1.0 - c;
    [
        [
            c + k[0] * k[0] * t,
            k[0] * k[1] * t - k[2] * s,
            k[0] * k[2] * t + k[1] * s,
        ],
        [
            k[1] * k[0] * t + k[2] * s,
            c + k[1] * k[1] * t,
            k[1] * k[2] * t - k[0] * s,
        ],
        [
            k[2] * k[0] * t - k[1] * s,
            k[2] * k[1] * t + k[0] * s,
            c + k[2] * k[2] * t,
        ],
    ]
}

pub fn apply(m: &M3, v: V3) -> V3 {
    [dot(m[0], v), dot(m[1], v), dot(m[2], v)]
}

/// a · b: b first, then a.
pub fn compose(a: &M3, b: &M3) -> M3 {
    let mut out = [[0.0; 3]; 3];
    for (i, row) in out.iter_mut().enumerate() {
        for (j, cell) in row.iter_mut().enumerate() {
            *cell = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
        }
    }
    out
}

/// The smallest rotation taking unit `from` to unit `to`, as a rotation vector.
pub fn turn_between(from: V3, to: V3) -> V3 {
    let axis = cross(from, to);
    let s = norm(axis);
    let c = dot(from, to);
    if s < 1e-15 {
        if c > 0.0 {
            return [0.0; 3];
        }
        // Opposite: any perpendicular axis, by π.
        return scale(any_perpendicular(from), std::f64::consts::PI);
    }
    scale(axis, math::atan2(s, c) / s)
}

/// The reference `l` (⟂ `from`) carried onto `to` by the smallest rotation: parallel transport
/// from one heading to the next, kept exactly perpendicular and unit.
pub fn transport(l: V3, from: V3, to: V3) -> V3 {
    let w = turn_between(from, to);
    let moved = apply(&rotation(w), l);
    normalize_or(reject(moved, to), any_perpendicular(to))
}

/// The unit direction at `beta` from the heading `h`, toward azimuth `phi` measured around `h`
/// from its reference `l` (toward `h × l` at φ = π/2).
pub fn tilt(h: V3, l: V3, beta: f64, phi: f64) -> V3 {
    let side = add(scale(l, math::cos(phi)), scale(cross(h, l), math::sin(phi)));
    normalize_or(
        add(scale(h, math::cos(beta)), scale(side, math::sin(beta))),
        h,
    )
}

/// The angle between two unit vectors, radians.
pub fn angle_between(a: V3, b: V3) -> f64 {
    math::atan2(norm(cross(a, b)), dot(a, b))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: V3, b: V3) -> bool {
        (0..3).all(|i| (a[i] - b[i]).abs() < 1e-12)
    }

    #[test]
    fn rotates_by_rodrigues_and_by_matrix_alike() {
        let axis = normalize_or([1.0, 2.0, -0.5], UP);
        let v = [0.3, -0.7, 0.2];
        for angle in [0.0, 0.4, -1.3, 3.0] {
            assert!(close(
                rotate(v, axis, angle),
                apply(&rotation(scale(axis, angle)), v)
            ));
        }
        // A quarter turn about z takes x to y.
        assert!(close(
            rotate(
                [1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0],
                std::f64::consts::FRAC_PI_2
            ),
            UP
        ));
    }

    #[test]
    fn composes_right_to_left() {
        let a = rotation([0.0, 0.0, 0.5]);
        let b = rotation([0.3, 0.0, 0.0]);
        let v = [0.2, 0.9, -0.4];
        assert!(close(apply(&compose(&a, &b), v), apply(&a, apply(&b, v))));
    }

    #[test]
    fn transport_keeps_the_reference_perpendicular_and_turns_it_least() {
        let from = UP;
        let l = [1.0, 0.0, 0.0];
        let to = normalize_or([0.0, 1.0, 1.0], UP); // tilted toward +z: x is unaffected
        let moved = transport(l, from, to);
        assert!(close(moved, l));
        let to = normalize_or([1.0, 1.0, 0.0], UP); // tilted toward +x: x tips down
        let moved = transport(l, from, to);
        assert!(dot(moved, to).abs() < 1e-12 && (norm(moved) - 1.0).abs() < 1e-12);
        assert!(moved[1] < 0.0 && moved[2].abs() < 1e-12);
    }

    #[test]
    fn tilts_toward_the_azimuth_from_the_reference() {
        let beta = std::f64::consts::FRAC_PI_4;
        let s = beta.sin();
        assert!(close(tilt(UP, [1.0, 0.0, 0.0], beta, 0.0), [s, s, 0.0]));
        // φ = π/2 is toward up × x = −z.
        assert!(close(
            tilt(UP, [1.0, 0.0, 0.0], beta, std::f64::consts::FRAC_PI_2),
            [0.0, s, -s]
        ));
    }

    #[test]
    fn turn_between_takes_from_to_to() {
        let a = normalize_or([0.2, 1.0, 0.1], UP);
        let b = normalize_or([-0.5, 0.3, 0.8], UP);
        assert!(close(apply(&rotation(turn_between(a, b)), a), b));
        assert!((norm(turn_between(a, b)) - angle_between(a, b)).abs() < 1e-12);
    }
}
