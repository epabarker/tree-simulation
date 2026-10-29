//! R3. Mechanics: sag, posture control, stress-driven girth (spec §R3, ADR 0011;
//! r3-mechanics.ts). After girth, a basipetal pass gives each metamer's base its load W, first
//! moment S and bending moment M = S − W·x_base; stress σ = 4|M|/(πr³) above σ_target adds local
//! wood; the elastic curvature of this season's load increment sets as sag, and reaction wood
//! turns each metamer toward its set-point (Bastien's AC model) within c·Δr/r. Turns accumulate
//! acropetally. Breakage above σ_break (storms load high limbs more, and may throw a tree), and
//! with `r3.ground` limbs rest on the ground.
//!
//! Params: r3.*, o2.stormLoad, r2 posture set-points, c4.setPoint, r6 leaf areas.

use super::c3::is_live_bud;
use super::c5::remove_branches;
use super::r2::pa_level;
use super::r6::deposit_area;
use crate::math;
use crate::params::{DEG, Params, R3};
use crate::rng::{purpose, uniform};
use crate::tree::{Tree, ensure, slot};

const PI: f64 = std::f64::consts::PI;
/// Windthrow: a storm's chance of throwing a 25 m tree, per unit of storm load (M16).
const THROW: f64 = 0.06;
/// Largest sag a metamer takes in one season, radians.
pub const MAX_SAG: f64 = 0.2;

/// Posture set-point A_set (radians from vertical) of an axis of order `order`.
pub fn posture_set_point(order: f64, params: &Params) -> f64 {
    match pa_level(order, &params.r2) {
        None => params.c4.set_point * DEG,
        Some(l) => l.posture_set_point.unwrap_or(l.set_point) * DEG,
    }
}

/// An angle wrapped into (−π, π].
pub fn wrap_angle(a: f64) -> f64 {
    let mut x = a % (2.0 * PI);
    if x > PI {
        x -= 2.0 * PI;
    } else if x <= -PI {
        x += 2.0 * PI;
    }
    x
}

/// Posture turn of a metamer at `angle` with set-point `set_point`, kink to the previous
/// metamer of its axis, and relative girth growth `dr`.
pub fn posture_turn(angle: f64, set_point: f64, kink: f64, dr: f64, r3: &R3) -> f64 {
    let side = if math::cos(angle) >= 0.0 { 1.0 } else { -1.0 };
    let target = PI / 2.0 - side * set_point;
    let want = -r3.beta_g * math::sin(wrap_angle(angle - target)) - r3.gamma * kink;
    let limit = r3.c * math::max(0.0, dr);
    math::min(limit, math::max(-limit, want))
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
    for v in [
        &mut tree.load_w,
        &mut tree.load_s,
        &mut tree.stress,
        &mut tree.prev_radius,
        &mut tree.scratch_f,
    ] {
        ensure(v, nm);
    }
    ensure(&mut tree.scratch_u, nm);
    tree.load_w[..nm].fill(0.0);
    tree.load_s[..nm].fill(0.0);
    for j in 0..tree.b.len() {
        let state = tree.b.state[j];
        if !is_live_bud(state) {
            continue;
        }
        let m = tree.b.metamer[j] as usize;
        let w = r3.leaf_mass * deposit_area(state, &params.r6);
        let x = tree.tip_x(m);
        tree.load_w[m] += w;
        tree.load_s[m] += w * x;
    }

    let sigma_t = r3.sigma_target;
    let mut any_break = false;
    for i in (0..nm).rev() {
        let c = &mut tree.m;
        let r = c.radius[i];
        let l = c.length[i];
        let x0 = c.base_x[i];
        let wood = r3.rho * PI * r * r * l;
        let w = tree.load_w[i] + wood;
        let s = tree.load_s[i] + wood * (x0 + 0.5 * l * math::cos(c.angle[i]));
        let moment = s - w * x0;
        let p = c.parent[i];
        if p >= 0 {
            tree.load_w[p as usize] += w;
            tree.load_s[p as usize] += s;
        }

        let mut r_new = r;
        let mut sigma = (4.0 * moment.abs()) / (PI * r * r * r);
        if r3.girth_gain > 0.0 && sigma_t > 0.0 && sigma > sigma_t {
            let r_target = math::cbrt((4.0 * moment.abs()) / (PI * sigma_t));
            let dr = math::min(r3.girth_gain * r * (sigma / sigma_t - 1.0), r_target - r);
            r_new = r + dr;
            c.radius[i] = r_new;
            c.stress_wood[i] += dr;
            sigma = (4.0 * moment.abs()) / (PI * r_new * r_new * r_new);
        }
        tree.stress[i] = if sigma_t > 0.0 { sigma / sigma_t } else { 0.0 };
        let loaded = if storm_load > 0.0 {
            sigma * (1.0 + (storm_load * math::max(0.0, c.base_y[i])) / math::max(1.0, height))
        } else {
            sigma
        };
        let breaks = r3.sigma_break > 0.0 && p >= 0 && loaded > r3.sigma_break;
        tree.scratch_u[i] = breaks as u8;
        if breaks {
            any_break = true;
        }
        if p < 0 && storm_load > 0.0 && r3.sigma_break > 0.0 {
            let slender = math::min(2.0, math::max(0.0, (height / (2.0 * r_new) - 40.0) / 30.0));
            let chance =
                THROW * storm_load * math::pow(math::min(1.0, height / 100.0), 2.0) * slender;
            if uniform(params.seed, purpose::WIND, tree.id as f64, 1.0, season, 0.0) < chance {
                thrown = true;
            }
        }

        let load = if r3.sag_increment {
            moment - c.moment[i]
        } else {
            moment
        };
        c.moment[i] = moment;
        let kappa = load / ((r3.e * PI * math::pow(r_new, 4.0)) / 4.0);
        let sag = math::min(MAX_SAG, math::max(-MAX_SAG, -r3.phi * kappa * l));
        let mut post = 0.0;
        if r3.posture {
            let a = c.angle[i];
            let kink = if p >= 0 && c.slot[i] == slot::MAIN {
                wrap_angle(a - c.angle[p as usize])
            } else {
                0.0
            };
            let prev = if tree.prev_radius[i] > 0.0 {
                tree.prev_radius[i]
            } else {
                r_new
            };
            let dr = (r_new - prev) / r_new;
            let set_point = posture_set_point(c.order[i] as f64 - c.pa_shift[i] as f64, params);
            post = posture_turn(a, set_point, kink, dr, r3);
        }
        tree.scratch_f[i] = sag + post;
    }

    // Acropetal: accumulate turns, rotate, rebuild positions from the root.
    for i in 0..nm {
        let p = tree.m.parent[i];
        if p >= 0 {
            let p = p as usize;
            tree.scratch_f[i] += tree.scratch_f[p];
            tree.m.base_x[i] = tree.tip_x(p);
            tree.m.base_y[i] = tree.tip_y(p);
        }
        tree.m.angle[i] += tree.scratch_f[i];
        if r3.ground && tree.tip_y(i) < 0.0 {
            let a = tree.m.angle[i];
            let y = tree.m.base_y[i];
            let l = tree.m.length[i];
            let drop = if y > 0.0 {
                math::asin(math::min(1.0, y / l))
            } else {
                0.0
            };
            let rest = if math::cos(a) >= 0.0 {
                -drop
            } else {
                PI + drop
            };
            tree.scratch_f[i] += rest - a;
            tree.m.angle[i] = rest;
        }
    }
    for j in 0..tree.b.len() {
        if is_live_bud(tree.b.state[j]) {
            tree.b.angle[j] += tree.scratch_f[tree.b.metamer[j] as usize];
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
