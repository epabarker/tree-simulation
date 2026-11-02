//! A fingerprint of the whole simulation state for the golden tests: FNV-1a over the raw bytes of
//! every table column in schema order. A column added after a golden was made is hashed only when
//! it holds a non-zero value (ADR 0011 did the same for `stressWood` and `moment` in 2D), so the
//! goldens of every build that never writes it hold: today that is the metamers' `lit` (ADR 0045).

use crate::tree::{Col, Metamers};
use crate::world::World;

const FNV_OFFSET: u32 = 0x811c9dc5;
const FNV_PRIME: u32 = 0x01000193;

fn fnv_bytes(mut h: u32, bytes: &[u8]) -> u32 {
    for &b in bytes {
        h ^= b as u32;
        h = h.wrapping_mul(FNV_PRIME);
    }
    h
}

fn fnv_int(h: u32, value: u32) -> u32 {
    fnv_bytes(h, &value.to_le_bytes())
}

/// Columns hashed only when any value is non-zero.
const WHEN_NON_ZERO: [&str; 1] = ["lit"];

fn hash_table(mut h: u32, len: usize, names: &[&str], cols: Vec<Col<'_>>) -> u32 {
    h = fnv_int(h, len as u32);
    for (name, col) in names.iter().zip(cols) {
        let bytes = col.bytes();
        if WHEN_NON_ZERO.contains(name) && bytes.iter().all(|&b| b == 0) {
            continue;
        }
        h = fnv_bytes(h, &bytes);
    }
    h
}

/// `hashWorld` as an 8-digit hex string.
pub fn hash_world(world: &World) -> String {
    let mut h = fnv_int(FNV_OFFSET, crate::rng::to_int32(world.season));
    for tree in &world.trees {
        h = fnv_int(h, tree.id as u32);
        h = fnv_int(h, tree.alive as u32);
        h = hash_table(h, tree.m.len(), Metamers::NAMES, tree.m.columns());
        h = hash_table(h, tree.b.len(), crate::tree::Buds::NAMES, tree.b.columns());
    }
    format!("{h:08x}")
}
