//! C1. Metamer structure, bud fate and the 2D side sequence (spec §C1; c1-buds.ts). New axillary
//! buds take a side from the distichous sequence s_k = s0·(−1)^k [RNG: sideSequence, keyed by
//! axis]; with R2 an axis's generator may place two buds or none. Shoot size follows ADR 0004:
//! v' = min(v, cap), n = ⌊v'⌋, l = v'/n · l0.
//!
//! Params: c1.branchAngle (β), c1.internodeLength (l0), c1.maxMetamersPerShoot, c6.r0; with R2
//! the levels' generator, β and p_term.

use super::obstacles::inside_obstacle;
use super::r2::{branch_angle_of, lateral_count, terminates};
use crate::math;
use crate::params::{DEG, Params};
use crate::rng::{purpose, sign};
use crate::tree::{Tree, bud, slot, store_i32, store_u8};

/// Appends a metamer at `slot` of `parent`'s upper node (parent −1 = root). Returns its index.
pub fn add_metamer(
    tree: &mut Tree,
    parent: i32,
    slot_: u8,
    angle: f64,
    length: f64,
    radius: f64,
    season: f64,
) -> usize {
    let i = tree.m.add();
    let id = tree.next_metamer_id;
    tree.next_metamer_id += 1.0;
    let (bx, by) = if parent < 0 {
        (tree.root_x, 0.0)
    } else {
        (tree.tip_x(parent as usize), tree.tip_y(parent as usize))
    };
    let c = &mut tree.m;
    c.birth_id[i] = store_i32(id);
    c.parent[i] = parent;
    c.slot[i] = slot_;
    if parent < 0 {
        c.axis[i] = store_i32(id);
        c.axis_node[i] = 0;
        c.order[i] = 0;
    } else {
        let p = parent as usize;
        if slot_ == slot::MAIN {
            c.axis[i] = c.axis[p];
            c.axis_node[i] = c.axis_node[p].wrapping_add(1);
            c.order[i] = c.order[p];
        } else {
            c.axis[i] = store_i32(id);
            c.axis_node[i] = 0;
            c.order[i] = c.order[p].wrapping_add(1);
        }
    }
    c.base_x[i] = bx;
    c.base_y[i] = by;
    c.angle[i] = angle;
    c.length[i] = length;
    c.radius[i] = radius;
    c.scar_sum_n[i] = 0.0;
    c.stress_wood[i] = 0.0;
    c.moment[i] = 0.0;
    c.pa_shift[i] = if parent < 0 {
        0
    } else {
        c.pa_shift[parent as usize]
    };
    c.birth_season[i] = store_i32(season);
    i
}

/// Appends a bud at `slot` of metamer `m`'s upper node. Returns its index.
pub fn add_bud(tree: &mut Tree, m: usize, slot_: u8, angle: f64, order: f64) -> usize {
    let i = tree.b.add();
    let id = tree.next_bud_id;
    tree.next_bud_id += 1.0;
    let c = &mut tree.b;
    c.birth_id[i] = store_i32(id);
    c.metamer[i] = m as i32;
    c.slot[i] = slot_;
    c.state[i] = bud::ACTIVE;
    c.age[i] = 0;
    c.order[i] = store_u8(order);
    c.angle[i] = angle;
    i
}

/// Forms the axillary bud(s) of metamer `m` from the side sequence (§C1.4).
pub fn form_axillary_buds(tree: &mut Tree, m: usize, params: &Params, last_of_shoot: bool) {
    let k = tree.m.axis_node[m] as f64;
    let pa = tree.m.order[m] as f64 - tree.m.pa_shift[m] as f64;
    let count = lateral_count(pa, k, last_of_shoot, &params.r2);
    if count == 0 {
        return;
    }
    let order = tree.m.order[m] as f64 + 1.0;
    let beta = branch_angle_of(pa + 1.0, params) * DEG;
    let angle = tree.m.angle[m];
    if count == 2 {
        add_bud(tree, m, slot::LEFT, angle + beta, order);
        add_bud(tree, m, slot::RIGHT, angle - beta, order);
        return;
    }
    let axis = tree.m.axis[m] as f64;
    let s0 = sign(
        params.seed,
        purpose::SIDE_SEQUENCE,
        tree.id as f64,
        axis,
        0.0,
        0.0,
    );
    let side = if k % 2.0 == 0.0 { s0 } else { -s0 };
    if side < 0.0 {
        add_bud(tree, m, slot::LEFT, angle + beta, order);
    } else {
        add_bud(tree, m, slot::RIGHT, angle - beta, order);
    }
}

/// Default direction of a bud at `slot` of metamer `m`'s upper node.
pub fn bud_angle(tree: &Tree, m: usize, slot_: u8, params: &Params) -> f64 {
    let a = tree.m.angle[m];
    if slot_ == slot::MAIN {
        return a;
    }
    let pa = tree.m.order[m] as f64 - tree.m.pa_shift[m] as f64;
    let beta = branch_angle_of(pa + 1.0, params) * DEG;
    if slot_ == slot::LEFT {
        a + beta
    } else {
        a - beta
    }
}

/// Forms the terminal bud of metamer `m`; with R2 it may end (sympodial growth).
pub fn form_terminal_bud(tree: &mut Tree, m: usize, params: &Params, season: f64) {
    let (angle, order) = (tree.m.angle[m], tree.m.order[m] as f64);
    let i = add_bud(tree, m, slot::MAIN, angle, order);
    let pa = order - tree.m.pa_shift[m] as f64;
    let birth = tree.m.birth_id[m] as f64;
    if terminates(pa, tree.id as f64, birth, season, params) {
        tree.b.state[i] = bud::TERMINATED;
    }
}

/// Plants a seedling: one metamer, vertical unless `lean` tilts it (degrees right of vertical).
pub fn plant_seedling(tree: &mut Tree, params: &Params, season: f64, lean: f64) {
    let pi = std::f64::consts::PI;
    let m = add_metamer(
        tree,
        -1,
        slot::MAIN,
        pi / 2.0 - (lean * pi) / 180.0,
        params.c1.internode_length,
        params.c6.r0,
        season,
    );
    form_terminal_bud(tree, m, params, season);
    form_axillary_buds(tree, m, params, true);
}

/// Metamers n and internode length (into `length`) for a bud receiving v (ADR 0004).
pub fn shoot_size(v: f64, params: &Params, length: &mut f64, cap: f64) -> f64 {
    let capped = math::min(v, cap);
    let n = capped.floor();
    if n < 1.0 {
        *length = 0.0;
        return 0.0;
    }
    *length = (capped / n) * params.c1.internode_length;
    n
}

/// The juvenile cap on a shoot (ADR 0022), by the tree's height at the start of the season.
pub fn juvenile_cap(height: f64, params: &Params) -> f64 {
    let max = params.c1.max_metamers_per_shoot;
    let h_j = if params.r2.enabled {
        params.r2.h_j.unwrap_or(0.0)
    } else {
        0.0
    };
    if h_j <= 0.0 || max <= 1.0 {
        return max;
    }
    1.0 + (max - 1.0) * math::min(1.0, height / h_j)
}

/// Grows a shoot of `n` metamers of length `length` from `bud_` (§C1, §C3.4). `direct(tree, prev,
/// bud, birth id)` gives each new metamer's direction. `pa_shift ≥ 0` sets the shoot's
/// reiteration shift (R4); otherwise it inherits its parent's.
#[allow(clippy::too_many_arguments)]
pub fn grow_shoot(
    tree: &mut Tree,
    bud_: usize,
    n: f64,
    length: f64,
    params: &Params,
    season: f64,
    direct: &mut dyn FnMut(&Tree, f64, usize, f64) -> f64,
    pa_shift: f64,
) {
    let mut parent = tree.b.metamer[bud_];
    let mut slot_ = tree.b.slot[bud_];
    let mut angle = tree.b.angle[bud_];
    let state = tree.b.state[bud_];
    tree.b.state[bud_] = bud::GONE;
    let mut j = 0.0;
    while j < n {
        angle = direct(tree, angle, bud_, tree.next_metamer_id);
        // Obstacles (ADR 0015): the shoot stops before a metamer that would end inside one.
        let blocked = params.world.obstacles.is_some() && {
            let p = parent as usize;
            inside_obstacle(
                params,
                tree.tip_x(p) + length * math::cos(angle),
                tree.tip_y(p) + length * math::sin(angle),
            )
        };
        if blocked {
            if j == 0.0 {
                tree.b.state[bud_] = state; // nothing grew: the bud rests and tries again
            } else {
                form_terminal_bud(tree, parent as usize, params, season);
            }
            return;
        }
        let m = add_metamer(tree, parent, slot_, angle, length, params.c6.r0, season);
        if j == 0.0 && pa_shift >= 0.0 {
            tree.m.pa_shift[m] = store_u8(pa_shift);
        }
        form_axillary_buds(tree, m, params, j == n - 1.0);
        if j == n - 1.0 {
            form_terminal_bud(tree, m, params, season);
        }
        parent = m as i32;
        slot_ = slot::MAIN;
        j += 1.0;
    }
}
