//! A fingerprint of the whole simulation state for the golden tests (hash.ts): FNV-1a over the
//! raw bytes of every table column in schema order. `stressWood`, `moment` and `paShift` are
//! hashed only when some row is non-zero, so runs without R3 and R4 hash as before they existed.

use crate::tree::Col;
use crate::world::World;

const FNV_OFFSET: u32 = 0x811c9dc5;
const FNV_PRIME: u32 = 0x01000193;
const LATE: [&str; 3] = ["stressWood", "moment", "paShift"];

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

fn hash_table(mut h: u32, len: usize, names: &[&str], cols: Vec<Col<'_>>) -> u32 {
    h = fnv_int(h, len as u32);
    for (name, col) in names.iter().zip(cols) {
        if LATE.contains(name) && !col.any_nonzero() {
            continue;
        }
        h = fnv_bytes(h, &col.bytes());
    }
    h
}

/// `hashWorld` as an 8-digit hex string.
pub fn hash_world(world: &World) -> String {
    let mut h = fnv_int(FNV_OFFSET, crate::rng::to_int32(world.season));
    for tree in &world.trees {
        h = fnv_int(h, tree.id as u32);
        h = fnv_int(h, tree.alive as u32);
        h = hash_table(
            h,
            tree.m.len(),
            crate::tree::Metamers::NAMES,
            tree.m.columns(),
        );
        h = hash_table(h, tree.b.len(), crate::tree::Buds::NAMES, tree.b.columns());
    }
    format!("{h:08x}")
}
