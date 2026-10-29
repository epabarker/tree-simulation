//! Crown form and allometry (M26; form.ts): the crown's width profile, apical control, branch
//! angles by order, limb droop, Δ, the length–diameter and leaf–section slopes. The CLI writes
//! them at snapshot seasons (form.csv). Reads the tables only.

use crate::math;
use crate::params::Params;
use crate::principles::c3::is_live_bud;
use crate::principles::c6::junction_exponents;
use crate::principles::r6::deposit_area;
use crate::tree::{Tree, slot};

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

fn elevation(a: f64) -> f64 {
    (math::atan2(math::sin(a), math::cos(a).abs()) * 180.0) / PI
}

fn from_vertical(a: f64) -> f64 {
    math::acos(math::max(-1.0, math::min(1.0, math::sin(a)))) * (180.0 / PI)
}

/// The median (NaN of none), as form.ts sorts: ascending, stable.
pub fn median(xs: &[f64]) -> f64 {
    if xs.is_empty() {
        return f64::NAN;
    }
    let mut s = xs.to_vec();
    s.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let k = s.len() >> 1;
    if s.len() % 2 == 1 {
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
        axes[k].1.push(elevation(c.angle[i]));
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
        }
        i += 1;
    }
    let mut widths = Vec::with_capacity(bands);
    let mut widest = 0.0;
    for k in 0..bands {
        let w = if hi[k] > lo[k] { hi[k] - lo[k] } else { 0.0 };
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
        if thickest[iu] > 0.0 {
            let ratio = thickest[iu] / c.radius[nx];
            if ratio >= FORK_RATIO && fork_height == 1.0 && height > 0.0 {
                fork_height = y / height;
            }
            if y >= bole {
                dominance.push(c.radius[nx] / thickest[iu]);
            }
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
            angle2 += from_vertical(c.angle[i]);
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
