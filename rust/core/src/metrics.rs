//! Per-tree, per-season measurements (spec §8, §10): one row per tree per season in the CLI's
//! metrics.csv, and the page's charts. Crown width and the centroid's offset are along x (the
//! picture's plane); depth and its offset along z (I2).

use crate::math;
use crate::principles::c3::is_live_bud;
use crate::tree::{Tree, bud};
use crate::world::World;

const PI: f64 = std::f64::consts::PI;

/// metrics.csv's columns (METRIC_COLUMNS), in order. `alive` and `sown` are flags (1/0) and
/// `species` a string; every other column is a number.
pub const METRIC_COLUMNS: [&str; 37] = [
    "tree",
    "alive",
    "species",
    "rootX",
    "age",
    "metamers",
    "buds",
    "dormantBuds",
    "shortShoots",
    "height",
    "crownWidth",
    "centroidOffset",
    "boleHeight",
    "qBase",
    "vBase",
    "meanBudQ",
    "trunkRadius",
    "woodVolume",
    "slenderness",
    "shed",
    "groundLight",
    "production",
    "maintenance",
    "reserve",
    "reproduction",
    "starved",
    "abraded",
    "seeds",
    "crownRatio",
    "branchAngle",
    "released",
    "epicormic",
    "aborted",
    "broken",
    "rootZ",
    "crownDepth",
    "centroidOffsetZ",
];

/// The numeric fields of TreeMetrics, in this order (`sown` among them, as a flag), which the
/// snapshot carries as a block: everything but `species`.
pub const METRIC_NUMBERS: [&str; 37] = [
    "tree",
    "alive",
    "rootX",
    "age",
    "metamers",
    "buds",
    "dormantBuds",
    "shortShoots",
    "height",
    "crownWidth",
    "centroidOffset",
    "boleHeight",
    "qBase",
    "vBase",
    "meanBudQ",
    "trunkRadius",
    "woodVolume",
    "slenderness",
    "shed",
    "groundLight",
    "production",
    "maintenance",
    "reserve",
    "reproduction",
    "starved",
    "abraded",
    "seeds",
    "sown",
    "crownRatio",
    "branchAngle",
    "released",
    "epicormic",
    "aborted",
    "broken",
    "rootZ",
    "crownDepth",
    "centroidOffsetZ",
];

pub struct TreeMetrics {
    /// By METRIC_NUMBERS.
    pub values: [f64; 37],
    pub species: String,
}

impl TreeMetrics {
    pub fn get(&self, name: &str) -> f64 {
        METRIC_NUMBERS
            .iter()
            .position(|&n| n == name)
            .map_or(f64::NAN, |k| self.values[k])
    }
}

/// Mean Q/C over the bottom row of cells whose columns lie in [x0, x1] and layers in [z0, z1].
pub fn ground_light(world: &World, x0: f64, x1: f64, z0: f64, z1: f64) -> f64 {
    let light = &world.light;
    let c = world.params().c2.c;
    let lo = math::max(0.0, x0.floor());
    let hi = math::min(light.width() - 1.0, x1.floor());
    let near = math::max(0.0, z0.floor());
    let far = math::min(light.depth() - 1.0, z1.floor());
    if hi < lo || far < near || c <= 0.0 {
        return f64::NAN;
    }
    let mut sum = 0.0;
    let mut layer = near;
    while layer <= far {
        let mut col = lo;
        while col <= hi {
            sum += light.sample(col + 0.5, 0.5, layer + 0.5).0;
            col += 1.0;
        }
        layer += 1.0;
    }
    sum / ((hi - lo + 1.0) * (far - near + 1.0) * c)
}

pub fn tree_metrics(tree: &Tree, world: Option<&World>) -> TreeMetrics {
    let nm = tree.m.len();
    let c = &tree.m;
    let mut height = 0.0;
    let mut min_x = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut sum_x = 0.0;
    let (mut min_z, mut max_z, mut sum_z) = (f64::INFINITY, f64::NEG_INFINITY, 0.0);
    let mut bole = f64::INFINITY;
    let mut wood = 0.0;
    let mut angle_sum = 0.0;
    let mut branches = 0.0;
    for i in 0..nm {
        wood += PI * c.radius[i] * c.radius[i] * c.length[i];
        let [x, y, z] = tree.tip(i);
        min_z = math::min(min_z, z);
        max_z = math::max(max_z, z);
        sum_z += z;
        if y > height {
            height = y;
        }
        if x < min_x {
            min_x = x;
        }
        if x > max_x {
            max_x = x;
        }
        sum_x += x;
        let p = c.parent[i];
        if c.order[i] == 1 && p >= 0 && c.order[p as usize] == 0 {
            if c.base_y[i] < bole {
                bole = c.base_y[i];
            }
            let up = math::max(-1.0, math::min(1.0, c.hy[i]));
            angle_sum += math::acos(up) * (180.0 / PI);
            branches += 1.0;
        }
    }
    let (mut buds, mut dormant, mut short) = (0.0, 0.0, 0.0);
    for i in 0..tree.b.len() {
        let s = tree.b.state[i];
        if !is_live_bud(s) {
            continue;
        }
        buds += 1.0;
        if s == bud::DORMANT {
            dormant += 1.0;
        } else if s == bud::SHORT_SHOOT {
            short += 1.0;
        }
    }
    let n = nm as f64;
    let trunk = if nm > 0 { c.radius[0] } else { 0.0 };
    let bole_height = if bole.is_finite() { bole } else { height };
    let ground = match world {
        Some(w) if nm > 0 => ground_light(w, min_x, max_x, min_z, max_z),
        _ => f64::NAN,
    };
    TreeMetrics {
        values: [
            tree.id as f64,
            tree.alive as u8 as f64,
            tree.root_x,
            tree.age,
            n,
            buds,
            dormant,
            short,
            height,
            if nm > 0 { max_x - min_x } else { 0.0 },
            if nm > 0 { sum_x / n - tree.root_x } else { 0.0 },
            bole_height,
            tree.q_base,
            tree.v_base,
            tree.mean_bud_q,
            trunk,
            wood,
            if nm > 0 && trunk > 0.0 {
                height / (2.0 * trunk)
            } else {
                0.0
            },
            tree.shed_count,
            ground,
            tree.production,
            tree.maintenance,
            tree.reserve,
            tree.reproduction,
            tree.starved,
            tree.abraded,
            tree.seeds,
            tree.sown as u8 as f64,
            if height > 0.0 {
                (height - bole_height) / height
            } else {
                0.0
            },
            if branches > 0.0 {
                angle_sum / branches
            } else {
                0.0
            },
            tree.released,
            tree.epicormic,
            tree.aborted,
            tree.broken,
            tree.root_z,
            if nm > 0 { max_z - min_z } else { 0.0 },
            if nm > 0 { sum_z / n - tree.root_z } else { 0.0 },
        ],
        species: tree.species.clone(),
    }
}
