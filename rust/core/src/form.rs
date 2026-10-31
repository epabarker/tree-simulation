//! Crown form and allometry (M26; form.ts): the crown's width profile, apical control, branch
//! angles by order, limb droop, Δ, the length–diameter and leaf–section slopes. The CLI writes
//! them at snapshot seasons (form.csv). Reads the tables only.

use crate::math;
use crate::params::Params;
use crate::principles::c3::is_live_bud;
use crate::principles::c6::junction_exponents;
use crate::principles::r6::deposit_area;
use crate::tree::{Metamers, Tree, slot};

pub const PROFILE_BANDS: usize = 10;
const FORK_RATIO: f64 = 0.7;
const MIN_SUBTREE: i32 = 5;
const MIN_LIMB: usize = 10;
const PI: f64 = std::f64::consts::PI;

/// form.csv's columns (FORM_COLUMNS), then p0…p9.
pub const FORM_COLUMNS: [&str; 11] = [
    "widestAt",
    "profileCentre",
    "crownFullness",
    "forkHeight",
    "leaderDominance",
    "branchAngle2",
    "limbDroop",
    "limbUpturn",
    "junctionDelta",
    "ldSlope",
    "leafStemSlope",
];

pub struct FormMetrics {
    /// In FORM_COLUMNS order.
    pub values: [f64; 11],
    pub profile: Vec<f64>,
}

/// Elevation of metamer `i`'s heading above the horizontal, degrees.
fn elevation(c: &Metamers, i: usize) -> f64 {
    (math::atan2(c.hy[i], math::hypot(c.hx[i], c.hz[i])) * 180.0) / PI
}

/// Metamer `i`'s heading from vertical, degrees.
fn from_vertical(c: &Metamers, i: usize) -> f64 {
    math::acos(math::max(-1.0, math::min(1.0, c.hy[i]))) * (180.0 / PI)
}

/// The median (NaN of none), as form.ts sorts: ascending, stable.
pub fn median(xs: &[f64]) -> f64 {
    if xs.is_empty() {
        return f64::NAN;
    }
    let mut s = xs.to_vec();
    s.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let k = s.len() >> 1;
    if !s.len().is_multiple_of(2) {
        s[k]
    } else {
        (s[k - 1] + s[k]) / 2.0
    }
}

/// OLS slope of y on x; NaN with fewer than 5 points or no spread in x.
pub fn ols_slope(x: &[f64], y: &[f64]) -> f64 {
    let n = x.len();
    if n < 5 {
        return f64::NAN;
    }
    let (mut mx, mut my) = (0.0, 0.0);
    for i in 0..n {
        mx += x[i];
        my += y[i];
    }
    mx /= n as f64;
    my /= n as f64;
    let (mut sxy, mut sxx) = (0.0, 0.0);
    for i in 0..n {
        let dx = x[i] - mx;
        sxy += dx * (y[i] - my);
        sxx += dx * dx;
    }
    if sxx > 1e-12 { sxy / sxx } else { f64::NAN }
}

/// Per first-order limb of ≥ 10 metamers: (droop, upturn), degrees.
pub fn limb_shapes(tree: &Tree) -> Vec<(f64, f64)> {
    let c = &tree.m;
    let mut axes: Vec<(i32, Vec<f64>)> = Vec::new();
    let mut index = std::collections::HashMap::new();
    for i in 0..c.len() {
        if c.order[i] != 1 {
            continue;
        }
        let k = *index.entry(c.axis[i]).or_insert_with(|| {
            axes.push((c.axis[i], Vec::new()));
            axes.len() - 1
        });
        axes[k].1.push(elevation(c, i));
    }
    axes.into_iter()
        .filter(|(_, e)| e.len() >= MIN_LIMB)
        .map(|(_, e)| {
            let low = e.iter().fold(f64::INFINITY, |a, &b| math::min(a, b));
            (e[0] - low, e[e.len() - 1] - low)
        })
        .collect()
}

/// The crown's width in `bands` height bands from the crown base to the top, over the widest.
///
/// A band's width is the larger of its tips' extents in x and in z: a 3D crown is read in both
/// horizontal axes (the species plan of 2026-10-30, step 1b), and the larger is not capped by the
/// slab's depth (a lone beech's band extents in z saturate at 52–66 against a depth of 64 by season
/// 60, where its x extents run to 93).
pub fn crown_profile(tree: &Tree, bands: usize) -> Vec<f64> {
    let nm = tree.m.len();
    let c = &tree.m;
    let mut height = 0.0;
    let mut bole = f64::INFINITY;
    for i in 0..nm {
        let y = tree.tip_y(i);
        if y > height {
            height = y;
        }
        let p = c.parent[i];
        if c.order[i] == 1 && p >= 0 && c.order[p as usize] == 0 && c.base_y[i] < bole {
            bole = c.base_y[i];
        }
    }
    if !bole.is_finite() || bole >= height {
        bole = 0.0;
    }
    let mut lo = vec![f64::INFINITY; bands];
    let mut hi = vec![f64::NEG_INFINITY; bands];
    let mut near = vec![f64::INFINITY; bands];
    let mut far = vec![f64::NEG_INFINITY; bands];
    let span = height - bole;
    let mut i = 0;
    while i < nm && span > 0.0 {
        let y = tree.tip_y(i);
        if y >= bole {
            let k = math::min(
                bands as f64 - 1.0,
                (((y - bole) / span) * bands as f64).floor(),
            ) as usize;
            let x = tree.tip_x(i);
            if x < lo[k] {
                lo[k] = x;
            }
            if x > hi[k] {
                hi[k] = x;
            }
            let z = tree.tip_z(i);
            if z < near[k] {
                near[k] = z;
            }
            if z > far[k] {
                far[k] = z;
            }
        }
        i += 1;
    }
    let mut widths = Vec::with_capacity(bands);
    let mut widest = 0.0;
    for k in 0..bands {
        let wx = if hi[k] > lo[k] { hi[k] - lo[k] } else { 0.0 };
        let wz = if far[k] > near[k] {
            far[k] - near[k]
        } else {
            0.0
        };
        let w = math::max(wx, wz);
        widths.push(w);
        if w > widest {
            widest = w;
        }
    }
    widths
        .into_iter()
        .map(|w| if widest > 0.0 { w / widest } else { 0.0 })
        .collect()
}

pub fn form_metrics(tree: &Tree, params: &Params) -> FormMetrics {
    let nm = tree.m.len();
    let c = &tree.m;
    let profile = crown_profile(tree, PROFILE_BANDS);
    let mut widest_at = f64::NAN;
    let (mut sum_w, mut sum_wh, mut best) = (0.0, 0.0, -1.0);
    for (k, &w) in profile.iter().enumerate() {
        let h = (k as f64 + 0.5) / profile.len() as f64;
        sum_w += w;
        sum_wh += w * h;
        if w > best {
            best = w;
            widest_at = h;
        }
    }

    let mut count = vec![0i32; nm];
    // The highest tip in each metamer's subtree: a fork's lateral climbs with the trunk.
    let mut top: Vec<f64> = (0..nm).map(|i| tree.tip_y(i)).collect();
    let mut leaf = vec![0.0f64; nm];
    let mut dist = vec![0.0f64; nm];
    let mut reach = vec![0.0f64; nm];
    for i in 0..nm {
        let p = c.parent[i];
        dist[i] = (if p >= 0 { dist[p as usize] } else { 0.0 }) + c.length[i];
    }
    let b = &tree.b;
    for j in 0..b.len() {
        if is_live_bud(b.state[j]) {
            leaf[b.metamer[j] as usize] += deposit_area(b.state[j], &params.r6);
        }
    }
    for i in (0..nm).rev() {
        count[i] += 1;
        if dist[i] > reach[i] {
            reach[i] = dist[i];
        }
        let p = c.parent[i];
        if p < 0 {
            continue;
        }
        let p = p as usize;
        count[p] += count[i];
        top[p] = math::max(top[p], top[i]);
        leaf[p] += leaf[i];
        if reach[i] > reach[p] {
            reach[p] = reach[i];
        }
    }

    let mut main_child = vec![-1i32; nm];
    let mut thickest = vec![0.0f64; nm];
    let mut any_lateral = vec![false; nm];
    let mut height = 0.0;
    let mut bole = f64::INFINITY;
    for i in 0..nm {
        let y = tree.tip_y(i);
        if y > height {
            height = y;
        }
        let p = c.parent[i];
        if p < 0 {
            continue;
        }
        let p = p as usize;
        if c.slot[i] == slot::MAIN {
            main_child[p] = i as i32;
        } else {
            any_lateral[p] = true;
            if count[i] >= MIN_SUBTREE && c.radius[i] > thickest[p] {
                thickest[p] = c.radius[i];
            }
        }
        if c.order[i] == 1 && c.order[p] == 0 && c.base_y[i] < bole {
            bole = c.base_y[i];
        }
    }
    if !bole.is_finite() {
        bole = height;
    }
    // A true division of the trunk (the species plan, step 1b): a lateral of at least FORK_RATIO of
    // the continuing trunk's radius that also climbs at least FORK_RATIO of the height the trunk
    // climbs above the node. In 3D a basal limb of a lone beech reaches 0.74 of the trunk's radius
    // and spreads sideways while the leader runs on unbroken to the top: by radius alone the tree
    // read as forked at 0.014 of its height.
    let mut divides = vec![false; nm];
    for i in 0..nm {
        let p = c.parent[i];
        if p < 0 || c.slot[i] == slot::MAIN || count[i] < MIN_SUBTREE {
            continue;
        }
        let p = p as usize;
        let next = main_child[p];
        if next < 0 {
            continue;
        }
        let nx = next as usize;
        let y = tree.tip_y(p);
        if c.radius[i] >= FORK_RATIO * c.radius[nx] && top[i] - y >= FORK_RATIO * (top[nx] - y) {
            divides[p] = true;
        }
    }

    let mut fork_height = 1.0;
    let mut dominance = Vec::new();
    let mut i: i32 = if nm > 0 { 0 } else { -1 };
    while i >= 0 {
        let iu = i as usize;
        let next = main_child[iu];
        let y = tree.tip_y(iu);
        if next < 0 || c.order[next as usize] != 0 {
            if any_lateral[iu] && fork_height == 1.0 && height > 0.0 {
                fork_height = y / height;
            }
            break;
        }
        let nx = next as usize;
        if divides[iu] && fork_height == 1.0 && height > 0.0 {
            fork_height = y / height;
        }
        if thickest[iu] > 0.0 && y >= bole {
            dominance.push(c.radius[nx] / thickest[iu]);
        }
        i = next;
    }

    let (mut log_d, mut log_l) = (Vec::new(), Vec::new());
    let (mut angle2, mut n2) = (0.0, 0.0);
    for i in 0..nm {
        let p = c.parent[i];
        if p < 0 || c.slot[i] == slot::MAIN {
            continue;
        }
        let p = p as usize;
        if c.order[i] == 2 && c.order[p] == 1 {
            angle2 += from_vertical(c, i);
            n2 += 1.0;
        }
        if (c.order[i] == 1 || c.order[i] == 2) && count[i] >= MIN_SUBTREE && c.radius[i] > 0.0 {
            log_d.push(math::ln(2.0 * c.radius[i]));
            log_l.push(math::ln(reach[i] - dist[p]));
        }
    }

    let (mut log_a, mut log_leaf) = (Vec::new(), Vec::new());
    for i in 0..nm {
        let r = c.radius[i] - c.stress_wood[i];
        if count[i] < MIN_SUBTREE || leaf[i] <= 0.0 || r <= 0.0 {
            continue;
        }
        log_a.push(math::ln(PI * r * r));
        log_leaf.push(math::ln(leaf[i]));
    }

    let shapes = limb_shapes(tree);
    let droops: Vec<f64> = shapes.iter().map(|s| s.0).collect();
    let upturns: Vec<f64> = shapes.iter().map(|s| s.1).collect();
    let mut deltas = Vec::new();
    junction_exponents(tree, &mut deltas);
    let n = profile.len() as f64;
    FormMetrics {
        values: [
            widest_at,
            if sum_w > 0.0 {
                sum_wh / sum_w
            } else {
                f64::NAN
            },
            if n > 0.0 { sum_w / n } else { f64::NAN },
            fork_height,
            median(&dominance),
            if n2 > 0.0 { angle2 / n2 } else { f64::NAN },
            median(&droops),
            median(&upturns),
            median(&deltas),
            ols_slope(&log_d, &log_l),
            ols_slope(&log_a, &log_leaf),
        ],
        profile,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::principles::c6::update_girth;
    use crate::testing::preset;
    use crate::testing::{LEFT, RIGHT, bud, metamer};

    const UP: f64 = std::f64::consts::FRAC_PI_2;

    fn params() -> Params {
        Params::from_json(&preset("default", r#"{"c6":{"enabled":true}}"#))
    }

    fn get(f: &FormMetrics, name: &str) -> f64 {
        f.values[FORM_COLUMNS.iter().position(|&n| n == name).unwrap()]
    }

    /// A trunk of `n` unit metamers with horizontal laterals of length `len(k)` either side at node k.
    fn crown(n: usize, len: impl Fn(usize) -> f64) -> Tree {
        let mut t = Tree::new(0, 50.0, 0.5);
        let mut trunk = Vec::new();
        for k in 0..n {
            let parent = if k == 0 { -1 } else { trunk[k - 1] as i32 };
            trunk.push(metamer(&mut t, parent, slot::MAIN, UP, 1.0, 1.0, 0.0));
        }
        for k in 0..n - 1 {
            let l = len(k + 1);
            metamer(&mut t, trunk[k] as i32, LEFT, PI, l, 0.1, 0.0);
            metamer(&mut t, trunk[k] as i32, RIGHT, 0.0, l, 0.1, 0.0);
        }
        t
    }

    /// A straight chain of `n` metamers from `parent`, its first of radius `r`, the rest r/2.
    fn chain(t: &mut Tree, parent: usize, s: u8, angle: f64, n: usize, r: f64) -> usize {
        let mut m = metamer(t, parent as i32, s, angle, 1.0, r, 0.0);
        let first = m;
        for _ in 1..n {
            m = metamer(t, m as i32, slot::MAIN, angle, 1.0, r * 0.5, 0.0);
        }
        first
    }

    fn height(t: &Tree) -> f64 {
        (0..t.m.len()).map(|i| t.tip_y(i)).fold(f64::MIN, f64::max)
    }

    #[test]
    fn tells_a_column_from_a_cone_and_an_inverted_cone() {
        let p = params();
        let column = form_metrics(&crown(20, |_| 5.0), &p);
        let cone = form_metrics(&crown(20, |k| 20.0 - k as f64), &p);
        let vase = form_metrics(&crown(20, |k| k as f64), &p);
        assert!(get(&column, "crownFullness") > 0.85);
        assert!((get(&column, "profileCentre") - 0.5).abs() < 0.05);
        assert!(get(&cone, "widestAt") < 0.2);
        assert!(get(&cone, "profileCentre") < 0.42);
        assert!(get(&cone, "crownFullness") < 0.65);
        assert!(get(&vase, "widestAt") > 0.8);
        assert!(get(&vase, "profileCentre") > 0.58);
        let prof = crown_profile(&crown(20, |k| 20.0 - k as f64), PROFILE_BANDS);
        assert_eq!(prof.iter().cloned().fold(0.0, f64::max), 1.0);
        assert!(prof.iter().all(|&w| (0.0..=1.0).contains(&w)));
    }

    /// A metamer from `parent` heading `h` (unit), its reference any unit vector ⟂ h.
    fn heading(t: &mut Tree, parent: usize, s: u8, h: [f64; 3], len: f64) -> usize {
        let l = if h[1].abs() < 0.9 {
            [0.0, 1.0, 0.0]
        } else {
            [1.0, 0.0, 0.0]
        };
        let l = {
            let d = l[0] * h[0] + l[1] * h[1] + l[2] * h[2];
            let v = [l[0] - d * h[0], l[1] - d * h[1], l[2] - d * h[2]];
            let n = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
            [v[0] / n, v[1] / n, v[2] / n]
        };
        crate::principles::c1::add_metamer(t, parent as i32, s, h, l, 0.0, len, 0.1, 0.0)
    }

    #[test]
    fn reads_a_crown_that_spreads_in_depth() {
        // The cone of `crown`, its laterals turned from ±x to ±z: the same profile, read in z.
        let mut t = Tree::new(0, 50.0, 0.5);
        let mut trunk = Vec::new();
        for k in 0..20 {
            let parent = if k == 0 { -1 } else { trunk[k - 1] as i32 };
            trunk.push(metamer(&mut t, parent, slot::MAIN, UP, 1.0, 1.0, 0.0));
        }
        for k in 0..19 {
            let l = 20.0 - (k + 1) as f64;
            heading(&mut t, trunk[k], LEFT, [0.0, 0.0, -1.0], l);
            heading(&mut t, trunk[k], RIGHT, [0.0, 0.0, 1.0], l);
        }
        let deep = crown_profile(&t, PROFILE_BANDS);
        let flat = crown_profile(&crown(20, |k| 20.0 - k as f64), PROFILE_BANDS);
        for (a, b) in deep.iter().zip(&flat) {
            assert!((a - b).abs() < 1e-9, "{deep:?} against {flat:?}");
        }
        assert!(get(&form_metrics(&t, &params()), "widestAt") < 0.2);
    }

    #[test]
    fn a_thick_basal_limb_that_spreads_sideways_is_not_a_fork() {
        // A lateral at node 1 as thick as a fork's (0.8 of the trunk), running out level for 12
        // metamers while the trunk climbs 20: the leader keeps its lead.
        let mut t = Tree::new(0, 50.0, 0.5);
        let mut m: i32 = -1;
        for k in 0..20 {
            m = metamer(&mut t, m, slot::MAIN, UP, 1.0, 1.0, 0.0) as i32;
            if k == 1 {
                chain(&mut t, m as usize, RIGHT, 0.1, 12, 0.8);
            }
        }
        let f = form_metrics(&t, &params());
        assert_eq!(get(&f, "forkHeight"), 1.0);
        assert!((get(&f, "leaderDominance") - 1.0 / 0.8).abs() < 1e-9);
    }

    fn forked(r: f64) -> Tree {
        let mut t = Tree::new(0, 50.0, 0.5);
        let mut m: i32 = -1;
        for k in 0..10 {
            m = metamer(&mut t, m, slot::MAIN, UP, 1.0, 1.0, 0.0) as i32;
            if k == 4 {
                chain(&mut t, m as usize, RIGHT, UP - 0.4, 6, r);
            }
        }
        t
    }

    #[test]
    fn finds_the_fork_where_a_limb_reaches_0_7_of_the_leader() {
        let p = params();
        let decurrent = forked(0.8);
        let f = form_metrics(&decurrent, &p);
        assert!((get(&f, "forkHeight") - 5.0 / height(&decurrent)).abs() < 1e-9);
        assert!((get(&f, "leaderDominance") - 1.0 / 0.8).abs() < 1e-9);
        let excurrent = form_metrics(&forked(0.3), &p);
        assert_eq!(get(&excurrent, "forkHeight"), 1.0);
        assert!((get(&excurrent, "leaderDominance") - 1.0 / 0.3).abs() < 1e-9);
    }

    #[test]
    fn a_trunk_ending_under_its_laterals_is_a_fork() {
        let mut t = Tree::new(0, 50.0, 0.5);
        let mut m: i32 = -1;
        for _ in 0..4 {
            m = metamer(&mut t, m, slot::MAIN, UP, 1.0, 1.0, 0.0) as i32;
        }
        chain(&mut t, m as usize, LEFT, UP + 0.5, 6, 0.6);
        chain(&mut t, m as usize, RIGHT, UP - 0.5, 6, 0.6);
        let f = form_metrics(&t, &params());
        assert!((get(&f, "forkHeight") - 4.0 / height(&t)).abs() < 1e-9);
    }

    #[test]
    fn recovers_a_length_diameter_slope_of_two_thirds() {
        let mut t = Tree::new(0, 50.0, 0.5);
        let mut m: i32 = -1;
        for k in 0..12 {
            m = metamer(&mut t, m, slot::MAIN, UP, 1.0, 5.0, 0.0) as i32;
            let n = 5 + k; // limb length n, base diameter ∝ n^(3/2)
            let (s, a) = if k % 2 == 0 { (LEFT, PI) } else { (RIGHT, 0.0) };
            chain(&mut t, m as usize, s, a, n, 0.01 * (n as f64).powf(1.5));
        }
        let f = form_metrics(&t, &params());
        assert!((get(&f, "ldSlope") - 2.0 / 3.0).abs() < 1e-9);
    }

    #[test]
    fn a_pipe_model_tree_has_leaf_section_slope_1_and_delta_2() {
        let p = params();
        let mut t = Tree::new(0, 50.0, 0.5);
        fn grow(t: &mut Tree, parent: i32, angle: f64, depth: u32) {
            let main = metamer(t, parent, slot::MAIN, angle, 1.0, 0.0, 0.0);
            if depth == 0 {
                bud(t, main, slot::MAIN, angle, 1.0);
                return;
            }
            grow(t, main as i32, angle + 0.3, depth - 1);
            let side = metamer(t, main as i32, RIGHT, angle - 0.5, 1.0, 0.0, 0.0);
            grow(t, side as i32, angle - 0.5, depth - 1);
        }
        grow(&mut t, -1, UP, 6);
        t.ensure_scratch();
        update_girth(&mut t, &p);
        let f = form_metrics(&t, &p);
        assert!((get(&f, "leafStemSlope") - 1.0).abs() < 1e-9);
        assert!((get(&f, "junctionDelta") - p.c6.n).abs() < 1e-6);
    }

    #[test]
    fn fits_a_least_squares_slope_and_refuses_too_few_points() {
        assert!(
            (ols_slope(&[1.0, 2.0, 3.0, 4.0, 5.0], &[3.0, 5.0, 7.0, 9.0, 11.0]) - 2.0).abs()
                < 1e-12
        );
        assert!(ols_slope(&[1.0, 2.0, 3.0], &[1.0, 2.0, 3.0]).is_nan());
        assert!(ols_slope(&[1.0; 5], &[1.0, 2.0, 3.0, 4.0, 5.0]).is_nan());
    }
}
