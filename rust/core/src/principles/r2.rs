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
//! exempt: it is the one axis that stays straight; a relay (its own axis at pa 0) curves.
//!
//! Pendulous twigs (ADR 0035, proposed): a level's `pendulous` set point is taken, in growth and
//! posture, by its thin axes: fully at pipe radius ≤ `pendulousRadius`, fading to the level's
//! own set point at twice it. Twigs hang (birch's curtains, the willow's) without taking the
//! scaffold with them, which one set point per level cannot do (≥ 80 for level 2 collapses
//! every broadleaf: the form-sweep review). The trunk (order 0) never hangs.
//!
//! Elbows (ADR 0037, proposed): a level's own `relay` extends the relay past the trunk. When a
//! limb's terminal ends (its row's p_term), the laterals on its top nodes continue it at the
//! limb's level; each starts at its bud's branch angle, so the limb kinks at every takeover and
//! zig-zags (oak's elbows; a lost tip replaced by a subapical bud, Hallé et al. 1978).
//!
//! Posture by age (ADR 0038, proposed): a level's `agedSetPoint` is where its set points (growth
//! and posture) move with age, over `agedOver` seasons: by the wood's own age (gravimorphism, old
//! wood descends while young tips stay up) or, with `agedBy` "tree", by the tree's (a phase
//! change at maturity). The trunk itself (order 0) is exempt.
//!
//! Twig density (ADR 0036, proposed): a level's own `kappa` (acrotony at its nodes, in place of
//! r2.kappa) and `lateralEvery` (laterals only at every k-th node of its axes) set how many fine
//! shoots a limb carries and where along it.
//!
//! The relay's neighbour gate (ADR 0039, accepted 2026-11-02; the fresh-look beech round): with `relayCrowd` k, the age relay's
//! relayPTerm acts by max(0, 1 − k·s̄), s̄ the tree's mean R5 neighbour shade (phase 2). A
//! free-standing tree (s̄ = 0) loses its leader from relayAge and becomes polyarchic; a tree among
//! neighbours keeps it through the race for height, a hierarchical bole (Nicolini & Caraglio 1994
//! [r on the beech card]: forks at the extremes of growth, "une structure bien hiérarchisée" in
//! between; Troll [r]: "young trees may develop a leader, aged crowns usually are polyarchic").
//!
//! The vigour fork (ADR 0040, accepted): a pa-0 shoot whose bud received v ≥ `forkAt` times the
//! full shoot (c1.maxMetamersPerShoot), more than the longest shoot can use, ends its apex, and
//! the relay makes the laterals on its top nodes co-dominant arms, re-aimed to `forkAngle` from
//! the ended apex (Nicolini & Caraglio 1994 [r]: forks at the highest growth rates). With it on,
//! every arm (a pa-0 axis not the trunk's own) holds the inclination of its own base as its set
//! point, growth and posture, instead of the trunk's vertical, plus the level's curve: Troll's
//! "all axes develop plagiotropically" [r], only the trunk straightened, so an arm rises and
//! then arches instead of standing up as a second trunk.
//!
//! The vigour drop (ADR 0041, accepted): a node's vigour u = min(1, (v_in / v_base) / vigourShare)
//! is the share of its tree's resource it carries; λ there falls by g·(1 − u)·vigourLambda (C3),
//! g the tree's own vigour gate by v_base between vigourTreeLo and vigourTreeHi. A broad open
//! crown spreads its resource over many limbs, so its weak wood loses apical control and its top
//! divides into near-equal limbs (the dome); a stand member never opens the gate.
//!
//! Light orthotropy (ADR 0042, accepted): wood of pa ≥ 1 on a vigorous tree (the vigour
//! gate g) takes a set point, in growth (C4) and posture (R3), moved from its level's toward
//! `lightSetPoint` by its light and, over `lightOver` seasons, by its age: lit wood rises, shaded
//! wood stays level (Nicolini & Caraglio 1994 [r]; Nicolini 2000 [s]). This season's shoot spreads
//! near its level's angle and its base rises as it ages (Troll's secondary straightening of the
//! proximal part of plagiotropic axes, Hallé et al. 1978), so a lit limb rises, then arches; the
//! lower crown's shaded sprays stay level. A stand member never opens the gate.
//!
//! Params: r2.enabled, r2.levels (curve, curveLength, pendulous, pendulousRadius, kappa,
//! lateralEvery), r2.aC, r2.dLambda, r2.ramp, r2.kappa, r2.relay,
//! r2.relayAge, r2.relayPTerm, r2.relayCrowd, r2.forkAt, r2.forkAngle, r2.vigourShare,
//! r2.vigourLambda, r2.vigourTreeLo, r2.vigourTreeHi, r2.lightSetPoint, r2.lightLo, r2.lightHi,
//! r2.lightOver; c1.branchAngle, c3.lambda, c4.setPoint, c4.eta when off.

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
    let r2 = &params.r2;
    r2.enabled
        && !r2.levels.is_empty()
        && (r2.relay >= 1.0 || r2.levels.iter().any(|l| l.relay.unwrap_or(0.0) >= 1.0))
}

/// The vigour fork: true if a shoot of physiological age `pa` grown from a bud
/// that received `v` ends at its apex, because it grew as fast as a shoot can (v at or above
/// `forkAt` times the full shoot, c1.maxMetamersPerShoot). Only pa 0 forks, and only with the
/// relay on, which makes the ended apex's top laterals the co-dominant arms.
pub fn vigour_forks(pa: f64, v: f64, cap: f64, tree_age: f64, params: &Params) -> bool {
    let r2 = &params.r2;
    let full = params.c1.max_metamers_per_shoot;
    // Young trees keep a leader (Troll: "young trees may develop a leader"): no fork while the
    // juvenile cap (r2.hJ) still holds the shoot below its full length, nor before r2.relayAge.
    r2.fork_at > 0.0
        && pa == 0.0
        && relay_on(params)
        && cap >= full
        && tree_age >= r2.relay_age
        && v >= r2.fork_at * full
}

/// With the vigour fork on, the set point (degrees) of a fork arm (a pa-0 axis that is not the
/// trunk's own): the angle from vertical it was born at, which it holds (Troll: every axis is
/// plagiotropic; only the trunk's base is straightened). None when off or on the trunk.
pub fn arm_set_point(tree: &Tree, trunk: bool, pa: f64, m: usize, params: &Params) -> Option<f64> {
    if params.r2.fork_at <= 0.0 || trunk || pa != 0.0 {
        return None;
    }
    let axis = tree.m.axis[m];
    let n = tree.m.len();
    // birth_id ascends with the row: the axis's first metamer by binary search.
    let ids = &tree.m.birth_id[..n];
    let first = ids.binary_search(&axis).ok()?;
    let h = tree.heading(first);
    // Degrees as form.rs takes them: one multiplication, the same bits as std's to_degrees.
    Some(math::acos(math::max(-1.0, math::min(1.0, h[1]))) * (180.0 / std::f64::consts::PI))
}

/// True if the vigour drop (fresh-look beech) is on: λ falls in weak wood of a vigorous tree.
pub fn vigour_drop_on(r2: &R2) -> bool {
    r2.enabled && r2.vigour_share > 0.0 && r2.vigour_lambda != 0.0
}

/// A node's vigour u in [0, 1]: the share of its tree's resource `v_base` that flows through it
/// this season (`v_in`), against r2.vigourShare. Troll's model (Pfisterer [r] on the card): every
/// axis is plagiotropic and "aged crowns usually are polyarchic"; Nicolini & Caraglio 1994 [r]:
/// beech forks at the extremes of growth rate and keeps "une structure bien hiérarchisée" only
/// in between. A narrow stand crown passes most of its resource up one leader, which keeps its
/// apical control; a broad open crown spreads it over many limbs, so the wood that carries little
/// of it (u → 0) loses apical control and its top divides.
pub fn vigour(v_in: f64, v_base: f64, r2: &R2) -> f64 {
    if v_base <= 0.0 || r2.vigour_share <= 0.0 {
        return 0.0;
    }
    math::max(0.0, math::min(1.0, v_in / v_base / r2.vigour_share))
}

/// The tree's vigour gate g in [0, 1] by its resource `v_base`: 0 at r2.vigourTreeLo and below,
/// 1 at r2.vigourTreeHi and above (1 when no gate is set). Like C5's Q_top and R1's maturity
/// height a tree-level signal: an open-grown crown produces an order of magnitude more than a
/// stand member of the same age, so the drop leaves the stand alone.
pub fn vigour_gate(v_base: f64, r2: &R2) -> f64 {
    if r2.vigour_tree_hi <= r2.vigour_tree_lo {
        return 1.0;
    }
    math::max(
        0.0,
        math::min(
            1.0,
            (v_base - r2.vigour_tree_lo) / (r2.vigour_tree_hi - r2.vigour_tree_lo),
        ),
    )
}

/// Light orthotropy (fresh-look beech, repair): the set point (degrees from vertical), in growth
/// and posture, of wood of physiological age `pa`, light `q` and age `wood_age` seasons, moved
/// from its level's own `set_point` toward r2.lightSetPoint by
/// u = g·clamp((q − lightLo) / (lightHi − lightLo))·min(1, (wood_age + 1) / lightOver), g the
/// tree's vigour gate (`vigour_gate`, 1 when r2.vigourTreeLo/Hi are unset). Beech's laterals are
/// plagiotropic under cover and erect in full light on a vigorous tree (Nicolini & Caraglio 1994
/// [r]: vertical laterals 0.18–0.45 in full light against 0.03–0.1 in shade; Nicolini 2000 [s]:
/// the axes of trees "very young or under dense cover" are plagiotropic with a flat crown, those
/// of vigorous trees orthotropic), and a plagiotropic axis straightens at its base as it ages
/// (Troll's model, Hallé et al. 1978). So the lit crown of an open-grown tree builds limbs that
/// rise, then arch out at their young tips, and its shaded lower crown level sprays. The trunk
/// and its relays (pa 0) are untouched; `set_point` is returned unchanged when off.
pub fn light_set_point(
    set_point: f64,
    pa: f64,
    q: f64,
    wood_age: f64,
    v_base: f64,
    r2: &R2,
) -> f64 {
    let Some(erect) = r2.light_set_point else {
        return set_point;
    };
    if !r2.enabled || pa < 1.0 {
        return set_point;
    }
    let span = r2.light_hi - r2.light_lo;
    let lit = if span > 0.0 {
        math::max(0.0, math::min(1.0, (q - r2.light_lo) / span))
    } else if q >= r2.light_hi {
        1.0
    } else {
        0.0
    };
    let aged = math::min(
        1.0,
        (math::max(0.0, wood_age) + 1.0) / math::max(1.0, r2.light_over),
    );
    let u = lit * aged * vigour_gate(v_base, r2);
    set_point + u * (erect - set_point)
}

/// How many nodes under an ended apex relay on an axis of physiological age `pa`: the level's
/// own `relay` (ADR 0037), else r2.relay for pa 0 (ADR 0033), else none.
pub fn relay_nodes(pa: f64, params: &Params) -> f64 {
    let own = pa_level(pa, &params.r2).and_then(|l| l.relay);
    match own {
        Some(n) => n,
        None if pa == 0.0 => params.r2.relay,
        None => 0.0,
    }
}

/// The probability that a shoot of physiological age `order` ends in its terminal bud, on a tree
/// of age `tree_age`: the row's p_term, and with the relay on, at least `relayPTerm` for pa 0 from
/// `relayAge` on (the leader stops after an age, Troll's and Leeuwenberg's modules), scaled by the
/// neighbour gate max(0, 1 − relayCrowd·`crowd`) when set, `crowd` the tree's mean R5 shade.
pub fn p_term_at(order: f64, tree_age: f64, crowd: f64, params: &Params) -> f64 {
    let Some(level) = pa_level(order, &params.r2) else {
        return 0.0;
    };
    let r2 = &params.r2;
    if relay_on(params) && order == 0.0 && tree_age >= r2.relay_age {
        // The crowding gate: a leader beside other crowns keeps growing (shade avoidance
        // keeps apical dominance); a free-standing one ends at relay_p_term.
        let gate = match r2.relay_crowd {
            Some(k) => math::max(0.0, 1.0 - k * crowd),
            None => 1.0,
        };
        return math::max(level.p_term, r2.relay_p_term * gate);
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
    crowd: f64,
    params: &Params,
) -> bool {
    let p_term = p_term_at(order, tree_age, crowd, params);
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

/// The paShift, against the bud's own order, that makes bud `b`'s shoot a relay at its axis's
/// physiological age, if it is a lateral on one of the top `relay_nodes` nodes below its axis's
/// ended apex (`depth` from `relay_depth`); else None. The shoot itself is stored at the order of
/// the axis it replaces, one less, with one less shift (ADR 0033, fix A), so orders do not climb
/// along a chain of relays.
pub fn relay_shift(tree: &Tree, b: usize, depth: &[f64], params: &Params) -> Option<f64> {
    if tree.b.slot[b] == slot::MAIN {
        return None;
    }
    let h = tree.b.metamer[b] as usize;
    if h >= depth.len() || !depth[h].is_finite() {
        return None;
    }
    let host_pa = tree.m.order[h] as f64 - tree.m.pa_shift[h] as f64;
    if depth[h] >= relay_nodes(host_pa, params) {
        return None;
    }
    Some(tree.b.order[b] as f64 - host_pa)
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

/// The curve's offset to the set points, degrees, at node `axis_node` of an axis of physiological
/// age `pa` (0 on the trunk's own axis, `trunk`, and when off).
pub fn curve_offset(trunk: bool, pa: f64, axis_node: f64, params: &Params) -> f64 {
    if trunk {
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

/// The offset, degrees, posture by age adds to the set points of an axis of physiological age
/// `pa`, for wood `wood_age` seasons old on a tree `tree_age` old (0 when off and on the trunk's
/// own axis, `trunk`).
pub fn aged_offset(trunk: bool, pa: f64, wood_age: f64, tree_age: f64, params: &Params) -> f64 {
    if trunk {
        return 0.0;
    }
    let Some(level) = pa_level(pa, &params.r2) else {
        return 0.0;
    };
    let Some(aged) = level.aged_set_point else {
        return 0.0;
    };
    let age = if level.aged_by_tree {
        tree_age
    } else {
        wood_age
    };
    let over = math::max(1.0, level.aged_over.unwrap_or(50.0));
    (aged - level.set_point) * math::min(1.0, math::max(0.0, age) / over)
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

/// A set point (degrees) of an axis of physiological age `pa` (`trunk`: the trunk's own axis,
/// which never hangs), moved toward its level's pendulous set point by the thinness of wood of
/// radius `radius`.
pub fn pendulous_set_point(
    set_point: f64,
    trunk: bool,
    pa: f64,
    radius: f64,
    params: &Params,
) -> f64 {
    if trunk {
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
        assert!(
            !ids.iter()
                .any(|&id| terminates(0.0, 0.0, id, 3.0, 0.0, 0.0, &p))
        );
        assert!(
            ids.iter()
                .all(|&id| terminates(1.0, 0.0, id, 3.0, 0.0, 0.0, &p))
        );
        let half = ids
            .iter()
            .filter(|&&id| terminates(2.0, 0.0, id, 3.0, 0.0, 0.0, &p))
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
        assert_eq!(p_term_at(0.0, 29.0, 0.0, &p), 0.0);
        assert_eq!(p_term_at(0.0, 30.0, 0.0, &p), 0.7);
        assert_eq!(p_term_at(1.0, 30.0, 0.0, &p), 0.2); // only pa 0 relays
        let off = with_r2(&rows, r#""relayAge":30,"relayPTerm":0.7"#); // relay absent: off
        assert_eq!(p_term_at(0.0, 50.0, 0.0, &off), 0.0);
        let ids: Vec<f64> = (0..2000).map(|i| i as f64).collect();
        let ended = ids
            .iter()
            .filter(|&&id| terminates(0.0, 0.0, id, 3.0, 40.0, 0.0, &p))
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
        // Fix A: the relay is stored at the order of the axis it replaces, 0, with shift 0: pa 0.
        assert_eq!(t.m.order[relay], 0);
        assert_eq!(t.m.pa_shift[relay], 0);
        assert_eq!((t.m.order[relay + 1], t.m.pa_shift[relay + 1]), (0, 0)); // along the shoot
        assert_ne!(t.m.axis[relay], t.m.axis[0]); // its own axis, not the trunk's
        // Its laterals are order 1, as any lateral of the trunk's order is.
        let lat =
            (0..t.b.len()).find(|&j| t.b.metamer[j] as usize == relay && t.b.slot[j] != slot::MAIN);
        assert_eq!(t.b.order[lat.unwrap()], 1);
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
        assert_eq!(curve_offset(true, 0.0, 50.0, &p), 0.0); // the trunk stays straight
        assert_eq!(curve_offset(false, 0.0, 10.0, &p), 15.0); // a relay: default length 20
        assert_eq!(curve_offset(false, 1.0, 0.0, &p), 0.0);
        assert_eq!(curve_offset(false, 1.0, 2.0, &p), -20.0);
        assert_eq!(curve_offset(false, 1.0, 9.0, &p), -40.0); // held past curveLength
        assert_eq!(curved(30.0, -40.0), 0.0);
        assert_eq!(curved(160.0, 40.0), 180.0);
        let off = with_r2(&[r#"{}"#, r#"{}"#], "");
        assert_eq!(curve_offset(false, 1.0, 9.0, &off), 0.0);
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
        assert_eq!(pendulous_set_point(0.0, true, 0.0, 0.0, &p), 0.0); // the trunk never hangs
        assert_eq!(pendulous_set_point(40.0, false, 1.0, 0.005, &p), 150.0); // thin: hangs fully
        assert_eq!(pendulous_set_point(40.0, false, 1.0, 0.01, &p), 150.0);
        assert!((pendulous_set_point(40.0, false, 1.0, 0.015, &p) - 95.0).abs() < 1e-9);
        assert_eq!(pendulous_set_point(40.0, false, 1.0, 0.03, &p), 40.0); // a limb: its level's
        assert!(hangs(1.0, &p));
        let off = with_r2(&[r#"{}"#, r#"{"setPoint":40}"#], "");
        assert!(!hangs(1.0, &off));
        assert_eq!(pendulous_set_point(40.0, false, 1.0, 0.0, &off), 40.0);
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

    #[test]
    fn a_limb_level_relays_its_own_ended_axes_into_elbows() {
        let p = with_r2(&[r#"{}"#, r#"{"relay":1}"#, r#"{}"#], "");
        assert!(relay_on(&p));
        let (t, laterals, twig) = ended_trunk();
        let depth = relay_depth(&t, t.m.len(), t.b.len());
        // The limb (order 1, pa 1) ended: its top lateral (order 2) continues it at pa 1.
        assert_eq!(relay_shift(&t, twig, &depth, &p), Some(1.0));
        // The trunk has no relay of its own and r2.relay is absent: its laterals stay limbs.
        assert!(
            laterals
                .iter()
                .all(|&b| relay_shift(&t, b, &depth, &p).is_none())
        );
        // A level's own relay overrides r2.relay for pa 0.
        let q = with_r2(&[r#"{"relay":0}"#, r#"{}"#], r#""relay":3"#);
        assert_eq!(relay_nodes(0.0, &q), 0.0);
        assert_eq!(relay_nodes(0.0, &with_r2(&[r#"{}"#], r#""relay":3"#)), 3.0);
    }

    #[test]
    fn moves_a_levels_set_point_with_the_woods_age_or_the_trees() {
        let p = with_r2(
            &[
                r#"{"agedSetPoint":90}"#,
                r#"{"setPoint":30,"agedSetPoint":110,"agedOver":40}"#,
                r#"{"setPoint":60,"agedSetPoint":20,"agedOver":10,"agedBy":"tree"}"#,
            ],
            "",
        );
        assert_eq!(aged_offset(true, 0.0, 99.0, 99.0, &p), 0.0); // the trunk itself never moves
        assert_eq!(aged_offset(false, 0.0, 25.0, 0.0, &p), 45.0); // a relay: default over 50
        assert_eq!(aged_offset(false, 1.0, 0.0, 99.0, &p), 0.0); // new wood: erect still
        assert_eq!(aged_offset(false, 1.0, 20.0, 0.0, &p), 40.0);
        assert_eq!(aged_offset(false, 1.0, 400.0, 0.0, &p), 80.0); // held at the aged set point
        assert_eq!(aged_offset(false, 2.0, 0.0, 5.0, &p), -20.0); // by the tree's age
        assert_eq!(aged_offset(false, 2.0, 50.0, 0.0, &p), 0.0);
        let off = with_r2(&[r#"{}"#, r#"{}"#], "");
        assert_eq!(aged_offset(false, 1.0, 50.0, 50.0, &off), 0.0);
    }

    #[test]
    fn a_chain_of_relays_keeps_the_trunks_order() {
        // Every pa-0 shoot ends (relayPTerm 1 from age 0) and its top lateral relays: thirty
        // seasons of relays on one axis, all at order 0 (before fix A they climbed one a season).
        let p = with_r2(
            &[r#"{"generator":"spiral"}"#, r#"{"generator":"none"}"#],
            r#""relay":1,"relayAge":0,"relayPTerm":1"#,
        );
        let mut t = Tree::new(0, 10.0, 0.5);
        crate::principles::c1::plant_seedling(&mut t, &p, 0.0, 0.0);
        for season in 1..30 {
            t.ensure_scratch();
            for j in 0..t.b.len() {
                t.b.v[j] = 1.0;
            }
            crate::season::grow_buds(&mut t, &p, season as f64);
            t.age += 1.0;
        }
        let pa0 = (0..t.m.len())
            .filter(|&i| t.m.order[i] == t.m.pa_shift[i])
            .count();
        assert!(pa0 > 20, "{pa0}");
        assert!((0..t.m.len()).all(|i| t.m.order[i] <= 1), "orders climbed");
        let axes: std::collections::BTreeSet<i32> = (0..t.m.len())
            .filter(|&i| t.m.order[i] == 0)
            .map(|i| t.m.axis[i])
            .collect();
        assert!(axes.len() > 5, "{axes:?}"); // many relay axes, all order 0
    }

    #[test]
    fn a_leader_grown_at_full_vigour_ends_and_its_top_laterals_leave_at_the_fork_angle() {
        // The vigour fork in growth (season.rs grow_buds): a pa-0 shoot whose bud got v ≥ forkAt·
        // full ends its apex, and the laterals on its top `relay` nodes are re-aimed to forkAngle
        // from the shoot. Below the threshold the leader grows on (relayPTerm 0: no age relay).
        let fork = |v: f64| {
            let p = with_r2(
                &[r#"{"generator":"spiral"}"#, r#"{"generator":"none"}"#],
                r#""relay":2,"relayAge":0,"forkAt":1.3,"forkAngle":30"#,
            );
            let mut t = Tree::new(0, 10.0, 0.5);
            crate::principles::c1::plant_seedling(&mut t, &p, 0.0, 0.0);
            t.ensure_scratch();
            let before = t.b.len();
            for j in 0..before {
                t.b.v[j] = v;
            }
            crate::season::grow_buds(&mut t, &p, 1.0);
            let full = p.c1.max_metamers_per_shoot;
            let apex = (before..t.b.len())
                .find(|&j| t.b.slot[j] == slot::MAIN && t.m.order[t.b.metamer[j] as usize] == 0)
                .expect("a new leader bud");
            // The leader's shoot: this season's order-0 metamers (the seedling's lateral grows
            // too, as order 1); its top two nodes (or as many as it has) carry the arms.
            let leader: Vec<usize> = (0..t.m.len())
                .filter(|&i| t.m.order[i] == 0 && t.m.birth_season[i] == 1)
                .collect();
            let top = &leader[leader.len().saturating_sub(2)..];
            let arms: Vec<f64> = (before..t.b.len())
                .filter(|&j| t.b.slot[j] != slot::MAIN && top.contains(&(t.b.metamer[j] as usize)))
                .map(|j| math::acos(t.b.hy[j]) * (180.0 / std::f64::consts::PI))
                .collect();
            (t.b.state[apex], arms, 1.3 * full)
        };
        let (state, arms, threshold) = fork(5.0);
        assert!(5.0 >= threshold);
        assert_eq!(state, bud::TERMINATED);
        assert!(!arms.is_empty());
        for a in &arms {
            assert!((a - 30.0).abs() < 1e-6, "an arm at {a}°");
        }
        let (state, _, threshold) = fork(1.0);
        assert!(1.0 < threshold);
        assert_ne!(state, bud::TERMINATED);
    }

    #[test]
    fn the_relay_gates_signal_is_zero_alone_and_positive_among_neighbours() {
        // phase_sample's s̄: the mean of R5's neighbour shade over the tree's metamers. A tree
        // alone in the open reads 0; the middle of three trees 6 cells apart reads more.
        use crate::world::World;
        let world = |xs: &str| {
            let p = crate::testing::preset(
                "oakOpen",
                &format!(r#"{{"trees":[{xs}],"species":{{"oak":{{"r2":{{"relayCrowd":10}}}}}}}}"#),
            );
            let mut w = World::new(p);
            w.run(25, &[]);
            w
        };
        let alone = world(r#"{"x":80,"species":"oak"}"#);
        assert_eq!(alone.trees[0].relay_crowd, 0.0);
        let row =
            world(r#"{"x":74,"species":"oak"},{"x":80,"species":"oak"},{"x":86,"species":"oak"}"#);
        assert!(
            row.trees[1].relay_crowd > 0.0,
            "{}",
            row.trees[1].relay_crowd
        );
    }

    #[test]
    fn the_relay_gate_keeps_the_leader_of_a_tree_among_neighbours() {
        let rows = [r#"{"pTerm":0}"#, r#"{"pTerm":0.2}"#];
        let p = with_r2(
            &rows,
            r#""relay":2,"relayAge":15,"relayPTerm":0.4,"relayCrowd":10"#,
        );
        assert_eq!(p_term_at(0.0, 20.0, 0.0, &p), 0.4); // alone in the open: the full relay
        assert!((p_term_at(0.0, 20.0, 0.05, &p) - 0.2).abs() < 1e-12); // half shaded: half
        assert_eq!(p_term_at(0.0, 20.0, 0.2, &p), 0.0); // among neighbours: the leader holds
        assert_eq!(p_term_at(1.0, 20.0, 0.2, &p), 0.2); // a limb keeps its row's pTerm
        let off = with_r2(&rows, r#""relay":2,"relayAge":15,"relayPTerm":0.4"#);
        assert_eq!(p_term_at(0.0, 20.0, 0.2, &off), 0.4); // no gate: age alone
    }

    #[test]
    fn forks_a_leader_only_at_full_vigour_with_the_relay_on() {
        let rows = [r#"{}"#, r#"{}"#];
        let p = with_r2(&rows, r#""relay":2,"relayAge":10,"forkAt":1.3"#);
        let full = p.c1.max_metamers_per_shoot;
        let v = 1.3 * full;
        assert!(vigour_forks(0.0, v, full, 20.0, &p));
        assert!(!vigour_forks(0.0, v - 0.01, full, 20.0, &p)); // below the threshold
        assert!(!vigour_forks(1.0, v, full, 20.0, &p)); // only pa 0 forks
        assert!(!vigour_forks(0.0, v, full - 0.5, 20.0, &p)); // the juvenile cap still holds
        assert!(!vigour_forks(0.0, v, full, 5.0, &p)); // before relayAge
        let no_relay = with_r2(&rows, r#""forkAt":1.3"#);
        assert!(!vigour_forks(0.0, v, full, 20.0, &no_relay));
        let off = with_r2(&rows, r#""relay":2"#);
        assert!(!vigour_forks(0.0, 100.0, full, 20.0, &off));
    }

    #[test]
    fn an_arm_holds_the_inclination_of_its_base_and_the_trunk_does_not() {
        use crate::testing::{LEFT, metamer};
        use std::f64::consts::FRAC_PI_2;
        let p = with_r2(&[r#"{}"#, r#"{}"#], r#""relay":2,"forkAt":1.3"#);
        let mut t = Tree::new(0, 10.0, 0.5);
        let trunk = metamer(&mut t, -1, slot::MAIN, FRAC_PI_2, 1.0, 0.02, 0.0);
        // An arm leaving at 2.5 rad in the plane (53.2° from vertical), relayed to pa 0, then
        // bending to 3.0 rad: both its metamers hold its base's 53.2°.
        let base = metamer(&mut t, trunk as i32, LEFT, 2.5, 1.0, 0.02, 0.0);
        let next = metamer(&mut t, base as i32, slot::MAIN, 3.0, 1.0, 0.02, 0.0);
        t.m.pa_shift[base] = 1;
        t.m.pa_shift[next] = 1;
        let want = (2.5 - FRAC_PI_2).to_degrees();
        for m in [base, next] {
            let a = arm_set_point(&t, false, 0.0, m, &p).unwrap();
            assert!((a - want).abs() < 1e-9, "{a} vs {want}");
        }
        assert_eq!(arm_set_point(&t, true, 0.0, trunk, &p), None); // the trunk stays upright
        assert_eq!(arm_set_point(&t, false, 1.0, base, &p), None); // a limb keeps its level
        let off = with_r2(&[r#"{}"#, r#"{}"#], r#""relay":2"#);
        assert_eq!(arm_set_point(&t, false, 0.0, base, &off), None);
    }

    #[test]
    fn lit_wood_of_a_vigorous_tree_rises_and_shaded_wood_stays_level() {
        let rows = [r#"{}"#, r#"{}"#, r#"{"setPoint":95}"#];
        let p = with_r2(
            &rows,
            r#""lightSetPoint":35,"lightLo":0.2,"lightHi":0.8,"lightOver":3,"vigourTreeLo":3000,"vigourTreeHi":10000"#,
        );
        let r2 = &p.r2;
        let open = 20000.0;
        // Old wood in full light takes the erect set point; in shade, its level's.
        assert!((light_set_point(95.0, 2.0, 0.9, 5.0, open, r2) - 35.0).abs() < 1e-12);
        assert_eq!(light_set_point(95.0, 2.0, 0.1, 5.0, open, r2), 95.0);
        assert!((light_set_point(95.0, 2.0, 0.5, 5.0, open, r2) - 65.0).abs() < 1e-12); // halfway
        // This season's shoot only a third of the way (lightOver 3): it spreads, its base rises.
        assert!((light_set_point(95.0, 2.0, 0.9, 0.0, open, r2) - 75.0).abs() < 1e-12);
        // A stand member (v_base below the gate), the trunk's level, and the rule off: unchanged.
        assert_eq!(light_set_point(95.0, 2.0, 0.9, 5.0, 2000.0, r2), 95.0);
        assert_eq!(light_set_point(0.0, 0.0, 0.9, 5.0, open, r2), 0.0);
        let off = with_r2(&rows, "");
        assert_eq!(light_set_point(95.0, 2.0, 0.9, 5.0, open, &off.r2), 95.0);
    }

    #[test]
    fn weak_wood_of_a_vigorous_tree_loses_apical_control() {
        let rows = [r#"{}"#];
        let p = with_r2(
            &rows,
            r#""vigourShare":0.3,"vigourLambda":0.03,"vigourTreeLo":3000,"vigourTreeHi":10000"#,
        );
        assert!(vigour_drop_on(&p.r2));
        assert_eq!(vigour(600.0, 1000.0, &p.r2), 1.0); // 60% of the tree: fully vigorous
        assert!((vigour(150.0, 1000.0, &p.r2) - 0.5).abs() < 1e-12);
        assert_eq!(vigour(5.0, 0.0, &p.r2), 0.0);
        assert_eq!(vigour_gate(2000.0, &p.r2), 0.0); // a stand member's production
        assert!((vigour_gate(6500.0, &p.r2) - 0.5).abs() < 1e-12);
        assert_eq!(vigour_gate(20000.0, &p.r2), 1.0); // an open-grown crown
        let ungated = with_r2(&rows, r#""vigourShare":0.3,"vigourLambda":0.03"#);
        assert_eq!(vigour_gate(10.0, &ungated.r2), 1.0);
        assert!(!vigour_drop_on(
            &with_r2(&rows, r#""vigourLambda":0.03"#).r2
        ));
        assert!(!vigour_drop_on(&with_r2(&rows, "").r2));
    }
}
