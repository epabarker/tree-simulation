//! Simulation parameters (`src/core/params.ts`): one plain-JSON object, read here into typed
//! groups the passes use. The JSON stays the source: species patches merge into it
//! (`species_params`), events patch it, checkpoints and run records carry it, all through
//! `json::merge`, so a run's params are the TypeScript core's byte for byte.
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
    pub species: String,
    pub plant_season: f64,
    pub lean: f64,
}

#[derive(Clone, Debug)]
pub struct WorldP {
    pub width: f64,
    pub height: f64,
    pub walls: Vec<Rect>,
    /// `world.obstacles`: None when absent (growth then skips the check, as `!== undefined`).
    pub obstacles: Option<Vec<Rect>>,
    pub periodic: bool,
}

#[derive(Clone, Debug)]
pub struct C1 {
    pub branch_angle: f64,
    pub internode_length: f64,
    pub max_metamers_per_shoot: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LightKind {
    Triangle,
    Sky,
    Pooled,
}

#[derive(Clone, Debug)]
pub struct C2 {
    pub enabled: bool,
    pub model: LightKind,
    pub a: f64,
    pub b: f64,
    pub q_max: f64,
    pub c: f64,
    pub perception_angle: f64,
    pub perception_distance: f64,
    pub k: f64,
    pub k_ext: f64,
    pub sky_exponent: f64,
    pub sky_tilt: f64,
    pub min_elevation: f64,
    pub rotate: bool,
    /// `c2.sweep === "columns"`: the M6 sweep.
    pub columns: bool,
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
}

#[derive(Clone, Debug)]
pub struct C5 {
    pub enabled: bool,
    pub t: f64,
    pub g: f64,
    pub t_rel: f64,
    pub top_quantile: f64,
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
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Generator {
    Distichous,
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
}

#[derive(Clone, Debug)]
pub struct R6 {
    pub enabled: bool,
    pub q_min: f64,
    pub leaf_area: f64,
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
                walls: rects(w.get("walls"), true),
                obstacles: w.get("obstacles").map(|o| rects(Some(o), false)),
                periodic: text(w, "sides") == "periodic",
            },
            trees: v
                .get("trees")
                .and_then(Value::as_array)
                .unwrap_or(&[])
                .iter()
                .map(|t| TreeSpec {
                    x: num(t, "x"),
                    species: text(t, "species"),
                    plant_season: opt(t, "plantSeason").unwrap_or(0.0),
                    lean: opt(t, "lean").unwrap_or(0.0),
                })
                .collect(),
            c1: {
                let g = group(v, "c1");
                C1 {
                    branch_angle: num(g, "branchAngle"),
                    internode_length: num(g, "internodeLength"),
                    max_metamers_per_shoot: num(g, "maxMetamersPerShoot"),
                }
            },
            c2: C2 {
                enabled: flag(c2, "enabled"),
                model: match text(c2, "model").as_str() {
                    "sky" => LightKind::Sky,
                    "pooled" => LightKind::Pooled,
                    _ => LightKind::Triangle,
                },
                a: num(c2, "a"),
                b: num(c2, "b"),
                q_max: num(c2, "qMax"),
                c: num(c2, "C"),
                perception_angle: num(c2, "perceptionAngle"),
                perception_distance: num(c2, "perceptionDistance"),
                k: num(c2, "K"),
                k_ext: num(c2, "kExt"),
                sky_exponent: num(c2, "skyExponent"),
                sky_tilt: num(c2, "skyTilt"),
                min_elevation: num(c2, "minElevation"),
                rotate: flag(c2, "rotate"),
                columns: text(c2, "sweep") == "columns",
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
            },
            c5: {
                let g = group(v, "c5");
                C5 {
                    enabled: flag(g, "enabled"),
                    t: num(g, "T"),
                    g: num(g, "g"),
                    t_rel: num(g, "Trel"),
                    top_quantile: num(g, "topQuantile"),
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
                            "opposite" => Generator::Opposite,
                            "whorled" => Generator::Whorled,
                            "none" => Generator::None,
                            _ => Generator::Unknown,
                        },
                        tier_every: num(l, "tierEvery"),
                        p_term: num(l, "pTerm"),
                        posture_set_point: opt(l, "postureSetPoint"),
                    })
                    .collect(),
                a_c: num(r2, "aC"),
                d_lambda: num(r2, "dLambda"),
                ramp: num(r2, "ramp"),
                kappa: opt(r2, "kappa"),
                h_j: opt(r2, "hJ"),
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
            },
            r6: {
                let g = group(v, "r6");
                R6 {
                    enabled: flag(g, "enabled"),
                    q_min: num(g, "qMin"),
                    leaf_area: num(g, "leafArea"),
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
