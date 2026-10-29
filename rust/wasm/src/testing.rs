//! Test-only exports (the parity build, feature `testing`): the core's Math, held to V8's bit for
//! bit (tests/wasm-math.test.ts).

use tree_core::math;
use wasm_bindgen::prelude::*;

/// The core's `Math`, exported so the tests can hold it to V8's bit for bit.
#[wasm_bindgen]
pub fn math_sin(x: f64) -> f64 {
    math::sin(x)
}

#[wasm_bindgen]
pub fn math_cos(x: f64) -> f64 {
    math::cos(x)
}

#[wasm_bindgen]
pub fn math_exp(x: f64) -> f64 {
    math::exp(x)
}

#[wasm_bindgen]
pub fn math_pow(x: f64, y: f64) -> f64 {
    math::pow(x, y)
}

#[wasm_bindgen]
pub fn math_hypot(x: f64, y: f64) -> f64 {
    math::hypot(x, y)
}

#[wasm_bindgen]
pub fn math_log(x: f64) -> f64 {
    math::ln(x)
}

#[wasm_bindgen]
pub fn math_atan2(y: f64, x: f64) -> f64 {
    math::atan2(y, x)
}

#[wasm_bindgen]
pub fn math_asin(x: f64) -> f64 {
    math::asin(x)
}

#[wasm_bindgen]
pub fn math_acos(x: f64) -> f64 {
    math::acos(x)
}

#[wasm_bindgen]
pub fn math_cbrt(x: f64) -> f64 {
    math::cbrt(x)
}
