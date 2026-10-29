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

#[cfg(test)]
mod tests {
    use super::*;

    fn o2() -> O2 {
        O2 {
            enabled: true,
            sway: 0.001,
            max_sway: 3.0,
            p_abr: 1.0,
            ..crate::testing::params("default").o2
        }
    }

    #[test]
    fn tags_cells_by_owner_marking_shared_ones() {
        let mut owner = [EMPTY; 4];
        tag_owner(&mut owner, 2, 0, 0, 5);
        tag_owner(&mut owner, 2, 0, 0, 5);
        tag_owner(&mut owner, 2, 1, 1, 5);
        tag_owner(&mut owner, 2, 1, 1, 6);
        assert_eq!(owner, [5, EMPTY, EMPTY, SHARED]);
    }

    #[test]
    fn sways_k_q_h_over_r_capped() {
        assert!((sway_of(0.5, 40.0, 0.02, &o2()) - 1.0).abs() < 1e-12);
        assert_eq!(sway_of(1.0, 1000.0, 0.02, &o2()), 3.0);
        assert_eq!(sway_of(1.0, 10.0, 0.0, &o2()), 0.0);
    }

    #[test]
    fn kills_a_leafy_bud_that_sways_into_another_trees_foliage_not_its_own() {
        let mut w = crate::principles::o4::tests::world(
            r#"{"c6":{"enabled":true},"o2":{"enabled":true,"sway":0.001,"maxSway":3,"pAbr":1}}"#,
        );
        let params = w.rules.params.clone();
        let tree = &mut w.trees[0];
        for j in 0..tree.b.len() {
            tree.b.q[j] = 1.0;
        }
        let (cw, ch) = (100usize, 50usize);
        let x = tree.tip_x(0).floor() as usize;
        let row = tree.tip_y(0).floor() as usize;
        let mut own = vec![EMPTY; cw * ch];
        tag_owner(&mut own, cw, x, row, tree.id as i32); // a seedling sways ≈ 0.05 cells
        assert_eq!(abrade(tree, &own, 100.0, 50.0, false, &params, 0.0), 0.0);
        let mut other = vec![EMPTY; cw * ch];
        tag_owner(&mut other, cw, x, row, 7);
        let n = tree.b.len() as f64;
        assert_eq!(abrade(tree, &other, 100.0, 50.0, false, &params, 0.0), n);
        assert_eq!(tree.b.state[0], bud::GONE);
    }
}
