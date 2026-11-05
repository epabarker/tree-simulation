//! The goldens (tests/golden.json): fixed presets and seeds, natively. The WASM build is held to
//! the same file (tests/golden.test.ts), so native and browser give the same bits. They change only
//! on purpose: `UPDATE_GOLDEN=1 cargo test -p tree-core --test golden` rewrites them
//! (`npm run golden:update` does), and the devlog says why. The 2D goldens of the TypeScript core
//! are archived at the tag `golden-2d-ts`, where CI's `golden-2d` job runs them.

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
fn every_golden() {
    let presets = read("../presets.json");
    // The cases are the file's keys, "preset:seedN:sM".
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
    let file = path("../../tests/golden.json");
    if std::env::var("UPDATE_GOLDEN").is_ok() {
        std::fs::write(&file, format!("{}\n", json::stringify_pretty(&got, 2))).unwrap();
        return;
    }
    let want = read("../../tests/golden.json");
    let wrong: Vec<String> = got
        .as_object()
        .unwrap()
        .iter()
        .filter(|(k, v)| want.get(k) != Some(v))
        .map(|(k, v)| format!("{k}: {}", json::stringify(v, false)))
        .collect();
    assert!(wrong.is_empty(), "goldens differ:\n{}", wrong.join("\n"));
}

/// The prototype rules of agent A9 (c1.budBreak, c1.shootLengthSD, c4.axisSD) written out as off
/// give the goldens' bits: off is the old model, not merely close to it.
#[test]
fn the_prototype_rules_written_as_off_keep_the_goldens() {
    let presets = read("../presets.json");
    let cases = read("../../tests/golden.json");
    let off = json::parse(
        r#"{"c1":{"budBreak":{"mode":"deterministic","width":0.25},"shootLengthSD":0},"c4":{"axisSD":0}}"#,
    )
    .unwrap();
    for key in [
        "forest:seed1:s20",
        "oakOpen:seed1:s15",
        "beechOpen:seed1:s40",
    ] {
        let parts: Vec<&str> = key.split(':').collect();
        let base = presets
            .get("presets")
            .and_then(|t| t.get(parts[0]))
            .unwrap();
        let mut params = json::merge(base, &off);
        params.set("seed", Value::Num(1.0));
        let seasons: usize = parts[2].trim_start_matches('s').parse().unwrap();
        let mut world = World::new(params);
        world.run(seasons, &[]);
        let got = Value::Str(hash_world(&world));
        assert_eq!(Some(&got), cases.get(key), "{key}");
    }
}
