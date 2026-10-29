//! C5. Self-pruning (spec §C5; c5-shedding.ts). A lateral whose light per metamer Q_b/n_b falls
//! below max(T, T_rel·Q_top), once g seasons old, is shed with its subtree and buds; its base
//! radius stays as a scar (C6). With R1's `carbon` mode the test is P_b < M_b (or dim against the
//! crown top). `remove_branches` is shared with R3 breakage and obstacle clearance; with R4's bud
//! bank each removed branch leaves a dormant bud in its slot.
//!
//! Params: c5.T, c5.g, c5.Trel, c5.topQuantile; c6.n; r1.shed; r4.bank.

use super::c1::{add_bud, bud_angle};
use super::c3::is_live_bud;
use crate::math;
use crate::params::Params;
use crate::tree::{Tree, bud, ensure, slot};

/// The `quantile` quantile (nearest rank) of the tree's live-bud Q this season.
pub fn crown_top_light(tree: &Tree, quantile: f64) -> f64 {
    let mut qs: Vec<f64> = (0..tree.b.len())
        .filter(|&i| is_live_bud(tree.b.state[i]))
        .map(|i| tree.b.q[i])
        .collect();
    let count = qs.len();
    if count == 0 {
        return 0.0;
    }
    // A typed array's sort: numeric, −0 before +0, NaN last (total_cmp agrees on these).
    qs.sort_by(f64::total_cmp);
    let n = count as f64;
    let rank = math::min(n - 1.0, math::max(0.0, (quantile * n).ceil() - 1.0));
    qs[rank as usize]
}

/// Sheds qualifying laterals among the first `evaluated` metamers. Returns metamers removed.
pub fn shed_branches(tree: &mut Tree, params: &Params, season: f64, evaluated: usize) -> f64 {
    let nm = tree.m.len();
    let g = params.c5.g;
    let t = math::max(params.c5.t, params.c5.t_rel * tree.q_top);
    let carbon = params.r1.enabled && params.r1.shed_carbon;
    let mut dead = std::mem::take(&mut tree.scratch_u);
    ensure(&mut dead, nm.max(tree.b.len()));
    dead[..nm].fill(0);
    let mut any = false;
    let c = &tree.m;
    for i in 0..evaluated {
        if c.slot[i] == slot::MAIN || c.parent[i] < 0 {
            continue;
        }
        if season - (c.birth_season[i] as f64) < g {
            continue;
        }
        let n_b = c.n_sum[i] as f64;
        let light = if n_b > 0.0 { c.q_sum[i] / n_b } else { 0.0 };
        let shed = if carbon {
            tree.p_sum[i] < tree.m_sum[i] || light < params.c5.t_rel * tree.q_top
        } else {
            n_b > 0.0 && light < t
        };
        if shed {
            dead[i] = 1;
            any = true;
        }
    }
    let removed = if any {
        remove_branches(tree, &mut dead, params, &mut [])
    } else {
        0.0
    };
    tree.scratch_u = dead;
    removed
}

/// Removes every metamer marked in `dead` with its subtree and buds, recording scars and
/// remapping indices; arrays in `carry` are compacted alongside. Returns metamers removed.
pub fn remove_branches(
    tree: &mut Tree,
    dead: &mut [u8],
    params: &Params,
    carry: &mut [&mut Vec<f64>],
) -> f64 {
    let nm = tree.m.len();
    let n = params.c6.n;
    let bank = params.r4.enabled && params.r4.bank;
    let mut roots: Vec<usize> = Vec::new();
    let mut removed = 0.0;
    {
        let c = &mut tree.m;
        for i in 0..nm {
            let p = c.parent[i];
            if p >= 0 && dead[p as usize] != 0 {
                dead[i] = 1;
            } else if dead[i] != 0 && p >= 0 {
                let r = math::pow(c.radius[i], n);
                c.scar_sum_n[p as usize] += r;
                if bank {
                    roots.push(i);
                }
            }
            if dead[i] != 0 {
                removed += 1.0;
            }
        }
    }
    // A consumed bud's metamer may be stale (it is never remapped), so read past the table as
    // the TypeScript reads its scratch: whatever is there only re-marks a bud already gone.
    for j in 0..tree.b.len() {
        if dead
            .get(tree.b.metamer[j] as usize)
            .is_some_and(|&d| d != 0)
        {
            tree.b.state[j] = bud::GONE;
        }
    }
    let bank_rows: Vec<(i32, u8, u8)> = roots
        .iter()
        .map(|&i| (tree.m.parent[i], tree.m.slot[i], tree.m.order[i]))
        .collect();
    let keep: Vec<u8> = (0..nm).map(|i| if dead[i] != 0 { 0 } else { 1 }).collect();
    let old_to_new = tree.m.compact(&keep);
    for i in 0..tree.m.len() {
        let p = tree.m.parent[i];
        if p >= 0 {
            tree.m.parent[i] = old_to_new[p as usize];
        }
    }
    for j in 0..tree.b.len() {
        if tree.b.state[j] != bud::GONE {
            tree.b.metamer[j] = old_to_new[tree.b.metamer[j] as usize];
        }
    }
    for arr in carry.iter_mut() {
        ensure(arr, nm);
        for i in 0..nm {
            if keep[i] != 0 {
                arr[old_to_new[i] as usize] = arr[i];
            }
        }
    }
    for (parent, slot_, order) in bank_rows {
        let m = old_to_new[parent as usize] as usize;
        let angle = bud_angle(tree, m, slot_, params);
        let i = add_bud(tree, m, slot_, angle, order as f64);
        tree.b.state[i] = bud::DORMANT;
    }
    removed
}
