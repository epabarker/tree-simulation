//! O2. Wind abrasion and crown shyness (spec §O2, ADR 0013; o2-shyness.ts). A leafy bud sways by
//! A = k_sway·Q·h/r cells (at most maxSway); if a cell within A in its row holds another tree's
//! foliage, it dies with probability p_abr [RNG: abrasion, keyed by tree, bud and season].
//!
//! Params: o2.enabled, o2.sway, o2.maxSway, o2.pAbr.

use super::c3::is_live_bud;
use crate::math;
use crate::params::{O2, Params};
use crate::rng::{purpose, uniform};
use crate::tree::{Tree, bud};

/// Owner tag of a cell holding foliage of more than one tree.
pub const SHARED: i32 = -2;
/// Owner tag of a cell without foliage.
pub const EMPTY: i32 = -1;

pub fn tag_owner(owner: &mut [i32], w: usize, col: usize, row: usize, id: i32) {
    let c = row * w + col;
    let o = owner[c];
    owner[c] = if o == EMPTY || o == id { id } else { SHARED };
}

pub fn sway_of(q: f64, h: f64, r: f64, o2: &O2) -> f64 {
    if r > 0.0 {
        math::min(o2.max_sway, (o2.sway * q * math::max(0.0, h)) / r)
    } else {
        0.0
    }
}

/// Kills leafy buds of `tree` that sway into another tree's foliage. Returns buds lost.
pub fn abrade(
    tree: &mut Tree,
    owner: &[i32],
    w: f64,
    h: f64,
    periodic: bool,
    params: &Params,
    season: f64,
) -> f64 {
    let o2 = &params.o2;
    let mut lost = 0.0;
    for j in 0..tree.b.len() {
        let state = tree.b.state[j];
        if !is_live_bud(state) || state == bud::DORMANT {
            continue;
        }
        let m = tree.b.metamer[j] as usize;
        let x = tree.tip_x(m);
        let y = tree.tip_y(m);
        let row = y.floor();
        if row < 0.0 || row >= h {
            continue;
        }
        let a = sway_of(tree.b.q[j], y, tree.m.radius[m], o2);
        if a <= 0.0 {
            continue;
        }
        let mut touches = false;
        let mut col = (x - a).floor();
        while col <= (x + a).floor() && !touches {
            let k = if periodic { ((col % w) + w) % w } else { col };
            col += 1.0;
            if k < 0.0 || k >= w {
                continue;
            }
            let o = owner[(row * w + k) as usize];
            touches = o != EMPTY && o as f64 != tree.id as f64;
        }
        if !touches {
            continue;
        }
        let birth = tree.b.birth_id[j] as f64;
        if uniform(
            params.seed,
            purpose::ABRASION,
            tree.id as f64,
            birth,
            season,
            0.0,
        ) < o2.p_abr
        {
            tree.b.state[j] = bud::GONE;
            lost += 1.0;
        }
    }
    lost
}
