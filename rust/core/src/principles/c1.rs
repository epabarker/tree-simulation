//! C1. Metamer structure, bud fate and phyllotaxis (spec §C1; I2, ADR 0025). Each new metamer
//! forms its axillary buds around its own heading H: lateral j of a node sits at azimuth
//! φ = φ_axis + k·δ + j·2π/n (measured around H from the metamer's reference L), tilted β from H.
//! The axis's start φ_axis is a draw [RNG: sideSequence, keyed by axis]; k is the node's place on
//! the axis; δ and n come from the phyllotaxis: spiral (δ = c1.divergence, one lateral), distichous
//! (δ = 180°), and with R2 the level's generator: opposite (decussate: two at 180°, δ = 90°),
//! whorled (n = the level's `whorl`, alternate whorls offset by π/n) or none. Shoot size follows
//! ADR 0004: v' = min(v, cap), n = ⌊v'⌋, l = v'/n · l0. A shoot's frames are carried from bud to
//! metamer to metamer by parallel transport, so phyllotaxis follows the axis as it bends. A
//! seedling's L is turned about its heading by a per-tree azimuth [RNG: seedlingAzimuth] (ADR 0054).
//!
//! Variable shoot length (prototype, agent A9): with `c1.shootLengthSD` s > 0, each shoot's
//! internode length is multiplied by exp(s·z − s²/2), z ~ N(0, 1) [RNG: shootLength, keyed by the
//! bud's birthId and the season], a lognormal of mean 1, so the mean extension is kept. Why: ADR
//! 0004's l = v'/n·l0 lies in [1, 2)·l0 by construction (CV ≈ 0.19 in lone hornbeam), where real
//! annual shoots vary many-fold with vigour and weather; the uniform line texture is a cue the
//! blinded judge names. Off (absent or 0): no draw.
//!
//! Per-axis branch angle (prototype, agent R; §C1.6's "branch angle β per order"; within-tree
//! variation, not ADR 0053's between-tree draw): with `c1.betaSD` s_β > 0, a lateral bud that
//! breaks into a new axis has
//! its heading turned in the plane of its host's heading by s_β·N(0, 1) degrees [RNG:
//! branchAngle, keyed by the axis, i.e. the birthId its first metamer takes], so its angle to the
//! host becomes β + offset (held in [0, 180°]: it never crosses the host's heading). One draw per
//! axis, at its start, as `c4.axisSD`'s. Why: β is fixed per level, so every limb leaves the trunk
//! at one angle (within-tree SD of first-order insertion ≈ 6° in today's lone hornbeam, 13° with
//! A9's three rules, against 31.5° in real lone hornbeam). Relays and fork arms, which start new
//! axes from lateral buds, take the offset too. C4's noise is white and R3's posture restores the set point, so nothing else makes
//! one limb leave steeper than its neighbour. Off (absent or 0): no draw, β as before.
//!
//! Crown-extent limit (probe only, #129; not an ADR): with `c1.extentLimit`, a shoot extends
//! this season with a chance g(L) = max(g_min, 1 / (1 + (L / L_x)^k)), L read at the bud's node
//! as the season began: the node's horizontal distance from the stem base ("reach": an imposed
//! crown radius, #121's yardstick), the tree's height ("height": a whole-tree size signal, which
//! §C1.1's local signals do not include), or the node's path length from the stem base ("path":
//! local; R1's L_path, #89's variable). With `c1.extentSpare` the chance is u² + (1 − u²)·g, u the
//! upward part of the bud's own heading: an upright shoot, the leader whatever its order, is
//! spared, and a level one takes g in full (lateral shoots slowed by the tree's size: Choi et
//! al. 2001's crown-margin rates are lateral rates). It acts at the tip after C3's allocation (a
//! sink limit, #83's reading: C3 still allocates on light; what the shoot does not use is not
//! returned), as a chance and not on the internode length: a shoot is one metamer from season
//! ≈ 30, and shorter internodes keep their leaf and buds, which floods a shade-tolerant crown
//! (the path-length note §2). One draw per live bud and season [RNG: extentLimit, keyed by the
//! bud and the season]; none at a chance of 1. A barred bud rests as one below its threshold
//! does. No state: L is one pass in `grow_buds`. Off (absent): no pass, no draw.
//!
//! Params: c1.phyllotaxis, c1.divergence (δ), c1.branchAngle (β), c1.internodeLength (l0),
//! c1.maxMetamersPerShoot, c1.shootLengthSD (s), c1.betaSD (s_β), c1.extentLimit,
//! c1.extentSpare, c1.extentScale (L_x), c1.extentSteepness (k), c1.extentFloor (g_min), c6.r0;
//! with R2 the levels' generator, whorl, β and p_term.

use super::obstacles::inside_obstacle;
use super::r2::{branch_angle_of, laterals, terminates};
use crate::geom::{
    V3, angle_between, any_perpendicular, cross, normalize_or, reject, rotate, tilt, transport,
};
use crate::math;
use crate::params::{C1, DEG, ExtentLimit, Params};
use crate::rng::{normal, purpose, uniform};
use crate::tree::{Tree, bud, slot, store_i32, store_u8};

/// Appends a metamer at `slot` of `parent`'s upper node (parent −1 = root) with heading `h` and
/// reference `l`; `azimuth` is a lateral's place around its parent. Returns its index.
#[allow(clippy::too_many_arguments)]
pub fn add_metamer(
    tree: &mut Tree,
    parent: i32,
    slot_: u8,
    h: V3,
    l: V3,
    azimuth: f64,
    length: f64,
    radius: f64,
    season: f64,
) -> usize {
    let i = tree.m.add();
    let id = tree.next_metamer_id;
    tree.next_metamer_id += 1.0;
    let base = if parent < 0 {
        [tree.root_x, 0.0, tree.root_z]
    } else {
        tree.tip(parent as usize)
    };
    tree.set_frame(i, h, l);
    let c = &mut tree.m;
    c.birth_id[i] = store_i32(id);
    c.parent[i] = parent;
    c.slot[i] = slot_;
    if parent < 0 {
        c.axis[i] = store_i32(id);
        c.axis_node[i] = 0;
        c.order[i] = 0;
    } else {
        let p = parent as usize;
        if slot_ == slot::MAIN {
            c.axis[i] = c.axis[p];
            c.axis_node[i] = c.axis_node[p].wrapping_add(1);
            c.order[i] = c.order[p];
        } else {
            c.axis[i] = store_i32(id);
            c.axis_node[i] = 0;
            c.order[i] = c.order[p].wrapping_add(1);
        }
    }
    (c.base_x[i], c.base_y[i], c.base_z[i]) = (base[0], base[1], base[2]);
    c.azimuth[i] = azimuth;
    c.length[i] = length;
    c.radius[i] = radius;
    c.scar_sum_n[i] = 0.0;
    c.stress_wood[i] = 0.0;
    (c.mx[i], c.my[i], c.mz[i]) = (0.0, 0.0, 0.0);
    c.pa_shift[i] = if parent < 0 {
        0
    } else {
        c.pa_shift[parent as usize]
    };
    c.birth_season[i] = store_i32(season);
    i
}

/// Appends a bud at `slot` of metamer `m`'s upper node, growing along `h` (reference `l`).
pub fn add_bud(
    tree: &mut Tree,
    m: usize,
    slot_: u8,
    h: V3,
    l: V3,
    azimuth: f64,
    order: f64,
) -> usize {
    let i = tree.b.add();
    let id = tree.next_bud_id;
    tree.next_bud_id += 1.0;
    tree.set_bud_frame(i, h, l);
    let c = &mut tree.b;
    c.birth_id[i] = store_i32(id);
    c.metamer[i] = m as i32;
    c.slot[i] = slot_;
    c.state[i] = bud::ACTIVE;
    c.age[i] = 0;
    c.order[i] = store_u8(order);
    c.azimuth[i] = azimuth;
    i
}

/// The start of an axis's phyllotactic sequence, radians [RNG: sideSequence, keyed by axis].
pub fn axis_phase(tree: &Tree, axis: f64, params: &Params) -> f64 {
    let u = uniform(
        params.seed,
        purpose::SIDE_SEQUENCE,
        tree.id as f64,
        axis,
        0.0,
        0.0,
    );
    2.0 * std::f64::consts::PI * u
}

/// The frame of a lateral at `azimuth` around metamer `m`: tilted β from its heading, with the
/// reference toward the parent's heading (the adaxial side).
pub fn lateral_frame(tree: &Tree, m: usize, azimuth: f64, beta: f64) -> (V3, V3) {
    let (h, l) = (tree.heading(m), tree.reference(m));
    let hb = tilt(h, l, beta, azimuth);
    let lb = normalize_or(reject(h, hb), any_perpendicular(hb));
    (hb, lb)
}

/// Forms the axillary bud(s) of metamer `m` by the phyllotaxis (§C1.4).
pub fn form_axillary_buds(tree: &mut Tree, m: usize, params: &Params, last_of_shoot: bool) {
    let k = tree.m.axis_node[m] as f64;
    let pa = tree.m.order[m] as f64 - tree.m.pa_shift[m] as f64;
    let (count, step) = laterals(pa, k, last_of_shoot, params);
    if count == 0 {
        return;
    }
    let order = tree.m.order[m] as f64 + 1.0;
    let beta = branch_angle_of(pa + 1.0, params) * DEG;
    let phase = axis_phase(tree, tree.m.axis[m] as f64, params);
    let n = count as f64;
    for j in 0..count {
        let azimuth = phase + k * step + (j as f64) * 2.0 * std::f64::consts::PI / n;
        let (h, l) = lateral_frame(tree, m, azimuth, beta);
        add_bud(tree, m, slot::LATERAL + j, h, l, azimuth, order);
    }
}

/// The frame a bud at `slot` of metamer `m`'s upper node grows from: the metamer's own for the
/// main slot, else the lateral's at `azimuth` (R4's bud bank, where a branch was shed).
pub fn bud_frame(tree: &Tree, m: usize, slot_: u8, azimuth: f64, params: &Params) -> (V3, V3) {
    if slot_ == slot::MAIN {
        return (tree.heading(m), tree.reference(m));
    }
    let pa = tree.m.order[m] as f64 - tree.m.pa_shift[m] as f64;
    lateral_frame(tree, m, azimuth, branch_angle_of(pa + 1.0, params) * DEG)
}

/// Forms the terminal bud of metamer `m`; with R2 it may end (sympodial growth).
pub fn form_terminal_bud(tree: &mut Tree, m: usize, params: &Params, season: f64) {
    let order = tree.m.order[m] as f64;
    let (h, l) = (tree.heading(m), tree.reference(m));
    let i = add_bud(tree, m, slot::MAIN, h, l, 0.0, order);
    let pa = order - tree.m.pa_shift[m] as f64;
    let birth = tree.m.birth_id[m] as f64;
    if terminates(
        pa,
        tree.id as f64,
        birth,
        season,
        tree.age,
        tree.relay_crowd,
        params,
    ) {
        tree.b.state[i] = bud::TERMINATED;
    }
}

/// The azimuth (radians) a seedling's reference L is turned by about its heading (ADR 0054): one
/// draw per tree [RNG: seedlingAzimuth, keyed by the tree's id, which is never reused], so the
/// trunk's set point (`c4::set_point_direction`, which takes a vertical leader's side from L) and
/// the phyllotaxis plane face a different way in every tree instead of all toward +x.
pub fn seedling_azimuth(params: &Params, tree_id: usize) -> f64 {
    2.0 * std::f64::consts::PI
        * uniform(
            params.seed,
            purpose::SEEDLING_AZIMUTH,
            tree_id as f64,
            0.0,
            0.0,
            0.0,
        )
}

/// Plants a seedling at its root: one metamer, vertical unless `lean` tilts it (degrees, toward
/// +x: a world lean, ADR 0054), its reference turned about the heading by `azimuth` (radians;
/// `seedling_azimuth` on every planting path, 0 the old frame exactly).
pub fn plant_seedling(tree: &mut Tree, params: &Params, season: f64, lean: f64, azimuth: f64) {
    let a = lean * DEG;
    let h = [math::sin(a), math::cos(a), 0.0];
    let l0 = [math::cos(a), -math::sin(a), 0.0];
    let l = if azimuth == 0.0 {
        l0
    } else {
        rotate(l0, h, azimuth)
    };
    let m = add_metamer(
        tree,
        -1,
        slot::MAIN,
        h,
        l,
        0.0,
        params.c1.internode_length,
        params.c6.r0,
        season,
    );
    form_terminal_bud(tree, m, params, season);
    form_axillary_buds(tree, m, params, true);
}

/// Metamers n and internode length (into `length`) for a bud receiving v (ADR 0004).
pub fn shoot_size(v: f64, params: &Params, length: &mut f64, cap: f64) -> f64 {
    let capped = math::min(v, cap);
    let n = capped.floor();
    if n < 1.0 {
        *length = 0.0;
        return 0.0;
    }
    *length = (capped / n) * params.c1.internode_length;
    n
}

/// The multiplier on the internode length of the shoot bud `bud_id` grows this season: lognormal
/// with mean 1, exp(s·z − s²/2) [RNG: shootLength], and exactly 1 when s = 0 (no draw).
pub fn shoot_length_factor(params: &Params, tree_id: f64, bud_id: f64, season: f64) -> f64 {
    let s = params.c1.shoot_length_sd;
    if s <= 0.0 {
        return 1.0;
    }
    let z = normal(
        params.seed,
        purpose::SHOOT_LENGTH,
        tree_id,
        bud_id,
        season,
        0.0,
    );
    math::exp(s * z - 0.5 * s * s)
}

/// Probe (#129, crown extent): g(L) = max(g_min, 1 / (1 + (L / L_x)^k)), the chance a shoot
/// extends at size `l` (cells): 1 at L = 0, one half at L_x, falling as L^-k beyond until it
/// meets the floor (held in [0, 1]). Exactly 1 with the rule off, or with L_x or k ≤ 0.
pub fn extent_scale(l: f64, c1: &C1) -> f64 {
    if c1.extent_limit == ExtentLimit::Off || c1.extent_scale <= 0.0 || c1.extent_steepness <= 0.0 {
        return 1.0;
    }
    let floor = math::max(0.0, math::min(1.0, c1.extent_floor));
    math::max(
        floor,
        1.0 / (1.0 + math::pow(l / c1.extent_scale, c1.extent_steepness)),
    )
}

/// Probe (#129): the chance that a shoot extends, from g at its node and `up`, the upward part
/// of its bud's heading. With `spare`, p = u² + (1 − u²)·g, u = max(0, up): an upright shoot (the
/// leader, whatever its order) is spared, a level or drooping one takes g in full. Without, p = g.
pub fn extent_chance(g: f64, up: f64, spare: bool) -> f64 {
    if !spare {
        return g;
    }
    let u = math::max(0.0, up);
    u * u + (1.0 - u * u) * g
}

/// Probe (#129): L (cells) at each metamer's tip, as the season began. One pass; nothing is
/// stored on the tree. `Reach`: the tip's horizontal distance from the stem base. `Height`: the
/// tree's height above its base, for every metamer alike. `Path`: the path length from the stem
/// base (R1's L_path, which is filled only with R1 on).
pub fn extent_sizes(tree: &Tree, of: ExtentLimit) -> Vec<f64> {
    let c = &tree.m;
    let mut size = vec![0.0; c.len()];
    match of {
        ExtentLimit::Off => {}
        ExtentLimit::Reach => {
            for (i, l) in size.iter_mut().enumerate() {
                let [x, _, z] = tree.tip(i);
                *l = math::hypot(x - tree.root_x, z - tree.root_z);
            }
        }
        ExtentLimit::Height => {
            let mut top = 0.0;
            for i in 0..c.len() {
                top = math::max(top, tree.tip_y(i) - c.base_y[0]);
            }
            size.fill(top);
        }
        ExtentLimit::Path => {
            // Parent before child: one forward pass.
            for i in 0..c.len() {
                let p = c.parent[i];
                let before = if p >= 0 { size[p as usize] } else { 0.0 };
                size[i] = before + c.length[i];
            }
        }
    }
    size
}

/// Probe (#129): whether the shoot of bud `bud_id` extends this season, with probability `p`
/// [RNG: extentLimit, keyed by the bud and the season]. No draw at p ≥ 1.
pub fn extends(p: f64, params: &Params, tree_id: f64, bud_id: f64, season: f64) -> bool {
    p >= 1.0
        || uniform(
            params.seed,
            purpose::EXTENT_LIMIT,
            tree_id,
            bud_id,
            season,
            0.0,
        ) < p
}

/// The offset, degrees, to β of the axis `axis` (the birthId its first metamer takes): s_β·N(0, 1)
/// [RNG: branchAngle, keyed by the axis only]; 0 when s_β = 0 (no draw).
pub fn beta_offset(params: &Params, tree_id: f64, axis: f64) -> f64 {
    let s = params.c1.beta_sd;
    if s <= 0.0 {
        return 0.0;
    }
    s * normal(params.seed, purpose::BRANCH_ANGLE, tree_id, axis, 0.0, 0.0)
}

/// A lateral's frame (`h`, `l`) turned by `offset` radians in the plane of its host's heading
/// `host`, away from it for offset > 0, so the angle between them becomes β + offset, held in
/// [0, π]. The reference is carried by parallel transport.
pub fn offset_frame(host: V3, h: V3, l: V3, offset: f64) -> (V3, V3) {
    let beta = angle_between(host, h);
    let to = math::max(0.0, math::min(std::f64::consts::PI, beta + offset));
    let axis = normalize_or(cross(host, h), any_perpendicular(h));
    let turned = normalize_or(rotate(h, axis, to - beta), h);
    (turned, transport(l, h, turned))
}

/// The juvenile cap on a shoot (ADR 0022), by the tree's height at the start of the season.
pub fn juvenile_cap(height: f64, params: &Params) -> f64 {
    let max = params.c1.max_metamers_per_shoot;
    let h_j = if params.r2.enabled {
        params.r2.h_j.unwrap_or(0.0)
    } else {
        0.0
    };
    if h_j <= 0.0 || max <= 1.0 {
        return max;
    }
    1.0 + (max - 1.0) * math::min(1.0, height / h_j)
}

/// Grows a shoot of `n` metamers of length `length` from `bud_` (§C1, §C3.4). `direct(tree,
/// prev, bud, birth id)` gives each new metamer's heading from the previous one; the reference is
/// carried along by parallel transport. `pa_shift ≥ 0` sets the shoot's reiteration shift (R4);
/// otherwise it inherits its parent's. `first_order ≥ 0` stores the shoot at that branching order
/// (a relay, ADR 0033: the order of the axis it replaces); otherwise its slot's.
#[allow(clippy::too_many_arguments)]
pub fn grow_shoot(
    tree: &mut Tree,
    bud_: usize,
    n: f64,
    length: f64,
    params: &Params,
    season: f64,
    direct: &mut dyn FnMut(&Tree, V3, usize, f64) -> V3,
    pa_shift: f64,
    first_order: f64,
) {
    let mut parent = tree.b.metamer[bud_];
    let mut slot_ = tree.b.slot[bud_];
    let mut h = tree.bud_heading(bud_);
    let mut l = tree.bud_reference(bud_);
    let mut azimuth = tree.b.azimuth[bud_];
    let state = tree.b.state[bud_];
    tree.b.state[bud_] = bud::GONE;
    let mut j = 0.0;
    while j < n {
        let next = direct(tree, h, bud_, tree.next_metamer_id);
        l = transport(l, h, next);
        h = next;
        // Obstacles (ADR 0015): the shoot stops before a metamer that would end inside one.
        let blocked = params.world.obstacles.is_some() && {
            let p = parent as usize;
            inside_obstacle(
                params,
                tree.tip_x(p) + length * h[0],
                tree.tip_y(p) + length * h[1],
            )
        };
        if blocked {
            if j == 0.0 {
                tree.b.state[bud_] = state; // nothing grew: the bud rests and tries again
            } else {
                form_terminal_bud(tree, parent as usize, params, season);
            }
            return;
        }
        let m = add_metamer(
            tree,
            parent,
            slot_,
            h,
            l,
            azimuth,
            length,
            params.c6.r0,
            season,
        );
        if j == 0.0 && pa_shift >= 0.0 {
            tree.m.pa_shift[m] = store_u8(pa_shift);
        }
        if j == 0.0 && first_order >= 0.0 {
            tree.m.order[m] = store_u8(first_order);
        }
        form_axillary_buds(tree, m, params, j == n - 1.0);
        if j == n - 1.0 {
            form_terminal_bud(tree, m, params, season);
        }
        parent = m as i32;
        slot_ = slot::MAIN;
        azimuth = 0.0;
        j += 1.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geom::{UP, angle_between, dot, norm};
    use crate::testing::preset;

    fn params(patch: &str) -> Params {
        Params::from_json(&preset("default", patch))
    }

    /// The state hash of the default lone tree, `patch` on top, after `seasons`.
    fn hashed(patch: &str, seasons: usize) -> String {
        let mut w = crate::world::World::new(preset("default", patch));
        w.run(seasons, &[]);
        crate::hash::hash_world(&w)
    }

    #[test]
    fn the_extent_chance_is_half_at_l_x_falls_as_the_steepness_says_and_keeps_its_floor() {
        // Probe (#129): g(L) = max(g_min, 1 / (1 + (L / L_x)^k)), worked by hand.
        let c1 = |patch: &str| params(&format!(r#"{{"c1":{patch}}}"#)).c1;
        let k2 = c1(r#"{"extentLimit":"height","extentScale":40,"extentSteepness":2}"#);
        assert_eq!(extent_scale(0.0, &k2), 1.0);
        assert!(close(extent_scale(40.0, &k2), 0.5));
        assert!(close(extent_scale(80.0, &k2), 0.2)); // 1 / (1 + 2²)
        assert!(close(extent_scale(120.0, &k2), 0.1)); // 1 / (1 + 3²)
        let k8 = c1(r#"{"extentLimit":"reach","extentScale":16,"extentSteepness":8}"#);
        assert!(close(extent_scale(16.0, &k8), 0.5));
        assert!(close(extent_scale(32.0, &k8), 1.0 / 257.0)); // 1 / (1 + 2⁸)
        // The floor holds g up; above 1 it is no limit, below 0 no floor.
        let floor = |f: f64| {
            c1(&format!(
                r#"{{"extentLimit":"reach","extentScale":16,"extentSteepness":8,"extentFloor":{f}}}"#
            ))
        };
        assert_eq!(extent_scale(32.0, &floor(0.1)), 0.1);
        assert!(close(extent_scale(16.0, &floor(0.1)), 0.5));
        assert_eq!(extent_scale(32.0, &floor(3.0)), 1.0);
        assert!(close(extent_scale(32.0, &floor(-1.0)), 1.0 / 257.0));
        // A steepness of 0 or less is no limit (g would not fall from 1 at the base); so is off.
        let flat = c1(r#"{"extentLimit":"reach","extentScale":16,"extentSteepness":0}"#);
        assert_eq!(extent_scale(32.0, &flat), 1.0);
        let off = c1(r#"{"extentScale":16,"extentSteepness":8}"#);
        assert_eq!(extent_scale(32.0, &off), 1.0);
    }

    #[test]
    fn an_upright_shoot_is_spared_the_extent_limit_and_a_level_one_takes_it_in_full() {
        // Probe (#129): p = u² + (1 − u²)·g, u the upward part of the bud's heading.
        let g = 0.2;
        assert_eq!(extent_chance(g, 1.0, true), 1.0); // the leader
        assert_eq!(extent_chance(g, 0.0, true), g); // a level limb
        assert!(close(extent_chance(g, 0.5, true), 0.4)); // 60° off vertical: ¼ + ¾·0.2
        let diagonal = std::f64::consts::FRAC_1_SQRT_2;
        assert!(close(extent_chance(g, diagonal, true), 0.6)); // 45°: ½ + ½·0.2
        // A drooping shoot is as level: it gains no height.
        assert_eq!(extent_chance(g, -0.8, true), g);
        // Without sparing every shoot takes g, the leader too (#121's reach, #89's path).
        assert_eq!(extent_chance(g, 1.0, false), g);
        assert_eq!(extent_chance(g, 0.0, false), g);
        // No limit: no chance to take, whatever the heading.
        assert_eq!(extent_chance(1.0, 0.0, true), 1.0);
    }

    #[test]
    fn an_extent_size_is_the_reach_the_tree_height_or_the_path_from_the_base() {
        // Probe (#129): L on a stem of three metamers with a level limb of two on its first node.
        // The stem stands at (10, 0, 32); the limb runs along +x at height 1.
        let mut t = Tree::new(0, 10.0, 32.0);
        let (up, x, z) = ([0.0, 1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]);
        let s0 = add_metamer(&mut t, -1, slot::MAIN, up, x, 0.0, 1.0, 0.1, 0.0);
        let s1 = add_metamer(&mut t, s0 as i32, slot::MAIN, up, x, 0.0, 1.0, 0.1, 0.0);
        let s2 = add_metamer(&mut t, s1 as i32, slot::MAIN, up, x, 0.0, 1.0, 0.1, 0.0);
        let l0 = add_metamer(&mut t, s0 as i32, 1, x, z, 0.0, 2.0, 0.1, 0.0);
        let l1 = add_metamer(&mut t, l0 as i32, slot::MAIN, x, z, 0.0, 1.5, 0.1, 0.0);
        assert_eq!((s2, l1), (2, 4));
        assert_eq!(
            extent_sizes(&t, ExtentLimit::Reach),
            [0.0, 0.0, 0.0, 2.0, 3.5]
        );
        assert_eq!(extent_sizes(&t, ExtentLimit::Height), [3.0; 5]);
        assert_eq!(
            extent_sizes(&t, ExtentLimit::Path),
            [1.0, 2.0, 3.0, 3.0, 4.5]
        );
    }

    #[test]
    fn a_bud_the_extent_limit_bars_rests_alive_and_a_spared_upright_one_grows() {
        // Probe (#129), in the season loop's bud phase. A seedling whose terminal bud (upright)
        // and lateral bud (level: β = 90°) each hold resource for one metamer; its node is one
        // internode along its path, so with L_x tiny g is 0 to rounding.
        let grown = |extent: &str| {
            let p = params(&format!(r#"{{"c1":{{"branchAngle":90{extent}}}}}"#));
            let mut t = Tree::new(0, 10.0, 32.0);
            plant_seedling(&mut t, &p, 0.0, 0.0, 0.0);
            let terminal = (0..t.b.len()).find(|&j| t.b.slot[j] == slot::MAIN).unwrap();
            let lateral = (0..t.b.len()).find(|&j| t.b.slot[j] != slot::MAIN).unwrap();
            t.b.v.iter_mut().for_each(|v| *v = 1.0);
            let before = t.m.len();
            crate::season::grow_buds(&mut t, &p, 1.0);
            let rests = |j: usize| t.b.state[j] == bud::ACTIVE || t.b.state[j] == bud::DORMANT;
            (t.m.len() - before, rests(terminal), rests(lateral))
        };
        // Off: both grow, and neither bud is left.
        assert_eq!(grown(""), (2, false, false));
        let limit = r#","extentLimit":"path","extentScale":1e-6,"extentSteepness":4"#;
        // Every shoot takes g: both are barred and rest, to try again next season.
        assert_eq!(grown(limit), (0, true, true));
        // Upright shoots spared: the leader grows, the level lateral is barred.
        assert_eq!(
            grown(&format!(r#"{limit},"extentSpare":true"#)),
            (1, false, true)
        );
        // No limit (L_x huge): both grow.
        let free = r#","extentLimit":"path","extentScale":1e9,"extentSpare":true"#;
        assert_eq!(grown(free), (2, false, false));
    }

    #[test]
    fn the_extent_draw_bars_a_shoot_at_its_chance_and_is_keyed_by_tree_bud_and_season() {
        // Probe (#129), in the bud phase. A seedling's node is one internode along its path, so
        // with L_x = 1 its terminal bud extends with a chance of one half. Over 4,000 seedlings
        // (tree ids 0..4000) about half grow; the same tree and season always draw alike, and
        // another season draws afresh.
        let p = params(r#"{"c1":{"extentLimit":"path","extentScale":1,"extentSteepness":3}}"#);
        let grows = |id: usize, season: f64| {
            let mut t = Tree::new(id, 10.0, 32.0);
            plant_seedling(&mut t, &p, 0.0, 0.0, 0.0);
            let terminal = (0..t.b.len()).find(|&j| t.b.slot[j] == slot::MAIN).unwrap();
            t.b.v.iter_mut().for_each(|v| *v = 0.0);
            t.b.v[terminal] = 1.0;
            let before = t.m.len();
            crate::season::grow_buds(&mut t, &p, season);
            t.m.len() > before
        };
        let first: Vec<bool> = (0..4000).map(|id| grows(id, 1.0)).collect();
        let grown = first.iter().filter(|&&g| g).count();
        assert!((1880..=2120).contains(&grown), "{grown} of 4000"); // ± 3.8 SD
        assert!((0..4000).all(|id| grows(id, 1.0) == first[id]));
        let changed = (0..4000).filter(|&id| grows(id, 2.0) != first[id]).count();
        assert!(
            (1880..=2120).contains(&changed),
            "{changed} of 4000 changed"
        );
    }

    #[test]
    fn the_extent_limit_is_off_by_default_and_written_out_is_bit_identical() {
        // Probe (#129): `off` written out, with every other extent param set, hashes as a run
        // that leaves the rule absent; so does a limit whose L_x is 0 (no limit). A reach limit
        // of half a cell bars every shoot off the stem, so that run differs.
        let absent = hashed("{}", 12);
        let off = r#"{"c1":{"extentLimit":"off","extentSpare":true,"extentScale":0.5,
                     "extentSteepness":8,"extentFloor":0.1}}"#;
        assert_eq!(hashed(off, 12), absent);
        let no_scale = r#"{"c1":{"extentLimit":"reach","extentScale":0}}"#;
        assert_eq!(hashed(no_scale, 12), absent);
        let reach = r#"{"c1":{"extentLimit":"reach","extentScale":0.5,"extentSteepness":8}}"#;
        assert_ne!(hashed(reach, 12), absent);
    }

    #[test]
    fn a_branch_angle_offset_is_drawn_once_per_axis_and_turns_away_from_the_host() {
        let off = params("{}");
        assert_eq!(beta_offset(&off, 0.0, 12.0), 0.0);
        let on = params(r#"{"c1":{"betaSD":20}}"#);
        // Keyed by the axis only: the same axis gets the same offset, another axis not.
        let a = beta_offset(&on, 1.0, 12.0);
        assert_eq!(a, beta_offset(&on, 1.0, 12.0));
        assert_ne!(a, beta_offset(&on, 1.0, 13.0));
        let n = 20_000;
        let (mut s1, mut s2) = (0.0f64, 0.0f64);
        for k in 0..n {
            let x = beta_offset(&on, 2.0, k as f64);
            s1 += x;
            s2 += x * x;
        }
        let mean = s1 / n as f64;
        let sd = (s2 / n as f64 - mean * mean).sqrt();
        assert!(mean.abs() < 0.5, "mean {mean}");
        assert!((sd - 20.0).abs() < 0.5, "sd {sd}");
        // The frame: a lateral at 45° from a vertical host turned by +15° sits at 60°, by -15° at
        // 30°, in the same azimuthal plane; a turn past the host stops on it; L stays a frame.
        let host = UP;
        let h = tilt(UP, [1.0, 0.0, 0.0], 45f64.to_radians(), 0.3);
        let l = normalize_or(reject(UP, h), any_perpendicular(h));
        for (by, want) in [(15.0, 60.0), (-15.0, 30.0), (-80.0, 0.0), (0.0, 45.0)] {
            let (th, tl) = offset_frame(host, h, l, f64::to_radians(by));
            assert!(
                close(angle_between(th, host), f64::to_radians(want)),
                "{by}"
            );
            assert!(close(norm(th), 1.0) && close(norm(tl), 1.0) && dot(th, tl).abs() < 1e-9);
            if want > 0.0 {
                // The same side of the host: the horizontal parts point the same way.
                assert!(th[0] * h[0] + th[2] * h[2] > 0.0);
            }
        }
    }

    #[test]
    fn a_shoot_length_factor_is_lognormal_with_mean_one_and_off_at_zero() {
        let off = params("{}");
        assert_eq!(shoot_length_factor(&off, 0.0, 5.0, 3.0), 1.0);
        let on = params(r#"{"c1":{"shootLengthSD":0.4}}"#);
        // Keyed by the bud and the season: the same pair gives the same factor, another season not.
        let f = shoot_length_factor(&on, 0.0, 5.0, 3.0);
        assert_eq!(f, shoot_length_factor(&on, 0.0, 5.0, 3.0));
        assert_ne!(f, shoot_length_factor(&on, 0.0, 5.0, 4.0));
        let n = 20_000;
        let (mut mean, mut s1, mut s2) = (0.0f64, 0.0f64, 0.0f64);
        for id in 0..n {
            let x = shoot_length_factor(&on, 1.0, id as f64, 7.0);
            assert!(x > 0.0);
            mean += x;
            s1 += x.ln();
            s2 += x.ln() * x.ln();
        }
        let n = n as f64;
        let sd = (s2 / n - (s1 / n).powi(2)).sqrt();
        assert!((mean / n - 1.0).abs() < 0.01, "mean {}", mean / n);
        assert!((sd - 0.4).abs() < 0.01, "sd {sd}");
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-12
    }

    /// The laterals of a vertical axis of `n` nodes from x = 10, by node.
    fn axis(p: &Params, n: usize) -> (Tree, Vec<Vec<usize>>) {
        let mut t = Tree::new(0, 10.0, 32.0);
        let mut parent = -1;
        let mut nodes = Vec::new();
        for _ in 0..n {
            let m = add_metamer(
                &mut t,
                parent,
                slot::MAIN,
                UP,
                [1.0, 0.0, 0.0],
                0.0,
                1.0,
                0.02,
                0.0,
            );
            let before = t.b.len();
            form_axillary_buds(&mut t, m, p, true);
            nodes.push((before..t.b.len()).collect());
            parent = m as i32;
        }
        (t, nodes)
    }

    #[test]
    fn a_spiral_steps_each_lateral_by_the_divergence_angle_at_the_branch_angle() {
        let p = params(r#"{"c1":{"phyllotaxis":"spiral","divergence":137.5,"branchAngle":45}}"#);
        let (t, nodes) = axis(&p, 4);
        let first = nodes[0][0];
        for (k, buds) in nodes.iter().enumerate() {
            assert_eq!(buds.len(), 1);
            let j = buds[0];
            assert_eq!(t.b.slot[j], slot::LATERAL);
            let step = t.b.azimuth[j] - t.b.azimuth[first];
            assert!(close(step, k as f64 * 137.5f64.to_radians()));
            let h = t.bud_heading(j);
            assert!(close(angle_between(h, UP), 45f64.to_radians()));
            // Its frame: unit, perpendicular, the reference on the parent axis's side.
            let l = t.bud_reference(j);
            assert!(close(norm(h), 1.0) && close(norm(l), 1.0) && dot(h, l).abs() < 1e-12);
            assert!(dot(l, UP) > 0.0);
        }
    }

    #[test]
    fn distichous_alternates_sides_and_opposite_pairs_turn_a_quarter_each_node() {
        let pi = std::f64::consts::PI;
        let p = params(r#"{"c1":{"phyllotaxis":"distichous"}}"#);
        let (t, nodes) = axis(&p, 3);
        let h: Vec<_> = nodes.iter().map(|b| t.bud_heading(b[0])).collect();
        assert!(dot([h[0][0], 0.0, h[0][2]], [h[1][0], 0.0, h[1][2]]) < -0.4); // opposite sides
        assert!(close(
            t.b.azimuth[nodes[2][0]] - t.b.azimuth[nodes[0][0]],
            2.0 * pi
        ));
        let row = r#"{"lambda":0.5,"setPoint":0,"eta":0.15,"branchAngle":45,"generator":"opposite","tierEvery":0,"pTerm":0}"#;
        let p = params(&format!(r#"{{"r2":{{"enabled":true,"levels":[{row}]}}}}"#));
        let (t, nodes) = axis(&p, 2);
        let az = |n: usize, j: usize| t.b.azimuth[nodes[n][j]];
        assert_eq!(nodes[0].len(), 2);
        assert!(close(az(0, 1) - az(0, 0), pi)); // a pair across the stem
        assert!(close(az(1, 0) - az(0, 0), pi / 2.0)); // decussate
        assert_eq!((t.b.slot[nodes[0][0]], t.b.slot[nodes[0][1]]), (1, 2));
    }

    #[test]
    fn a_whorl_spreads_its_laterals_evenly_round_the_axis() {
        let row = r#"{"lambda":0.5,"setPoint":0,"eta":0.15,"branchAngle":60,"generator":"whorled","whorl":5,"tierEvery":0,"pTerm":0}"#;
        let p = params(&format!(r#"{{"r2":{{"enabled":true,"levels":[{row}]}}}}"#));
        let (t, nodes) = axis(&p, 1);
        assert_eq!(nodes[0].len(), 5);
        let mut flat: Vec<_> = nodes[0]
            .iter()
            .map(|&j| {
                let h = t.bud_heading(j);
                crate::geom::normalize_or([h[0], 0.0, h[2]], UP)
            })
            .collect();
        flat.push(flat[0]);
        for w in flat.windows(2) {
            assert!(close(angle_between(w[0], w[1]), 72f64.to_radians()));
        }
        let slots: Vec<u8> = nodes[0].iter().map(|&j| t.b.slot[j]).collect();
        assert_eq!(slots, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn a_seedling_faces_its_own_azimuth_and_zero_is_the_old_frame() {
        // ADR 0054: the reference turns about the heading by a per-tree draw; h stays vertical.
        let p = params(r#"{"c1":{"phyllotaxis":"distichous"}}"#);
        let frame = |id: usize, lean: f64, az: f64| {
            let mut t = Tree::new(id, 10.0, 32.0);
            plant_seedling(&mut t, &p, 0.0, lean, az);
            (t.heading(0), t.reference(0))
        };
        let (h, l) = frame(0, 0.0, 0.0);
        assert_eq!((h, l), ([0.0, 1.0, 0.0], [1.0, -0.0, 0.0])); // the old frame, bit for bit
        let az = seedling_azimuth(&p, 3);
        assert_eq!(az, seedling_azimuth(&p, 3)); // the same tree and seed: the same draw
        assert!((0.0..2.0 * std::f64::consts::PI).contains(&az));
        let (h, l) = frame(3, 0.0, az);
        assert_eq!(h, UP);
        assert!(close(norm(l), 1.0) && dot(h, l).abs() < 1e-12);
        assert!(close(l[0], az.cos()) && close(l[2], -az.sin()));
        // A world lean keeps its heading in the x–y plane; only L turns, about it.
        let (h0, _) = frame(3, 10.0, 0.0);
        let (h1, l1) = frame(3, 10.0, az);
        assert_eq!(h0, h1);
        assert!(close(norm(l1), 1.0) && dot(h1, l1).abs() < 1e-12);
        // Different trees draw different azimuths (twenty ids, all distinct, spread round the circle).
        let draws: Vec<f64> = (0..20).map(|i| seedling_azimuth(&p, i)).collect();
        for i in 0..draws.len() {
            for j in 0..i {
                assert_ne!(draws[i], draws[j]);
            }
        }
        let (c, s) = draws
            .iter()
            .fold((0.0, 0.0), |(c, s), a| (c + a.cos(), s + a.sin()));
        assert!(math::hypot(c, s) / 20.0 < 0.5);
    }

    #[test]
    fn a_shoot_carries_its_frame_by_parallel_transport_as_it_bends() {
        let p = params(r#"{"c1":{"phyllotaxis":"spiral"}}"#);
        let mut t = Tree::new(0, 10.0, 32.0);
        plant_seedling(&mut t, &p, 0.0, 0.0, 0.0);
        let terminal = (0..t.b.len()).find(|&j| t.b.slot[j] == slot::MAIN).unwrap();
        // Each new metamer turns 10° further toward +z.
        let turn = 10f64.to_radians();
        let mut direct =
            |_: &Tree, prev: V3, _: usize, _: f64| crate::geom::rotate(prev, [1.0, 0.0, 0.0], turn);
        grow_shoot(&mut t, terminal, 3.0, 1.0, &p, 1.0, &mut direct, -1.0, -1.0);
        for i in 1..t.m.len() {
            let (h, l) = (t.heading(i), t.reference(i));
            assert!(close(norm(h), 1.0) && close(norm(l), 1.0) && dot(h, l).abs() < 1e-12);
            // Turning about x moves the frame about x: the reference, x at the root, stays x.
            assert!(close(l[0], 1.0));
            assert!(close(angle_between(h, t.heading(i - 1)), turn));
            // Each metamer starts at its parent's tip.
            let tip = t.tip(t.m.parent[i] as usize);
            assert!((0..3).all(|k| (t.base(i)[k] - tip[k]).abs() < 1e-12));
        }
        assert!(t.tip_z(3) > 32.0);
    }

    #[test]
    fn the_juvenile_cap_rises_from_one_metamer_to_the_full_cap_at_h_j() {
        let row = r#"{"lambda":0.5,"setPoint":0,"eta":0.15,"branchAngle":45,"generator":"distichous","tierEvery":0,"pTerm":0}"#;
        let p = Params::from_json(&preset(
            "default",
            &format!(r#"{{"r2":{{"enabled":true,"levels":[{row}],"hJ":20}}}}"#),
        ));
        let max = p.c1.max_metamers_per_shoot;
        assert_eq!(juvenile_cap(0.0, &p), 1.0);
        assert!((juvenile_cap(10.0, &p) - (1.0 + (max - 1.0) / 2.0)).abs() < 1e-12);
        assert_eq!(juvenile_cap(20.0, &p), max);
        assert_eq!(juvenile_cap(80.0, &p), max);
        // Off: h_j absent, or R2 off.
        let no_hj = Params::from_json(&preset(
            "default",
            &format!(r#"{{"r2":{{"enabled":true,"levels":[{row}]}}}}"#),
        ));
        assert_eq!(juvenile_cap(0.0, &no_hj), max);
        let mut off = p.clone();
        off.r2.enabled = false;
        assert_eq!(juvenile_cap(0.0, &off), max);
    }

    #[test]
    fn a_fractional_cap_gives_one_longer_metamer() {
        let p = Params::from_json(&preset("default", "{}"));
        let mut length = 0.0;
        assert_eq!(shoot_size(10.0, &p, &mut length, 1.5), 1.0);
        assert!((length - 1.5 * p.c1.internode_length).abs() < 1e-12);
    }
}
