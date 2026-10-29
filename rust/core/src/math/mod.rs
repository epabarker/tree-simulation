//! The `Math` functions the core uses, in one of two modes (ADR 0024).
//!
//! - **`parity` (a feature):** exactly as Node's V8 computes them, so the Rust core reproduces the
//!   TypeScript core's goldens bit for bit on every target (G2 note, 2026-10-29). `sin`, `cos`,
//!   `exp`: V8's fdlibm port (`fdlibm.rs`); `pow`: V8's wrapper around glibc's pow, Arm's
//!   optimized-routines (`pow.rs`); `hypot`: V8's two-argument Torque fast path.
//! - **Otherwise:** the `libm` crate, pure Rust and identical on native and wasm32, for the core
//!   that gets its own goldens (the 3D core, I1 stage 2). The C library is never called.
//!
//! `sqrt`, `floor`, `ceil`, `abs` are exact in IEEE 754, so Rust's own in both modes; `max` and
//! `min` keep JavaScript's NaN and ±0 rules in both.

#[cfg(feature = "parity")]
mod fdlibm;
#[cfg(feature = "parity")]
mod pow;
#[cfg(feature = "parity")]
mod pow_data;

#[cfg(feature = "parity")]
pub use fdlibm::{cos, exp, sin};
#[cfg(feature = "parity")]
pub use pow::pow;

/// `Math.hypot(a, b)` as V8's `FastMathHypot` computes it (`v8/src/builtins/math.tq`).
#[cfg(feature = "parity")]
pub fn hypot(a: f64, b: f64) -> f64 {
    let a = a.abs();
    let b = b.abs();
    if a == f64::INFINITY || b == f64::INFINITY {
        return f64::INFINITY;
    }
    let max = max(a, b);
    if max.is_nan() {
        return f64::NAN;
    }
    if max == 0.0 {
        return 0.0;
    }
    ((a / max) * (a / max) + (b / max) * (b / max)).sqrt() * max
}

#[cfg(not(feature = "parity"))]
pub fn sin(x: f64) -> f64 {
    libm::sin(x)
}

#[cfg(not(feature = "parity"))]
pub fn cos(x: f64) -> f64 {
    libm::cos(x)
}

#[cfg(not(feature = "parity"))]
pub fn exp(x: f64) -> f64 {
    libm::exp(x)
}

#[cfg(not(feature = "parity"))]
pub fn pow(x: f64, y: f64) -> f64 {
    libm::pow(x, y)
}

#[cfg(not(feature = "parity"))]
pub fn hypot(a: f64, b: f64) -> f64 {
    libm::hypot(a, b)
}

/// Natural log, used by the 3D light (once per sweep, for the faces' depth). Not yet V8's in
/// parity mode: nothing the TypeScript goldens see calls it. I1 ports V8's `Math.log`.
pub fn ln(x: f64) -> f64 {
    libm::log(x)
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
