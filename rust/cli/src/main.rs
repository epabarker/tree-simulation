//! The headless runner (I1, ADR 0024): the Rust core natively, writing the files the TypeScript
//! CLI wrote, in the same formats, so the analysis (analysis/treesim) reads them unchanged.
//!
//!   treesim --preset explosion --seed 3 --seasons 12 --out runs/m0
//!   treesim --params my.json --snapshots 25,50 --out runs/x     (patch over the preset)
//!   treesim --replay tree-run.json --out runs/replay            (the page's "Export run")
//!   echo '{"c3":{"lambda":0.56}}' | treesim --params - --out runs/y
//!   treesim --preset oakOpen --species-patch '{"oak":{"r3":{"posture":false}}}'
//!   treesim --preset succession --checkpoint-at 60 --seasons 60 --out runs/c
//!
//! Writes to --out: run.json, metrics.csv, metamers.csv, form.csv, hash.txt; with --light,
//! light.csv; with --checkpoint-at N, checkpoint-N.bin.gz. Presets come from rust/presets.json
//! (exported from the TypeScript presets). `npm run sim` (cli/run.ts) builds and runs it.

use std::collections::HashSet;
use std::io::{Read, Write};
use std::path::Path;
use std::time::Instant;
use tree_core::checkpoint::save_world;
use tree_core::form::{FORM_COLUMNS, PROFILE_BANDS, form_metrics};
use tree_core::hash::hash_world;
use tree_core::json::{self, Value, number_to_string};
use tree_core::metrics::{METRIC_COLUMNS, tree_metrics};
use tree_core::world::World;

const PRESETS: &str = include_str!("../../presets.json");

/// `+x.toPrecision(8)`: eight significant digits, a tie going to the larger magnitude.
fn to_precision8(x: f64) -> f64 {
    if !x.is_finite() || x == 0.0 {
        return x + 0.0;
    }
    let exact = format!("{:.60e}", x.abs());
    let (mant, exp) = exact.split_once('e').unwrap();
    let digits: Vec<u8> = mant.bytes().filter(|b| *b != b'.').collect();
    let tie = digits[8] == b'5' && digits[9..].iter().all(|&d| d == b'0');
    let v = if tie {
        // Round the first eight digits up by one in the last place.
        let mut d: Vec<u8> = digits[..8].to_vec();
        let mut e: i32 = exp.parse().unwrap();
        let mut k = 7;
        loop {
            if d[k] == b'9' {
                d[k] = b'0';
                if k == 0 {
                    d.insert(0, b'1');
                    d.pop();
                    e += 1;
                    break;
                }
                k -= 1;
            } else {
                d[k] += 1;
                break;
            }
        }
        let s = format!(
            "{}.{}e{}",
            d[0] as char,
            std::str::from_utf8(&d[1..]).unwrap(),
            e
        );
        s.parse::<f64>().unwrap()
    } else {
        format!("{:.7e}", x.abs()).parse::<f64>().unwrap()
    };
    if x < 0.0 { -v } else { v }
}

/// cli/run.ts's `num`: integers as JavaScript prints them, others to eight significant digits.
fn num(x: f64) -> String {
    if x.is_finite() && x.trunc() == x {
        number_to_string(x)
    } else {
        number_to_string(to_precision8(x))
    }
}

struct Args {
    preset: String,
    params: Option<String>,
    replay: Option<String>,
    seed: Option<String>,
    seasons: Option<String>,
    snapshots: String,
    out: Option<String>,
    quiet: bool,
    light: bool,
    checkpoint_at: Option<String>,
    species_patch: Option<String>,
    /// Time each phase of each season instead of writing files (`npm run bench`'s table).
    bench: bool,
}

fn args() -> Args {
    let mut a = Args {
        preset: "skyStand".into(),
        params: None,
        replay: None,
        seed: None,
        seasons: None,
        snapshots: String::new(),
        out: None,
        quiet: false,
        light: false,
        checkpoint_at: None,
        species_patch: None,
        bench: false,
    };
    let mut it = std::env::args().skip(1);
    while let Some(flag) = it.next() {
        let (name, inline) = match flag.split_once('=') {
            Some((n, v)) => (n.to_string(), Some(v.to_string())),
            None => (flag.clone(), None),
        };
        let mut value = || inline.clone().or_else(|| it.next()).unwrap_or_default();
        match name.as_str() {
            "--preset" => a.preset = value(),
            "--params" => a.params = Some(value()),
            "--replay" => a.replay = Some(value()),
            "--seed" => a.seed = Some(value()),
            "--seasons" => a.seasons = Some(value()),
            "--snapshots" => a.snapshots = value(),
            "--out" => a.out = Some(value()),
            "--checkpoint-at" => a.checkpoint_at = Some(value()),
            "--species-patch" => a.species_patch = Some(value()),
            "--quiet" => a.quiet = true,
            "--light" => a.light = true,
            "--bench" => a.bench = true,
            // The TypeScript CLI's G2 switch: the whole core is Rust now.
            "--rust" => {}
            _ => fail(&format!("Unknown option '{flag}'")),
        }
    }
    a
}

fn fail(msg: &str) -> ! {
    eprintln!("{msg}");
    std::process::exit(1);
}

fn read_json(path: &str) -> Value {
    let mut text = String::new();
    if path == "-" {
        std::io::stdin().read_to_string(&mut text).unwrap();
    } else {
        text = std::fs::read_to_string(path).unwrap_or_else(|e| fail(&format!("{path}: {e}")));
    }
    json::parse(&text).unwrap_or_else(|e| fail(&format!("{path}: {e}")))
}

/// `Number(s)` for the CLI's numeric options.
fn number(s: &str) -> f64 {
    let t = s.trim();
    if t.is_empty() {
        return 0.0;
    }
    t.parse::<f64>().unwrap_or(f64::NAN)
}

fn git_commit() -> String {
    std::process::Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .stderr(std::process::Stdio::null())
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".into())
}

/// `patchSpecies` (params.ts): `patch` merged into species `name`'s groups.
fn patch_species(params: &Value, name: &str, patch: &Value) -> Value {
    let mut out = params.clone();
    let entry = out
        .get("species")
        .and_then(|t| t.get(name))
        .cloned()
        .unwrap_or(Value::obj());
    let merged = json::merge(&entry, patch);
    let mut table = out.get("species").cloned().unwrap_or(Value::obj());
    table.set(name, merged);
    out.set("species", table);
    out
}

fn main() {
    let a = args();
    let presets = json::parse(PRESETS).expect("presets.json");
    let mut events: Vec<Value> = Vec::new();
    let mut params: Value;
    let seasons: f64;
    if let Some(path) = &a.replay {
        let record = read_json(path);
        params = record.get("params").cloned().unwrap_or(Value::obj());
        events = record
            .get("events")
            .and_then(Value::as_array)
            .unwrap_or(&[])
            .to_vec();
        seasons = match &a.seasons {
            Some(s) => number(s),
            None => record.get("seasons").and_then(Value::as_f64).unwrap_or(0.0),
        };
    } else {
        params = presets
            .get("presets")
            .and_then(|t| t.get(&a.preset))
            .or_else(|| presets.get("fixtures").and_then(|t| t.get(&a.preset)))
            .cloned()
            .unwrap_or_else(|| fail(&format!("Unknown preset '{}'", a.preset)));
        if let Some(p) = &a.params {
            params = json::merge(&params, &read_json(p));
        }
        if let Some(sp) = &a.species_patch {
            let amend = json::parse(sp).unwrap_or_else(|e| fail(&e.to_string()));
            for (name, patch) in amend.as_object().unwrap_or(&[]) {
                params = patch_species(&params, name, patch);
            }
        }
        seasons = a.seasons.as_deref().map_or(30.0, number);
    }
    if let Some(s) = &a.seed {
        params.set("seed", Value::Num(number(s)));
    }
    let seed = params
        .get("seed")
        .and_then(Value::as_f64)
        .unwrap_or(f64::NAN);
    let out = a
        .out
        .clone()
        .unwrap_or_else(|| format!("runs/{}-seed{}", a.preset, number_to_string(seed)));
    let out = Path::new(&out);
    std::fs::create_dir_all(out).unwrap_or_else(|e| fail(&format!("{}: {e}", out.display())));
    let mut snapshot_seasons: HashSet<u64> = a
        .snapshots
        .split(',')
        .filter(|s| !s.trim().is_empty())
        .map(|s| number(s).to_bits())
        .collect();
    snapshot_seasons.insert(seasons.to_bits());
    let snap = |s: f64| snapshot_seasons.contains(&s.to_bits());
    let checkpoint_at = a.checkpoint_at.as_deref().map(number);

    let mut metrics_lines = vec![format!("season,{}", METRIC_COLUMNS.join(","))];
    let mut metamer_lines = vec![
        "season,tree,birthId,parentBirthId,order,axis,x0,y0,x1,y1,length,angle,radius,qSum,nSum,vIn,birthSeason,stressWood"
            .to_string(),
    ];
    let profile: Vec<String> = (0..PROFILE_BANDS).map(|k| format!("p{k}")).collect();
    let mut form_lines = vec![format!(
        "season,tree,species,{},{}",
        FORM_COLUMNS.join(","),
        profile.join(",")
    )];
    let mut light_lines = vec!["season,col,row,shade".to_string()];

    let mut world = World::new(params);
    if a.bench {
        bench(&mut world, seasons);
        return;
    }
    let mut queue: Vec<Value> = events.clone();
    let at = |e: &Value| e.get("season").and_then(Value::as_f64).unwrap_or(0.0);
    queue.sort_by(|x, y| at(x).total_cmp(&at(y)));
    let t0 = Instant::now();
    let mut s = 0.0;
    while s < seasons {
        s += 1.0;
        let now: Vec<Value> = queue
            .iter()
            .filter(|e| at(e) == world.season)
            .cloned()
            .collect();
        world.run(1, &now);
        let season = world.season;
        for tree in &world.trees {
            if tree.m.is_empty() {
                continue;
            }
            let m = tree_metrics(tree, Some(&world));
            let mut row = vec![num(season)];
            for k in METRIC_COLUMNS {
                row.push(match k {
                    "species" => m.species.clone(),
                    _ => num(m.get(k)),
                });
            }
            metrics_lines.push(row.join(","));
        }
        if checkpoint_at == Some(season) {
            let bytes = save_world(&world);
            let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::best());
            gz.write_all(&bytes).unwrap();
            let name = format!("checkpoint-{}.bin.gz", number_to_string(season));
            std::fs::write(out.join(name), gz.finish().unwrap()).unwrap();
        }
        if a.light && snap(season) {
            let w = world.light.width() as usize;
            if let Some(field) = world.light.field() {
                for (c, &v) in field.iter().enumerate() {
                    light_lines.push(format!("{},{},{},{}", num(season), c % w, c / w, num(v)));
                }
            }
        }
        if snap(season) {
            for tree in &world.trees {
                if !tree.alive || tree.m.is_empty() {
                    continue;
                }
                let f = form_metrics(tree, world.params_of(tree));
                let mut row = vec![num(season), tree.id.to_string(), tree.species.clone()];
                row.extend(f.values.iter().map(|&v| num(v)));
                row.extend(f.profile.iter().map(|&v| num(v)));
                form_lines.push(row.join(","));
            }
            for tree in &world.trees {
                if !tree.alive {
                    continue;
                }
                let c = &tree.m;
                for i in 0..c.len() {
                    let p = c.parent[i];
                    let parent_birth = if p >= 0 {
                        c.birth_id[p as usize] as f64
                    } else {
                        -1.0
                    };
                    let row = [
                        season,
                        tree.id as f64,
                        c.birth_id[i] as f64,
                        parent_birth,
                        c.order[i] as f64,
                        c.axis[i] as f64,
                        c.base_x[i],
                        c.base_y[i],
                        tree.tip_x(i),
                        tree.tip_y(i),
                        c.length[i],
                        c.angle[i],
                        c.radius[i],
                        c.q_sum[i],
                        c.n_sum[i] as f64,
                        c.v_in[i],
                        c.birth_season[i] as f64,
                        c.stress_wood[i],
                    ];
                    let cells: Vec<String> = row.iter().map(|&v| num(v)).collect();
                    metamer_lines.push(cells.join(","));
                }
            }
        }
    }
    let ms = t0.elapsed().as_secs_f64() * 1000.0;

    let hash = hash_world(&world);
    let mut run = Value::Obj(vec![(
        "meta".into(),
        Value::Obj(vec![
            (
                "preset".into(),
                if a.replay.is_some() {
                    Value::Null
                } else {
                    Value::Str(a.preset.clone())
                },
            ),
            ("seasons".into(), Value::Num(seasons)),
            ("commit".into(), Value::Str(git_commit())),
            ("hash".into(), Value::Str(hash.clone())),
            ("ms".into(), Value::Num(ms.round())),
            ("core".into(), Value::Str("rust".into())),
        ]),
    )]);
    if let Value::Obj(fields) = world.record() {
        for (k, v) in fields {
            run.set(&k, v);
        }
    }
    let write = |name: &str, text: String| {
        std::fs::write(out.join(name), text).unwrap_or_else(|e| fail(&format!("{name}: {e}")));
    };
    write("run.json", format!("{}\n", json::stringify_pretty(&run, 2)));
    write("metrics.csv", format!("{}\n", metrics_lines.join("\n")));
    write("metamers.csv", format!("{}\n", metamer_lines.join("\n")));
    write("form.csv", format!("{}\n", form_lines.join("\n")));
    write("hash.txt", format!("{hash}\n"));
    if a.light {
        write("light.csv", format!("{}\n", light_lines.join("\n")));
    }
    if !a.quiet {
        println!(
            "{}: {} seasons in {:.0} ms, hash {hash}",
            out.display(),
            number_to_string(seasons),
            ms
        );
    }
}

/// Mean ms per season by phase, as JSON on stdout (as cli/bench.ts runs a case, its hash too).
fn bench(world: &mut World, seasons: f64) {
    use tree_core::season::{PHASES, Phase};
    let mut totals = [0.0f64; 9];
    let mut seasons_ms = Vec::new();
    let mut s = 0.0;
    while s < seasons {
        s += 1.0;
        let t_season = Instant::now();
        let mut last = Instant::now();
        world.step(&mut |phase: Phase| {
            let now = Instant::now();
            let k = PHASES.iter().position(|&p| p == phase).unwrap();
            totals[k] += (now - last).as_secs_f64() * 1000.0;
            last = now;
        });
        seasons_ms.push(t_season.elapsed().as_secs_f64() * 1000.0);
    }
    let n = seasons_ms.len().max(1) as f64;
    let mut fields = vec![(
        "mean".to_string(),
        Value::Num(seasons_ms.iter().sum::<f64>() / n),
    )];
    for (k, p) in PHASES.iter().enumerate() {
        fields.push((p.name().into(), Value::Num(totals[k] / n)));
    }
    fields.push(("hash".into(), Value::Str(hash_world(world))));
    println!("{}", json::stringify(&Value::Obj(fields), false));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers_print_as_cli_run_ts_printed_them() {
        for (x, s) in [
            (3.0, "3"),
            (0.1, "0.1"),
            (1.0 / 3.0, "0.33333333"),
            (123456.789012, "123456.79"),
            (1.00390625, "1.0039063"), // a tie: toPrecision rounds it up
            (-1.00390625, "-1.0039063"),
            (9.99999995e-7, "0.000001"),
            (2.5e-8, "2.5e-8"),
            (f64::NAN, "NaN"),
            (-0.0, "0"),
            (1e22, "1e+22"),
        ] {
            assert_eq!(num(x), s, "{x:e}");
        }
    }
}
