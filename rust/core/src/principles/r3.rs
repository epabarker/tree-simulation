//! R3. Mechanics: sag, posture control, stress-driven girth (spec §R3, ADR 0011; in 3D, ADR 0025).
//! After girth, a basipetal pass gives each metamer's base its load W and first moment S (a
//! 3-vector), and the bending moment M = (S − W·base) × (−ŷ) across its axis; stress
//! σ = 4|M|/(πr³) above σ_target adds local wood; the elastic curvature of this season's load
//! increment sets as sag, a rotation φ·l·ΔM/(E·πr⁴/4) about M, and reaction wood turns each
//! metamer toward its set-point (Bastien's AC model) within c·Δr/r. Rotations compose
//! acropetally. Breakage above σ_break (storms load high limbs more, and may throw a tree), and
//! with `r3.ground` limbs rest on the ground. E is wood's own, ≈ 4·10⁶ in these units (ADR
//! 0011: 2D had lowered it to 10⁶ because a planar limb carried less foliage than a real one).
//!
//! Params: r3.*, o2.stormLoad, r2 posture set-points, c4.setPoint, r6 leaf areas.

use super::c3::is_live_bud;
use super::c4::{horizontal_heading, set_point_direction};
use super::c5::remove_branches;
use super::r2::pa_level;
use super::r6::deposit_area;
use crate::geom::{
    IDENTITY, M3, V3, add, angle_between, apply, compose, cross, norm, normalize_or, reject,
    rotation, scale, sub, turn_between,
};
use crate::math;
use crate::params::{DEG, Params, R3};
use crate::rng::{purpose, uniform};
use crate::tree::{Tree, ensure, slot};

const PI: f64 = std::f64::consts::PI;
/// Windthrow: a storm's chance of throwing a 25 m tree, per unit of storm load (M16).
const THROW: f64 = 0.06;
/// Windthrow's slenderness ramp (ADR 0027): no risk up to H/D 80, the top of stand-grown trees'
/// band (spec §10: 60–80, risky above 80, slender above 100); 1 at 110, 2 from 140.
const SAFE_SLENDERNESS: f64 = 80.0;

/// The slenderness factor of a storm's chance of throwing a tree of height/diameter `hd`.
pub fn slenderness_risk(hd: f64) -> f64 {
    math::min(2.0, math::max(0.0, (hd - SAFE_SLENDERNESS) / 30.0))
}
/// Largest sag a metamer takes in one season, radians.
pub const MAX_SAG: f64 = 0.2;

/// Posture set-point A_set (radians from vertical) of an axis of order `order`.
pub fn posture_set_point(order: f64, params: &Params) -> f64 {
    match pa_level(order, &params.r2) {
        None => params.c4.set_point * DEG,
        Some(l) => l.posture_set_point.unwrap_or(l.set_point) * DEG,
    }
}

/// The posture turn (Bastien's AC model, in 3D) of a metamer heading `h` (reference `l`) with
/// set-point `set_point` (radians from vertical), its axis's previous heading `prev` (None at an
/// axis's base) and relative girth growth `dr`: a rotation vector toward the set-point direction
/// (β_g·sin θ) and toward the previous metamer (γ·kink), together at most c·Δr/r.
pub fn posture_turn(h: V3, l: V3, set_point: f64, prev: Option<V3>, dr: f64, r3: &R3) -> V3 {
    let target = set_point_direction(h, l, set_point);
    let toward = |to: V3| normalize_or(cross(h, to), [0.0; 3]);
    let mut want = scale(
        toward(target),
        r3.beta_g * math::sin(angle_between(h, target)),
    );
    if let Some(prev) = prev {
        want = add(want, scale(toward(prev), r3.gamma * angle_between(h, prev)));
    }
    let limit = r3.c * math::max(0.0, dr);
    let n = norm(want);
    if n > limit {
        if limit > 0.0 {
            scale(want, limit / n)
        } else {
            [0.0; 3]
        }
    } else {
        want
    }
}

/// The MECHANICS step of §6. Expects `tree.prev_radius` to hold the radii before girth.
pub fn update_mechanics(tree: &mut Tree, params: &Params, storm: bool, season: f64) {
    let r3 = &params.r3;
    let storm_load = if storm {
        params.o2.storm_load.unwrap_or(0.0)
    } else {
        0.0
    };
    let mut height = 0.0;
    if storm_load > 0.0 {
        for i in 0..tree.m.len() {
            height = math::max(height, tree.tip_y(i));
        }
    }
    let mut thrown = false;
    let nm = tree.m.len();
    for v in [&mut tree.load_w, &mut tree.stress, &mut tree.prev_radius] {
        ensure(v, nm);
    }
    // S, the first moment Σ w·p of each metamer's load, as (x, y, z) triples.
    ensure(&mut tree.load_s, 3 * nm);
    ensure(&mut tree.scratch_u, nm);
    tree.load_w[..nm].fill(0.0);
    tree.load_s[..3 * nm].fill(0.0);
    for j in 0..tree.b.len() {
        let state = tree.b.state[j];
        if !is_live_bud(state) {
            continue;
        }
        let m = tree.b.metamer[j] as usize;
        let w = r3.leaf_mass * deposit_area(state, &params.r6);
        let tip = tree.tip(m);
        tree.load_w[m] += w;
        for k in 0..3 {
            tree.load_s[3 * m + k] += w * tip[k];
        }
    }

    let sigma_t = r3.sigma_target;
    let mut any_break = false;
    // Each metamer's own turn (sag and posture) as a rotation vector, from the start-of-pass
    // geometry.
    let mut turn: Vec<V3> = vec![[0.0; 3]; nm];
    for i in (0..nm).rev() {
        let r = tree.m.radius[i];
        let l = tree.m.length[i];
        let (base, h, lref) = (tree.base(i), tree.heading(i), tree.reference(i));
        let wood = r3.rho * PI * r * r * l;
        let w = tree.load_w[i] + wood;
        let mut s = [0.0; 3];
        for k in 0..3 {
            s[k] = tree.load_s[3 * i + k] + wood * (base[k] + 0.5 * l * h[k]);
        }
        let p = tree.m.parent[i];
        if p >= 0 {
            let p = p as usize;
            tree.load_w[p] += w;
            for k in 0..3 {
                tree.load_s[3 * p + k] += s[k];
            }
        }
        // Gravity's moment about the base, (S − W·base) × (−ŷ); only its part across the axis
        // bends it (the part along it would twist, which the model leaves out).
        let a = sub(s, scale(base, w));
        let moment = reject([a[2], 0.0, -a[0]], h);
        let m_abs = norm(moment);

        let mut r_new = r;
        let mut sigma = (4.0 * m_abs) / (PI * r * r * r);
        if r3.girth_gain > 0.0 && sigma_t > 0.0 && sigma > sigma_t {
            let r_target = math::cbrt((4.0 * m_abs) / (PI * sigma_t));
            let dr = math::min(r3.girth_gain * r * (sigma / sigma_t - 1.0), r_target - r);
            r_new = r + dr;
            tree.m.radius[i] = r_new;
            tree.m.stress_wood[i] += dr;
            sigma = (4.0 * m_abs) / (PI * r_new * r_new * r_new);
        }
        tree.stress[i] = if sigma_t > 0.0 { sigma / sigma_t } else { 0.0 };
        let loaded = if storm_load > 0.0 {
            sigma * (1.0 + (storm_load * math::max(0.0, tree.m.base_y[i])) / math::max(1.0, height))
        } else {
            sigma
        };
        let breaks = r3.sigma_break > 0.0 && p >= 0 && loaded > r3.sigma_break;
        tree.scratch_u[i] = breaks as u8;
        if breaks {
            any_break = true;
        }
        if p < 0 && storm_load > 0.0 && r3.sigma_break > 0.0 {
            let slender = slenderness_risk(height / (2.0 * r_new));
            let chance =
                THROW * storm_load * math::pow(math::min(1.0, height / 100.0), 2.0) * slender;
            if uniform(params.seed, purpose::WIND, tree.id as f64, 1.0, season, 0.0) < chance {
                thrown = true;
            }
        }

        let previous = [tree.m.mx[i], tree.m.my[i], tree.m.mz[i]];
        let load = if r3.sag_increment {
            sub(moment, previous)
        } else {
            moment
        };
        (tree.m.mx[i], tree.m.my[i], tree.m.mz[i]) = (moment[0], moment[1], moment[2]);
        // Sag: the rotation φ·l·M/(E·πr⁴/4) about M itself (a load at +x turns +x down).
        let mut sag = scale(
            load,
            r3.phi * l / ((r3.e * PI * math::pow(r_new, 4.0)) / 4.0),
        );
        let sag_angle = norm(sag);
        if sag_angle > MAX_SAG {
            sag = scale(sag, MAX_SAG / sag_angle);
        }
        let mut post = [0.0; 3];
        if r3.posture {
            let prev = if p >= 0 && tree.m.slot[i] == slot::MAIN {
                Some(tree.heading(p as usize))
            } else {
                None
            };
            let before = if tree.prev_radius[i] > 0.0 {
                tree.prev_radius[i]
            } else {
                r_new
            };
            let dr = (r_new - before) / r_new;
            let pa = tree.m.order[i] as f64 - tree.m.pa_shift[i] as f64;
            post = posture_turn(h, lref, posture_set_point(pa, params), prev, dr, r3);
        }
        turn[i] = add(sag, post);
    }

    // Acropetal: each metamer turns by its own rotation and all of its parent's, then the
    // positions are rebuilt from the root.
    let mut total: Vec<M3> = vec![IDENTITY; nm];
    for i in 0..nm {
        let p = tree.m.parent[i];
        let own = rotation(turn[i]);
        total[i] = if p >= 0 {
            let p = p as usize;
            let tip = tree.tip(p);
            (tree.m.base_x[i], tree.m.base_y[i], tree.m.base_z[i]) = (tip[0], tip[1], tip[2]);
            compose(&total[p], &own)
        } else {
            own
        };
        let h = apply(&total[i], tree.heading(i));
        let l = apply(&total[i], tree.reference(i));
        tree.set_frame(i, h, l);
        if r3.ground && tree.tip_y(i) < 0.0 {
            // Resting on the ground: level, or reaching down to it from above, on its heading.
            let y = tree.m.base_y[i];
            let len = tree.m.length[i];
            let drop = if y > 0.0 {
                math::asin(math::min(1.0, y / len))
            } else {
                0.0
            };
            let flat = horizontal_heading(h, l);
            let rest = [
                math::cos(drop) * flat[0],
                -math::sin(drop),
                math::cos(drop) * flat[2],
            ];
            let g = rotation(turn_between(h, rest));
            total[i] = compose(&g, &total[i]);
            tree.set_frame(i, rest, normalize_or(reject(apply(&g, l), rest), l));
        }
    }
    for j in 0..tree.b.len() {
        if is_live_bud(tree.b.state[j]) {
            let m = tree.b.metamer[j] as usize;
            let h = apply(&total[m], tree.bud_heading(j));
            let l = apply(&total[m], tree.bud_reference(j));
            tree.set_bud_frame(j, h, l);
        }
    }

    if thrown {
        tree.alive = false;
        tree.broken = nm as f64;
        return;
    }
    if any_break {
        let mut breaks = std::mem::take(&mut tree.scratch_u);
        let mut stress = std::mem::take(&mut tree.stress);
        tree.broken = remove_branches(tree, &mut breaks, params, &mut [&mut stress]);
        tree.stress = stress;
        tree.scratch_u = breaks;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::principles::c6::{junction_exponents, update_girth};
    use crate::testing::{RIGHT, bud, metamer};
    use crate::testing::{angle, bud_angle, planar, preset};
    use crate::tree::bud;

    fn params(r3: &str, extra: &str) -> Params {
        let base = preset(
            "default",
            r#"{"c6":{"enabled":true},"r3":{"enabled":true,"posture":false,"girthGain":0}}"#,
        );
        let v = crate::json::merge(
            &base,
            &crate::json::parse(&format!(r#"{{"r3":{r3}}}"#)).unwrap(),
        );
        Params::from_json(&crate::json::merge(&v, &crate::json::parse(extra).unwrap()))
    }

    /// A horizontal limb of `n` metamers pointing right from x = 10, radius r, one leafy tip bud.
    fn limb(n: usize, r: f64) -> Tree {
        let mut t = Tree::new(0, 10.0, 0.5);
        let mut parent: i32 = -1;
        for _ in 0..n {
            parent = metamer(&mut t, parent, slot::MAIN, 0.0, 1.0, r, 0.0) as i32;
        }
        bud(&mut t, parent as usize, slot::MAIN, 0.0, 0.0);
        t.ensure_scratch();
        for i in 0..n {
            t.prev_radius[i] = r;
        }
        t
    }

    fn second_moment(r: f64) -> f64 {
        (PI * r.powi(4)) / 4.0
    }

    fn close(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() < eps
    }

    fn bend(t: &Tree, i: usize) -> f64 {
        norm([t.m.mx[i], t.m.my[i], t.m.mz[i]])
    }

    #[test]
    fn windthrow_spares_a_stand_grown_stem_and_ramps_past_h_d_80() {
        assert_eq!(slenderness_risk(10.0), 0.0);
        assert_eq!(slenderness_risk(78.0), 0.0);
        assert_eq!(slenderness_risk(80.0), 0.0);
        assert!((slenderness_risk(110.0) - 1.0).abs() < 1e-12);
        assert_eq!(slenderness_risk(140.0), 2.0);
        assert_eq!(slenderness_risk(400.0), 2.0);
    }

    #[test]
    fn bends_each_metamer_by_its_moment_and_carries_children_along() {
        let p = params(r#"{"sag":"creep","phi":0.5,"E":1e4,"leafMass":0.01}"#, "{}");
        let r = 0.1;
        let mut t = limb(2, r);
        update_mechanics(&mut t, &p, false, 0.0);
        let wood = PI * r * r;
        let m1 = wood * 0.5 + 0.01; // the second metamer about its own base (x = 11)
        let m0 = wood * 0.5 + wood * 1.5 + 0.01 * 2.0; // the first about the root
        // A limb along +x: the moment points along −z.
        assert!(close(t.m.mz[1], -m1, 1e-12) && close(t.m.mz[0], -m0, 1e-12));
        assert!(close(t.m.mx[0], 0.0, 1e-12) && close(t.m.my[0], 0.0, 1e-12));
        let turn0 = (-0.5 * m0) / (1e4 * second_moment(r));
        let turn1 = (-0.5 * m1) / (1e4 * second_moment(r));
        assert!(close(angle(&t, 0), turn0, 1e-12)); // clockwise: the limb droops
        assert!(close(angle(&t, 1), turn0 + turn1, 1e-12));
        assert!(close(t.m.base_x[1], 10.0 + turn0.cos(), 1e-12));
        assert!(close(t.m.base_y[1], turn0.sin(), 1e-12));
        assert!(close(t.m.hz[1], 0.0, 1e-12)); // it stays in its plane
        assert!(close(bud_angle(&t, 0), turn0 + turn1, 1e-12)); // buds turn with their metamer
    }

    #[test]
    fn a_limb_in_depth_droops_in_its_own_vertical_plane() {
        let p = params(r#"{"sag":"creep","phi":0.5,"E":1e4,"leafMass":0.01}"#, "{}");
        let mut t = Tree::new(0, 10.0, 0.5);
        let z = [0.0, 0.0, 1.0];
        let up = [0.0, 1.0, 0.0];
        let m =
            crate::principles::c1::add_metamer(&mut t, -1, slot::MAIN, z, up, 0.0, 1.0, 0.1, 0.0);
        crate::principles::c1::add_bud(&mut t, m, slot::MAIN, z, up, 0.0, 0.0);
        t.ensure_scratch();
        t.prev_radius[0] = 0.1;
        update_mechanics(&mut t, &p, false, 0.0);
        // Along +z, the moment points along +x, and the tip drops in the y–z plane.
        assert!(t.m.mx[0] > 0.0 && close(t.m.mz[0], 0.0, 1e-12));
        assert!(t.m.hy[0] < 0.0 && close(t.m.hx[0], 0.0, 1e-12));
        let h = t.heading(0);
        let l = t.reference(0);
        assert!(close(norm(h), 1.0, 1e-12) && close(crate::geom::dot(h, l), 0.0, 1e-12));
    }

    #[test]
    fn only_the_load_increment_sets_by_default() {
        let run = |sag: &str| {
            let p = params(
                &format!(r#"{{"sag":"{sag}","E":1e4,"leafMass":0.01}}"#),
                "{}",
            );
            let mut t = limb(3, 0.1);
            update_mechanics(&mut t, &p, false, 0.0);
            let first = angle(&t, 0);
            update_mechanics(&mut t, &p, false, 0.0);
            (first, angle(&t, 0) - first)
        };
        let (first, second) = run("increment");
        assert!(first < 0.0);
        assert!(second.abs() < 0.05 * first.abs());
        let (first, second) = run("creep");
        assert!(second < 0.8 * first); // creep keeps bending
    }

    #[test]
    fn a_limb_springs_back_up_when_its_load_drops() {
        let p = params(r#"{"E":1e4,"leafMass":0.05}"#, "{}");
        let mut t = limb(3, 0.1);
        update_mechanics(&mut t, &p, false, 0.0);
        let before = angle(&t, 0);
        t.b.state[0] = bud::GONE; // the leaves go
        update_mechanics(&mut t, &p, false, 0.0);
        assert!(angle(&t, 0) > before);
    }

    #[test]
    fn posture_turns_toward_the_set_point_within_c_dr_over_r() {
        let r3 = R3 {
            beta_g: 0.1,
            gamma: 0.2,
            c: 1.0,
            ..params("{}", "{}").r3
        };
        // In the x–y plane a turn is about z: its z component is the 2D turn.
        let turn = |a: f64, set: f64, prev: Option<f64>, dr: f64| {
            let (h, l) = planar(a);
            posture_turn(h, l, set, prev.map(|p| planar(p).0), dr, &r3)[2]
        };
        let h = PI / 2.0;
        assert!(close(
            turn(h + 0.3, 0.0, None, 1.0),
            -0.1 * 0.3f64.sin(),
            1e-12
        ));
        assert!(turn(h - 0.3, 0.0, None, 1.0) > 0.0);
        assert!(turn(0.2, 80.0 * DEG, None, 1.0) < 0.0);
        assert!(turn(PI - 0.2, 80.0 * DEG, None, 1.0) > 0.0);
        assert!(close(turn(h, 0.0, Some(h - 0.1), 1.0), -0.02, 1e-12)); // a kink straightens
        assert!(close(turn(h + 1.0, 0.0, None, 0.0), 0.0, 1e-12)); // no new girth
        assert!(close(turn(h + 1.0, 0.0, None, 0.01), -0.01, 1e-12));
        // A shoot leaning toward +z rights itself about x, back toward vertical.
        let lean = [0.0, 0.5f64.cos(), 0.5f64.sin()];
        let w = posture_turn(lean, [1.0, 0.0, 0.0], 0.0, None, 1.0, &r3);
        assert!(w[0] < 0.0 && close(w[1], 0.0, 1e-12) && close(w[2], 0.0, 1e-12));
    }

    #[test]
    fn rights_a_leaning_stem_only_as_fast_as_it_thickens() {
        let p = params(r#"{"posture":true,"E":1e12,"betaG":0.2,"c":1}"#, "{}");
        let lean = |grown: f64| {
            let mut t = limb(1, 0.1);
            let (h, l) = planar(PI / 2.0 + 0.5);
            t.set_frame(0, h, l);
            t.prev_radius[0] = 0.1 / (1.0 + grown);
            update_mechanics(&mut t, &p, false, 0.0);
            PI / 2.0 + 0.5 - angle(&t, 0)
        };
        assert!(close(lean(0.0), 0.0, 1e-6));
        assert!(close(lean(0.01), 0.01 / 1.01, 1e-6)); // clamped at c·Δr/r
        assert!(close(lean(1.0), 0.2 * 0.5f64.sin(), 1e-6)); // the full gravitropic turn
    }

    #[test]
    fn stress_wood_reaches_sigma_target_and_stays_out_of_the_pipe_sum() {
        let p = params(
            r#"{"E":1e12,"sigmaTarget":2e4,"girthGain":1,"leafMass":1}"#,
            "{}",
        );
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = metamer(&mut t, -1, slot::MAIN, PI / 2.0, 1.0, 0.05, 0.0);
        let top = metamer(&mut t, trunk as i32, slot::MAIN, PI / 2.0, 1.0, 0.05, 0.0);
        let side = metamer(&mut t, trunk as i32, RIGHT, 0.0, 3.0, 0.05, 0.0);
        bud(&mut t, top, slot::MAIN, PI / 2.0, 0.0);
        bud(&mut t, side, slot::MAIN, 0.0, 1.0);
        t.ensure_scratch();
        update_girth(&mut t, &p);
        let radius = t.m.radius.clone();
        t.prev_radius[..3].copy_from_slice(&radius[..3]);
        let mut d = Vec::new();
        junction_exponents(&t, &mut d);
        assert!(close(d[0], 2.0, 1e-6));
        update_mechanics(&mut t, &p, false, 0.0);
        assert!(t.m.stress_wood[side] > 0.0);
        assert!(t.stress[side] <= 1.0 + 1e-9); // never past σ_target
        let r = t.m.radius[side];
        assert!(close((4.0 * bend(&t, side)) / (PI * r.powi(3)), 2e4, 1e-6));
        assert_eq!(t.m.stress_wood[trunk], 0.0);
        update_girth(&mut t, &p);
        assert!(close(
            t.m.radius[trunk],
            (0.05f64.powi(2) * 2.0).sqrt(),
            1e-12
        )); // pipes only
        let mut d = Vec::new();
        junction_exponents(&t, &mut d);
        assert!(d[0] > 2.1);
    }

    #[test]
    fn breaks_an_overstressed_limb_leaving_a_scar_and_a_banked_bud() {
        let p = params(
            r#"{"E":1e12,"sigmaBreak":1e4,"leafMass":1}"#,
            r#"{"r4":{"enabled":true}}"#,
        );
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = metamer(&mut t, -1, slot::MAIN, PI / 2.0, 1.0, 0.1, 0.0);
        let side = metamer(&mut t, trunk as i32, RIGHT, 0.0, 3.0, 0.05, 0.0);
        let tip = metamer(&mut t, side as i32, slot::MAIN, 0.0, 1.0, 0.05, 0.0);
        bud(&mut t, tip, slot::MAIN, 0.0, 1.0);
        t.ensure_scratch();
        let radius = t.m.radius.clone();
        t.prev_radius[..3].copy_from_slice(&radius[..3]);
        update_mechanics(&mut t, &p, false, 0.0);
        assert_eq!(t.broken, 2.0);
        assert_eq!(t.m.len(), 1);
        assert!(close(t.m.scar_sum_n[0], 0.05f64.powi(2), 1e-12));
        assert_eq!(t.b.state[0], bud::GONE);
        assert_eq!(t.b.state[1], bud::DORMANT); // the bud bank
        assert_eq!(t.b.slot[1], RIGHT);
    }

    #[test]
    fn a_limb_below_ground_rests_on_it_keeping_its_azimuth() {
        let p = params(r#"{"E":1e12,"ground":true}"#, "{}");
        let mut t = Tree::new(0, 10.0, 0.5);
        let down = crate::geom::normalize_or([1.0, -1.0, 1.0], crate::geom::UP);
        let l = crate::geom::any_perpendicular(down);
        crate::principles::c1::add_metamer(&mut t, -1, slot::MAIN, down, l, 0.0, 2.0, 0.1, 0.0);
        t.ensure_scratch();
        t.prev_radius[0] = 0.1;
        update_mechanics(&mut t, &p, false, 0.0);
        let h = t.heading(0);
        assert!(close(h[1], 0.0, 1e-12)); // level on the ground
        assert!(close(h[0], h[2], 1e-12) && h[0] > 0.0); // the same way as before
    }
}
