//! World checkpoints (M21): a whole world as bytes.
//!
//! Layout: a little-endian u32 header length, an ASCII JSON header (version, params, season,
//! flags, event log and queue, each tree's root, scalar fields and table lengths), padding to 8
//! bytes, then for each tree its metamer columns and its bud columns in schema order, each the
//! rows in use, padded to 8 bytes. The light field, the owner grid and the per-season scratch are
//! rebuilt by the season that reads them.
//!
//! **Version 2** (I2, ADR 0025) is the 3D schema. **Version 1**, the 2D core's (the TypeScript
//! core's, and garden 0.14.0's opening forests), still loads: each angle becomes a heading in the
//! x-y plane with reference +z, laterals take the in-plane azimuths (−π/2 left, π/2 right), the
//! scalar moment becomes its vector, and the tree stands at z = 0.5. Its params have no depth, so
//! the world is a slab one cell deep: the planar forest it was, growing on in 3D's code.

use crate::json::{self, Value};
use crate::tree::{ColMut, NUMBERS, SCALARS, Tree};
use crate::world::World;

const VERSION: f64 = 2.0;

/// The 2D schema (version 1): (name, size in bytes) of each column, in its order.
const METAMERS_V1: [(&str, usize); 19] = [
    ("birthId", 4),
    ("parent", 4),
    ("slot", 1),
    ("axis", 4),
    ("axisNode", 4),
    ("order", 1),
    ("baseX", 8),
    ("baseY", 8),
    ("angle", 8),
    ("length", 8),
    ("radius", 8),
    ("scarSumN", 8),
    ("birthSeason", 4),
    ("qSum", 8),
    ("nSum", 4),
    ("vIn", 8),
    ("stressWood", 8),
    ("moment", 8),
    ("paShift", 1),
];

const BUDS_V1: [(&str, usize); 11] = [
    ("birthId", 4),
    ("metamer", 4),
    ("slot", 1),
    ("state", 1),
    ("age", 4),
    ("order", 1),
    ("angle", 8),
    ("q", 8),
    ("vx", 8),
    ("vy", 8),
    ("v", 8),
];

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
                ("rootZ".into(), Value::Num(t.root_z)),
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
    let version = num(&header, "version");
    if version != VERSION && version != 1.0 {
        return Err(CheckpointError(format!("unknown version {version}")));
    }
    let mut at = pad8(4 + len);
    let mut trees = Vec::new();
    for h in header.get("trees").and_then(Value::as_array).unwrap_or(&[]) {
        let root_z = h.get("rootZ").and_then(Value::as_f64).unwrap_or(0.5);
        let mut tree = Tree::new(num(h, "id") as usize, num(h, "rootX"), root_z);
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
        if version == 1.0 {
            load_v1(&mut tree, nm, nb, bytes, &mut at)?;
            trees.push(tree);
            continue;
        }
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

/// One version-1 column's values as numbers (its stored type widened to f64).
fn column_v1(
    rows: usize,
    size: usize,
    bytes: &[u8],
    at: &mut usize,
) -> Result<Vec<f64>, CheckpointError> {
    let n = rows * size;
    let src = bytes
        .get(*at..*at + n)
        .ok_or_else(|| CheckpointError("truncated columns".into()))?;
    let out = match size {
        8 => src
            .chunks_exact(8)
            .map(|c| f64::from_le_bytes(c.try_into().unwrap()))
            .collect(),
        4 => src
            .chunks_exact(4)
            .map(|c| i32::from_le_bytes(c.try_into().unwrap()) as f64)
            .collect(),
        _ => src.iter().map(|&b| b as f64).collect(),
    };
    *at += pad8(n);
    Ok(out)
}

/// A 2D (version 1) tree's tables into the 3D schema (see the module's header).
fn load_v1(
    tree: &mut Tree,
    nm: usize,
    nb: usize,
    bytes: &[u8],
    at: &mut usize,
) -> Result<(), CheckpointError> {
    let half = std::f64::consts::FRAC_PI_2;
    let lateral = |slot: f64| {
        if slot == 1.0 {
            -half
        } else if slot == 2.0 {
            half
        } else {
            0.0
        }
    };
    let mut cols = std::collections::HashMap::new();
    for (name, size) in METAMERS_V1 {
        cols.insert(name, column_v1(nm, size, bytes, at)?);
    }
    let c = |k: &str, i: usize| cols[k][i];
    tree.m.set_len(nm);
    for i in 0..nm {
        let a = c("angle", i);
        let m = &mut tree.m;
        m.birth_id[i] = c("birthId", i) as i32;
        m.parent[i] = c("parent", i) as i32;
        m.slot[i] = c("slot", i) as u8;
        m.axis[i] = c("axis", i) as i32;
        m.axis_node[i] = c("axisNode", i) as i32;
        m.order[i] = c("order", i) as u8;
        (m.base_x[i], m.base_y[i], m.base_z[i]) = (c("baseX", i), c("baseY", i), 0.5);
        (m.hx[i], m.hy[i], m.hz[i]) = (crate::math::cos(a), crate::math::sin(a), 0.0);
        (m.lx[i], m.ly[i], m.lz[i]) = (0.0, 0.0, 1.0);
        m.azimuth[i] = lateral(c("slot", i));
        m.length[i] = c("length", i);
        m.radius[i] = c("radius", i);
        m.scar_sum_n[i] = c("scarSumN", i);
        m.birth_season[i] = c("birthSeason", i) as i32;
        m.q_sum[i] = c("qSum", i);
        m.n_sum[i] = c("nSum", i) as i32;
        m.v_in[i] = c("vIn", i);
        m.stress_wood[i] = c("stressWood", i);
        // 2D's moment S − W·x_base is the lever arm's x; the vector's z is its negative.
        (m.mx[i], m.my[i], m.mz[i]) = (0.0, 0.0, -c("moment", i));
        m.pa_shift[i] = c("paShift", i) as u8;
    }
    let mut cols = std::collections::HashMap::new();
    for (name, size) in BUDS_V1 {
        cols.insert(name, column_v1(nb, size, bytes, at)?);
    }
    let c = |k: &str, i: usize| cols[k][i];
    tree.b.set_len(nb);
    for i in 0..nb {
        let a = c("angle", i);
        let b = &mut tree.b;
        b.birth_id[i] = c("birthId", i) as i32;
        b.metamer[i] = c("metamer", i) as i32;
        b.slot[i] = c("slot", i) as u8;
        b.state[i] = c("state", i) as u8;
        b.age[i] = c("age", i) as i32;
        b.order[i] = c("order", i) as u8;
        (b.hx[i], b.hy[i], b.hz[i]) = (crate::math::cos(a), crate::math::sin(a), 0.0);
        (b.lx[i], b.ly[i], b.lz[i]) = (0.0, 0.0, 1.0);
        b.azimuth[i] = lateral(c("slot", i));
        b.q[i] = c("q", i);
        (b.vx[i], b.vy[i], b.vz[i]) = (c("vx", i), c("vy", i), 0.0);
        b.v[i] = c("v", i);
    }
    Ok(())
}
