//! C5. Self-pruning (spec §C5; c5-shedding.ts). A lateral whose light per metamer Q_b/n_b falls
//! below max(T, T_rel·Q_top), once g seasons old, is shed with its subtree and buds; its base
//! radius stays as a scar (C6). With R1's `carbon` mode the test is P_b < M_b (or dim against the
//! crown top). `remove_branches` is shared with R3 breakage and obstacle clearance; with R4's bud
//! bank each removed branch leaves a dormant bud in its slot.
//!
//! Params: c5.T, c5.g, c5.Trel, c5.topQuantile; c6.n; r1.shed; r4.bank.

use super::c1::{add_bud, bud_frame};
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
    let bank_rows: Vec<(i32, u8, u8, f64)> = roots
        .iter()
        .map(|&i| {
            let c = &tree.m;
            (c.parent[i], c.slot[i], c.order[i], c.azimuth[i])
        })
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
    // R4's bud bank: a dormant bud where each branch was, at its azimuth around the parent as
    // the parent now lies.
    for (parent, slot_, order, azimuth) in bank_rows {
        let m = old_to_new[parent as usize] as usize;
        let (h, l) = bud_frame(tree, m, slot_, azimuth, params);
        let i = add_bud(tree, m, slot_, h, l, azimuth, order as f64);
        tree.b.state[i] = bud::DORMANT;
    }
    removed
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::principles::c6::{junction_exponents, update_girth};
    use crate::testing::preset;
    use crate::testing::{LEFT, RIGHT, bud, metamer};
    use crate::world::World;

    pub const UP: f64 = std::f64::consts::FRAC_PI_2;

    pub fn params(extra: &str) -> Params {
        let base = r#"{"c5":{"enabled":true,"T":0.1,"g":2,"Trel":0,"topQuantile":0.9},"c6":{"enabled":true,"n":2,"r0":0.02}}"#;
        let p = preset("default", base);
        Params::from_json(&crate::json::merge(&p, &crate::json::parse(extra).unwrap()))
    }

    /// root → (main continuation, lateral → lateral's continuation), with a bud on each tip.
    pub fn small_tree(p: &Params) -> Tree {
        let mut t = Tree::new(0, 10.0, 0.5);
        let r0 = p.c6.r0;
        let root = metamer(&mut t, -1, slot::MAIN, UP, 1.0, r0, 0.0) as i32;
        let main = metamer(&mut t, root, slot::MAIN, UP, 1.0, r0, 0.0);
        let lat = metamer(&mut t, root, RIGHT, UP - 0.7, 1.0, r0, 0.0) as i32;
        let lat_tip = metamer(&mut t, lat, slot::MAIN, UP - 0.7, 1.0, r0, 0.0);
        bud(&mut t, main, slot::MAIN, UP, 0.0);
        bud(&mut t, lat_tip, slot::MAIN, UP - 0.7, 1.0);
        t.ensure_scratch();
        t
    }

    fn close(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() < eps
    }

    #[test]
    fn girth_adds_children_and_scars_and_tips_have_r0() {
        let p = params("{}");
        let mut t = small_tree(&p);
        update_girth(&mut t, &p);
        let (r, r0) = (&t.m.radius, p.c6.r0);
        assert!(close(r[1], r0, 1e-12) && close(r[3], r0, 1e-12) && close(r[2], r0, 1e-12));
        assert!(close(r[0], 2f64.sqrt() * r0, 1e-12)); // n = 2: r² = r0² + r0²
        let mut d = Vec::new();
        junction_exponents(&t, &mut d);
        assert_eq!(d.len(), 1);
        assert!(close(d[0], p.c6.n, 1e-6));
    }

    #[test]
    fn solves_the_leonardo_exponent_at_two_and_three_way_junctions() {
        for (delta, xs) in [(2.5, vec![0.6]), (1.8, vec![0.5, 0.3]), (3.2, vec![0.7])] {
            let rest = 1.0 - xs.iter().map(|x: &f64| x.powf(delta)).sum::<f64>();
            let mut t = Tree::new(0, 10.0, 0.5);
            let root = metamer(&mut t, -1, slot::MAIN, UP, 1.0, 1.0, 0.0) as i32;
            let mut radii = xs.clone();
            radii.push(rest.powf(1.0 / delta));
            for (k, r) in radii.iter().enumerate() {
                metamer(&mut t, root, [slot::MAIN, LEFT, RIGHT][k], UP, 1.0, *r, 0.0);
            }
            let mut d = Vec::new();
            junction_exponents(&t, &mut d);
            assert_eq!(d.len(), 1);
            assert!(close(d[0], delta, 1e-10), "{delta}: {}", d[0]);
        }
    }

    #[test]
    fn a_radius_never_decreases() {
        let p = params("{}");
        let mut t = small_tree(&p);
        t.m.radius[0] = 1.0;
        update_girth(&mut t, &p);
        assert_eq!(t.m.radius[0], 1.0);
    }

    #[test]
    fn sheds_a_dim_lateral_with_its_subtree_leaving_a_scar() {
        let p = params("{}");
        let mut t = small_tree(&p);
        t.m.q_sum[2] = 0.05;
        t.m.n_sum[2] = 2;
        t.m.q_sum[1] = 1.0;
        t.m.n_sum[1] = 1;
        update_girth(&mut t, &p);
        let lateral_r = t.m.radius[2];
        let nm = t.m.len();
        assert_eq!(shed_branches(&mut t, &p, 5.0, nm), 2.0);
        assert_eq!(t.m.len(), 2);
        assert_eq!(&t.m.parent[..2], &[-1, 0]);
        assert!(close(t.m.scar_sum_n[0], lateral_r.powf(p.c6.n), 1e-12));
        // The lateral's bud is gone; the main tip's bud now points at row 1.
        let live: Vec<usize> = (0..2).filter(|&j| t.b.state[j] != bud::GONE).collect();
        assert_eq!(live.len(), 1);
        assert_eq!(t.b.metamer[live[0]], 1);
        // Girth below the scar does not shrink.
        let before = t.m.radius[0];
        update_girth(&mut t, &p);
        assert!(close(t.m.radius[0], before, 1e-12));
    }

    #[test]
    fn judges_a_branch_against_its_own_crown_top() {
        // Lateral light per metamer 0.15 is above T = 0.1, so the baseline rule keeps it.
        let relative = params(r#"{"c5":{"Trel":0.3}}"#);
        let dim_lateral = |q_top: f64, p: &Params| {
            let mut t = small_tree(p);
            t.m.q_sum[2] = 0.3;
            t.m.n_sum[2] = 2;
            t.q_top = q_top;
            let nm = t.m.len();
            shed_branches(&mut t, p, 5.0, nm)
        };
        assert_eq!(dim_lateral(1.0, &relative), 2.0); // bright top: T_eff = 0.3 > 0.15, shed
        assert_eq!(dim_lateral(0.4, &relative), 0.0); // dim top: T_eff = 0.12 < 0.15, kept
        assert_eq!(dim_lateral(1.0, &params("{}")), 0.0); // T_rel = 0 ignores the top
    }

    #[test]
    fn the_crown_top_light_is_a_quantile_of_live_bud_q() {
        let p = params("{}");
        let mut t = Tree::new(0, 10.0, 0.5);
        let root = metamer(&mut t, -1, slot::MAIN, UP, 1.0, p.c6.r0, 0.0);
        for i in 0..10 {
            let b = bud(&mut t, root, slot::MAIN, UP, 0.0);
            t.b.q[b] = (i + 1) as f64 / 10.0;
        }
        t.b.state[9] = bud::GONE; // consumed buds do not count
        assert!(close(crown_top_light(&t, 0.9), 0.9, 1e-12));
        assert!(close(crown_top_light(&t, 0.5), 0.5, 1e-12));
    }

    #[test]
    fn respects_the_grace_period() {
        let p = params("{}");
        let mut t = small_tree(&p);
        t.m.q_sum[2] = 0.0;
        t.m.n_sum[2] = 2;
        let nm = t.m.len();
        assert_eq!(shed_branches(&mut t, &p, 1.0, nm), 0.0); // age 1 < g = 2
    }

    #[test]
    fn m4_never_thins_a_metamer_and_gives_delta_n_without_shedding() {
        let mut world = World::new(preset("pruned", "{}"));
        let mut prev = std::collections::HashMap::new();
        for _ in 0..30 {
            world.step(&mut |_| {});
            let t = &world.trees[0];
            let mut next = std::collections::HashMap::new();
            for i in 0..t.m.len() {
                let (id, r) = (t.m.birth_id[i], t.m.radius[i]);
                if let Some(&before) = prev.get(&id) {
                    assert!(r >= before);
                }
                next.insert(id, r);
            }
            prev = next;
        }
        let mut world = World::new(preset("pruned", r#"{"c5":{"enabled":false}}"#));
        world.run(25, &[]);
        let mut d = Vec::new();
        junction_exponents(&world.trees[0], &mut d);
        assert!(d.len() > 20);
        assert!(d.iter().all(|&x| close(x, world.params().c6.n, 1e-5)));
    }

    #[test]
    fn m4_clears_the_interior_without_lowering_the_crown_base() {
        let run = |c5: bool, seed: u32| {
            let patch = format!(r#"{{"seed":{seed},"c5":{{"enabled":{c5}}}}}"#);
            let mut world = World::new(preset("pruned", &patch));
            let mut shed = 0.0;
            for _ in 0..40 {
                world.step(&mut |_| {});
                shed += world.trees[0].shed_count;
            }
            let t = &world.trees[0];
            let mut bole = f64::INFINITY;
            for i in 0..t.m.len() {
                let p = t.m.parent[i];
                if t.m.order[i] == 1 && p >= 0 && t.m.order[p as usize] == 0 {
                    bole = bole.min(t.m.base_y[i]);
                }
            }
            (t.m.len() as f64, shed, bole)
        };
        let mean = |v: &[f64]| v.iter().sum::<f64>() / v.len() as f64;
        let on: Vec<_> = (1..=5).map(|s| run(true, s)).collect();
        let off: Vec<_> = (1..=5).map(|s| run(false, s)).collect();
        assert!(on.iter().all(|r| r.1 > 0.0));
        let m = |v: &[(f64, f64, f64)], k: usize| {
            mean(&v.iter().map(|r| [r.0, r.1, r.2][k]).collect::<Vec<_>>())
        };
        assert!(m(&on, 0) < m(&off, 0));
        assert!(m(&on, 2) >= m(&off, 2));
    }
}
