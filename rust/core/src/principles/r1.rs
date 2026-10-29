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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::principles::c1::plant_seedling;
    use crate::principles::c3::gather_light;
    use crate::testing::preset;

    fn params(r1: &str, extra: &str) -> Params {
        let base = preset("default", r#"{"r1":{"enabled":true}}"#);
        let with_r1 = crate::json::merge(
            &base,
            &crate::json::parse(&format!(r#"{{"r1":{r1}}}"#)).unwrap(),
        );
        Params::from_json(&crate::json::merge(
            &with_r1,
            &crate::json::parse(extra).unwrap(),
        ))
    }

    /// A seedling (one metamer, a terminal and an axillary bud) with every bud at light q.
    fn seedling(p: &Params, q: f64) -> Tree {
        let mut t = Tree::new(0, 10.0, 0.5);
        plant_seedling(&mut t, p, 0.0, 0.0);
        t.ensure_scratch();
        for i in 0..t.b.len() {
            t.b.q[i] = q;
        }
        gather_light(&mut t, &p.r6);
        t
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    #[test]
    fn produces_and_pays_live_sapwood_plus_foliage() {
        let p = params(r#"{"mw":2,"mf":0.05,"Lh":10}"#, "{}");
        let mut t = seedling(&p, 0.5);
        carbon_balance(&mut t, &p);
        let (l, buds) = (t.m.length[0], t.b.len() as f64);
        assert!(close(
            t.production,
            p.c3.alpha * buds * 0.5 * (-l / 10.0).exp()
        ));
        let sapwood = 2.0 * std::f64::consts::PI * p.c6.r0.powi(2) * l;
        assert!(close(t.maintenance, sapwood + 0.05 * buds));
    }

    #[test]
    fn the_hyperbolic_form_discounts_by_one_over_one_plus_l_over_lh() {
        let p = params(r#"{"mw":0,"mf":0,"Lh":10,"hydraulic":"hyperbolic"}"#, "{}");
        let mut t = seedling(&p, 0.5);
        carbon_balance(&mut t, &p);
        let (l, buds) = (t.m.length[0], t.b.len() as f64);
        assert!(close(
            t.production,
            (p.c3.alpha * buds * 0.5) / (1.0 + l / 10.0)
        ));
    }

    #[test]
    fn heartwood_costs_nothing() {
        let p = params(r#"{"mw":2,"mf":0}"#, "{}");
        let mut a = seedling(&p, 0.5);
        carbon_balance(&mut a, &p);
        let mut b = seedling(&p, 0.5);
        b.m.scar_sum_n[0] = 1.0; // a big shed branch's pipes
        b.m.radius[0] = 1.0; // C6 memory
        carbon_balance(&mut b, &p);
        assert_eq!(b.maintenance, a.maintenance);
    }

    #[test]
    fn splits_a_surplus_into_reserve_reproduction_and_v_base() {
        let young = params(
            r#"{"mw":0,"mf":0,"sr":0.2,"fRep":0.5,"maturity":100,"store":1e9}"#,
            "{}",
        );
        let mut t = seedling(&young, 1.0);
        t.age = 1.0;
        carbon_balance(&mut t, &young);
        let n = t.production;
        assert!(close(t.v_base, 0.8 * n));
        assert_eq!(t.reproduction, 0.0);
        let mature = params(
            r#"{"mw":0,"mf":0,"sr":0.2,"fRep":0.5,"maturity":0.5,"store":1e9}"#,
            "{}",
        );
        let mut old = seedling(&mature, 1.0);
        old.age = 1.0;
        carbon_balance(&mut old, &mature);
        assert!(close(old.reproduction, 0.5 * n));
        assert!(close(old.v_base, 0.3 * n));
    }

    #[test]
    fn a_deficit_draws_the_reserve_then_starves_the_tree() {
        let p = params(
            r#"{"mw":0,"mf":1,"kStarve":3,"reserve0":2,"store":100}"#,
            "{}",
        );
        let mut t = seedling(&p, 0.0); // dark: P = 0, M = m_f per bud
        carbon_balance(&mut t, &p); // age 0: the seed's store covers the first season
        assert_eq!(t.v_base, 0.0);
        assert_eq!(t.reserve, 2.0 - t.maintenance);
        let mut s = 1.0;
        while s <= 10.0 && !starved_to_death(&t, &p.r1) {
            t.age = s;
            carbon_balance(&mut t, &p);
            s += 1.0;
        }
        assert_eq!((t.reserve, t.starved), (0.0, 3.0));
        assert!(starved_to_death(&t, &p.r1));
        let off = R1 {
            enabled: false,
            ..p.r1.clone()
        };
        assert!(!starved_to_death(&t, &off));
    }

    #[test]
    fn keeps_at_most_store_seasons_of_maintenance() {
        let p = params(r#"{"mw":0,"mf":0.1,"sr":1,"store":2}"#, "{}");
        let mut t = seedling(&p, 1.0);
        for s in 0..20 {
            t.age = s as f64;
            carbon_balance(&mut t, &p);
        }
        assert!(close(t.reserve, 2.0 * t.maintenance));
    }

    #[test]
    fn a_dormant_leafless_bud_neither_produces_nor_respires_with_r6() {
        let p = params(
            r#"{"mw":0,"mf":0.1}"#,
            r#"{"r6":{"enabled":true,"qMin":0.5,"leafArea":2}}"#,
        );
        let mut t = seedling(&p, 0.3);
        for i in 0..t.b.len() {
            t.b.state[i] = crate::tree::bud::DORMANT;
        }
        carbon_balance(&mut t, &p);
        assert_eq!(t.production, 0.0);
        assert!(close(t.maintenance, p.r1.mw));
    }
}
