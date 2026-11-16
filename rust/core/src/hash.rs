//! A fingerprint of the whole simulation state for the golden tests: FNV-1a over the raw bytes of
//! every table column in schema order.

use crate::tree::Col;
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

fn hash_table(mut h: u32, len: usize, cols: Vec<Col<'_>>) -> u32 {
    h = fnv_int(h, len as u32);
    for col in cols {
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
        h = hash_table(h, tree.m.len(), tree.m.columns());
        h = hash_table(h, tree.b.len(), tree.b.columns());
    }
    // §O4.11's stubs (ADR 0072), only when there are any, so a world without them hashes as before.
    for (species, cells) in &world.stubs {
        let held = cells.iter().filter(|&&n| n > 0).count();
        h = fnv_int(h, species.len() as u32);
        h = fnv_bytes(h, species.as_bytes());
        h = fnv_int(h, held as u32);
        for (cell, &n) in cells.iter().enumerate() {
            if n > 0 {
                h = fnv_int(fnv_int(h, cell as u32), n);
            }
        }
    }
    format!("{h:08x}")
}
