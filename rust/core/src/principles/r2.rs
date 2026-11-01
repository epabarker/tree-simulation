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
//! Curvature along the limb (ADR 0034, proposed; Weber & Penn 1995's nCurve): a level's `curve`
//! adds curve·min(1, k/curveLength) degrees to its set points (C4's growth, R3's posture) at node
//! k of an axis, so the limb bends as it lengthens instead of holding one angle: an ascending limb
//! arches over (beech's fan, oak's spread), a negative curve sweeps up. The trunk (order 0) is
//! exempt: it is the one axis that stays straight; a relay (order ≥ 1 at pa 0) curves.
//!
//! Pendulous twigs (ADR 0035, proposed): a level's `pendulous` set point is taken, in growth and
//! posture, by its thin axes: fully at pipe radius ≤ `pendulousRadius`, fading to the level's
//! own set point at twice it. Twigs hang (birch's curtains, the willow's) without taking the
//! scaffold with them, which one set point per level cannot do (≥ 80 for level 2 collapses
//! every broadleaf: the form-sweep review). The trunk (order 0) never hangs.
//!
//! Twig density (ADR 0036, proposed): a level's own `kappa` (acrotony at its nodes, in place of
//! r2.kappa) and `lateralEvery` (laterals only at every k-th node of its axes) set how many fine
//! shoots a limb carries and where along it.
//!
//! Params: r2.enabled, r2.levels (curve, curveLength, pendulous, pendulousRadius, kappa,
//! lateralEvery), r2.aC, r2.dLambda, r2.ramp, r2.kappa, r2.relay,
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
    // Twig density (ADR 0036): laterals only at every k-th node.
    if let Some(every) = level.lateral_every
        && every > 1.0
        && level.generator != Generator::Whorled
        && (axis_node + 1.0) % every.floor() != 0.0
    {
        return (0, 0.0);
    }
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

/// The curve's offset to the set points, degrees, at node `axis_node` of an axis of branching
/// order `order` and physiological age `pa` (0 for the trunk itself and when off).
pub fn curve_offset(order: f64, pa: f64, axis_node: f64, params: &Params) -> f64 {
    if order <= 0.0 {
        return 0.0;
    }
    let Some(level) = pa_level(pa, &params.r2) else {
        return 0.0;
    };
    let curve = level.curve.unwrap_or(0.0);
    if curve == 0.0 {
        return 0.0;
    }
    let length = math::max(1.0, level.curve_length.unwrap_or(20.0));
    curve * math::min(1.0, math::max(0.0, axis_node) / length)
}

/// A set point (degrees) moved by the curve's offset, kept within [0°, 180°].
pub fn curved(set_point: f64, offset: f64) -> f64 {
    if offset == 0.0 {
        return set_point;
    }
    math::max(0.0, math::min(180.0, set_point + offset))
}

/// True if axes of physiological age `pa` have a pendulous set point.
pub fn hangs(pa: f64, params: &Params) -> bool {
    pa_level(pa, &params.r2).is_some_and(|l| l.pendulous.is_some())
}

/// A set point (degrees) of an axis of branching order `order` and physiological age `pa`,
/// moved toward its level's pendulous set point by the thinness of wood of radius `radius`.
pub fn pendulous_set_point(
    set_point: f64,
    order: f64,
    pa: f64,
    radius: f64,
    params: &Params,
) -> f64 {
    if order <= 0.0 {
        return set_point;
    }
    let Some(level) = pa_level(pa, &params.r2) else {
        return set_point;
    };
    let Some(hang) = level.pendulous else {
        return set_point;
    };
    let r_t = level.pendulous_radius.unwrap_or(0.01);
    let w = if r_t > 0.0 {
        math::max(0.0, math::min(1.0, (2.0 * r_t - radius) / r_t))
    } else {
        0.0
    };
    set_point + w * (hang - set_point)
}

/// Acrotony weights exp(κ(pos − 1)) per metamer in `tree.scratch_f` (first nm entries), pos its
/// node's place in the shoot it grew with. False when κ is 0 (no weights).
pub fn acrotony_weights(tree: &mut Tree, params: &Params) -> bool {
    let kappa = if params.r2.enabled {
        params.r2.kappa.unwrap_or(0.0)
    } else {
        0.0
    };
    // Twig density (ADR 0036): a level may carry its own κ.
    let per_level = params.r2.enabled && params.r2.levels.iter().any(|l| l.kappa.is_some());
    if kappa == 0.0 && !per_level {
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
        let k = if per_level {
            let pa = tree.m.order[i] as f64 - tree.m.pa_shift[i] as f64;
            pa_level(pa, &params.r2)
                .and_then(|l| l.kappa)
                .unwrap_or(kappa)
        } else {
            kappa
        };
        w[i] = math::exp(k * (pos - 1.0));
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

    #[test]
    fn curves_a_limbs_set_point_along_its_length_but_never_the_trunks() {
        let p = with_r2(&[r#"{"curve":30}"#, r#"{"curve":-40,"curveLength":4}"#], "");
        assert_eq!(curve_offset(0.0, 0.0, 50.0, &p), 0.0); // the trunk stays straight
        assert_eq!(curve_offset(1.0, 0.0, 10.0, &p), 15.0); // a relay: default length 20
        assert_eq!(curve_offset(1.0, 1.0, 0.0, &p), 0.0);
        assert_eq!(curve_offset(1.0, 1.0, 2.0, &p), -20.0);
        assert_eq!(curve_offset(2.0, 1.0, 9.0, &p), -40.0); // held past curveLength
        assert_eq!(curved(30.0, -40.0), 0.0);
        assert_eq!(curved(160.0, 40.0), 180.0);
        let off = with_r2(&[r#"{}"#, r#"{}"#], "");
        assert_eq!(curve_offset(1.0, 1.0, 9.0, &off), 0.0);
    }

    #[test]
    fn a_curved_limb_bends_further_from_vertical_node_by_node() {
        use crate::geom::{UP, angle_between};
        use crate::testing::{LEFT, bud, metamer};
        use std::f64::consts::FRAC_PI_2;
        let angles = |curve: &str| {
            let row = format!(r#"{{"setPoint":45,"eta":1{curve}}}"#);
            let mut p = with_r2(&[r#"{}"#, &row], "");
            p.c4.enabled = true;
            (p.c4.wd, p.c4.xi, p.c4.epsilon, p.c4.sigma) = (0.2, 0.0, 0.0, 0.0);
            let mut t = Tree::new(0, 10.0, 0.5);
            let m = metamer(&mut t, -1, slot::MAIN, FRAC_PI_2, 1.0, 0.02, 0.0);
            let b = bud(&mut t, m, LEFT, FRAC_PI_2 + 0.785, 1.0);
            t.ensure_scratch();
            t.b.v[b] = 3.0;
            crate::season::grow_buds(&mut t, &p, 1.0);
            (1..t.m.len())
                .map(|i| angle_between(t.heading(i), UP).to_degrees())
                .collect::<Vec<f64>>()
        };
        let straight = angles("");
        let curved = angles(r#","curve":90,"curveLength":2"#);
        assert_eq!(straight.len(), 3);
        assert!(
            straight.iter().all(|a| (a - 45.0).abs() < 2.0),
            "{straight:?}"
        );
        assert!(curved[0] < curved[1] && curved[1] < curved[2], "{curved:?}");
        assert!(curved[2] > 90.0, "{curved:?}");
    }

    #[test]
    fn hangs_thin_axes_and_lets_thick_ones_rise_to_the_level() {
        let p = with_r2(
            &[
                r#"{"pendulous":150}"#,
                r#"{"setPoint":40,"pendulous":150,"pendulousRadius":0.01}"#,
            ],
            "",
        );
        assert_eq!(pendulous_set_point(0.0, 0.0, 0.0, 0.0, &p), 0.0); // the trunk never hangs
        assert_eq!(pendulous_set_point(40.0, 1.0, 1.0, 0.005, &p), 150.0); // thin: hangs fully
        assert_eq!(pendulous_set_point(40.0, 1.0, 1.0, 0.01, &p), 150.0);
        assert!((pendulous_set_point(40.0, 1.0, 1.0, 0.015, &p) - 95.0).abs() < 1e-9);
        assert_eq!(pendulous_set_point(40.0, 1.0, 1.0, 0.03, &p), 40.0); // a limb: its level's
        assert!(hangs(1.0, &p));
        let off = with_r2(&[r#"{}"#, r#"{"setPoint":40}"#], "");
        assert!(!hangs(1.0, &off));
        assert_eq!(pendulous_set_point(40.0, 1.0, 1.0, 0.0, &off), 40.0);
    }

    #[test]
    fn a_new_twig_grows_down_where_its_level_hangs() {
        use crate::geom::{UP, angle_between};
        use crate::testing::{LEFT, bud, metamer};
        use std::f64::consts::FRAC_PI_2;
        let last_angle = |row: &str| {
            let mut p = with_r2(&[r#"{}"#, row], "");
            p.c4.enabled = true;
            (p.c4.wd, p.c4.xi, p.c4.epsilon, p.c4.sigma) = (0.2, 0.0, 0.0, 0.0);
            let mut t = Tree::new(0, 10.0, 0.5);
            let m = metamer(&mut t, -1, slot::MAIN, FRAC_PI_2, 1.0, 0.02, 0.0);
            let b = bud(&mut t, m, LEFT, FRAC_PI_2 + 0.785, 1.0);
            t.ensure_scratch();
            t.b.v[b] = 3.0;
            crate::season::grow_buds(&mut t, &p, 1.0);
            angle_between(t.heading(t.m.len() - 1), UP).to_degrees()
        };
        let level = last_angle(r#"{"setPoint":45,"eta":1}"#);
        let hung = last_angle(r#"{"setPoint":45,"eta":1,"pendulous":160}"#);
        assert!((level - 45.0).abs() < 2.0, "{level}");
        assert!(hung > 120.0, "{hung}");
    }

    #[test]
    fn spaces_laterals_every_k_nodes_where_the_level_says() {
        let p = with_r2(
            &[
                r#"{"generator":"spiral","lateralEvery":3}"#,
                r#"{"generator":"opposite","lateralEvery":2}"#,
            ],
            "",
        );
        let count = |pa: f64, k: f64| laterals(pa, k, false, &p).0;
        let trunk: Vec<u8> = (0..6).map(|k| count(0.0, k as f64)).collect();
        assert_eq!(trunk, vec![0, 0, 1, 0, 0, 1]);
        let limb: Vec<u8> = (0..4).map(|k| count(1.0, k as f64)).collect();
        assert_eq!(limb, vec![0, 2, 0, 2]);
        let every = with_r2(&[r#"{"generator":"spiral","lateralEvery":1}"#], "");
        assert_eq!(laterals(0.0, 0.0, false, &every).0, 1);
    }

    #[test]
    fn gives_a_level_its_own_acrotony() {
        use std::f64::consts::FRAC_PI_2;
        let shoot = |p: &Params| {
            let mut t = Tree::new(0, 10.0, 0.5);
            let mut parent = -1;
            for _ in 0..3 {
                parent =
                    crate::testing::metamer(&mut t, parent, slot::MAIN, FRAC_PI_2, 1.0, 0.02, 0.0)
                        as i32;
            }
            let on = acrotony_weights(&mut t, p);
            (
                on,
                if on {
                    t.scratch_f[..3].to_vec()
                } else {
                    Vec::new()
                },
            )
        };
        let (on, w) = shoot(&with_r2(&[r#"{"kappa":2}"#], ""));
        assert!(on);
        let want = [(-2.0f64).exp(), (-1.0f64).exp(), 1.0];
        assert!((0..3).all(|k| (w[k] - want[k]).abs() < 1e-12), "{w:?}");
        // A level's κ overrides the tree's; absent everywhere and κ 0: no weights.
        let (_, w) = shoot(&with_r2(&[r#"{"kappa":0}"#], r#""kappa":3"#));
        assert!(w.iter().all(|&x| x == 1.0), "{w:?}");
        assert!(!shoot(&with_r2(&[r#"{}"#], "")).0);
    }
}
