//! C3. Basipetal light summation and acropetal Borchert–Honda allocation (spec §C3;
//! c3-allocation.ts). Basipetal: each bud's Q enters its node by its slot, each subtree's Q_sum
//! flows into its parent's node. Acropetal: v_base = α·Q_base enters the root and splits at each
//! node, main share v·λQ_m / (λQ_m + (1 − λ)Q_l).
//!
//! Exploratory (wayfinder #87, off by default): with c3.sink "turgor" a sink limit caps each
//! shoot's extension by its water status Ψ = −(g·height + r·path length), Lockhart-linear to
//! Ψ_crit (`turgor_scale`); C3 still allocates on light, and what a tip cannot use goes to R1's
//! reserve (season.rs, grow_buds). Params c3.sink, c3.sinkG, c3.sinkR, c3.psiCrit.
//!
//! Params: c3.mode, c3.lambda (λ), c3.alpha (α); with R2 λ by pa and age and acrotony κ, and λ
//! falls in weak wood of a vigorous tree (R2's vigour drop: r2.vigourShare, r2.vigourLambda,
//! r2.vigourTreeLo, r2.vigourTreeHi); with R5 λ rises at shaded nodes; with R1, v_base is the
//! tree's net production.

use super::r2::{acrotony_weights, lambda_at, vigour, vigour_drop_on, vigour_gate};
use super::r5::shaded_lambda;
use super::r6::light_weight;
use crate::math;
use crate::params::{C3, C3Mode, Params, R6};
use crate::tree::{SLOTS, Tree, bud, ensure};

/// True for buds that still take part in growth (not consumed, aborted or terminated).
pub fn is_live_bud(state: u8) -> bool {
    state == bud::ACTIVE || state == bud::DORMANT || state == bud::SHORT_SHOOT
}

/// Basipetal pass: qSlot, qSum (Q_sum) and nSum (n_b), and the tree's Q_base.
pub fn gather_light(tree: &mut Tree, r6: &R6) {
    let nm = tree.m.len();
    let nb = tree.b.len();
    ensure(&mut tree.q_slot, SLOTS * nm);
    let q_slot = &mut tree.q_slot;
    q_slot[..SLOTS * nm].fill(0.0);
    let b = &tree.b;
    for i in 0..nb {
        if !is_live_bud(b.state[i]) {
            continue;
        }
        let w = light_weight(b.state[i], r6);
        q_slot[SLOTS * b.metamer[i] as usize + b.slot[i] as usize] += w * b.q[i];
    }
    let m = &mut tree.m;
    m.n_sum[..nm].fill(0);
    for i in (0..nm).rev() {
        let q: f64 = q_slot[SLOTS * i..SLOTS * (i + 1)].iter().sum();
        m.q_sum[i] = q;
        m.n_sum[i] = m.n_sum[i].wrapping_add(1);
        let p = m.parent[i];
        if p >= 0 {
            let p = p as usize;
            q_slot[SLOTS * p + m.slot[i] as usize] += q;
            m.n_sum[p] = m.n_sum[p].wrapping_add(m.n_sum[i]);
        }
    }
    tree.q_base = if nm > 0 { tree.m.q_sum[0] } else { 0.0 };
}

/// Metres per cell (the grid's 0.25 m), for the sink limit's per-metre terms.
pub const CELL_M: f64 = 0.25;

/// The sink limit's scale on a shoot's metamer count (wayfinder #87): Ψ = −(g·h + r·L) with h
/// the shoot's height above the root and L its path length from the root, both in metres, and
/// max(0, (Ψ − Ψ_crit)/(0 − Ψ_crit)), at most 1. Turgor, not carbon, tracks elongation in tall
/// trees (Woodruff 2004; Woodruff & Meinzer 2011: NSC rises with height while extension falls).
pub fn turgor_scale(height_m: f64, path_m: f64, c3: &C3) -> f64 {
    let psi = -(c3.sink_g * height_m + c3.sink_r * path_m);
    if c3.psi_crit >= 0.0 {
        return 1.0;
    }
    math::max(
        0.0,
        math::min(1.0, (psi - c3.psi_crit) / (0.0 - c3.psi_crit)),
    )
}

/// The Borchert–Honda split at one node: the main axis's share; 0 when the node gathered nothing.
pub fn bh_main_share(v: f64, q_main: f64, q_lateral: f64, lambda: f64) -> f64 {
    let denom = lambda * q_main + (1.0 - lambda) * q_lateral;
    if denom > 0.0 {
        (v * lambda * q_main) / denom
    } else {
        0.0
    }
}

/// Acropetal pass: each live bud's resource v (and each metamer's vIn) by c3.mode.
pub fn allocate(tree: &mut Tree, params: &Params) {
    let nb = tree.b.len();
    let alpha = params.c3.alpha;
    match params.c3.mode {
        C3Mode::None => {
            for i in 0..nb {
                tree.b.v[i] = if is_live_bud(tree.b.state[i]) && tree.b.q[i] > 0.0 {
                    1.0
                } else {
                    0.0
                };
            }
            tree.v_base = 0.0;
            sum_resource_basipetally(tree);
        }
        C3Mode::Equal => {
            let mut live = 0.0;
            for i in 0..nb {
                if is_live_bud(tree.b.state[i]) {
                    live += 1.0;
                }
            }
            if !params.r1.enabled {
                tree.v_base = alpha * tree.q_base;
            }
            let share = if live > 0.0 { tree.v_base / live } else { 0.0 };
            for i in 0..nb {
                tree.b.v[i] = if is_live_bud(tree.b.state[i]) {
                    share
                } else {
                    0.0
                };
            }
            sum_resource_basipetally(tree);
        }
        C3Mode::Bh => {
            let nm = tree.m.len();
            if !params.r1.enabled {
                tree.v_base = if nm > 0 { alpha * tree.q_base } else { 0.0 };
            }
            let acro = acrotony_weights(tree, params);
            // R2's vigour drop: how far it acts on this tree (0 when off).
            let gate = if vigour_drop_on(&params.r2) {
                vigour_gate(tree.v_base, &params.r2)
            } else {
                0.0
            };
            ensure(&mut tree.v_slot, SLOTS * nm);
            ensure(&mut tree.node_shade, nm);
            let age = tree.age;
            let v_base = tree.v_base;
            let (q_slot, v_slot, shade, w) = (
                &tree.q_slot,
                &mut tree.v_slot,
                &tree.node_shade,
                &tree.scratch_f,
            );
            let m = &mut tree.m;
            for i in 0..nm {
                let p = m.parent[i];
                let v = if p < 0 {
                    v_base
                } else {
                    v_slot[SLOTS * p as usize + m.slot[i] as usize]
                };
                m.v_in[i] = v;
                let at = SLOTS * i;
                let q_main = q_slot[at];
                let q_lat: f64 = q_slot[at + 1..at + SLOTS].iter().sum();
                let pa = m.order[i] as f64 - m.pa_shift[i] as f64;
                let mut lambda = shaded_lambda(lambda_at(pa, age, params), shade[i], &params.r5);
                if gate > 0.0 {
                    lambda -=
                        params.r2.vigour_lambda * gate * (1.0 - vigour(v, v_base, &params.r2));
                }
                let lateral = if acro { q_lat * w[i] } else { q_lat };
                let v_main = bh_main_share(v, q_main, lateral, lambda);
                let v_lat = if q_main + q_lat > 0.0 {
                    v - v_main
                } else {
                    0.0
                };
                v_slot[at] = v_main;
                for k in at + 1..at + SLOTS {
                    v_slot[k] = if q_lat > 0.0 {
                        (v_lat * q_slot[k]) / q_lat
                    } else {
                        0.0
                    };
                }
            }
            let b = &mut tree.b;
            for i in 0..nb {
                b.v[i] = if is_live_bud(b.state[i]) {
                    v_slot[SLOTS * b.metamer[i] as usize + b.slot[i] as usize]
                } else {
                    0.0
                };
            }
        }
    }
}

/// vIn for modes without an acropetal flow: the resource of all buds above each metamer.
fn sum_resource_basipetally(tree: &mut Tree) {
    let nm = tree.m.len();
    let m = &mut tree.m;
    m.v_in[..nm].fill(0.0);
    let b = &tree.b;
    for i in 0..b.len() {
        // A consumed bud's metamer may be stale; its v is 0, and TypeScript's write past the
        // table lands in rows that are zeroed when added.
        let at = b.metamer[i] as usize;
        if at < nm {
            m.v_in[at] += b.v[i];
        }
    }
    for i in (1..nm).rev() {
        let p = m.parent[i] as usize;
        m.v_in[p] += m.v_in[i];
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::Params;
    use crate::testing::preset;
    use crate::world::World;

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    #[test]
    fn turgor_scale_is_lockhart_linear_to_psi_crit() {
        let p = Params::from_json(&crate::json::merge(
            &preset("default", "{}"),
            &crate::json::parse(
                r#"{"c3":{"sink":"turgor","sinkG":0.01,"sinkR":0.005,"psiCrit":-0.5}}"#,
            )
            .unwrap(),
        ));
        assert!(p.c3.sink_turgor);
        assert!(close(turgor_scale(0.0, 0.0, &p.c3), 1.0));
        // Ψ = −(0.01·20 + 0.005·20) = −0.3: 0.2/0.5 of full extension.
        assert!(close(turgor_scale(20.0, 20.0, &p.c3), 0.4));
        assert!(close(turgor_scale(40.0, 40.0, &p.c3), 0.0));
        assert!(!Params::from_json(&preset("default", "{}")).c3.sink_turgor);
    }

    #[test]
    fn splits_v_by_lambda_q_main_to_one_minus_lambda_q_lateral() {
        assert_eq!(bh_main_share(10.0, 1.0, 1.0, 0.5), 5.0);
        assert!(close(bh_main_share(10.0, 1.0, 1.0, 0.6), 6.0));
        assert!(close(bh_main_share(10.0, 3.0, 1.0, 0.5), 7.5));
        assert_eq!(bh_main_share(10.0, 1.0, 0.0, 0.3), 10.0); // no lateral light: all to the main axis
        assert_eq!(bh_main_share(10.0, 0.0, 1.0, 0.7), 0.0);
        assert_eq!(bh_main_share(10.0, 0.0, 0.0, 0.5), 0.0); // no light at all
    }

    #[test]
    fn splits_conservatively_at_every_node() {
        // M2: the slot shares sum to the inflow, at every row of the last allocation.
        let mut world = World::new(preset("bh", "{}"));
        world.run(15, &[]);
        let t = &world.trees[0];
        let mut checked = 0;
        for i in 0..t.m.len() {
            let v = t.m.v_in[i];
            if v <= 0.0 {
                continue; // rows grown this season have vIn = 0
            }
            let total: f64 = t.v_slot[SLOTS * i..SLOTS * (i + 1)].iter().sum();
            assert!((total - v).abs() < 1e-9, "row {i}: {total} vs {v}");
            checked += 1;
        }
        assert!(checked > 50);
    }
    #[test]
    fn a_vigorous_tree_gives_its_weak_wood_less_apical_control() {
        // R2's vigour drop: the same tree, allocated with and without it; the root carries the
        // whole tree (u = 1) and splits as before, weaker nodes pass less to their main axis.
        let levels = r#""levels":[{"lambda":0.6,"setPoint":0,"eta":0.15,"branchAngle":45,"generator":"spiral","tierEvery":0,"pTerm":0}]"#;
        let off = preset("bh", &format!(r#"{{"r2":{{"enabled":true,{levels}}}}}"#));
        let mut world = World::new(off.clone());
        world.run(12, &[]);
        let tree = world.trees[0].clone();
        let off = Params::from_json(&off);
        let on = Params::from_json(&preset(
            "bh",
            &format!(
                r#"{{"r2":{{"enabled":true,{levels},"vigourShare":0.5,"vigourLambda":0.2}}}}"#
            ),
        ));
        let gated = Params::from_json(&preset(
            "bh",
            &format!(
                r#"{{"r2":{{"enabled":true,{levels},"vigourShare":0.5,"vigourLambda":0.2,"vigourTreeLo":1e9,"vigourTreeHi":2e9}}}}"#
            ),
        ));
        let mut tree = tree;
        gather_light(&mut tree, &off.r6);
        let (mut a, mut b, mut c) = (tree.clone(), tree.clone(), tree);
        allocate(&mut a, &off);
        allocate(&mut b, &on);
        allocate(&mut c, &gated);
        let share = |t: &Tree, i: usize| t.v_slot[SLOTS * i] / t.m.v_in[i];
        assert!(close(share(&a, 0), share(&b, 0)));
        let mut weaker = 0;
        for i in 0..a.m.len() {
            let lateral: f64 = a.q_slot[SLOTS * i + 1..SLOTS * (i + 1)].iter().sum();
            if a.m.v_in[i] <= 0.0 || a.q_slot[SLOTS * i] <= 0.0 || lateral <= 0.0 {
                continue;
            }
            assert!(share(&b, i) <= share(&a, i) + 1e-12, "row {i}");
            if share(&b, i) < share(&a, i) - 1e-9 {
                weaker += 1;
            }
        }
        assert!(weaker > 5, "{weaker}");
        // A tree below the gate's lower bound allocates exactly as without the rule.
        assert_eq!(&a.v_slot[..], &c.v_slot[..]);
    }
}
