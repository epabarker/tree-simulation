//! R1. Carbon balance with the cost of size (spec §R1, ADR 0010, ADR 0021; r1-carbon.ts).
//! P = α·Σ a·Q·d(L_path) over live buds, d = exp(−L/L_h) or 1/(1 + L/L_h); M = m_w·Σ π r_live² l +
//! m_f·Σ a. A surplus N = P − M feeds the reserve (s_r), reproduction above the maturity height
//! (f_rep) and v_base; a deficit draws the reserve, and k_starve seasons empty kill the tree.
//! P_b and M_b per branch feed C5's `carbon` shedding.
//!
//! Params: r1.*, c3.alpha (α), c6.n, c6.r0, r6 leaf areas.

use super::c3::is_live_bud;
use super::r6::deposit_area;
use crate::math;
use crate::params::{Params, R1};
use crate::tree::{Tree, ensure};

pub fn carbon_balance(tree: &mut Tree, params: &Params) {
    let r1 = &params.r1;
    let nm = tree.m.len();
    for v in [
        &mut tree.path_len,
        &mut tree.p_sum,
        &mut tree.m_sum,
        &mut tree.scratch_f,
    ] {
        ensure(v, nm);
    }
    ensure(&mut tree.scratch_u, nm);

    // Acropetal: path length to each tip, and the tree's height.
    let mut height = 0.0;
    for i in 0..nm {
        let p = tree.m.parent[i];
        let base = if p >= 0 {
            tree.path_len[p as usize]
        } else {
            0.0
        };
        tree.path_len[i] = base + tree.m.length[i];
        let y = tree.tip_y(i);
        if y > height {
            height = y;
        }
    }

    let (path_len, p_sum, m_sum) = (&tree.path_len, &mut tree.p_sum, &mut tree.m_sum);
    p_sum[..nm].fill(0.0);
    m_sum[..nm].fill(0.0);
    let alpha = params.c3.alpha;
    let b = &tree.b;
    for j in 0..b.len() {
        if !is_live_bud(b.state[j]) {
            continue;
        }
        let m = b.metamer[j] as usize;
        let discount = if r1.lh <= 0.0 {
            1.0
        } else if r1.hyperbolic {
            1.0 / (1.0 + path_len[m] / r1.lh)
        } else {
            math::exp(-path_len[m] / r1.lh)
        };
        let leaf = deposit_area(b.state[j], &params.r6);
        p_sum[m] += alpha * leaf * b.q[j] * discount;
        m_sum[m] += r1.mf * leaf;
    }

    // Basipetal: live pipes, their sapwood cost, and subtree sums.
    let (n, r0) = (params.c6.n, params.c6.r0);
    let tip_n = math::pow(r0, n);
    let pipes = &mut tree.scratch_f;
    let has_child = &mut tree.scratch_u;
    pipes[..nm].fill(0.0);
    has_child[..nm].fill(0);
    let c = &tree.m;
    for i in (0..nm).rev() {
        let s = if has_child[i] != 0 { pipes[i] } else { tip_n };
        let r_live = math::pow(s, 1.0 / n);
        m_sum[i] += r1.mw * std::f64::consts::PI * r_live * r_live * c.length[i];
        let p = c.parent[i];
        if p >= 0 {
            let p = p as usize;
            pipes[p] += s;
            has_child[p] = 1;
            p_sum[p] += p_sum[i];
            m_sum[p] += m_sum[i];
        }
    }

    let total_p = if nm > 0 { p_sum[0] } else { 0.0 };
    let total_m = if nm > 0 { m_sum[0] } else { 0.0 };
    tree.production = total_p;
    tree.maintenance = total_m;
    let cap = if tree.age == 0.0 {
        math::max(r1.reserve0, r1.store * total_m)
    } else {
        r1.store * total_m
    };
    if tree.age == 0.0 {
        tree.reserve = r1.reserve0;
    } else {
        tree.reserve = math::min(tree.reserve, cap);
    }
    let net = total_p - total_m;
    if net > 0.0 {
        let to_reserve = r1.sr * net;
        let to_seeds = if r1.f_rep > 0.0 && height >= r1.maturity {
            r1.f_rep * net
        } else {
            0.0
        };
        tree.reserve = math::min(tree.reserve + to_reserve, cap);
        tree.reproduction += to_seeds;
        tree.seed_pool += to_seeds;
        tree.v_base = net - to_reserve - to_seeds;
        tree.starved = 0.0;
    } else {
        tree.v_base = 0.0;
        tree.reserve += net;
        if tree.reserve <= 0.0 {
            tree.reserve = 0.0;
            tree.starved += 1.0;
        } else {
            tree.starved = 0.0;
        }
    }
}

/// True when R1 kills the tree: its reserve has been empty for k_starve seasons.
pub fn starved_to_death(tree: &Tree, r1: &R1) -> bool {
    r1.enabled && tree.starved >= r1.k_starve
}
