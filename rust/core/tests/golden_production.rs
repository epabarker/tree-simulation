//! I1 stage 2 (ADR 0024): the production build's goldens (Rust's libm, not V8's Math), the same
//! cases as the TypeScript goldens, in tests/golden-production.json. The WASM build is held to the
//! same file (tests/rust-world.test.ts), so native and browser give the same bits. They change only
//! on purpose: `UPDATE_GOLDEN=1 cargo test -p tree-core --test golden_production` rewrites them
//! (`npm run golden:update` does), and the devlog says why.
#![cfg(not(feature = "parity"))]

use tree_core::hash::hash_world;
use tree_core::json::{self, Value};
use tree_core::world::World;

fn path(p: &str) -> String {
    format!("{}/{p}", env!("CARGO_MANIFEST_DIR"))
}

fn read(p: &str) -> Value {
    json::parse(&std::fs::read_to_string(path(p)).unwrap()).unwrap()
}

#[test]
fn every_production_golden() {
    let presets = read("../presets.json");
    // The cases are the TypeScript goldens' keys, "preset:seedN:sM".
    let cases = read("../../tests/golden.json");
    let mut got = Vec::new();
    for (key, _) in cases.as_object().unwrap() {
        let parts: Vec<&str> = key.split(':').collect();
        let seed: f64 = parts[1].trim_start_matches("seed").parse().unwrap();
        let seasons: usize = parts[2].trim_start_matches('s').parse().unwrap();
        let mut params = presets
            .get("presets")
            .and_then(|t| t.get(parts[0]))
            .or_else(|| presets.get("fixtures").and_then(|t| t.get(parts[0])))
            .unwrap()
            .clone();
        params.set("seed", Value::Num(seed));
        let mut world = World::new(params);
        world.run(seasons, &[]);
        got.push((key.clone(), Value::Str(hash_world(&world))));
    }
    let got = Value::Obj(got);
    let file = path("../../tests/golden-production.json");
    if std::env::var("UPDATE_GOLDEN").is_ok() {
        std::fs::write(&file, format!("{}\n", json::stringify_pretty(&got, 2))).unwrap();
        return;
    }
    let want = read("../../tests/golden-production.json");
    let wrong: Vec<String> = got
        .as_object()
        .unwrap()
        .iter()
        .filter(|(k, v)| want.get(k) != Some(v))
        .map(|(k, v)| format!("{k}: {}", json::stringify(v, false)))
        .collect();
    assert!(
        wrong.is_empty(),
        "production goldens differ:\n{}",
        wrong.join("\n")
    );
}
