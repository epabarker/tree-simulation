//! Per-tree, per-season measurements (spec §8, §10): one row per tree per season in the CLI's
//! metrics.csv, and the page's charts. Crown width and the centroid's offset are along x (the
//! picture's plane); depth and its offset along z (I2).

use crate::light::Light;
use crate::math;
use crate::principles::c3::is_live_bud;
use crate::principles::r6::deposit_area;
use crate::tree::{Tree, bud};
use crate::world::World;

const PI: f64 = std::f64::consts::PI;

/// metrics.csv's columns (METRIC_COLUMNS), in order. `alive` and `sown` are flags (1/0) and
/// `species` a string; every other column is a number.
pub const METRIC_COLUMNS: [&str; 41] = [
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
    "leafBase",
    "leafCrownRatio",
    "limbBase",
    "limbCrownRatio",
];

/// The numeric fields of TreeMetrics, in this order (`sown` among them, as a flag), which the
/// snapshot carries as a block: everything but `species`.
pub const METRIC_NUMBERS: [&str; 41] = [
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
    "leafBase",
    "leafCrownRatio",
    "limbBase",
    "limbCrownRatio",
];

pub struct TreeMetrics {
    /// By METRIC_NUMBERS.
    pub values: [f64; 41],
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

/// Leaf area index over the ground cells whose columns lie in [x0, x1] and layers in [z0, z1]: the
/// mean over those cells of the leaf area deposited in the column above (Σ_y lad, as the CLI's
/// ground.csv reports it), per cell of ground. It is this season's start-of-season foliage, the one
/// the light field was swept through (§6). NaN without the slab light.
pub fn lai(light: &Light, x0: f64, x1: f64, z0: f64, z1: f64) -> f64 {
    let Light::Slab(slab) = light else {
        return f64::NAN;
    };
    let (w, h, d) = slab.sweep.dims();
    let lo = math::max(0.0, x0.floor());
    let hi = math::min(w as f64 - 1.0, x1.floor());
    let near = math::max(0.0, z0.floor());
    let far = math::min(d as f64 - 1.0, z1.floor());
    if hi < lo || far < near {
        return f64::NAN;
    }
    let lad = slab.sweep.lad();
    let (lo, hi, near, far) = (lo as usize, hi as usize, near as usize, far as usize);
    let mut sum = 0.0;
    for y in 0..h {
        for z in near..=far {
            for x in lo..=hi {
                sum += lad[(y * d + z) * w + x] as f64;
            }
        }
    }
    sum / ((hi - lo + 1) * (far - near + 1)) as f64
}

/// The crown's base by leaf area (C1 round 3, plan 2026-10-30-form §3): live buds' leaf area
/// (R6's `deposit_area`; 1 per live bud without a world) in 1-cell bins of their metamer's tip
/// height, walked up from the ground until CROWN_BASE_SHARE of it lies below; the height is
/// interpolated within that bin. Unlike the lowest live first-order branch (`boleHeight`), one
/// low twig does not hold it down. `height` when the tree carries no leaf.
pub const CROWN_BASE_SHARE: f64 = 0.05;

pub fn leaf_base(tree: &Tree, world: Option<&World>, height: f64) -> f64 {
    let r6 = world.map(|w| &w.params_of(tree).r6);
    let bins = math::max(0.0, height).floor() as usize + 1;
    let mut area = vec![0.0; bins];
    let mut total = 0.0;
    for j in 0..tree.b.len() {
        let s = tree.b.state[j];
        if !is_live_bud(s) {
            continue;
        }
        let leaf = r6.map_or(1.0, |r6| deposit_area(s, r6));
        if leaf <= 0.0 {
            continue;
        }
        let y = tree.tip_y(tree.b.metamer[j] as usize);
        let k = (math::max(0.0, y).floor() as usize).min(bins - 1);
        area[k] += leaf;
        total += leaf;
    }
    if total <= 0.0 {
        return height;
    }
    let target = CROWN_BASE_SHARE * total;
    let mut below = 0.0;
    for (k, &a) in area.iter().enumerate() {
        if a > 0.0 && below + a >= target {
            return math::min(height, k as f64 + (target - below) / a);
        }
        below += a;
    }
    height
}

/// The crown's base by limbs (species plan 2026-10-31, step B.2; ADR 0028): first-order limbs (an
/// order-1 metamer off the trunk, and everything it carries) taken in order of the height they
/// leave the trunk, the base of the limb at which those from the bottom up first hold
/// CROWN_BASE_SHARE of the tree's leaf area. It reads where limbs attach, as the field's live crown
/// base does (the lowest live primary limb of the main crown; Pretzsch 2019), where `leaf_base`
/// reads where their leaves hang; one low twig does not set it, unlike `boleHeight`. Cumulative,
/// not a share per limb: a crown of 126 limbs, none holding 5%, read a crown ratio of 0 that way
/// (the round-2 lone beech at 100). `height` when the limbs hold less than that share.
pub fn limb_base(tree: &Tree, world: Option<&World>, height: f64) -> f64 {
    let r6 = world.map(|w| &w.params_of(tree).r6);
    let c = &tree.m;
    let nm = c.len();
    // Each metamer's limb (the order-1 metamer it descends from, -1 on the trunk): parents come
    // first, so one pass forward fills it.
    let mut limb = vec![-1i32; nm];
    for i in 0..nm {
        let p = c.parent[i];
        if p < 0 {
            continue;
        }
        limb[i] = if c.order[i] == 1 && c.order[p as usize] == 0 {
            i as i32
        } else {
            limb[p as usize]
        };
    }
    let mut area = vec![0.0; nm];
    let mut total = 0.0;
    for j in 0..tree.b.len() {
        let s = tree.b.state[j];
        if !is_live_bud(s) {
            continue;
        }
        let leaf = r6.map_or(1.0, |r6| deposit_area(s, r6));
        if leaf <= 0.0 {
            continue;
        }
        total += leaf;
        let l = limb[tree.b.metamer[j] as usize];
        if l >= 0 {
            area[l as usize] += leaf;
        }
    }
    if total <= 0.0 {
        return height;
    }
    let mut limbs: Vec<usize> = (0..nm)
        .filter(|&i| limb[i] == i as i32 && area[i] > 0.0)
        .collect();
    limbs.sort_by(|&a, &b| c.base_y[a].total_cmp(&c.base_y[b]));
    let mut below = 0.0;
    for i in limbs {
        below += area[i];
        if below >= CROWN_BASE_SHARE * total {
            return math::min(height, c.base_y[i]);
        }
    }
    height
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
    let leaf_base = leaf_base(tree, world, height);
    let limb_base = limb_base(tree, world, height);
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
            leaf_base,
            if height > 0.0 {
                (height - leaf_base) / height
            } else {
                0.0
            },
            limb_base,
            if height > 0.0 {
                (height - limb_base) / height
            } else {
                0.0
            },
        ],
        species: tree.species.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::Params;
    use crate::testing::{RIGHT, bud, metamer};
    use crate::tree::slot;

    const UP: f64 = std::f64::consts::FRAC_PI_2;

    #[test]
    fn the_leaf_base_ignores_one_low_twig_that_sets_the_bole() {
        // A 20-cell trunk; one twig with a single bud at height 2; six crown limbs at 14–19, each
        // with eight buds.
        let mut t = Tree::new(0, 10.0, 0.5);
        let mut trunk = vec![metamer(&mut t, -1, slot::MAIN, UP, 1.0, 0.1, 0.0)];
        for _ in 1..20 {
            let p = *trunk.last().unwrap() as i32;
            trunk.push(metamer(&mut t, p, slot::MAIN, UP, 1.0, 0.1, 0.0));
        }
        let twig = metamer(&mut t, trunk[1] as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        bud(&mut t, twig, slot::MAIN, 0.0, 1.0);
        for &k in &trunk[13..19] {
            let limb = metamer(&mut t, k as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
            for s in 0..8 {
                bud(&mut t, limb, s, 0.0, 1.0);
            }
        }
        let m = tree_metrics(&t, None);
        assert_eq!(m.get("height"), 20.0);
        assert_eq!(m.get("boleHeight"), 2.0);
        let base = m.get("leafBase");
        assert!((14.0..15.0).contains(&base), "{base}");
        assert!(m.get("leafCrownRatio") < m.get("crownRatio"));
        assert!((m.get("leafCrownRatio") - (20.0 - base) / 20.0).abs() < 1e-12);
    }

    #[test]
    fn the_limb_base_skips_a_low_twig_and_stops_where_the_limbs_hold_a_twentieth_of_the_leaf() {
        // A 20-cell trunk; a one-bud twig at 2 (1 of 49 buds, under 5%); six eight-bud crown
        // limbs at 14–19.
        let mut t = Tree::new(0, 10.0, 0.5);
        let mut trunk = vec![metamer(&mut t, -1, slot::MAIN, UP, 1.0, 0.1, 0.0)];
        for _ in 1..20 {
            let p = *trunk.last().unwrap() as i32;
            trunk.push(metamer(&mut t, p, slot::MAIN, UP, 1.0, 0.1, 0.0));
        }
        let twig = metamer(&mut t, trunk[1] as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        bud(&mut t, twig, slot::MAIN, 0.0, 1.0);
        for &k in &trunk[13..19] {
            let limb = metamer(&mut t, k as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
            for s in 0..8 {
                bud(&mut t, limb, s, 0.0, 1.0);
            }
        }
        let m = tree_metrics(&t, None);
        assert_eq!(m.get("boleHeight"), 2.0);
        assert_eq!(m.get("limbBase"), 14.0);
        // A limb at 6 with a second-order shoot, counted toward that limb: with the twig below, 4 of
        // 52 buds (7.7%) lie on the limbs up to it.
        let low = metamer(&mut t, trunk[5] as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        bud(&mut t, low, slot::MAIN, 0.0, 1.0);
        let side = metamer(&mut t, low as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        bud(&mut t, side, slot::MAIN, 0.0, 1.0);
        bud(&mut t, side, 2, 0.0, 1.0);
        let m = tree_metrics(&t, None);
        assert_eq!(m.get("limbBase"), 6.0);
        assert!((m.get("limbCrownRatio") - 14.0 / 20.0).abs() < 1e-12);
    }

    #[test]
    fn the_limb_base_counts_many_small_limbs_together() {
        // Forty one-bud limbs at 1–40, none near 5% alone (2.5% each): the second from the bottom
        // brings the limbs below and at it to 5%.
        let mut t = Tree::new(0, 10.0, 0.5);
        let mut trunk = vec![metamer(&mut t, -1, slot::MAIN, UP, 1.0, 0.1, 0.0)];
        for _ in 1..41 {
            let p = *trunk.last().unwrap() as i32;
            trunk.push(metamer(&mut t, p, slot::MAIN, UP, 1.0, 0.1, 0.0));
        }
        for &k in &trunk[0..40] {
            let limb = metamer(&mut t, k as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
            bud(&mut t, limb, slot::MAIN, 0.0, 1.0);
        }
        let m = tree_metrics(&t, None);
        assert_eq!(m.get("limbBase"), 2.0);
        assert!((m.get("limbCrownRatio") - 39.0 / 41.0).abs() < 1e-12);
    }

    #[test]
    fn the_lai_of_a_one_leaf_column_is_its_deposit_area() {
        let p = Params::from_json(&crate::testing::preset(
            "default",
            r#"{"c2":{"enabled":true}}"#,
        ));
        let mut light = crate::light::make_light(&p);
        let d = light.depth();
        light.clear();
        light.deposit(10.5, 3.5, 2.5, 1.5);
        light.deposit(10.5, 7.5, 2.5, 0.5);
        assert!((lai(&light, 10.0, 10.0, 2.0, 2.0) - 2.0).abs() < 1e-6);
        assert_eq!(lai(&light, 11.0, 11.0, 2.0, 2.0), 0.0);
        // Over two columns and the whole depth, the mean per cell of ground.
        let all = lai(&light, 10.0, 11.0, 0.0, d);
        assert!((all - 2.0 / (2.0 * d)).abs() < 1e-6, "{all}");
    }
}
