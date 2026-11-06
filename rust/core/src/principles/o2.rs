//! O2. Wind abrasion and crown shyness (spec §O2, ADR 0013). A leafy bud sways by
//! A = k_sway·Q·h/r cells (at most maxSway); if a cell within A of it in its row (in x and z)
//! holds another tree's foliage, it dies with probability p_abr [RNG: abrasion, keyed by tree,
//! bud and season]. The owner grid is the slab's, W × H × D.
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

/// The owner grid's shape: W × H × D cells, index (row·D + layer)·W + col (the slab's layout).
#[derive(Clone, Copy, Debug)]
pub struct Grid {
    pub w: f64,
    pub h: f64,
    pub d: f64,
    pub periodic: bool,
}

impl Grid {
    pub fn of(params: &Params) -> Grid {
        Grid {
            w: params.world.width,
            h: params.world.height,
            d: crate::light::depth_of(params),
            periodic: params.world.periodic,
        }
    }

    /// The cell at whole-cell coordinates, x wrapped on a ring; None outside.
    pub fn index(&self, col: f64, row: f64, layer: f64) -> Option<usize> {
        let col = if self.periodic {
            ((col % self.w) + self.w) % self.w
        } else {
            col
        };
        if col < 0.0
            || col >= self.w
            || row < 0.0
            || row >= self.h
            || layer < 0.0
            || layer >= self.d
        {
            return None;
        }
        Some(((row * self.d + layer) * self.w + col) as usize)
    }
}

pub fn tag_owner(
    owner: &mut [i32],
    (w, d): (usize, usize),
    (col, row, layer): (usize, usize, usize),
    id: i32,
) {
    let c = (row * d + layer) * w + col;
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

/// Kills leafy buds of `tree` that sway into another tree's foliage. Returns buds lost. A bud
/// sways in the horizontal plane: any cell of its row within A of it, in x and z, counts.
pub fn abrade(tree: &mut Tree, owner: &[i32], grid: &Grid, params: &Params, season: f64) -> f64 {
    let o2 = &params.o2;
    let mut lost = 0.0;
    for j in 0..tree.b.len() {
        let state = tree.b.state[j];
        if !is_live_bud(state) || state == bud::DORMANT {
            continue;
        }
        let m = tree.b.metamer[j] as usize;
        let [x, y, z] = tree.tip(m);
        let row = y.floor();
        if row < 0.0 || row >= grid.h {
            continue;
        }
        let a = sway_of(tree.b.q[j], y, tree.m.radius[m], o2);
        if a <= 0.0 {
            continue;
        }
        let mut touches = false;
        let mut layer = (z - a).floor();
        while layer <= (z + a).floor() && !touches {
            let mut col = (x - a).floor();
            while col <= (x + a).floor() && !touches {
                if let Some(c) = grid.index(col, row, layer) {
                    let o = owner[c];
                    touches = o != EMPTY && o as f64 != tree.id as f64;
                }
                col += 1.0;
            }
            layer += 1.0;
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
        // A 2 × 1 × 2 grid: index (row·D + layer)·W + col.
        let mut owner = [EMPTY; 4];
        tag_owner(&mut owner, (2, 2), (0, 0, 0), 5);
        tag_owner(&mut owner, (2, 2), (0, 0, 0), 5);
        tag_owner(&mut owner, (2, 2), (1, 0, 1), 5);
        tag_owner(&mut owner, (2, 2), (1, 0, 1), 6);
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
        let grid = Grid::of(&params);
        let (cw, cd) = (grid.w as usize, grid.d as usize);
        let cells = cw * grid.h as usize * cd;
        let [x, y, z] = tree.tip(0);
        let at = (x.floor() as usize, y.floor() as usize, z.floor() as usize);
        let mut own = vec![EMPTY; cells];
        tag_owner(&mut own, (cw, cd), at, tree.id as i32); // a seedling sways ≈ 0.05 cells
        assert_eq!(abrade(tree, &own, &grid, &params, 0.0), 0.0);
        let mut other = vec![EMPTY; cells];
        tag_owner(&mut other, (cw, cd), at, 7);
        let n = tree.b.len() as f64;
        assert_eq!(abrade(tree, &other, &grid, &params, 0.0), n);
        assert_eq!(tree.b.state[0], bud::GONE);
    }
}
