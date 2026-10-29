//! R2. Physiological age and axis differentiation (spec §R2, ADR 0009; r2-physiological-age.ts).
//! pa = min(order, levels − 1) picks a row of the table: λ (C3), A_set and η (C4), β (C1), the
//! lateral generator and p_term (sympodial growth); ontogeny lowers λ from age a_c; acrotony κ
//! weights each node's laterals by their place in the season's shoot.
//!
//! Params: r2.enabled, r2.levels, r2.aC, r2.dLambda, r2.ramp, r2.kappa; c1.branchAngle,
//! c3.lambda, c4.setPoint, c4.eta when off.

use crate::math;
use crate::params::{C4, Generator, PaLevel, Params, Phyllotaxis, R2};
use crate::rng::{purpose, uniform};
use crate::tree::{Tree, ensure};

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

/// True if the terminal bud ending a shoot at metamer `birth_id` terminates (sympodial growth).
pub fn terminates(order: f64, tree_id: f64, birth_id: f64, season: f64, params: &Params) -> bool {
    let Some(level) = pa_level(order, &params.r2) else {
        return false;
    };
    if level.p_term <= 0.0 {
        return false;
    }
    uniform(
        params.seed,
        purpose::SYMPODIAL_TERMINATION,
        tree_id,
        birth_id,
        season,
        0.0,
    ) < level.p_term
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
        assert!(!ids.iter().any(|&id| terminates(0.0, 0.0, id, 3.0, &p)));
        assert!(ids.iter().all(|&id| terminates(1.0, 0.0, id, 3.0, &p)));
        let half = ids
            .iter()
            .filter(|&&id| terminates(2.0, 0.0, id, 3.0, &p))
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
}
