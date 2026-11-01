//! R2. Physiological age and axis differentiation (spec §R2, ADR 0009; r2-physiological-age.ts).
//! pa = min(order, levels − 1) picks a row of the table: λ (C3), A_set and η (C4), β (C1), the
//! lateral generator and p_term (sympodial growth); ontogeny lowers λ from age a_c; acrotony κ
//! weights each node's laterals by their place in the season's shoot.
//!
//! The relay (§R2.4's "distal laterals take over"; ADR 0033, proposed): when a pa-0 axis's
//! terminal bud has ended (by its row's p_term, or from tree age `relayAge` by `relayPTerm`), the
//! lateral buds on the top `relay` nodes below the ended apex grow as pa 0 themselves: their
//! shoots take the trunk's row (λ, set point, generator, p_term) and pass it to their subtree
//! through R4's per-axis shift. The crown becomes several ascending co-dominant limbs, each a
//! trunk that may in turn end and relay (Troll's and Leeuwenberg's sympodial models; Hallé et al.
//! 1978), instead of one leader whose laterals stay limbs. Without it a lateral under an ended
//! apex stays pa 1, and a trunk that stops is a table (ADR 0031).
//!
//! Params: r2.enabled, r2.levels, r2.aC, r2.dLambda, r2.ramp, r2.kappa, r2.relay,
//! r2.relayAge, r2.relayPTerm; c1.branchAngle, c3.lambda, c4.setPoint, c4.eta when off.

use crate::math;
use crate::params::{C4, Generator, PaLevel, Params, Phyllotaxis, R2};
use crate::rng::{purpose, uniform};
use crate::tree::{Tree, bud, ensure, slot};

/// The table row for an axis of order `order`, or None when R2 is off (or the order is
/// negative, where JavaScript's `levels[-1]` is undefined).
pub fn pa_level(order: f64, r2: &R2) -> Option<&PaLevel> {
    let n = r2.levels.len();
    if !r2.enabled || n == 0 {
        return None;
    }
    let i = math::min(order, (n - 1) as f64);
    if i < 0.0 || i.fract() != 0.0 {
        return None;
    }
    r2.levels.get(i as usize)
}

/// λ at a node of an axis of order `order` on a tree of age `tree_age`.
pub fn lambda_at(order: f64, tree_age: f64, params: &Params) -> f64 {
    let Some(level) = pa_level(order, &params.r2) else {
        return params.c3.lambda;
    };
    let r2 = &params.r2;
    let t = if tree_age <= r2.a_c {
        0.0
    } else {
        math::min(1.0, (tree_age - r2.a_c) / math::max(1.0, r2.ramp))
    };
    level.lambda - r2.d_lambda * t
}

/// Branch angle β, degrees, of a new lateral of order `order`.
pub fn branch_angle_of(order: f64, params: &Params) -> f64 {
    pa_level(order, &params.r2).map_or(params.c1.branch_angle, |l| l.branch_angle)
}

/// The laterals at the node above metamer `axis_node` of an axis of physiological age `order`
/// (I2): how many, and the azimuth step δ from one node to the next, radians. Without R2, C1's
/// phyllotaxis: one lateral a node, spiral (δ = c1.divergence) or distichous (δ = π).
pub fn laterals(order: f64, axis_node: f64, last_of_shoot: bool, params: &Params) -> (u8, f64) {
    let pi = std::f64::consts::PI;
    let spiral = params.c1.divergence * crate::params::DEG;
    let Some(level) = pa_level(order, &params.r2) else {
        return match params.c1.phyllotaxis {
            Phyllotaxis::Spiral => (1, spiral),
            Phyllotaxis::Distichous => (1, pi),
        };
    };
    match level.generator {
        // An unknown generator falls through to distichous, as the TypeScript switch did.
        Generator::Distichous | Generator::Unknown => (1, pi),
        Generator::Spiral => (1, spiral),
        // Decussate: each pair a quarter turn from the last.
        Generator::Opposite => (2, pi / 2.0),
        Generator::Whorled => {
            let at = if level.tier_every > 0.0 {
                (axis_node + 1.0) % level.tier_every == 0.0
            } else {
                last_of_shoot
            };
            if !at {
                return (0, 0.0);
            }
            let n = math::max(1.0, math::min(7.0, level.whorl.unwrap_or(4.0).floor()));
            // Alternate whorls sit between the last whorl's branches.
            (n as u8, pi / n)
        }
        Generator::None => (0, 0.0),
    }
}

/// True if the relay is on: some laterals under an ended pa-0 apex take pa 0.
pub fn relay_on(params: &Params) -> bool {
    params.r2.enabled && !params.r2.levels.is_empty() && params.r2.relay >= 1.0
}

/// The probability that a shoot of physiological age `order` ends in its terminal bud, on a tree
/// of age `tree_age`: the row's p_term, and with the relay on, at least `relayPTerm` for pa 0 from
/// `relayAge` on (the leader stops after an age, Troll's and Leeuwenberg's modules).
pub fn p_term_at(order: f64, tree_age: f64, params: &Params) -> f64 {
    let Some(level) = pa_level(order, &params.r2) else {
        return 0.0;
    };
    let r2 = &params.r2;
    if relay_on(params) && order == 0.0 && tree_age >= r2.relay_age {
        return math::max(level.p_term, r2.relay_p_term);
    }
    level.p_term
}

/// True if the terminal bud ending a shoot at metamer `birth_id` terminates (sympodial growth),
/// on a tree of age `tree_age`.
pub fn terminates(
    order: f64,
    tree_id: f64,
    birth_id: f64,
    season: f64,
    tree_age: f64,
    params: &Params,
) -> bool {
    let p_term = p_term_at(order, tree_age, params);
    if p_term <= 0.0 {
        return false;
    }
    uniform(
        params.seed,
        purpose::SYMPODIAL_TERMINATION,
        tree_id,
        birth_id,
        season,
        0.0,
    ) < p_term
}

/// For each of the first `nm` metamers, how many nodes it sits below an ended apex on its own axis
/// (0: it carries the ended terminal bud), or infinity; read from the buds that existed when the
/// season's growth began (the first `nb`). One reverse pass: a node has one main child.
pub fn relay_depth(tree: &Tree, nm: usize, nb: usize) -> Vec<f64> {
    let mut depth = vec![f64::INFINITY; nm];
    for j in 0..nb {
        let m = tree.b.metamer[j];
        if tree.b.slot[j] == slot::MAIN && tree.b.state[j] == bud::TERMINATED && m >= 0 {
            depth[m as usize] = 0.0;
        }
    }
    for i in (1..nm).rev() {
        let p = tree.m.parent[i];
        if tree.m.slot[i] == slot::MAIN && p >= 0 {
            let p = p as usize;
            depth[p] = math::min(depth[p], depth[i] + 1.0);
        }
    }
    depth
}

/// The paShift that makes bud `b`'s shoot a relay, pa 0, if it is a lateral on one of the top
/// `relay` nodes below an ended apex of a pa-0 axis (`depth` from `relay_depth`); else None.
pub fn relay_shift(tree: &Tree, b: usize, depth: &[f64], params: &Params) -> Option<f64> {
    if tree.b.slot[b] == slot::MAIN {
        return None;
    }
    let h = tree.b.metamer[b] as usize;
    if h >= depth.len() || depth[h] >= params.r2.relay {
        return None;
    }
    let host_pa = tree.m.order[h] as f64 - tree.m.pa_shift[h] as f64;
    if host_pa != 0.0 {
        return None;
    }
    Some(tree.b.order[b] as f64)
}

/// C4 params for shoots of physiological age `order`: A_set and η from the pa table.
pub fn direction_params(params: &Params, order: f64) -> C4 {
    let (c4, r2) = (params.c4, &params.r2);
    if !r2.enabled || r2.levels.is_empty() {
        return c4;
    }
    let n = r2.levels.len();
    let level = &r2.levels[math::min(order, (n - 1) as f64) as usize];
    C4 {
        set_point: level.set_point,
        eta: level.eta,
        ..c4
    }
}

/// Acrotony weights exp(κ(pos − 1)) per metamer in `tree.scratch_f` (first nm entries), pos its
/// node's place in the shoot it grew with. False when κ is 0 (no weights).
pub fn acrotony_weights(tree: &mut Tree, params: &Params) -> bool {
    let kappa = if params.r2.enabled {
        params.r2.kappa.unwrap_or(0.0)
    } else {
        0.0
    };
    if kappa == 0.0 {
        return false;
    }
    let nm = tree.m.len();
    ensure(&mut tree.scratch_f, 2 * nm);
    let (parent, slot, birth) = (&tree.m.parent, &tree.m.slot, &tree.m.birth_season);
    let w = &mut tree.scratch_f;
    for i in 0..nm {
        let p = parent[i];
        let same = p >= 0 && slot[i] == 0 && birth[p as usize] == birth[i];
        w[i] = if same { w[p as usize] + 1.0 } else { 0.0 };
        w[nm + i] = w[i];
    }
    for i in (1..nm).rev() {
        let p = parent[i] as usize;
        if slot[i] == 0 && birth[p] == birth[i] {
            w[nm + p] = math::max(w[nm + p], w[nm + i]);
        }
    }
    for i in 0..nm {
        let last = w[nm + i];
        let pos = if last > 0.0 { w[i] / last } else { 1.0 };
        w[i] = math::exp(kappa * (pos - 1.0));
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::Params;
    use crate::testing::preset;

    /// The default params with R2 on and `levels` (each a JSON row over the baseline row).
    pub fn with_r2(levels: &[&str], extra: &str) -> Params {
        let rows: Vec<String> = levels
            .iter()
            .map(|r| {
                let base = r#"{"lambda":0.5,"setPoint":0,"eta":0.15,"branchAngle":45,"generator":"distichous","tierEvery":0,"pTerm":0}"#;
                let row = crate::json::merge(&crate::json::parse(base).unwrap(), &crate::json::parse(r).unwrap());
                crate::json::stringify(&row, false)
            })
            .collect();
        let extra = extra.trim_start_matches('{').trim_end_matches('}');
        let sep = if extra.is_empty() { "" } else { "," };
        let patch = format!(
            r#"{{"r2":{{"enabled":true,"levels":[{}]{sep}{extra}}}}}"#,
            rows.join(",")
        );
        Params::from_json(&preset("default", &patch))
    }

    #[test]
    fn places_lateral_buds_by_the_axis_generator() {
        let p = with_r2(
            &[
                r#"{"generator":"whorled"}"#,
                r#"{"generator":"whorled","tierEvery":3}"#,
                r#"{"generator":"opposite"}"#,
                r#"{"generator":"none"}"#,
            ],
            "",
        );
        let pi = std::f64::consts::PI;
        let count = |pa: f64, k: f64, last: bool| laterals(pa, k, last, &p).0;
        assert_eq!(count(0.0, 4.0, false), 0); // whorled: only where a growth unit starts
        assert_eq!(laterals(0.0, 4.0, true, &p), (4, pi / 4.0)); // four, the next whorl between
        let tiers: Vec<u8> = (0..6).map(|k| count(1.0, k as f64, false)).collect();
        assert_eq!(tiers, vec![0, 0, 4, 0, 0, 4]);
        assert_eq!(laterals(2.0, 0.0, false, &p), (2, pi / 2.0)); // decussate
        assert_eq!(count(3.0, 0.0, true), 0);
        assert_eq!(count(7.0, 0.0, true), 0); // pa is capped at the last row
        let off = Params::from_json(&preset("default", "{}"));
        let (n, step) = laterals(0.0, 0.0, true, &off);
        assert_eq!(n, 1); // off: C1's spiral
        assert!((step - 137.5f64.to_radians()).abs() < 1e-12);
        let two = Params::from_json(&preset("default", r#"{"c1":{"phyllotaxis":"distichous"}}"#));
        assert_eq!(laterals(0.0, 0.0, true, &two), (1, pi));
    }

    #[test]
    fn reads_lambda_by_pa_and_lowers_it_after_age_a_c() {
        let p = with_r2(
            &[r#"{"lambda":0.56}"#, r#"{"lambda":0.52}"#],
            r#""aC":10,"dLambda":0.06,"ramp":20"#,
        );
        assert_eq!(lambda_at(0.0, 5.0, &p), 0.56);
        assert_eq!(lambda_at(3.0, 10.0, &p), 0.52);
        assert!((lambda_at(0.0, 20.0, &p) - 0.53).abs() < 1e-12);
        assert!((lambda_at(0.0, 100.0, &p) - 0.5).abs() < 1e-12);
        let off = Params::from_json(&preset("default", "{}"));
        assert_eq!(lambda_at(0.0, 100.0, &off), off.c3.lambda);
    }

    #[test]
    fn terminates_shoots_with_probability_p_term_deterministically() {
        let p = with_r2(
            &[r#"{"pTerm":0}"#, r#"{"pTerm":1}"#, r#"{"pTerm":0.5}"#],
            "",
        );
        let ids: Vec<f64> = (0..2000).map(|i| i as f64).collect();
        assert!(!ids.iter().any(|&id| terminates(0.0, 0.0, id, 3.0, 0.0, &p)));
        assert!(ids.iter().all(|&id| terminates(1.0, 0.0, id, 3.0, 0.0, &p)));
        let half = ids
            .iter()
            .filter(|&&id| terminates(2.0, 0.0, id, 3.0, 0.0, &p))
            .count() as f64
            / ids.len() as f64;
        assert!(half > 0.45 && half < 0.55, "{half}");
    }

    #[test]
    fn gives_each_pa_its_own_set_point_and_eta() {
        let p = with_r2(
            &[r#"{"setPoint":0,"eta":0.4}"#, r#"{"setPoint":85,"eta":2}"#],
            "",
        );
        assert_eq!(direction_params(&p, 0.0).set_point, 0.0);
        let one = direction_params(&p, 1.0);
        assert_eq!((one.set_point, one.eta, one.xi), (85.0, 2.0, p.c4.xi));
        assert_eq!(direction_params(&p, 4.0).set_point, 85.0);
        let off = Params::from_json(&preset("default", "{}"));
        assert_eq!(direction_params(&off, 3.0).set_point, off.c4.set_point);
    }

    #[test]
    fn ends_the_leader_from_relay_age_with_relay_p_term() {
        let rows = [r#"{"pTerm":0}"#, r#"{"pTerm":0.2}"#];
        let p = with_r2(&rows, r#""relay":2,"relayAge":30,"relayPTerm":0.7"#);
        assert_eq!(p_term_at(0.0, 29.0, &p), 0.0);
        assert_eq!(p_term_at(0.0, 30.0, &p), 0.7);
        assert_eq!(p_term_at(1.0, 30.0, &p), 0.2); // only pa 0 relays
        let off = with_r2(&rows, r#""relayAge":30,"relayPTerm":0.7"#); // relay absent: off
        assert_eq!(p_term_at(0.0, 50.0, &off), 0.0);
        let ids: Vec<f64> = (0..2000).map(|i| i as f64).collect();
        let ended = ids
            .iter()
            .filter(|&&id| terminates(0.0, 0.0, id, 3.0, 40.0, &p))
            .count() as f64
            / ids.len() as f64;
        assert!(ended > 0.65 && ended < 0.75, "{ended}");
    }

    /// A vertical trunk of four metamers, each with a lateral bud (slot 1), the top one with an
    /// ended terminal bud; and a pa-1 limb on the base with the same.
    fn ended_trunk() -> (Tree, Vec<usize>, usize) {
        use crate::testing::{LEFT, bud, metamer};
        use std::f64::consts::FRAC_PI_2;
        let mut t = Tree::new(0, 10.0, 0.5);
        let mut laterals = Vec::new();
        let mut parent = -1;
        for _ in 0..4 {
            let m = metamer(&mut t, parent, slot::MAIN, FRAC_PI_2, 1.0, 0.02, 0.0);
            laterals.push(bud(&mut t, m, LEFT, 2.0, 1.0));
            parent = m as i32;
        }
        let apex = bud(&mut t, parent as usize, slot::MAIN, FRAC_PI_2, 0.0);
        t.b.state[apex] = bud::TERMINATED;
        let limb = metamer(&mut t, 0, LEFT, 2.5, 1.0, 0.02, 0.0);
        let twig = bud(&mut t, limb, LEFT, 2.5, 2.0);
        let end = bud(&mut t, limb, slot::MAIN, 2.5, 1.0);
        t.b.state[end] = bud::TERMINATED;
        (t, laterals, twig)
    }

    #[test]
    fn relays_the_laterals_on_the_top_nodes_under_an_ended_leader() {
        let p = with_r2(&[r#"{}"#, r#"{}"#, r#"{}"#], r#""relay":2"#);
        let (t, laterals, twig) = ended_trunk();
        let depth = relay_depth(&t, t.m.len(), t.b.len());
        assert_eq!(&depth[..4], &[3.0, 2.0, 1.0, 0.0]);
        assert_eq!(depth[4], 0.0); // the limb's own ended apex
        let shifts: Vec<Option<f64>> = laterals
            .iter()
            .map(|&b| relay_shift(&t, b, &depth, &p))
            .collect();
        // The top two nodes' laterals take pa 0 (shift = order 1); the lower two stay limbs.
        assert_eq!(shifts, vec![None, None, Some(1.0), Some(1.0)]);
        // A pa-1 limb whose apex ended does not relay: only the trunk's row is passed on.
        assert_eq!(relay_shift(&t, twig, &depth, &p), None);
        assert!(!relay_on(&with_r2(&[r#"{}"#], "")));
    }

    #[test]
    fn a_relay_shoot_grows_as_pa_0_and_passes_it_to_its_subtree() {
        let p = with_r2(
            &[r#"{"generator":"opposite"}"#, r#"{"generator":"none"}"#],
            r#""relay":1"#,
        );
        let (mut t, laterals, _) = ended_trunk();
        t.ensure_scratch();
        for j in 0..t.b.len() {
            t.b.v[j] = 0.0;
        }
        let (top, low) = (laterals[3], laterals[0]);
        t.b.v[top] = 2.0;
        t.b.v[low] = 2.0;
        let nm = t.m.len();
        crate::season::grow_buds(&mut t, &p, 1.0);
        // Two shoots of two metamers: the low one first (bud order), then the relay.
        let (low_shoot, relay) = (nm, nm + 2);
        assert_eq!(t.m.order[relay], 1);
        assert_eq!(t.m.pa_shift[relay], 1); // pa 0
        assert_eq!(t.m.pa_shift[relay + 1], 1); // inherited along the shoot
        assert_eq!(t.m.pa_shift[low_shoot], 0); // pa 1: a limb
        // pa 0's opposite generator on the relay, pa 1's none on the limb.
        let on = |m: usize| {
            (0..t.b.len())
                .filter(|&j| t.b.metamer[j] as usize == m && t.b.slot[j] != slot::MAIN)
                .count()
        };
        assert_eq!(on(relay), 2);
        assert_eq!(on(low_shoot), 0);
        // Off, the same bud grows a limb.
        let off = with_r2(
            &[r#"{"generator":"opposite"}"#, r#"{"generator":"none"}"#],
            "",
        );
        let (mut t, laterals, _) = ended_trunk();
        t.ensure_scratch();
        for j in 0..t.b.len() {
            t.b.v[j] = 0.0;
        }
        t.b.v[laterals[3]] = 2.0;
        let nm = t.m.len();
        crate::season::grow_buds(&mut t, &off, 1.0);
        assert_eq!(t.m.pa_shift[nm], 0);
    }
}
