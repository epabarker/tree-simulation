//! The `Math` functions the core uses (ADR 0024): the `libm` crate, pure Rust and identical on
//! native and wasm32, so the CLI and the page give the same bits. The C library is never called.
//! (Until I1 a `parity` feature carried V8's routines, ported bit for bit, to reproduce the
//! TypeScript core's goldens; it is archived at the tag `golden-2d-ts`.)
//!
//! `sqrt`, `floor`, `ceil`, `abs` are exact in IEEE 754, so Rust's own; `max`, `min`, `round` and
//! `sign` keep JavaScript's NaN and ±0 rules, which the checkpoints and goldens were made with.

pub fn sin(x: f64) -> f64 {
    libm::sin(x)
}

pub fn cos(x: f64) -> f64 {
    libm::cos(x)
}

pub fn exp(x: f64) -> f64 {
    libm::exp(x)
}

pub fn pow(x: f64, y: f64) -> f64 {
    libm::pow(x, y)
}

pub fn hypot(a: f64, b: f64) -> f64 {
    libm::hypot(a, b)
}

/// Natural log (`Math.log`).
pub fn ln(x: f64) -> f64 {
    libm::log(x)
}

pub fn atan2(y: f64, x: f64) -> f64 {
    libm::atan2(y, x)
}

pub fn cbrt(x: f64) -> f64 {
    libm::cbrt(x)
}

pub fn asin(x: f64) -> f64 {
    libm::asin(x)
}

pub fn acos(x: f64) -> f64 {
    libm::acos(x)
}

/// JavaScript's `Math.round`: the nearest integer, halves toward +∞, keeping −0 (and rounding
/// −0.5 ≤ x < 0 to −0).
pub fn round(x: f64) -> f64 {
    if !x.is_finite() || x == 0.0 {
        return x;
    }
    if (-0.5..0.0).contains(&x) {
        return -0.0;
    }
    let f = x.floor();
    if x - f >= 0.5 { f + 1.0 } else { f }
}

/// JavaScript's `Math.sign`.
pub fn sign(x: f64) -> f64 {
    if x > 0.0 {
        1.0
    } else if x < 0.0 {
        -1.0
    } else {
        x
    }
}

/// `Math.max(a, b)`: NaN if either is NaN, and +0 over −0.
pub fn max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == 0.0 && b == 0.0 {
        return if a.is_sign_negative() && b.is_sign_negative() {
            -0.0
        } else {
            0.0
        };
    }
    if a > b { a } else { b }
}

/// `Math.min(a, b)`: NaN if either is NaN, and −0 over +0.
pub fn min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == 0.0 && b == 0.0 {
        return if a.is_sign_negative() || b.is_sign_negative() {
            -0.0
        } else {
            0.0
        };
    }
    if a < b { a } else { b }
}
