//! The native sweep against the TypeScript one (ADR 0024, G2): the hashes below are what
//! `node rust/tools/sweep_fixture.ts` prints for the same fixture. `npm run check` runs this test
//! with and without the `threads` feature, so it also holds the threaded sweep to the serial bits.
//! (The WASM build is held to TypeScript in the vitest suite: tests/wasm-sky.test.ts.)
//! The hashes are TypeScript's, so the test runs in parity mode only.
#![cfg(feature = "parity")]

use tree_core::light::sky_sweep::{SkyParams, SkySweep};

fn fnv(mut h: u32, a: &[f64]) -> u32 {
    for v in a {
        for b in v.to_le_bytes() {
            h = (h ^ b as u32).wrapping_mul(0x01000193);
        }
    }
    h
}

fn fixture(columns: bool, periodic: bool) -> u32 {
    let p = SkyParams {
        k: 9.0,
        k_ext: 0.6,
        sky_exponent: 1.5,
        sky_tilt: 0.3,
        min_elevation: 15.0,
        c: 1.0,
        rotate: true,
        columns,
    };
    let mut s = SkySweep::new(64, 40, p, periodic);
    let mut h = 0x811c9dc5;
    let mut seed: u32 = 12345;
    for season in 0..5 {
        s.clear();
        s.add_wall(5.0, 0.0, 3.0, 25.0, 2.0);
        for i in 0..300 {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            let x = (seed as f64 / 4294967296.0) * 70.0 - 3.0;
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            let y = (seed as f64 / 4294967296.0) * 36.0;
            s.deposit(x, y, 1.0 + (i % 3) as f64 * 0.25);
        }
        s.compute(season as f64);
        h = fnv(fnv(fnv(h, s.q()), s.vx()), s.vy());
    }
    h
}

#[test]
fn rows_open() {
    assert_eq!(fixture(false, false), 0x5cb2aebb);
}

#[test]
fn rows_ring() {
    assert_eq!(fixture(false, true), 0x2a2a12bf);
}

#[test]
fn columns_open() {
    assert_eq!(fixture(true, false), 0xbc10b1ba);
}

#[test]
fn columns_ring() {
    assert_eq!(fixture(true, true), 0xc4b945d0);
}
