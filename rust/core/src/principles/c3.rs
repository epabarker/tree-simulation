//! C3. Basipetal light summation and acropetal Borchert–Honda allocation (spec §C3;
//! c3-allocation.ts). Basipetal: each bud's Q enters its node by its slot, each subtree's Q_sum
//! flows into its parent's node. Acropetal: v_base = α·Q_base enters the root and splits at each
//! node, main share v·λQ_m / (λQ_m + (1 − λ)Q_l).
//!
//! Params: c3.mode, c3.lambda (λ), c3.alpha (α); with R2 λ by pa and age and acrotony κ; with R5
//! λ rises at shaded nodes; with R1, v_base is the tree's net production.

use super::r2::{acrotony_weights, lambda_at};
use super::r5::shaded_lambda;
use super::r6::light_weight;
use crate::params::{C3Mode, Params, R6};
use crate::tree::{Tree, bud, ensure};

/// True for buds that still take part in growth (not consumed, aborted or terminated).
pub fn is_live_bud(state: u8) -> bool {
    state == bud::ACTIVE || state == bud::DORMANT || state == bud::SHORT_SHOOT
}

/// Basipetal pass: qSlot, qSum (Q_sum) and nSum (n_b), and the tree's Q_base.
pub fn gather_light(tree: &mut Tree, r6: &R6) {
    let nm = tree.m.len();
    let nb = tree.b.len();
    ensure(&mut tree.q_slot, 3 * nm);
    let q_slot = &mut tree.q_slot;
    q_slot[..3 * nm].fill(0.0);
    let b = &tree.b;
    for i in 0..nb {
        if !is_live_bud(b.state[i]) {
            continue;
        }
        let w = light_weight(b.state[i], r6);
        q_slot[3 * b.metamer[i] as usize + b.slot[i] as usize] += w * b.q[i];
    }
    let m = &mut tree.m;
    m.n_sum[..nm].fill(0);
    for i in (0..nm).rev() {
        let q = q_slot[3 * i] + q_slot[3 * i + 1] + q_slot[3 * i + 2];
        m.q_sum[i] = q;
        m.n_sum[i] = m.n_sum[i].wrapping_add(1);
        let p = m.parent[i];
        if p >= 0 {
            let p = p as usize;
            q_slot[3 * p + m.slot[i] as usize] += q;
            m.n_sum[p] = m.n_sum[p].wrapping_add(m.n_sum[i]);
        }
    }
    tree.q_base = if nm > 0 { tree.m.q_sum[0] } else { 0.0 };
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
            ensure(&mut tree.v_slot, 3 * nm);
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
                    v_slot[3 * p as usize + m.slot[i] as usize]
                };
                m.v_in[i] = v;
                let q_main = q_slot[3 * i];
                let q_left = q_slot[3 * i + 1];
                let q_right = q_slot[3 * i + 2];
                let q_lat = q_left + q_right;
                let pa = m.order[i] as f64 - m.pa_shift[i] as f64;
                let lambda = shaded_lambda(lambda_at(pa, age, params), shade[i], &params.r5);
                let lateral = if acro { q_lat * w[i] } else { q_lat };
                let v_main = bh_main_share(v, q_main, lateral, lambda);
                let v_lat = if q_main + q_lat > 0.0 {
                    v - v_main
                } else {
                    0.0
                };
                v_slot[3 * i] = v_main;
                v_slot[3 * i + 1] = if q_lat > 0.0 {
                    (v_lat * q_left) / q_lat
                } else {
                    0.0
                };
                v_slot[3 * i + 2] = if q_lat > 0.0 {
                    (v_lat * q_right) / q_lat
                } else {
                    0.0
                };
            }
            let b = &mut tree.b;
            for i in 0..nb {
                b.v[i] = if is_live_bud(b.state[i]) {
                    v_slot[3 * b.metamer[i] as usize + b.slot[i] as usize]
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
    use crate::testing::preset;
    use crate::world::World;

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
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
        // M2: the three slot shares sum to the inflow, at every row of the last allocation.
        let mut world = World::new(preset("bh", "{}"));
        world.run(15, &[]);
        let t = &world.trees[0];
        let mut checked = 0;
        for i in 0..t.m.len() {
            let v = t.m.v_in[i];
            if v <= 0.0 {
                continue; // rows grown this season have vIn = 0
            }
            let total = t.v_slot[3 * i] + t.v_slot[3 * i + 1] + t.v_slot[3 * i + 2];
            assert!((total - v).abs() < 1e-9, "row {i}: {total} vs {v}");
            checked += 1;
        }
        assert!(checked > 50);
    }
}
