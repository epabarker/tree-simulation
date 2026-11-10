//! Per-tree, per-season measurements (spec §8, §10): one row per tree per season in the CLI's
//! metrics.csv, and the page's charts. Crown width and the centroid's offset are along x (the
//! picture's plane); depth and its offset along z (I2).
//! The feature measures (liveCrownBase … budsOutside, docs/features/ and GLOSSARY) are computed
//! here once, so the feature probe, the evidence tests and the analysis read the same numbers.

use crate::light::Light;
use crate::math;
use crate::principles::c3::is_live_bud;
use crate::principles::r6::deposit_area;
use crate::tree::{Tree, bud};
use crate::world::World;

const PI: f64 = std::f64::consts::PI;

/// metrics.csv's columns (METRIC_COLUMNS), in order. `alive` and `sown` are flags (1/0) and
/// `species` a string; every other column is a number.
/// How many numbers a tree's metrics hold: METRIC_COLUMNS' and METRIC_NUMBERS' length.
pub const METRIC_COUNT: usize = 47;

pub const METRIC_COLUMNS: [&str; METRIC_COUNT] = [
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
    "liveCrownBase",
    "topFifthLeaf",
    "leafBelowSixth",
    "w90",
    "upperFlankNew",
    "budsOutside",
];

/// The numeric fields of TreeMetrics, in this order (`sown` among them, as a flag), which the
/// snapshot carries as a block: everything but `species`.
pub const METRIC_NUMBERS: [&str; METRIC_COUNT] = [
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
    "liveCrownBase",
    "topFifthLeaf",
    "leafBelowSixth",
    "w90",
    "upperFlankNew",
    "budsOutside",
];

pub struct TreeMetrics {
    /// By METRIC_NUMBERS.
    pub values: [f64; METRIC_COUNT],
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
/// Each metamer's first-order limb: the order-1 metamer off the trunk it descends from, -1 on the
/// trunk. Parents come first, so one pass forward fills it.
fn limbs_of(tree: &Tree) -> Vec<i32> {
    let c = &tree.m;
    let mut limb = vec![-1i32; c.len()];
    for i in 0..c.len() {
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
    limb
}

/// The live crown base (GLOSSARY; the bare-bole page's measure): the height where the lowest
/// living first-order limb leaves the trunk, over the tree's height. A limb is living while it
/// carries a live bud (active, dormant or short shoot) anywhere on it; a limb whose buds are all
/// gone is a dead stub and does not count (the model sheds limbs outright, so these are rare).
/// 1 when no limb lives (the whole stem is bare); NaN for a tree of no height.
pub fn live_crown_base(tree: &Tree, height: f64) -> f64 {
    if height <= 0.0 {
        return f64::NAN;
    }
    let limb = limbs_of(tree);
    let mut base = height;
    for j in 0..tree.b.len() {
        if !is_live_bud(tree.b.state[j]) {
            continue;
        }
        let l = limb[tree.b.metamer[j] as usize];
        if l >= 0 {
            base = math::min(base, tree.m.base_y[l as usize]);
        }
    }
    math::min(1.0, base / height)
}

/// The leafy buds, as (x, y, leaf area) at their metamer's tip: live buds with a leaf area above 0
/// (R6's `deposit_area`; 1 per live bud without a world, as `leaf_base` takes it).
fn leaves(tree: &Tree, world: Option<&World>) -> Vec<(f64, f64, f64)> {
    let r6 = world.map(|w| &w.params_of(tree).r6);
    let mut out = Vec::new();
    for j in 0..tree.b.len() {
        let s = tree.b.state[j];
        if !is_live_bud(s) {
            continue;
        }
        let leaf = r6.map_or(1.0, |r6| deposit_area(s, r6));
        if leaf > 0.0 {
            let m = tree.b.metamer[j] as usize;
            out.push((tree.tip_x(m), tree.tip_y(m), leaf));
        }
    }
    out
}

/// The shares of the tree's leaf area at or above 0.8 H (the top fifth: ADR 0031's band, the
/// rounded-crown page's measure) and below H/6 (the lone beech's low leaf, ADR 0043, the bare-bole
/// page's guard), by the height of each leafy bud. NaN for a tree with no leaf.
pub fn leaf_shares(leaves: &[(f64, f64, f64)], height: f64) -> (f64, f64) {
    let (mut total, mut top, mut low) = (0.0, 0.0, 0.0);
    for &(_, y, leaf) in leaves {
        total += leaf;
        if y >= 0.8 * height {
            top += leaf;
        }
        if y < height / 6.0 {
            low += leaf;
        }
    }
    if total <= 0.0 || height <= 0.0 {
        return (f64::NAN, f64::NAN);
    }
    (top / total, low / total)
}

/// The q-quantile of `xs` by the nearest rank (polars' default, which the playbook's scripts
/// used): the sorted value at round(q·(n − 1)). Sorts `xs`; NaN when it is empty.
fn quantile(xs: &mut [f64], q: f64) -> f64 {
    if xs.is_empty() {
        return f64::NAN;
    }
    xs.sort_by(f64::total_cmp);
    xs[math::round(q * (xs.len() - 1) as f64) as usize]
}

/// The leafy crown's frame, in the picture's plane: its base (the 5th percentile of the leafy
/// buds' heights), its top (the tree's height) and its half-width (the 95th percentile of the
/// leafy buds' |x − root x|). `None` without leaf or depth. The flat-cap note's crown box (#79),
/// which the open-box, oak-λ and oak-schedule summaries share.
struct CrownFrame {
    base: f64,
    top: f64,
    half_width: f64,
}

fn crown_frame(leaves: &[(f64, f64, f64)], root_x: f64, height: f64) -> Option<CrownFrame> {
    let mut ys: Vec<f64> = leaves.iter().map(|l| l.1).collect();
    let base = quantile(&mut ys, 0.05);
    if base.is_nan() || height <= base {
        return None;
    }
    let mut dx: Vec<f64> = leaves.iter().map(|l| (l.0 - root_x).abs()).collect();
    Some(CrownFrame {
        base,
        top: height,
        half_width: quantile(&mut dx, 0.95),
    })
}

/// Leafy buds a slice needs for its width to count as the crown's widest (the oak-schedule
/// summary's rule).
pub const W90_MIN_BUDS: usize = 20;

/// w90, the rounded-crown page's outline measure (the oak-schedule summary's `outline`): the
/// leafy crown, from its base to the top, cut into 20 slices of equal depth; a slice's width is
/// the 2nd to 98th percentile of its leafy buds' x; w90 is slice 17's width (0.85–0.90 of the
/// depth) over the widest slice holding W90_MIN_BUDS. An ellipse gives about 0.6, a spire is low
/// and a flat cap near 1. 0 when slice 17 is empty; NaN when no slice holds enough buds.
fn w90(leaves: &[(f64, f64, f64)], frame: Option<&CrownFrame>) -> f64 {
    let Some(f) = frame else {
        return f64::NAN;
    };
    let mut slices: Vec<Vec<f64>> = vec![Vec::new(); 20];
    for &(x, y, _) in leaves {
        if y < f.base || y > f.top {
            continue;
        }
        let k = ((20.0 * (y - f.base) / (f.top - f.base)).floor() as usize).min(19);
        slices[k].push(x);
    }
    let mut widest = f64::NAN;
    let mut at = 0.0;
    for (k, xs) in slices.iter_mut().enumerate() {
        let n = xs.len();
        let w = if n == 0 {
            0.0
        } else {
            let hi = quantile(xs, 0.98);
            hi - xs[math::round(0.02 * (n - 1) as f64) as usize]
        };
        if k == 17 {
            at = w;
        }
        if n >= W90_MIN_BUDS && (widest.is_nan() || w > widest) {
            widest = w;
        }
    }
    if widest.is_nan() || widest <= 0.0 {
        return f64::NAN;
    }
    at / widest
}

/// The upper flank's share of this season's new metamers (the rounded-crown page's measure; the
/// flat-cap note's sectors, #79): each new metamer's tip placed about the leafy crown's centre in
/// the picture's plane, u = (x − root x)/half-width and v = (y − centre)/half-depth; the flank is
/// the outer shell (ρ = √(u² + v²) ≥ 0.7) between 30° and 60° from vertical (θ = atan2(|u|, v)).
/// New means born in the season that last ran (World::step counts the season after running it).
/// NaN without a world, a leafy crown or new metamers.
fn upper_flank_new(tree: &Tree, world: Option<&World>, frame: Option<&CrownFrame>) -> f64 {
    let (Some(w), Some(f)) = (world, frame) else {
        return f64::NAN;
    };
    let season = w.season - 1.0;
    let centre = (f.base + f.top) / 2.0;
    let half_depth = (f.top - f.base) / 2.0;
    let (mut new, mut flank) = (0.0, 0.0);
    for i in 0..tree.m.len() {
        if tree.m.birth_season[i] as f64 != season {
            continue;
        }
        new += 1.0;
        let [x, y, _] = tree.tip(i);
        let u = (x - tree.root_x) / f.half_width;
        let v = (y - centre) / half_depth;
        let rho = math::hypot(u, v);
        let theta = math::atan2(u.abs(), v) * (180.0 / PI);
        if rho >= 0.7 && (30.0..60.0).contains(&theta) {
            flank += 1.0;
        }
    }
    if new > 0.0 { flank / new } else { f64::NAN }
}

/// Live buds outside the world's bounds (ADR 0062: an open-grown lone tree's box must hold its
/// crown, so this is zero there): a bud at its metamer's tip below the ground, at or above the
/// world's height, or past a width or depth face that is not periodic. A periodic side wraps a
/// crown round and is no bound. NaN without a world.
pub fn buds_outside(tree: &Tree, world: Option<&World>) -> f64 {
    let Some(w) = world else {
        return f64::NAN;
    };
    let p = &w.params().world;
    let (width, height, depth) = (p.width, p.height, crate::light::depth_of(w.params()));
    let mut out = 0.0;
    for j in 0..tree.b.len() {
        if !is_live_bud(tree.b.state[j]) {
            continue;
        }
        let [x, y, z] = tree.tip(tree.b.metamer[j] as usize);
        let past_x = !p.periodic && !(0.0..width).contains(&x);
        let past_z = !p.periodic_z && !(0.0..depth).contains(&z);
        if past_x || past_z || !(0.0..height).contains(&y) {
            out += 1.0;
        }
    }
    out
}

pub fn limb_base(tree: &Tree, world: Option<&World>, height: f64) -> f64 {
    let r6 = world.map(|w| &w.params_of(tree).r6);
    let c = &tree.m;
    let nm = c.len();
    let limb = limbs_of(tree);
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
    let leafy = leaves(tree, world);
    let (top_fifth, below_sixth) = leaf_shares(&leafy, height);
    let frame = crown_frame(&leafy, tree.root_x, height);
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
            live_crown_base(tree, height),
            top_fifth,
            below_sixth,
            w90(&leafy, frame.as_ref()),
            upper_flank_new(tree, world, frame.as_ref()),
            buds_outside(tree, world),
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

    /// A 20-cell trunk, up the y axis from (10, 0, 0.5).
    fn stem(t: &mut Tree, n: usize) -> Vec<usize> {
        let mut trunk = vec![metamer(t, -1, slot::MAIN, UP, 1.0, 0.1, 0.0)];
        for _ in 1..n {
            let p = *trunk.last().unwrap() as i32;
            trunk.push(metamer(t, p, slot::MAIN, UP, 1.0, 0.1, 0.0));
        }
        trunk
    }

    #[test]
    fn the_live_crown_base_is_the_lowest_limb_with_a_live_bud_over_the_height() {
        // A dead limb at 2 (its only bud terminated), a live one-bud limb at 5 carrying a dead
        // side shoot, and crown limbs at 14–19.
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = stem(&mut t, 20);
        let dead = metamer(&mut t, trunk[1] as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        let b = bud(&mut t, dead, slot::MAIN, 0.0, 1.0);
        t.b.state[b] = crate::tree::bud::TERMINATED;
        let low = metamer(&mut t, trunk[4] as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        let side = metamer(&mut t, low as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        bud(&mut t, side, slot::MAIN, 0.0, 1.0);
        for &k in &trunk[13..19] {
            let limb = metamer(&mut t, k as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
            bud(&mut t, limb, slot::MAIN, 0.0, 1.0);
        }
        let m = tree_metrics(&t, None);
        assert_eq!(m.get("boleHeight"), 2.0);
        assert_eq!(m.get("liveCrownBase"), 0.25);
    }

    #[test]
    fn the_top_fifth_and_the_bottom_sixth_hold_their_share_of_the_leaf() {
        // A 20-cell trunk; a one-bud twig with its leaf at 2; one-bud limbs with their leaf at
        // 14–19. Above 0.8 H = 16: the limbs at 16–19, 4 of 7. Below H/6 ≈ 3.3: the twig, 1 of 7.
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = stem(&mut t, 20);
        let twig = metamer(&mut t, trunk[1] as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
        bud(&mut t, twig, slot::MAIN, 0.0, 1.0);
        for &k in &trunk[13..19] {
            let limb = metamer(&mut t, k as i32, RIGHT, 0.0, 1.0, 0.01, 0.0);
            bud(&mut t, limb, slot::MAIN, 0.0, 1.0);
        }
        let m = tree_metrics(&t, None);
        assert!((m.get("topFifthLeaf") - 4.0 / 7.0).abs() < 1e-12);
        assert!((m.get("leafBelowSixth") - 1.0 / 7.0).abs() < 1e-12);
        // A tree with no leaf has no shares.
        let mut bare = Tree::new(0, 10.0, 0.5);
        stem(&mut bare, 5);
        assert!(tree_metrics(&bare, None).get("topFifthLeaf").is_nan());
    }

    /// A horizontal limb of `length` off trunk node `at`, to the right (+x) or the left, with `n`
    /// active buds at its tip.
    fn leafy_limb(t: &mut Tree, at: usize, right: bool, length: f64, n: usize) -> usize {
        let angle = if right { 0.0 } else { std::f64::consts::PI };
        let limb = metamer(t, at as i32, RIGHT, angle, length, 0.01, 0.0);
        for s in 0..n {
            bud(t, limb, (s % 8) as u8, 0.0, 1.0);
        }
        limb
    }

    /// A 21-cell trunk whose leaf runs from 1 to the top (21): ten leafy buds each side at 1
    /// (half-width 1), at 6 (half-width 5) and at 18 (half-width 3).
    fn outlined() -> Tree {
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = stem(&mut t, 21);
        for (node, reach) in [(0, 1.0), (5, 5.0), (17, 3.0)] {
            leafy_limb(&mut t, trunk[node], true, reach, 10);
            leafy_limb(&mut t, trunk[node], false, reach, 10);
        }
        t
    }

    #[test]
    fn w90_is_the_outline_width_near_the_top_over_the_widest() {
        // The crown runs from its leaf base (1) to the top (21) in 20 slices of one cell. The
        // widest slice (y 6) is 10 wide; slice 17, y 18–19, is 6 wide.
        let m = tree_metrics(&outlined(), None);
        assert_eq!(m.get("height"), 21.0);
        assert!((m.get("w90") - 0.6).abs() < 1e-12, "{}", m.get("w90"));
        // Nothing in slice 17: the top is empty, w90 0.
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = stem(&mut t, 21);
        for (node, reach) in [(0, 1.0), (5, 5.0), (14, 3.0)] {
            leafy_limb(&mut t, trunk[node], true, reach, 10);
            leafy_limb(&mut t, trunk[node], false, reach, 10);
        }
        assert_eq!(tree_metrics(&t, None).get("w90"), 0.0);
        // No slice holds 20 leafy buds: no widest slice to measure against.
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = stem(&mut t, 21);
        leafy_limb(&mut t, trunk[5], true, 5.0, 4);
        assert!(tree_metrics(&t, None).get("w90").is_nan());
    }

    #[test]
    fn a_season_s_new_metamers_carry_the_season_before_the_world_s_count() {
        // The metrics run after World::step, which counts the season after running it.
        let mut world = World::new(crate::testing::preset("bh", "{}"));
        world.run(8, &[]);
        let t = &world.trees[0];
        let born = |s: f64| {
            (0..t.m.len())
                .filter(|&i| t.m.birth_season[i] as f64 == s)
                .count()
        };
        assert!(born(world.season - 1.0) > 0);
        assert_eq!(born(world.season), 0);
    }

    #[test]
    fn the_upper_flank_share_counts_this_season_s_new_metamers_between_30_and_60_degrees() {
        // The outlined crown's frame: centre 11, half-depth 10, half-width 5 (the 95th percentile
        // of |dx|). Four metamers grown this season end at (u, v): (0.6, 0.6) in the flank shell,
        // (1, 0) on the side, (0, 0.9) on top and (0.3, 0.3) inside the flank's angle but not in
        // its shell: 1 of 4.
        let mut world = World::new(crate::testing::preset("bh", "{}"));
        world.season = 6.0;
        let mut t = outlined();
        for (node, angle, length) in [
            (16, 0.0, 3.0),
            (10, 0.0, 5.0),
            (18, UP, 1.0),
            (13, 0.0, 1.5),
        ] {
            metamer(&mut t, node as i32, RIGHT, angle, length, 0.01, 5.0);
        }
        let m = tree_metrics(&t, Some(&world));
        assert_eq!(m.get("height"), 21.0);
        assert!(
            (m.get("upperFlankNew") - 0.25).abs() < 1e-12,
            "{}",
            m.get("upperFlankNew")
        );
        // The season after, none of them is new.
        world.season = 7.0;
        assert!(tree_metrics(&t, Some(&world)).get("upperFlankNew").is_nan());
    }

    #[test]
    fn buds_outside_count_live_buds_past_a_bound_but_not_past_a_periodic_side() {
        // The outlined crown spans x 5–15 and y 0–21 about its root at x 10, z 0.5; its ten
        // right-hand buds on the widest limb sit at x 15.
        let world = |w: &str| {
            World::new(crate::testing::preset(
                "bh",
                &format!(r#"{{"world":{{"width":{w},"height":30,"walls":[]}}}}"#),
            ))
        };
        let t = outlined();
        assert_eq!(tree_metrics(&t, Some(&world("30"))).get("budsOutside"), 0.0);
        assert_eq!(
            tree_metrics(&t, Some(&world("14"))).get("budsOutside"),
            10.0
        );
        // Above the world's height: the ten buds each side at 18.
        let low = World::new(crate::testing::preset(
            "bh",
            r#"{"world":{"width":30,"height":15,"walls":[]}}"#,
        ));
        assert_eq!(tree_metrics(&t, Some(&low)).get("budsOutside"), 20.0);
        // A periodic width wraps a crown round; it has no bound to cross.
        let round = World::new(crate::testing::preset(
            "bh",
            r#"{"world":{"width":14,"height":30,"walls":[],"sides":"periodic"}}"#,
        ));
        assert!(round.params().world.periodic);
        assert_eq!(tree_metrics(&t, Some(&round)).get("budsOutside"), 0.0);
        // A dead bud past the bound does not count; without a world, there are no bounds.
        let mut dead = outlined();
        let past = leafy_limb(&mut dead, 3, true, 20.0, 1);
        let last = dead.b.len() - 1;
        dead.b.state[last] = crate::tree::bud::GONE;
        assert_eq!(past, dead.m.len() - 1);
        assert_eq!(
            tree_metrics(&dead, Some(&world("30"))).get("budsOutside"),
            0.0
        );
        assert!(tree_metrics(&t, None).get("budsOutside").is_nan());
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
