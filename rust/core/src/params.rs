//! Simulation parameters (`src/core/params.ts`): one plain-JSON object, read here into typed
//! groups the passes use. The JSON stays the source: species patches merge into it
//! (`species_params`), events patch it, checkpoints and run records carry it, all through
//! `json::merge`, with JavaScript's semantics (key order, number printing).
//!
//! A field the JSON lacks reads as JavaScript reads `undefined`: NaN for a number, false for a
//! flag, "" for a string. The optional fields params.ts marks with `?` are `Option`s, defaulted
//! where the TypeScript defaults them (`?? 0`).

use crate::json::{self, Value};

/// π/180, as `Math.PI / 180`.
pub const DEG: f64 = std::f64::consts::PI / 180.0;

fn num(v: &Value, key: &str) -> f64 {
    v.get(key).and_then(Value::as_f64).unwrap_or(f64::NAN)
}

fn opt(v: &Value, key: &str) -> Option<f64> {
    v.get(key).and_then(Value::as_f64)
}

fn flag(v: &Value, key: &str) -> bool {
    v.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn text(v: &Value, key: &str) -> String {
    v.get(key).and_then(Value::as_str).unwrap_or("").to_string()
}

fn group<'a>(v: &'a Value, key: &str) -> &'a Value {
    static NULL: Value = Value::Null;
    v.get(key).unwrap_or(&NULL)
}

#[derive(Clone, Debug)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    /// Walls only: shadow added to each covered cell.
    pub shade: f64,
}

#[derive(Clone, Debug)]
pub struct TreeSpec {
    pub x: f64,
    /// Depth in the slab; absent, the slab's middle.
    pub z: f64,
    pub species: String,
    pub plant_season: f64,
    pub lean: f64,
}

#[derive(Clone, Debug)]
pub struct WorldP {
    pub width: f64,
    pub height: f64,
    /// D, the slab's depth in cells (ADR 0024: 64).
    pub depth: f64,
    /// τ beyond the front (z < 0, the viewer's) and back (z ≥ D) faces (ADR 0024).
    pub faces: [f64; 2],
    /// Q fades linearly to 0 over this many cells before each face (0: hard faces).
    pub fade: f64,
    /// `world.faceWood`: a virtual wood beyond the z faces with the slab's own foliage profile, at
    /// this share of its density (box A4, ADR 0056). 0: off.
    pub face_wood: f64,
    pub walls: Vec<Rect>,
    /// `world.obstacles`: None when absent (growth then skips the check, as `!== undefined`).
    pub obstacles: Option<Vec<Rect>>,
    pub periodic: bool,
    /// `world.sidesZ` "periodic": the depth wraps as the width does (box A6, ADR 0058).
    pub periodic_z: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Phyllotaxis {
    Spiral,
    Distichous,
}

#[derive(Clone, Debug)]
pub struct C1 {
    /// Without R2: one lateral a node, at successive azimuths `divergence` (spiral) or 180° apart.
    pub phyllotaxis: Phyllotaxis,
    /// The spiral's divergence angle, degrees (137.5°, the golden angle).
    pub divergence: f64,
    pub branch_angle: f64,
    pub internode_length: f64,
    pub max_metamers_per_shoot: f64,
    /// c1.budBreak (prototype): `Some(width)` when stochastic, `None` deterministic (or absent).
    pub bud_break_width: Option<f64>,
    /// c1.shootLengthSD (prototype): SD s of ln(shoot length); 0 when absent (off).
    pub shoot_length_sd: f64,
    /// c1.betaSD (prototype): SD, degrees, of a per-axis offset to β; 0 when absent (off).
    pub beta_sd: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LightKind {
    /// The slab sweep (G3): Beer–Lambert over W × H × D.
    Slab,
    /// The §8 ablation (M22): one homogeneous canopy's mean light.
    Pooled,
}

#[derive(Clone, Debug)]
pub struct C2 {
    pub enabled: bool,
    pub model: LightKind,
    pub c: f64,
    pub k: f64,
    pub k_ext: f64,
    pub sky_exponent: f64,
    pub sky_tilt: f64,
    pub min_elevation: f64,
    pub rotate: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum C3Mode {
    Bh,
    Equal,
    None,
}

#[derive(Clone, Debug)]
pub struct C3 {
    pub mode: C3Mode,
    pub lambda: f64,
    pub alpha: f64,
}

#[derive(Clone, Copy, Debug)]
pub struct C4 {
    pub enabled: bool,
    pub wd: f64,
    pub xi: f64,
    pub eta: f64,
    pub set_point: f64,
    pub epsilon: f64,
    pub sigma: f64,
    /// c4.axisSD (prototype): SD, degrees, of a per-axis offset to A_set; 0 when absent (off).
    pub axis_sd: f64,
}

#[derive(Clone, Debug)]
pub struct C5 {
    pub enabled: bool,
    pub t: f64,
    pub g: f64,
    pub t_rel: f64,
    pub top_quantile: f64,
    /// Own-crown pruning (fresh-look beech, repair): a lateral whose light per metamer is below
    /// g·Tvig·Q_top is shed too, g the tree's vigour gate (r2.vigourTreeLo/Hi; 1 when unset).
    /// 0 or absent: off.
    pub t_vig: f64,
    /// Accumulating relative test (wayfinder "bare bole"): a lateral is shed by T_rel·Q_top only
    /// after this many consecutive dark seasons; a season above resets the count. 1 or absent:
    /// this season alone, as before.
    pub k_rel: f64,
}

#[derive(Clone, Debug)]
pub struct C6 {
    pub enabled: bool,
    pub n: f64,
    pub r0: f64,
}

#[derive(Clone, Debug)]
pub struct R1 {
    pub enabled: bool,
    pub mw: f64,
    pub mf: f64,
    pub lh: f64,
    pub hyperbolic: bool,
    pub sr: f64,
    pub f_rep: f64,
    pub maturity: f64,
    pub k_starve: f64,
    pub reserve0: f64,
    pub store: f64,
    /// `r1.shed === "carbon"`.
    pub shed_carbon: bool,
    /// `r1.response === "saturating"` (ADR 0030); absent, the linear response.
    pub saturating: bool,
    /// q_half: the saturating response's half-saturation light (read only when `saturating`).
    pub q_half: f64,
    /// k_shed: consecutive seasons of P_b < M_b before carbon shedding takes a branch (absent: 1).
    pub k_shed: f64,
    /// `r1.leafCost === "acclimated"`: foliage maintenance falls with the leaf's light.
    pub leaf_acclimated: bool,
    /// c: the acclimated cost's share at Q = 0, m_f·(c + (1 − c)·Q) (read only when acclimated).
    pub leaf_cost_shade: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Generator {
    Distichous,
    /// One lateral a node at the divergence angle (c1.divergence).
    Spiral,
    Opposite,
    Whorled,
    None,
    /// A name the TypeScript `switch` has no case for: `lateralCount` returns undefined.
    Unknown,
}

#[derive(Clone, Debug)]
pub struct PaLevel {
    pub lambda: f64,
    pub set_point: f64,
    pub eta: f64,
    pub branch_angle: f64,
    pub generator: Generator,
    pub tier_every: f64,
    pub p_term: f64,
    pub posture_set_point: Option<f64>,
    /// Laterals in a whorl ("whorled"); absent, 4.
    pub whorl: Option<f64>,
    /// Curvature along the limb (ADR 0034): degrees added to the set points over `curve_length`
    /// nodes of the axis. Absent or 0: off.
    pub curve: Option<f64>,
    pub curve_length: Option<f64>,
    /// Pendulous twigs (ADR 0035): the set point (degrees) a thin axis of this level hangs at,
    /// fully at radius ≤ `pendulous_radius`, fading to the level's own at twice it. Absent: off.
    pub pendulous: Option<f64>,
    pub pendulous_radius: Option<f64>,
    /// Twig density (ADR 0036): this level's acrotony κ (absent: r2.kappa), and laterals only at
    /// every k-th node (absent or ≤ 1: every node; not for whorled, which has tier_every).
    pub kappa: Option<f64>,
    pub lateral_every: Option<f64>,
    /// Elbows (ADR 0037): when this level's axis ends (p_term), the laterals on its top `relay`
    /// nodes continue it at this level (absent: 0, or r2.relay for pa 0).
    pub relay: Option<f64>,
    /// Posture by age (ADR 0038): the set point this level's axes move toward with age, over
    /// `aged_over` seasons, by the wood's own age, or the tree's when `aged_by_tree`. Absent: off.
    pub aged_set_point: Option<f64>,
    pub aged_over: Option<f64>,
    pub aged_by_tree: bool,
    /// Twigs keep λ (ADR 0057, proposed): the share of r2.dLambda, the ontogenetic fall of λ,
    /// that this level takes. Absent: 1, every level falls by the full Δλ (today's).
    pub d_lambda_share: Option<f64>,
}

#[derive(Clone, Debug)]
pub struct R2 {
    pub enabled: bool,
    pub levels: Vec<PaLevel>,
    pub a_c: f64,
    pub d_lambda: f64,
    pub ramp: f64,
    pub kappa: Option<f64>,
    pub h_j: Option<f64>,
    /// The sympodial relay (ADR 0033): laterals on the top `relay` nodes below a pa-0 axis's
    /// ended apex take pa 0. 0 or absent: off.
    pub relay: f64,
    /// From this tree age (seasons) a pa-0 terminal ends with probability `relay_p_term`.
    pub relay_age: f64,
    pub relay_p_term: f64,
    /// The vigour fork (Nicolini & Caraglio 1994: beech forks where growth is fastest): a pa-0
    /// shoot whose bud received v ≥ `forkAt`·c1.maxMetamersPerShoot ends its terminal bud, so the
    /// relay (r2.relay nodes) turns the season's apex into co-dominant arms. 0 or absent: off.
    pub fork_at: f64,
    /// The fork arms' angle from the ended apex's heading, degrees (absent: the laterals' own β).
    pub fork_angle: Option<f64>,
    /// The relay's neighbour gate (fresh-look beech): a pa-0 apex ends by `relay_p_term`·max(0,
    /// 1 − k·s̄), s̄ the tree's mean R5 neighbour shade over its metamers (0 alone in the open).
    /// Absent: off, the relay fires by age alone.
    pub relay_crowd: Option<f64>,
    /// The vigour drop (fresh-look beech): the share s of the tree's resource v_base at which a
    /// node is fully vigorous, u = min(1, (v_in / v_base) / s). 0 or absent: off.
    pub vigour_share: f64,
    /// λ falls by g·(1 − u)·vigourLambda at a node: weak wood loses apical control (absent: 0).
    pub vigour_lambda: f64,
    /// The tree's own vigour gate g = clamp((v_base − lo) / (hi − lo)), so a tree whose whole
    /// production stays small (a stand member, a suppressed tree) is untouched; g = 1 when
    /// `vigour_tree_hi` ≤ `vigour_tree_lo` (both absent).
    pub vigour_tree_lo: f64,
    pub vigour_tree_hi: f64,
    /// Light orthotropy (fresh-look beech, repair): a new shoot of pa ≥ 1 takes a growth set
    /// point moved from its level's toward this one (degrees from vertical) by its bud's light,
    /// fully at `light_hi` and above, not at all at `light_lo` and below (Nicolini & Caraglio
    /// 1994: vertical laterals are more frequent in full light; Nicolini 2000: axes under cover
    /// are plagiotropic). Absent: off.
    pub light_set_point: Option<f64>,
    pub light_lo: f64,
    pub light_hi: f64,
    /// Light orthotropy's wood-age ramp: wood straightens fully at this age, seasons (absent: 1,
    /// so even this season's shoot does).
    pub light_over: f64,
}

#[derive(Clone, Debug)]
pub struct R3 {
    pub enabled: bool,
    pub rho: f64,
    pub leaf_mass: f64,
    pub e: f64,
    /// `r3.sag === "increment"`.
    pub sag_increment: bool,
    pub phi: f64,
    pub posture: bool,
    pub beta_g: f64,
    pub gamma: f64,
    pub c: f64,
    pub sigma_target: f64,
    pub girth_gain: f64,
    pub sigma_break: f64,
    /// `r3.ground === true`.
    pub ground: bool,
}

#[derive(Clone, Debug)]
pub struct R4 {
    pub enabled: bool,
    pub v_break: f64,
    pub q_rel: f64,
    pub v_cont: f64,
    pub delta: f64,
    pub l_dorm: f64,
    pub juvenile: f64,
    pub bank: bool,
}

#[derive(Clone, Debug)]
pub struct R5 {
    pub enabled: bool,
    pub e_s: f64,
    pub d_lambda: f64,
    pub d_b: f64,
    pub d_a: f64,
    /// `r5.signal === "neighbours"`.
    pub neighbours: bool,
}

#[derive(Clone, Debug)]
pub struct O2 {
    pub enabled: bool,
    pub sway: f64,
    pub max_sway: f64,
    pub p_abr: f64,
    pub storm_p: Option<f64>,
    pub storm_load: Option<f64>,
}

#[derive(Clone, Debug)]
pub struct O4 {
    pub enabled: bool,
    pub c_seed: f64,
    pub d: f64,
    pub q_est: f64,
    pub p_est: f64,
    pub m0: f64,
    pub max_trees: f64,
    pub rain: Option<f64>,
    /// The band of depth seedlings establish in, cells, centred on the slab's middle (the
    /// garden's one row, I3); None: anywhere.
    pub band: Option<f64>,
}

#[derive(Clone, Debug)]
pub struct R6 {
    pub enabled: bool,
    pub q_min: f64,
    pub leaf_area: f64,
    /// L: a short shoot on wood older than this rests as a dormant bud (ADR 0044). Absent: off.
    pub lifespan: Option<f64>,
}

/// The typed view of one params object (the world's, or a species' merged over it).
#[derive(Clone, Debug)]
pub struct Params {
    pub seed: f64,
    pub world: WorldP,
    pub trees: Vec<TreeSpec>,
    pub c1: C1,
    pub c2: C2,
    pub c3: C3,
    pub c4: C4,
    pub c5: C5,
    pub c6: C6,
    pub r1: R1,
    pub r2: R2,
    pub r3: R3,
    pub r4: R4,
    pub r5: R5,
    pub o2: O2,
    pub o4: O4,
    pub r6: R6,
    /// Species names in the table's order (`Object.keys(params.species)`), None without a table.
    pub species: Option<Vec<String>>,
    /// Some species' own r5 patch asks for the neighbour signal (season.ts's owner-grid test).
    pub species_neighbours: bool,
}

fn rects(v: Option<&Value>, shade: bool) -> Vec<Rect> {
    v.and_then(Value::as_array)
        .unwrap_or(&[])
        .iter()
        .map(|r| Rect {
            x: num(r, "x"),
            y: num(r, "y"),
            width: num(r, "width"),
            height: num(r, "height"),
            shade: if shade { num(r, "shade") } else { 0.0 },
        })
        .collect()
}

impl Params {
    pub fn from_json(v: &Value) -> Params {
        let w = group(v, "world");
        let c2 = group(v, "c2");
        let c3 = group(v, "c3");
        let c4 = group(v, "c4");
        let r1 = group(v, "r1");
        let r2 = group(v, "r2");
        let r3 = group(v, "r3");
        let r5 = group(v, "r5");
        let o2 = group(v, "o2");
        let o4 = group(v, "o4");
        let species_table = v.get("species").and_then(Value::as_object);
        Params {
            seed: num(v, "seed"),
            world: WorldP {
                width: num(w, "width"),
                height: num(w, "height"),
                depth: num(w, "depth"),
                faces: match w.get("faces").and_then(Value::as_array) {
                    Some(f) => [
                        f.first().and_then(Value::as_f64).unwrap_or(1.0),
                        f.get(1).and_then(Value::as_f64).unwrap_or(1.0),
                    ],
                    None => [1.0, 1.0],
                },
                fade: opt(w, "fade").unwrap_or(0.0),
                face_wood: opt(w, "faceWood").unwrap_or(0.0),
                walls: rects(w.get("walls"), true),
                obstacles: w.get("obstacles").map(|o| rects(Some(o), false)),
                periodic: text(w, "sides") == "periodic",
                periodic_z: text(w, "sidesZ") == "periodic",
            },
            trees: v
                .get("trees")
                .and_then(Value::as_array)
                .unwrap_or(&[])
                .iter()
                .map(|t| TreeSpec {
                    x: num(t, "x"),
                    z: opt(t, "z").unwrap_or(num(w, "depth") / 2.0),
                    species: text(t, "species"),
                    plant_season: opt(t, "plantSeason").unwrap_or(0.0),
                    lean: opt(t, "lean").unwrap_or(0.0),
                })
                .collect(),
            c1: {
                let g = group(v, "c1");
                C1 {
                    phyllotaxis: match text(g, "phyllotaxis").as_str() {
                        "distichous" => Phyllotaxis::Distichous,
                        _ => Phyllotaxis::Spiral,
                    },
                    divergence: opt(g, "divergence").unwrap_or(137.5),
                    branch_angle: num(g, "branchAngle"),
                    internode_length: num(g, "internodeLength"),
                    max_metamers_per_shoot: num(g, "maxMetamersPerShoot"),
                    bud_break_width: {
                        let b = group(g, "budBreak");
                        (text(b, "mode") == "stochastic").then(|| num(b, "width"))
                    },
                    shoot_length_sd: opt(g, "shootLengthSD").unwrap_or(0.0),
                    beta_sd: opt(g, "betaSD").unwrap_or(0.0),
                }
            },
            c2: C2 {
                enabled: flag(c2, "enabled"),
                model: match text(c2, "model").as_str() {
                    "pooled" => LightKind::Pooled,
                    _ => LightKind::Slab,
                },
                c: num(c2, "C"),
                k: num(c2, "K"),
                k_ext: num(c2, "kExt"),
                sky_exponent: num(c2, "skyExponent"),
                sky_tilt: opt(c2, "skyTilt").unwrap_or(0.0),
                min_elevation: num(c2, "minElevation"),
                rotate: flag(c2, "rotate"),
            },
            c3: C3 {
                mode: match text(c3, "mode").as_str() {
                    "bh" => C3Mode::Bh,
                    "equal" => C3Mode::Equal,
                    _ => C3Mode::None,
                },
                lambda: num(c3, "lambda"),
                alpha: num(c3, "alpha"),
            },
            c4: C4 {
                enabled: flag(c4, "enabled"),
                wd: num(c4, "wd"),
                xi: num(c4, "xi"),
                eta: num(c4, "eta"),
                set_point: num(c4, "setPoint"),
                epsilon: num(c4, "epsilon"),
                sigma: num(c4, "sigma"),
                axis_sd: opt(c4, "axisSD").unwrap_or(0.0),
            },
            c5: {
                let g = group(v, "c5");
                C5 {
                    enabled: flag(g, "enabled"),
                    t: num(g, "T"),
                    g: num(g, "g"),
                    t_rel: num(g, "Trel"),
                    top_quantile: num(g, "topQuantile"),
                    t_vig: opt(g, "Tvig").unwrap_or(0.0),
                    k_rel: opt(g, "kRel").unwrap_or(1.0),
                }
            },
            c6: {
                let g = group(v, "c6");
                C6 {
                    enabled: flag(g, "enabled"),
                    n: num(g, "n"),
                    r0: num(g, "r0"),
                }
            },
            r1: R1 {
                enabled: flag(r1, "enabled"),
                mw: num(r1, "mw"),
                mf: num(r1, "mf"),
                lh: num(r1, "Lh"),
                hyperbolic: text(r1, "hydraulic") == "hyperbolic",
                sr: num(r1, "sr"),
                f_rep: num(r1, "fRep"),
                maturity: num(r1, "maturity"),
                k_starve: num(r1, "kStarve"),
                reserve0: num(r1, "reserve0"),
                store: num(r1, "store"),
                shed_carbon: text(r1, "shed") == "carbon",
                saturating: text(r1, "response") == "saturating",
                q_half: num(r1, "qHalf"),
                k_shed: opt(r1, "kShed").unwrap_or(1.0),
                leaf_acclimated: text(r1, "leafCost") == "acclimated",
                leaf_cost_shade: num(r1, "leafCostShade"),
            },
            r2: R2 {
                enabled: flag(r2, "enabled"),
                levels: r2
                    .get("levels")
                    .and_then(Value::as_array)
                    .unwrap_or(&[])
                    .iter()
                    .map(|l| PaLevel {
                        lambda: num(l, "lambda"),
                        set_point: num(l, "setPoint"),
                        eta: num(l, "eta"),
                        branch_angle: num(l, "branchAngle"),
                        generator: match text(l, "generator").as_str() {
                            "distichous" => Generator::Distichous,
                            "spiral" => Generator::Spiral,
                            "opposite" => Generator::Opposite,
                            "whorled" => Generator::Whorled,
                            "none" => Generator::None,
                            _ => Generator::Unknown,
                        },
                        tier_every: num(l, "tierEvery"),
                        p_term: num(l, "pTerm"),
                        posture_set_point: opt(l, "postureSetPoint"),
                        whorl: opt(l, "whorl"),
                        curve: opt(l, "curve"),
                        curve_length: opt(l, "curveLength"),
                        pendulous: opt(l, "pendulous"),
                        pendulous_radius: opt(l, "pendulousRadius"),
                        kappa: opt(l, "kappa"),
                        lateral_every: opt(l, "lateralEvery"),
                        relay: opt(l, "relay"),
                        aged_set_point: opt(l, "agedSetPoint"),
                        aged_over: opt(l, "agedOver"),
                        aged_by_tree: text(l, "agedBy") == "tree",
                        d_lambda_share: opt(l, "dLambdaShare"),
                    })
                    .collect(),
                a_c: num(r2, "aC"),
                d_lambda: num(r2, "dLambda"),
                ramp: num(r2, "ramp"),
                kappa: opt(r2, "kappa"),
                h_j: opt(r2, "hJ"),
                relay: opt(r2, "relay").unwrap_or(0.0),
                relay_age: opt(r2, "relayAge").unwrap_or(0.0),
                relay_p_term: opt(r2, "relayPTerm").unwrap_or(0.0),
                fork_at: opt(r2, "forkAt").unwrap_or(0.0),
                fork_angle: opt(r2, "forkAngle"),
                relay_crowd: opt(r2, "relayCrowd"),
                vigour_share: opt(r2, "vigourShare").unwrap_or(0.0),
                vigour_lambda: opt(r2, "vigourLambda").unwrap_or(0.0),
                vigour_tree_lo: opt(r2, "vigourTreeLo").unwrap_or(0.0),
                vigour_tree_hi: opt(r2, "vigourTreeHi").unwrap_or(0.0),
                light_set_point: opt(r2, "lightSetPoint"),
                light_lo: opt(r2, "lightLo").unwrap_or(0.0),
                light_hi: opt(r2, "lightHi").unwrap_or(1.0),
                light_over: opt(r2, "lightOver").unwrap_or(1.0),
            },
            r3: R3 {
                enabled: flag(r3, "enabled"),
                rho: num(r3, "rho"),
                leaf_mass: num(r3, "leafMass"),
                e: num(r3, "E"),
                sag_increment: text(r3, "sag") == "increment",
                phi: num(r3, "phi"),
                posture: flag(r3, "posture"),
                beta_g: num(r3, "betaG"),
                gamma: num(r3, "gamma"),
                c: num(r3, "c"),
                sigma_target: num(r3, "sigmaTarget"),
                girth_gain: num(r3, "girthGain"),
                sigma_break: num(r3, "sigmaBreak"),
                ground: flag(r3, "ground"),
            },
            r4: {
                let g = group(v, "r4");
                R4 {
                    enabled: flag(g, "enabled"),
                    v_break: num(g, "vBreak"),
                    q_rel: num(g, "qRel"),
                    v_cont: num(g, "vCont"),
                    delta: num(g, "delta"),
                    l_dorm: num(g, "lDorm"),
                    juvenile: num(g, "juvenile"),
                    bank: flag(g, "bank"),
                }
            },
            r5: R5 {
                enabled: flag(r5, "enabled"),
                e_s: num(r5, "eS"),
                d_lambda: num(r5, "dLambda"),
                d_b: num(r5, "dB"),
                d_a: num(r5, "dA"),
                neighbours: text(r5, "signal") == "neighbours",
            },
            o2: O2 {
                enabled: flag(o2, "enabled"),
                sway: num(o2, "sway"),
                max_sway: num(o2, "maxSway"),
                p_abr: num(o2, "pAbr"),
                storm_p: opt(o2, "stormP"),
                storm_load: opt(o2, "stormLoad"),
            },
            o4: O4 {
                enabled: flag(o4, "enabled"),
                c_seed: num(o4, "cSeed"),
                d: num(o4, "d"),
                q_est: num(o4, "qEst"),
                p_est: num(o4, "pEst"),
                m0: num(o4, "m0"),
                max_trees: num(o4, "maxTrees"),
                rain: opt(o4, "rain"),
                band: opt(o4, "band"),
            },
            r6: {
                let g = group(v, "r6");
                R6 {
                    enabled: flag(g, "enabled"),
                    q_min: num(g, "qMin"),
                    leaf_area: num(g, "leafArea"),
                    lifespan: opt(g, "lifespan"),
                }
            },
            species: species_table.map(|t| t.iter().map(|(k, _)| k.clone()).collect()),
            species_neighbours: species_table.is_some_and(|t| {
                t.iter().any(|(_, sp)| {
                    sp.get("r5")
                        .is_some_and(|r5| text(r5, "signal") == "neighbours")
                })
            }),
        }
    }
}

/// `speciesParams` (world.ts): `params` with `species`' patch on top, labels left out; `params`
/// itself when the table has no such species.
pub fn species_params(params: &Value, species: &str) -> Value {
    let Some(patch) = params.get("species").and_then(|t| t.get(species)) else {
        return params.clone();
    };
    let mut groups = patch.clone();
    for label in ["common", "latin", "leaf"] {
        groups.remove(label);
    }
    json::merge(params, &groups)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_groups_and_optionals() {
        let v = json::parse(
            r#"{"seed":3,"world":{"width":10,"height":5,"walls":[],"sides":"periodic"},
            "trees":[{"x":2,"species":"oak"}],"r2":{"enabled":true,"levels":[{"lambda":0.5,
            "setPoint":10,"eta":0.1,"branchAngle":40,"generator":"whorled","tierEvery":0,
            "pTerm":0}],"aC":0,"dLambda":0,"ramp":1,"hJ":8},
            "species":{"oak":{"common":"Oak","r5":{"signal":"neighbours"}}}}"#,
        )
        .unwrap();
        let p = Params::from_json(&v);
        assert!(p.world.periodic && p.world.obstacles.is_none());
        assert_eq!(p.trees[0].species, "oak");
        assert_eq!(p.r2.levels[0].generator, Generator::Whorled);
        assert_eq!(p.r2.h_j, Some(8.0));
        assert_eq!(p.r2.kappa, None);
        assert!(p.c1.branch_angle.is_nan());
        assert!(p.species_neighbours);
        let oak = species_params(&v, "oak");
        assert_eq!(
            json::stringify(oak.get("r5").unwrap(), false),
            r#"{"signal":"neighbours"}"#
        );
        assert!(oak.get("common").is_none());
    }
}
