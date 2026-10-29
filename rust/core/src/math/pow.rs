//! `x ** y` exactly as Node's V8 computes it on x86-64 Linux, where the goldens are made.
//!
//! V8's `Math.pow` (`v8/src/numbers/ieee754.cc`, flag `use_std_math_pow`, on by default) handles
//! NaN, ±1 ** ±∞, y = 2 and y = ½ itself and otherwise calls the C library's `pow`. On glibc
//! 2.39 x86-64 with FMA that is `__ieee754_pow_fma`: Arm's optimized-routines pow compiled with
//! `-mfma -mavx2` and GCC's default `-ffp-contract=fast`. So besides the source's explicit
//! `__builtin_fma` calls, every product whose only uses are additions in its own basic block is
//! fused into them, and that is what this port does (`mul_add`, correctly rounded on every
//! target). Bit-for-bit
//! agreement with V8 is checked by `tests/wasm-math.test.ts`.
//!
//! Ported from Arm's optimized-routines math/pow.c, which glibc 2.39 carries as
//! sysdeps/ieee754/dbl-64/e_pow.c.
//! Copyright (c) 2018-2024, Arm Limited. SPDX-License-Identifier: MIT OR Apache-2.0 WITH
//! LLVM-exception.

// The C's evaluation order is kept as written (`lo = one - hi + y + lo`, not `lo += …`), and
// NaN is made as (x − x)/(x − x), as there.
#![allow(clippy::assign_op_pattern, clippy::eq_op)]

use super::pow_data::{
    EXP_POLY, EXP_TAB, INV_LN2_N, LN2HI, LN2LO, NEG_LN2_HI_N, NEG_LN2_LO_N, POLY, SHIFT, TAB,
};

const POW_LOG_TABLE_BITS: u32 = 7;
const EXP_TABLE_BITS: u32 = 7;
const N_LOG: u64 = 1 << POW_LOG_TABLE_BITS;
const N_EXP: u64 = 1 << EXP_TABLE_BITS;
const OFF: u64 = 0x3fe6955500000000;
const SIGN_BIAS: u64 = 0x800 << EXP_TABLE_BITS;

#[inline]
fn top12(x: f64) -> u32 {
    (x.to_bits() >> 52) as u32
}

/// log(x) as hi + tail, ix the bits of x (subnormals normalised).
#[inline]
fn log_inline(ix: u64) -> (f64, f64) {
    let tmp = ix.wrapping_sub(OFF);
    let i = ((tmp >> (52 - POW_LOG_TABLE_BITS)) % N_LOG) as usize;
    let k = ((tmp as i64) >> 52) as i32;
    let iz = ix.wrapping_sub(tmp & (0xfff << 52));
    let z = f64::from_bits(iz);
    let kd = k as f64;
    let [invc, logc, logctail] = TAB[i];

    let r = z.mul_add(invc, -1.0);
    let t1 = kd.mul_add(LN2HI, logc);
    let t2 = t1 + r;
    let lo1 = kd.mul_add(LN2LO, logctail);
    let lo2 = t1 - t2 + r;

    let ar = POLY[0] * r;
    let ar2 = r * ar;
    let ar3 = r * ar2;
    let hi = t2 + ar2;
    let lo3 = ar.mul_add(r, -ar2);
    let lo4 = t2 - hi + ar2;
    // p = ar3 · (A1 + r·A2 + ar2·(A3 + r·A4 + ar2·(A5 + r·A6))), fused into lo's sum.
    let inner = r.mul_add(POLY[6], POLY[5]);
    let mid = ar2.mul_add(inner, r.mul_add(POLY[4], POLY[3]));
    let outer = ar2.mul_add(mid, r.mul_add(POLY[2], POLY[1]));
    let lo = ar3.mul_add(outer, lo1 + lo2 + lo3 + lo4);
    let y = hi + lo;
    let tail = hi - y + lo;
    (y, tail)
}

fn oflow(sign: u64) -> f64 {
    let s = if sign != 0 { -1.0 } else { 1.0 };
    s * f64::from_bits(0x7000000000000000) * f64::from_bits(0x7000000000000000)
}

fn uflow(sign: u64) -> f64 {
    let s = if sign != 0 { -1.0 } else { 1.0 };
    s * f64::from_bits(0x1000000000000000) * f64::from_bits(0x1000000000000000)
}

#[inline]
fn specialcase(tmp: f64, mut sbits: u64, ki: u64) -> f64 {
    if ki & 0x80000000 == 0 {
        sbits = sbits.wrapping_sub(1009u64 << 52);
        let scale = f64::from_bits(sbits);
        return f64::from_bits(0x7f00000000000000) * scale.mul_add(tmp, scale);
    }
    sbits = sbits.wrapping_add(1022u64 << 52);
    let scale = f64::from_bits(sbits);
    // scale·tmp is also used inside the branch below, in another basic block, so GCC does not
    // fuse it into either addition.
    let st = scale * tmp;
    let mut y = scale + st;
    if y.abs() < 1.0 {
        let one = if y < 0.0 { -1.0 } else { 1.0 };
        let mut lo = scale - y + st;
        let hi = one + y;
        lo = one - hi + y + lo;
        y = (hi + lo) - one;
        if y == 0.0 {
            y = f64::from_bits(sbits & 0x8000000000000000);
        }
    }
    f64::from_bits(0x0010000000000000) * y
}

/// sign · exp(x + xtail).
#[inline]
fn exp_inline(x: f64, xtail: f64, sign_bias: u64) -> f64 {
    let mut abstop = top12(x) & 0x7ff;
    if abstop.wrapping_sub(top12(f64::from_bits(0x3c90000000000000)))
        >= top12(512.0).wrapping_sub(top12(f64::from_bits(0x3c90000000000000)))
    {
        if abstop.wrapping_sub(top12(f64::from_bits(0x3c90000000000000))) >= 0x80000000 {
            let one = 1.0 + x;
            return if sign_bias != 0 { -one } else { one };
        }
        if abstop >= top12(1024.0) {
            return if x.to_bits() >> 63 != 0 {
                uflow(sign_bias)
            } else {
                oflow(sign_bias)
            };
        }
        abstop = 0;
    }
    let mut kd = INV_LN2_N.mul_add(x, SHIFT);
    let ki = kd.to_bits();
    kd -= SHIFT;
    let mut r = kd.mul_add(NEG_LN2_LO_N, kd.mul_add(NEG_LN2_HI_N, x));
    r += xtail;
    let idx = (2 * (ki % N_EXP)) as usize;
    let top = ki.wrapping_add(sign_bias) << (52 - EXP_TABLE_BITS);
    let tail = f64::from_bits(EXP_TAB[idx]);
    let sbits = EXP_TAB[idx + 1].wrapping_add(top);
    let r2 = r * r;
    let a = r2.mul_add(r.mul_add(EXP_POLY[1], EXP_POLY[0]), tail + r);
    let tmp = (r2 * r2).mul_add(r.mul_add(EXP_POLY[3], EXP_POLY[2]), a);
    if abstop == 0 {
        return specialcase(tmp, sbits, ki);
    }
    let scale = f64::from_bits(sbits);
    scale.mul_add(tmp, scale)
}

/// 0 if not an integer, 1 if odd, 2 if even (iy the bits of a non-zero finite value).
#[inline]
fn checkint(iy: u64) -> i32 {
    let e = (iy >> 52 & 0x7ff) as i32;
    if e < 0x3ff {
        return 0;
    }
    if e > 0x3ff + 52 {
        return 2;
    }
    if iy & ((1u64 << (0x3ff + 52 - e)) - 1) != 0 {
        return 0;
    }
    if iy & (1u64 << (0x3ff + 52 - e)) != 0 {
        return 1;
    }
    2
}

#[inline]
fn zeroinfnan(i: u64) -> bool {
    (2 * i).wrapping_sub(1) >= (2 * f64::INFINITY.to_bits()).wrapping_sub(1)
}

/// glibc's pow (the FMA variant), for finite non-special JS cases and the rest.
fn c_pow(x: f64, y: f64) -> f64 {
    let mut sign_bias = 0u64;
    let mut ix = x.to_bits();
    let iy = y.to_bits();
    let mut topx = top12(x);
    let topy = top12(y);
    if topx.wrapping_sub(0x001) >= 0x7ff - 0x001
        || (topy & 0x7ff).wrapping_sub(0x3be) >= 0x43e - 0x3be
    {
        if zeroinfnan(iy) {
            if 2 * iy == 0 {
                return 1.0;
            }
            if ix == 1.0f64.to_bits() {
                return 1.0;
            }
            if 2 * ix > 2 * f64::INFINITY.to_bits() || 2 * iy > 2 * f64::INFINITY.to_bits() {
                return x + y;
            }
            if 2 * ix == 2 * 1.0f64.to_bits() {
                return 1.0;
            }
            if (2 * ix < 2 * 1.0f64.to_bits()) == (iy >> 63 == 0) {
                return 0.0;
            }
            return y * y;
        }
        if zeroinfnan(ix) {
            let mut x2 = x * x;
            if ix >> 63 != 0 && checkint(iy) == 1 {
                x2 = -x2;
                sign_bias = 1;
            }
            if 2 * ix == 0 && iy >> 63 != 0 {
                return (if sign_bias != 0 { -1.0 } else { 1.0 }) / 0.0;
            }
            return if iy >> 63 != 0 { 1.0 / x2 } else { x2 };
        }
        // x and y are non-zero finite.
        if ix >> 63 != 0 {
            let yint = checkint(iy);
            if yint == 0 {
                return (x - x) / (x - x);
            }
            if yint == 1 {
                sign_bias = SIGN_BIAS;
            }
            ix &= 0x7fffffffffffffff;
            topx &= 0x7ff;
        }
        if (topy & 0x7ff).wrapping_sub(0x3be) >= 0x43e - 0x3be {
            if ix == 1.0f64.to_bits() {
                return 1.0;
            }
            if (topy & 0x7ff) < 0x3be {
                return if ix > 1.0f64.to_bits() {
                    1.0 + y
                } else {
                    1.0 - y
                };
            }
            return if (ix > 1.0f64.to_bits()) == (topy < 0x800) {
                oflow(0)
            } else {
                uflow(0)
            };
        }
        if topx == 0 {
            ix = (x * f64::from_bits(0x4330000000000000)).to_bits();
            ix &= 0x7fffffffffffffff;
            ix = ix.wrapping_sub(52u64 << 52);
        }
    }
    let (hi, lo) = log_inline(ix);
    let ehi = y * hi;
    let elo = y.mul_add(lo, y.mul_add(hi, -ehi));
    exp_inline(ehi, elo, sign_bias)
}

/// `x ** y` / `Math.pow(x, y)` as V8 computes it.
pub fn pow(x: f64, y: f64) -> f64 {
    if y.is_nan() {
        return f64::NAN;
    }
    if y.is_infinite() && (x == 1.0 || x == -1.0) {
        return f64::NAN;
    }
    if y == 2.0 {
        return x * x;
    }
    if y == 0.5 {
        return if x.is_infinite() {
            f64::INFINITY
        } else {
            (x + 0.0).sqrt()
        };
    }
    c_pow(x, y)
}
