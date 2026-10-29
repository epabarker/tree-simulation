//! World checkpoints (M21; checkpoint.ts): a whole world as bytes, the same bytes the TypeScript
//! core reads and writes, so the opening forests shipped as TypeScript checkpoints load here.
//!
//! Layout: a little-endian u32 header length, an ASCII JSON header (params, season, flags, event
//! log and queue, each tree's scalar fields and table lengths), padding to 8 bytes, then for each
//! tree its metamer columns and its bud columns in schema order, each the rows in use, padded to
//! 8 bytes. The light field, the owner grid and the per-season scratch are rebuilt by the season
//! that reads them.

use crate::json::{self, Value};
use crate::tree::{ColMut, NUMBERS, SCALARS, Tree};
use crate::world::World;

const VERSION: f64 = 1.0;

fn pad8(n: usize) -> usize {
    (n + 7) & !7
}

fn scalars(t: &Tree) -> Value {
    Value::Obj(
        SCALARS
            .iter()
            .map(|&k| {
                let v = match k {
                    "alive" => Value::Bool(t.alive),
                    "discarded" => Value::Bool(t.discarded),
                    "sown" => Value::Bool(t.sown),
                    "species" => Value::Str(t.species.clone()),
                    _ => Value::Num(t.number(k)),
                };
                (k.to_string(), v)
            })
            .collect(),
    )
}

/// The world as checkpoint bytes (`saveWorld`).
pub fn save_world(world: &World) -> Vec<u8> {
    let trees = world
        .trees
        .iter()
        .map(|t| {
            Value::Obj(vec![
                ("id".into(), Value::Num(t.id as f64)),
                ("rootX".into(), Value::Num(t.root_x)),
                ("scalars".into(), scalars(t)),
                ("metamers".into(), Value::Num(t.m.len() as f64)),
                ("buds".into(), Value::Num(t.b.len() as f64)),
            ])
        })
        .collect();
    let header = Value::Obj(vec![
        ("version".into(), Value::Num(VERSION)),
        ("initialParams".into(), world.initial_params.clone()),
        ("params".into(), world.params_json.clone()),
        ("season".into(), Value::Num(world.season)),
        ("recruits".into(), Value::Num(world.recruits)),
        ("storm".into(), Value::Bool(world.storm)),
        ("log".into(), Value::Arr(world.log.clone())),
        ("pending".into(), Value::Arr(world.pending.clone())),
        ("trees".into(), Value::Arr(trees)),
    ]);
    let text = json::stringify(&header, true);
    let mut out = Vec::new();
    out.extend_from_slice(&(text.len() as u32).to_le_bytes());
    out.extend_from_slice(text.as_bytes());
    out.resize(pad8(out.len()), 0);
    for t in &world.trees {
        for col in t.m.columns().into_iter().chain(t.b.columns()) {
            out.extend_from_slice(&col.bytes());
            out.resize(pad8(out.len()), 0);
        }
    }
    out
}

#[derive(Debug)]
pub struct CheckpointError(pub String);

impl std::fmt::Display for CheckpointError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "checkpoint: {}", self.0)
    }
}

impl std::error::Error for CheckpointError {}

fn fill(
    target: ColMut<'_>,
    rows: usize,
    bytes: &[u8],
    at: &mut usize,
) -> Result<(), CheckpointError> {
    let size = match &target {
        ColMut::F64(_) => 8,
        ColMut::I32(_) => 4,
        ColMut::U8(_) => 1,
    };
    let n = rows * size;
    let src = bytes
        .get(*at..*at + n)
        .ok_or_else(|| CheckpointError("truncated columns".into()))?;
    match target {
        ColMut::F64(v) => {
            for (d, c) in v.iter_mut().zip(src.chunks_exact(8)) {
                *d = f64::from_le_bytes(c.try_into().unwrap());
            }
        }
        ColMut::I32(v) => {
            for (d, c) in v.iter_mut().zip(src.chunks_exact(4)) {
                *d = i32::from_le_bytes(c.try_into().unwrap());
            }
        }
        ColMut::U8(v) => v[..rows].copy_from_slice(src),
    }
    *at += pad8(n);
    Ok(())
}

/// A world from checkpoint bytes, ready to step on from the saved season (`loadWorld`).
pub fn load_world(bytes: &[u8]) -> Result<World, CheckpointError> {
    let len = u32::from_le_bytes(
        bytes
            .get(0..4)
            .ok_or_else(|| CheckpointError("empty".into()))?
            .try_into()
            .unwrap(),
    ) as usize;
    let text = std::str::from_utf8(
        bytes
            .get(4..4 + len)
            .ok_or_else(|| CheckpointError("truncated header".into()))?,
    )
    .map_err(|e| CheckpointError(e.to_string()))?;
    let header = json::parse(text).map_err(|e| CheckpointError(e.to_string()))?;
    let num = |v: &Value, k: &str| v.get(k).and_then(Value::as_f64).unwrap_or(0.0);
    if num(&header, "version") != VERSION {
        return Err(CheckpointError(format!(
            "unknown version {}",
            num(&header, "version")
        )));
    }
    let mut at = pad8(4 + len);
    let mut trees = Vec::new();
    for h in header.get("trees").and_then(Value::as_array).unwrap_or(&[]) {
        let mut tree = Tree::new(num(h, "id") as usize, num(h, "rootX"));
        if let Some(s) = h.get("scalars") {
            for &k in NUMBERS {
                if let Some(x) = s.get(k).and_then(Value::as_f64) {
                    tree.set_number(k, x);
                }
            }
            let flag = |k: &str, d: bool| s.get(k).and_then(Value::as_bool).unwrap_or(d);
            tree.alive = flag("alive", true);
            tree.discarded = flag("discarded", false);
            tree.sown = flag("sown", false);
            tree.species = s
                .get("species")
                .and_then(Value::as_str)
                .unwrap_or("")
                .into();
        }
        let (nm, nb) = (num(h, "metamers") as usize, num(h, "buds") as usize);
        tree.m.set_len(nm);
        for col in tree.m.columns_mut() {
            fill(col, nm, bytes, &mut at)?;
        }
        tree.b.set_len(nb);
        for col in tree.b.columns_mut() {
            fill(col, nb, bytes, &mut at)?;
        }
        trees.push(tree);
    }
    let initial = header.get("initialParams").cloned().unwrap_or(Value::obj());
    let mut world = World::new(initial);
    world.restore(
        header.get("params").cloned().unwrap_or(Value::obj()),
        num(&header, "season"),
        num(&header, "recruits"),
        header
            .get("storm")
            .and_then(Value::as_bool)
            .unwrap_or(false),
    );
    world.log = header
        .get("log")
        .and_then(Value::as_array)
        .unwrap_or(&[])
        .to_vec();
    world.pending = header
        .get("pending")
        .and_then(Value::as_array)
        .unwrap_or(&[])
        .to_vec();
    world.trees = trees;
    Ok(world)
}
