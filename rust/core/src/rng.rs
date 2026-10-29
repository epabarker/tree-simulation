//! Keyed-hash randomness (ADR 0002; `src/core/rng.ts`): every draw is a pure function of
//! hash(seed, purpose, tree, entity, season, k). Integer maths only, so the raw hashes are the
//! same everywhere; `normal` uses log and cos, V8's in parity mode (`crate::math`).

use crate::math;

/// Registry of randomness purposes. IDs are part of the reproducibility contract: never renumber.
pub mod purpose {
    pub const SIDE_SEQUENCE: u32 = 1;
    pub const DIRECTION_NOISE: u32 = 2;
    pub const SHEDDING: u32 = 3;
    pub const SYMPODIAL_TERMINATION: u32 = 4;
    pub const BUD_BREAK: u32 = 5;
    pub const ABRASION: u32 = 6;
    pub const WIND: u32 = 7;
    pub const SEEDS: u32 = 8;
    pub const DISPERSAL: u32 = 9;
    pub const ESTABLISHMENT: u32 = 10;
    pub const MORTALITY: u32 = 11;
    pub const INITIAL_POSITIONS: u32 = 12;
    pub const SEED_RAIN: u32 = 13;
}

const TWO_POW_32: f64 = 4294967296.0;

/// JavaScript's ToInt32 (what `x ^ y` does to a number), as raw bits.
pub fn to_int32(x: f64) -> u32 {
    if !x.is_finite() || x == 0.0 {
        return 0;
    }
    let t = x.trunc();
    // t mod 2³², in [0, 2³²): exact for every double.
    let m = t.rem_euclid(TWO_POW_32);
    m as u32
}

/// lowbias32 integer finaliser (C. Wellons).
fn mix32(mut x: u32) -> u32 {
    x ^= x >> 16;
    x = x.wrapping_mul(0x7feb352d);
    x ^= x >> 15;
    x = x.wrapping_mul(0x846ca68b);
    x ^= x >> 16;
    x
}

/// 32-bit hash of the full key; every argument is truncated to 32 bits as `^` does.
pub fn hash_key(seed: f64, purpose: u32, tree: f64, entity: f64, season: f64, k: f64) -> u32 {
    let mut h = mix32(to_int32(seed) ^ 0x9e3779b9);
    h = mix32(h ^ purpose);
    h = mix32(h ^ to_int32(tree));
    h = mix32(h ^ to_int32(entity));
    h = mix32(h ^ to_int32(season));
    mix32(h ^ to_int32(k))
}

/// Uniform in [0, 1) with 32-bit resolution.
pub fn uniform(seed: f64, purpose: u32, tree: f64, entity: f64, season: f64, k: f64) -> f64 {
    hash_key(seed, purpose, tree, entity, season, k) as f64 / TWO_POW_32
}

/// Fair coin: −1 or +1.
pub fn sign(seed: f64, purpose: u32, tree: f64, entity: f64, season: f64, k: f64) -> f64 {
    if hash_key(seed, purpose, tree, entity, season, k) & 1 != 0 {
        1.0
    } else {
        -1.0
    }
}

/// Standard normal via Box–Muller, from draws 2k and 2k + 1 of the key.
pub fn normal(seed: f64, purpose: u32, tree: f64, entity: f64, season: f64, k: f64) -> f64 {
    let u1 = (hash_key(seed, purpose, tree, entity, season, 2.0 * k) as f64 + 0.5) / TWO_POW_32;
    let u2 = hash_key(seed, purpose, tree, entity, season, 2.0 * k + 1.0) as f64 / TWO_POW_32;
    (-2.0 * math::ln(u1)).sqrt() * math::cos(2.0 * std::f64::consts::PI * u2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn to_int32_wraps_as_javascript_does() {
        assert_eq!(to_int32(1.0), 1);
        assert_eq!(to_int32(-1.0), u32::MAX);
        assert_eq!(to_int32(4294967297.5), 1);
        assert_eq!(to_int32(-2.7), (-2i32) as u32);
        assert_eq!(to_int32(f64::NAN), 0);
    }

    #[test]
    fn hashes_match_the_typescript_core() {
        // Values from src/core/rng.ts under Node.
        assert_eq!(hash_key(1.0, 1, 0.0, 0.0, 0.0, 0.0), 1382201895);
        assert_eq!(hash_key(42.0, 2, 3.0, 4.0, 5.0, 6.0), 896310872);
        assert_eq!(
            hash_key(-7.5, 13, 1e10, 2f64.powi(31), -3.0, 0.0),
            2277157654
        );
        assert_eq!(uniform(3.0, 4, 5.0, 6.0, 7.0, 1.0), 0.9250604065600783);
    }

    #[test]
    fn matches_frozen_known_answer_vectors() {
        // Changing these breaks reproducibility of every saved run: only with an ADR.
        assert_eq!(
            hash_key(1.0, purpose::SIDE_SEQUENCE, 0.0, 0.0, 0.0, 0.0),
            1382201895
        );
        assert_eq!(
            hash_key(42.0, purpose::DIRECTION_NOISE, 3.0, 1234.0, 17.0, 2.0),
            3388988208
        );
        assert_eq!(
            hash_key(4294967295.0, purpose::MORTALITY, 9.0, 99999.0, 500.0, 7.0),
            2673640170
        );
        assert_eq!(
            uniform(7.0, purpose::SHEDDING, 1.0, 2.0, 3.0, 0.0),
            0.27200592774897814
        );
    }

    #[test]
    fn changes_when_any_key_component_changes() {
        let base = hash_key(1.0, 2, 2.0, 3.0, 4.0, 5.0);
        for v in [
            hash_key(2.0, 2, 2.0, 3.0, 4.0, 5.0),
            hash_key(1.0, 3, 2.0, 3.0, 4.0, 5.0),
            hash_key(1.0, 2, 3.0, 3.0, 4.0, 5.0),
            hash_key(1.0, 2, 2.0, 4.0, 4.0, 5.0),
            hash_key(1.0, 2, 2.0, 3.0, 5.0, 5.0),
            hash_key(1.0, 2, 2.0, 3.0, 4.0, 6.0),
        ] {
            assert_ne!(v, base);
        }
    }

    #[test]
    fn gives_uniform_and_normal_draws_with_the_right_moments() {
        let n = 100_000;
        let (mut su, mut sz, mut sz2, mut heads) = (0.0, 0.0, 0.0, 0.0);
        for i in 0..n {
            let i = i as f64;
            let u = uniform(5.0, purpose::SHEDDING, 0.0, i, 0.0, 0.0);
            assert!((0.0..1.0).contains(&u));
            su += u;
            let z = normal(5.0, purpose::DIRECTION_NOISE, 0.0, i, 0.0, 0.0);
            sz += z;
            sz2 += z * z;
            if sign(5.0, purpose::SIDE_SEQUENCE, 0.0, i, 0.0, 0.0) > 0.0 {
                heads += 1.0;
            }
        }
        let n = n as f64;
        assert!((su / n - 0.5).abs() < 0.005);
        assert!((sz / n).abs() < 0.05);
        assert!((sz2 / n - 1.0).abs() < 0.05);
        assert!((heads / n - 0.5).abs() < 0.005);
    }

    #[cfg(feature = "parity")]
    #[test]
    fn normal_matches_the_typescript_core() {
        assert_eq!(
            normal(7.0, purpose::DIRECTION_NOISE, 1.0, 2.0, 3.0, 0.0),
            0.5882301320315867
        );
        assert_eq!(normal(9.0, 2, 1.0, 2.0, 3.0, 0.0), -0.8179644073063318);
    }
}
