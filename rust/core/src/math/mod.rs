//! The JavaScript `Math` functions the core uses, computed exactly as Node's V8 computes them,
//! so the Rust core reproduces the TypeScript core's goldens bit for bit on every target (native
//! and wasm32). The C library is never called: on wasm32 Rust's `f64::sin` and friends are musl's
//! and natively they are the platform's, and neither matches V8 (G2 note, 2026-10-29).
//!
//! - `sin`, `cos`, `exp`: V8's fdlibm port (`fdlibm.rs`).
//! - `pow`: V8's wrapper around glibc's pow, Arm's optimized-routines (`pow.rs`).
//! - `hypot`: V8's two-argument Torque fast path (below).
//! - `sqrt`, `floor`, `ceil`, `abs`: exact in IEEE 754, so Rust's own.

mod fdlibm;
mod pow;
mod pow_data;

pub use fdlibm::{cos, exp, sin};
pub use pow::pow;

/// `Math.hypot(a, b)` as V8's `FastMathHypot` computes it (`v8/src/builtins/math.tq`).
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
