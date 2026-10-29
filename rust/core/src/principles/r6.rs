//! R6. Short shoots (spec §R6, ADR 0006; r6-short-shoots.ts). A bud too weak to extend but lit at
//! Q ≥ Q_ss becomes a leafy short shoot; foliage follows shoot type (active 1, short shoot a_ss,
//! dormant 0), and a short shoot's Q counts a_ss times in the basipetal sum.
//!
//! Params: r6.enabled, r6.qMin (Q_ss), r6.leafArea (a_ss).

use crate::params::R6;
use crate::tree::bud;

/// Leaf area a live bud deposits into the light field.
pub fn deposit_area(state: u8, r6: &R6) -> f64 {
    if !r6.enabled {
        return 1.0;
    }
    if state == bud::SHORT_SHOOT {
        return r6.leaf_area;
    }
    if state == bud::ACTIVE { 1.0 } else { 0.0 }
}

/// Weight of a live bud's Q in the basipetal sum.
pub fn light_weight(state: u8, r6: &R6) -> f64 {
    if r6.enabled && state == bud::SHORT_SHOOT {
        r6.leaf_area
    } else {
        1.0
    }
}

/// Fate of a live bud that grows no shoot this season.
pub fn resting_state(q: f64, r6: &R6) -> u8 {
    if r6.enabled && q >= r6.q_min {
        bud::SHORT_SHOOT
    } else {
        bud::DORMANT
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::Params;
    use crate::principles::c3::gather_light;
    use crate::testing::preset;
    use crate::testing::{LEFT, bud, metamer};
    use crate::tree::{Tree, slot};
    use crate::world::World;

    fn on() -> R6 {
        Params::from_json(&preset(
            "default",
            r#"{"r6":{"enabled":true,"qMin":0.3,"leafArea":2}}"#,
        ))
        .r6
    }

    fn off() -> R6 {
        Params::from_json(&preset("default", "{}")).r6
    }

    #[test]
    fn rests_a_bud_as_a_short_shoot_when_lit_enough() {
        assert_eq!(resting_state(0.5, &on()), bud::SHORT_SHOOT);
        assert_eq!(resting_state(0.3, &on()), bud::SHORT_SHOOT);
        assert_eq!(resting_state(0.29, &on()), bud::DORMANT);
        assert_eq!(resting_state(0.9, &off()), bud::DORMANT);
    }

    #[test]
    fn foliage_follows_shoot_type() {
        assert_eq!(deposit_area(bud::ACTIVE, &on()), 1.0);
        assert_eq!(deposit_area(bud::SHORT_SHOOT, &on()), 2.0);
        assert_eq!(deposit_area(bud::DORMANT, &on()), 0.0);
        assert_eq!(deposit_area(bud::ACTIVE, &off()), 1.0);
        assert_eq!(deposit_area(bud::DORMANT, &off()), 1.0);
        assert_eq!(light_weight(bud::SHORT_SHOOT, &on()), 2.0);
        assert_eq!(light_weight(bud::DORMANT, &on()), 1.0);
    }

    #[test]
    fn a_short_shoots_light_counts_by_its_leaf_area() {
        let up = std::f64::consts::FRAC_PI_2;
        let mut t = Tree::new(0, 10.0, 0.5);
        let root = metamer(&mut t, -1, slot::MAIN, up, 1.0, 0.02, 0.0);
        bud(&mut t, root, slot::MAIN, up, 0.0);
        bud(&mut t, root, LEFT, up, 1.0);
        t.b.q[0] = 0.5;
        t.b.q[1] = 0.4;
        t.b.state[1] = bud::SHORT_SHOOT;
        t.ensure_scratch();
        gather_light(&mut t, &on());
        assert!((t.q_base - (0.5 + 2.0 * 0.4)).abs() < 1e-12);
        gather_light(&mut t, &off());
        assert!((t.q_base - 0.9).abs() < 1e-12);
    }

    #[test]
    fn forms_short_shoots_only_when_on_and_they_can_still_break() {
        let run = |enabled: bool| {
            let patch = format!(r#"{{"r6":{{"enabled":{enabled}}},"c5":{{"enabled":false}}}}"#);
            let mut world = World::new(preset("skyTree", &patch));
            let mut broke = 0;
            for _ in 0..30 {
                let t = &world.trees[0];
                let resting: Vec<i32> = (0..t.b.len())
                    .filter(|&i| t.b.state[i] == bud::SHORT_SHOOT)
                    .map(|i| t.b.birth_id[i])
                    .collect();
                world.step(&mut |_| {});
                let t = &world.trees[0];
                let after: std::collections::HashSet<i32> = t.b.birth_id.iter().copied().collect();
                broke += resting.iter().filter(|id| !after.contains(id)).count();
            }
            let t = &world.trees[0];
            let short = t.b.state.iter().filter(|&&s| s == bud::SHORT_SHOOT).count();
            (short, broke)
        };
        assert_eq!(run(false).0, 0);
        let (short, broke) = run(true);
        assert!(short > 0 && broke > 0);
    }
}
