//! I1 (ADR 0024): every 2D golden run natively through the whole Rust core, in parity mode. The
//! hashes are the TypeScript core's (tests/golden.json), bit for bit; nothing here may be updated
//! to make them pass. The presets are rust/presets.json, exported from the TypeScript ones.
#![cfg(feature = "parity")]

use tree_core::hash::hash_world;
use tree_core::json::{self, Value};
use tree_core::world::World;

fn read(path: &str) -> Value {
    let p = format!("{}/{path}", env!("CARGO_MANIFEST_DIR"));
    json::parse(&std::fs::read_to_string(&p).unwrap_or_else(|e| panic!("{p}: {e}"))).unwrap()
}

/// The params of a golden case, "preset:seedN:sM".
pub fn case(presets: &Value, key: &str) -> (Value, usize) {
    let parts: Vec<&str> = key.split(':').collect();
    let name = parts[0];
    let seed: f64 = parts[1].trim_start_matches("seed").parse().unwrap();
    let seasons: usize = parts[2].trim_start_matches('s').parse().unwrap();
    let mut params = presets
        .get("presets")
        .and_then(|t| t.get(name))
        .or_else(|| presets.get("fixtures").and_then(|t| t.get(name)))
        .unwrap_or_else(|| panic!("no preset {name}"))
        .clone();
    params.set("seed", Value::Num(seed));
    (params, seasons)
}

#[test]
fn every_golden_is_the_typescript_cores() {
    let presets = read("../presets.json");
    let golden = read("../../tests/golden.json");
    let mut wrong = Vec::new();
    for (key, want) in golden.as_object().unwrap() {
        let (params, seasons) = case(&presets, key);
        let mut world = World::new(params);
        world.run(seasons, &[]);
        let got = hash_world(&world);
        if got != want.as_str().unwrap() {
            wrong.push(format!("{key}: {got} (want {})", want.as_str().unwrap()));
        }
    }
    assert!(
        wrong.is_empty(),
        "{} of {} differ:\n{}",
        wrong.len(),
        golden.as_object().unwrap().len(),
        wrong.join("\n")
    );
}
