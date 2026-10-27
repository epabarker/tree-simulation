/**
 * Simulation parameters: one plain-JSON object shared by the UI, presets, URL, CLI and
 * output metadata. Names follow the spec's symbols (docs/spec.md §3).
 *
 * Units: one length unit = one grid cell = the base internode length l0 (spec §C1, Palubicki
 * et al. 2009 §6). Angles are in degrees here and radians inside the core.
 *
 * Values marked `calibrate` have no published value; they are placeholders to tune on an
 * isolated tree (spec §2 table) and are listed in docs/ROADMAP.md.
 */

export interface Wall {
  /** Left edge, bottom edge, width, height in cells. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Shadow added to every covered cell each season. */
  shade: number;
}

/** A solid region with no shade (ADR 0015): nothing grows into it. Cells, like a wall. */
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreeSpec {
  /** Root position along the ground, in cells. */
  x: number;
  /** Its species, a key of `Params.species` (ADR 0016). Omitted: the world's own params. */
  species?: string;
  /** Season in which the seedling appears (default 0). */
  plantSeason?: number;
}

export interface Params {
  seed: number;
  world: {
    /** Grid width and height in cells. */
    width: number;
    height: number;
    /** Static shade sources (M3 "lean away from a wall"). */
    walls: Wall[];
    /**
     * Solid regions with no shade (ADR 0015): shoots don't grow into them, and branches found
     * inside are shed at the start of a season. A host page marks its content as obstacles so the
     * forest grows around it. Optional: none.
     */
    obstacles?: Obstacle[];
    /**
     * World sides for the sky sweep: 'open' lets open sky in from beyond them (ADR 0005), so a
     * stand is an island lit from its edges (M6e); 'periodic' wraps light, foliage and growth
     * around, so the stand continues for ever on both sides (M11, ADR 0013). Optional: 'open'.
     */
    sides?: "open" | "periodic";
  };
  trees: TreeSpec[];
  /**
   * Species (ADR 0016): named overrides of the per-tree groups, so one world can hold several.
   * A tree of a species grows by the world's params with its species' patch on top.
   */
  species?: Record<string, SpeciesPatch>;

  /** C1 Metamer structure, bud fate and 2D side sequence (always on). */
  c1: {
    /** Side sequence generator; distichous is the default and only planar phyllotaxis (§C1.5). */
    generator: "distichous";
    /** Branch angle β between a lateral and its parent axis, degrees. */
    branchAngle: number;
    /** Base internode length l0 in cells (≈ one cell, Palubicki et al. §6). */
    internodeLength: number;
    /** Maximum metamers one bud may produce per season (the cap in C3). */
    maxMetamersPerShoot: number;
  };

  /** C2 Shared light field: shadow triangle (Palubicki et al. §4.1) or sky sweep (§C2.4, M6). */
  c2: {
    enabled: boolean;
    /** 'triangle': the baseline shadow triangle. 'sky': the Beer–Lambert sky sweep (M6). */
    model: "triangle" | "sky";
    /**
     * Shadow strength a > 0 (calibrate). Also the self-shadow a bud removes from its own Q.
     * Buds of one node share a cell and shade each other, so C must exceed a·(buds per node − 1).
     */
    a: number;
    /** Shadow decay b > 1 per layer below the bud (calibrate). */
    b: number;
    /** Depth of the shadow triangle in layers (Palubicki: 4–8). */
    qMax: number;
    /** Full-exposure constant C in Q = max(C − s + a, 0) (calibrate). */
    C: number;
    /** Perception half-angle for the optimal direction V, degrees (Palubicki θ ≈ 90° full angle). */
    perceptionAngle: number;
    /** Perception distance for V, in cells (Palubicki r = 4–6). */
    perceptionDistance: number;
    /** Sky sweep: number of sky directions K (spec: 5–9). */
    K: number;
    /** Sky sweep: extinction coefficient k_ext per unit of leaf area (one bud = one unit) (calibrate). */
    kExt: number;
    /** Sky sweep: weights ∝ sin(elevation)^p; p = 1 is a cosine-weighted (overcast-like) sky. */
    skyExponent: number;
    /** Sky sweep: −1…1; positive skies are brighter to the right (an oblique sun, §C2.6). */
    skyTilt: number;
    /** Sky sweep: lowest sky direction above the horizon, degrees. */
    minElevation: number;
    /**
     * Sky sweep: move the K directions by a golden-ratio step each season (stratified, one per
     * equal slice of the sky) so the streaks of a small K average out (M6e). Off: the fixed M6 grid.
     */
    rotate: boolean;
  };

  /** C3 Basipetal light summation and acropetal Borchert–Honda allocation. */
  c3: {
    /**
     * 'bh': Borchert–Honda (§C3). 'equal': §8 ablation, every bud gets an equal share.
     * 'none': milestone scaffold before C3 (M0–M1), every bud with Q > 0 grows one metamer.
     */
    mode: "bh" | "equal" | "none";
    /** Apical bias λ (Palubicki Fig. 7: 0.46 spreading … 0.56 leader). */
    lambda: number;
    /** Proportionality α in v_base = α·Q_base (Palubicki Fig. 7: 2). */
    alpha: number;
  };

  /** C4 Shoot direction as a weighted sum. */
  c4: {
    enabled: boolean;
    /** Weight of the previous (default) direction. */
    wd: number;
    /** Weight ξ of the optimal light direction V. */
    xi: number;
    /** Weight η of the tropism vector t(A_set) (negative flips it). */
    eta: number;
    /**
     * Set-point angle A_set from vertical, degrees: 0 orthotropic, ~90 plagiotropic, > 90
     * pendulous. One value for every axis until R2 (M7) gives each physiological age its own.
     */
    setPoint: number;
    /** Weight ε of the noise vector u = d_prev rotated by N(0, σ²). */
    epsilon: number;
    /** Angular noise σ of u, degrees. */
    sigma: number;
  };

  /** C5 Self-pruning. */
  c5: {
    enabled: boolean;
    /** Shed a lateral when its light per metamer Q_b/n_b < T (calibrate). */
    T: number;
    /** Grace period g in seasons before a lateral can be shed. */
    g: number;
    /**
     * Relative threshold (ADR 0007): shed when Q_b/n_b < max(T, Trel·Q_top), Q_top the tree's
     * `topQuantile` bud light this season (correlative inhibition; Sprugel 2002, Kothari et al.
     * 2025). 0 is the baseline rule (calibrate).
     */
    Trel: number;
    /** Quantile of the tree's live-bud Q that stands for the light at its crown top. */
    topQuantile: number;
  };

  /** C6 Pipe-model girth with memory. */
  c6: {
    enabled: boolean;
    /** Pipe exponent n (Palubicki: 2–3; empirical 1.8–2.3). */
    n: number;
    /**
     * Tip radius r0 in cells. 0.02 gives stand-grown height/diameter ≈ 56–75 and open-grown ≈ 41,
     * matching real slenderness (stand-grown 60–80, Watt et al. 2023); radius scales linearly with
     * r0 under the pipe rule (literature review 2026-10-27 §4, M6c).
     */
    r0: number;
  };

  /**
   * R1 Carbon balance with the cost of size (spec §R1, ADR 0010). Off = baseline: v_base = α·Q_base.
   * On: production P = α·Σ w·Q·exp(−L_path/L_h) minus sapwood maintenance M = m_w·Σ π r_live² l;
   * a reserve buffers deficits and a tree whose reserve stays empty for k_starve seasons dies.
   */
  r1: {
    enabled: boolean;
    /** m_w: maintenance per unit of sapwood volume per season (calibrate). */
    mw: number;
    /** m_f: foliage maintenance per unit of leaf area per season; Q_c = m_f/α is the compensation light. */
    mf: number;
    /** L_h: hydraulic path-length scale in cells; 0 switches the path-length cause off. */
    Lh: number;
    /** s_r: share of a surplus put into the reserve. */
    sr: number;
    /** f_rep: share of a surplus going to reproduction once the tree is mature; 0 = off. */
    fRep: number;
    /** Maturity: the height (cells) from which the reproductive sink runs (size, never age). */
    maturity: number;
    /** k_starve: seasons with an empty reserve before the tree dies. */
    kStarve: number;
    /** The seed's reserve, in resource units. */
    reserve0: number;
    /** The reserve holds at most this many seasons of maintenance (stores are kept, not hoarded). */
    store: number;
    /** Branch shedding: 'c5' keeps C5's light rule; 'carbon' sheds branches whose P_b < M_b. */
    shed: "c5" | "carbon";
  };

  /**
   * R3 Mechanics (spec §R3, ADR 0011): each season branches bend under the weight they carry,
   * with girth-set stiffness, and reaction wood bends them back toward their set-point at a rate
   * limited by new girth. Off = baseline: geometry is fixed once grown.
   *
   * Units: weights are in units of a cell³ of wood (ρ_w = 1 by default), moments in weight·cells,
   * so E and σ are in weight per cell² (physically ρ_w·g·0.25 m ≈ 2.5 kPa per unit: wood's
   * E ≈ 10 GPa is ≈ 4·10⁶).
   */
  r3: {
    enabled: boolean;
    /** ρ_w: wood weight per cell³ (sets the unit; change it only to compare densities). */
    rho: number;
    /** Leaf weight per unit of leaf area (a bud's leaf area as the light model sees it) (calibrate). */
    leafMass: number;
    /** E: Young's modulus (calibrate; wood ≈ 4·10⁶ in these units). */
    E: number;
    /**
     * 'increment': the elastic curvature of this season's load increment, ΔM/(E·πr⁴/4), sets
     * (Fournier's growth-ring model; Alméras & Fournier 2009). 'creep': the whole κ_e = M/(E·πr⁴/4)
     * sets again each season (spec §R3.4 as first written).
     */
    sag: "increment" | "creep";
    /** φ: share of the elastic curvature κ_e = M/(E·πr⁴/4) that becomes permanent each season. */
    phi: number;
    /**
     * Posture control on (reaction wood). Off = the §8 ablation "R3 posture only": sag with no
     * correction, so limbs droop progressively.
     */
    posture: boolean;
    /** β_g: gravitropic gain, rotation per metamer per season at 90° from the set-point (Bastien et al. 2013's β). */
    betaG: number;
    /** γ: proprioceptive gain on the axis's local curvature (Bastien et al. 2013's γ). */
    gamma: number;
    /** c: a metamer's posture rotation per season is at most c·Δr/r, its relative girth growth. */
    c: number;
    /** σ_target: bending stress above which stress-driven girth adds wood (calibrate). */
    sigmaTarget: number;
    /** Stress-driven girth gain: Δr = gain·r·(σ/σ_target − 1), never past σ = σ_target; 0 = off. */
    girthGain: number;
    /**
     * σ_break: a metamer whose base stress exceeds this breaks off with everything above it,
     * leaving a scar (§R3.4 optional; its dormant buds below can then be released, R4). 0 = off.
     */
    sigmaBreak: number;
    /**
     * Ground contact (M16, ADR 0011 addendum): a limb that sags down to the ground rests on it
     * instead of sinking below. Off by default, so the M9 presets keep their calibration; the
     * `forest` preset (the home page's) turns it on.
     */
    ground?: boolean;
  };

  /**
   * R2 Physiological age (spec §R2, ADR 0009). pa = min(branching order, levels − 1); each level
   * overrides λ, A_set, η and β for its axes and sets their lateral generator and p_term.
   * Off = baseline: one level taken from c1, c3 and c4.
   */
  r2: {
    enabled: boolean;
    /** The pa table, 2–4 rows: row 0 is the trunk. */
    levels: PaLevel[];
    /** Ontogeny: from tree age a_c (seasons), every λ falls linearly by Δλ over `ramp` seasons. */
    aC: number;
    dLambda: number;
    ramp: number;
  };

  /**
   * R4 Dormancy, release and reiteration (spec §R4, ADR 0012). Off = baseline: any live bud with
   * v ≥ 1 grows, and dormant buds live for ever.
   */
  r4: {
    enabled: boolean;
    /** v_break: BH resource that releases a dormant bud (the sugar signal, spec §R4.4) (calibrate). */
    vBreak: number;
    /**
     * Q_rel: light that releases a dormant bud (the light/R:FR trigger, ADR 0012); its first shoot,
     * one metamer, is paid from the tree's reserve when R1 is on (calibrate).
     */
    qRel: number;
    /** v_cont: resource an active bud needs to keep growing (sustained growth); ≤ v_break. */
    vCont: number;
    /** δ: v_break and Q_rel rise by this fraction per season of dormancy (older buds are harder to wake). */
    delta: number;
    /** L_dorm: a dormant bud older than this many seasons aborts. */
    lDorm: number;
    /**
     * Reiteration: a released dormant bud's shoot takes the physiological age of an axis this many
     * levels younger (1 = like the axis that bears it, R2 only).
     */
    juvenile: number;
    /**
     * Bud bank: a shed or broken branch leaves a dormant bud in its slot (accessory buds at the
     * branch base, the source of epicormic shoots; ADR 0012).
     */
    bank: boolean;
  };

  /**
   * R5 Shade avoidance (spec §R5, ADR 0012). With s = 1 − Q/C, a bud's or node's shade: internodes
   * lengthen, λ favours the main axis, dormant buds break less (with R4) and shoots grow more
   * upright. Off = baseline.
   */
  r5: {
    enabled: boolean;
    /** e_s: internode length l0·(1 + e_s·s) (calibrate). */
    eS: number;
    /** δλ: λ + δλ·s at a shaded node (calibrate). */
    dLambda: number;
    /** δ_b: v_break·(1 + δ_b·s), the sugar route of R4: low R:FR suppresses bud outgrowth (Schneider et al. 2019) (calibrate). */
    dB: number;
    /** δ_A: A_set·(1 − δ_A·s): shade makes shoots more upright (Roychoudhry et al. 2017) (calibrate). */
    dA: number;
    /**
     * What the shade signal s reads (M19). "light" (default): 1 − Q/C, own foliage included, so a
     * lone tree avoids its own shade and grows tall. "neighbours": that shade scaled by the share
     * of the foliage above the node that belongs to other trees (O2's owner grid), standing in for
     * the low R:FR of neighbours' light, so a lone tree grows squat (MacFarlane et al. 2017).
     */
    signal?: "light" | "neighbours";
  };

  /**
   * O2 Wind abrasion and crown shyness (spec §O2, ADR 0013): a leafy bud that sways into another
   * tree's foliage dies with probability p_abr. Off = baseline.
   */
  o2: {
    enabled: boolean;
    /** k_sway: sway A = k_sway·Q·h/r cells (calibrate). */
    sway: number;
    /** Largest sway, in cells. */
    maxSway: number;
    /** p_abr: probability a touching bud dies in a season (calibrate). */
    pAbr: number;
    /**
     * Storms (M16, §O2 wind events): the chance a season is a storm (0 = never). In a storm every
     * limb's stress counts (1 + stormLoad · h/H) times toward breakage (R3 σ_break), h its height and
     * H the tree's, so exposed upper limbs snap; a trunk overloaded at its base throws the tree.
     * Independent of `enabled` (abrasion). Needs R3 with σ_break > 0 to break anything.
     */
    stormP?: number;
    stormLoad?: number;
  };

  /**
   * O4 Stand dynamics (spec §O4, ADR 0013): background mortality, seeds from R1's reproductive
   * sink, Laplace dispersal and establishment in ground light. Needs R1 with f_rep > 0 for seeds.
   * Off = baseline: the planted trees only.
   */
  o4: {
    enabled: boolean;
    /** c_seed: reproductive carbon per seed (calibrate). */
    cSeed: number;
    /** d: Laplace dispersal scale in cells (calibrate). */
    d: number;
    /** Q_est: ground light, as a fraction of open sky, a seed needs to establish (calibrate). */
    qEst: number;
    /** p_est: probability that a seed on lit ground establishes (calibrate). */
    pEst: number;
    /** m₀: background mortality per tree per season (calibrate). */
    m0: number;
    /** Cap on live trees, so a page cannot run away. */
    maxTrees: number;
  };

  /** R6 Short shoots (spec §R6, ADR 0006). Off = baseline: every live bud is one unit of leaf area. */
  r6: {
    enabled: boolean;
    /** Q_ss: a bud too weak to extend becomes a leafy short shoot if its Q is at least this (calibrate). */
    qMin: number;
    /** a_ss: leaf area of a short shoot, in units of a long shoot's (calibrate). */
    leafArea: number;
  };
}

/** One row of the R2 table (§R2.6): what an axis of this physiological age does. */
export interface PaLevel {
  /** Apical bias λ at the nodes of this axis (C3). */
  lambda: number;
  /** Set-point angle A_set from vertical, degrees (C4): 0 orthotropic, ≈ 90 plagiotropic. */
  setPoint: number;
  /** Tropism weight η toward A_set (C4). */
  eta: number;
  /** Branch angle β of a lateral of this pa from its parent axis, degrees (C1). */
  branchAngle: number;
  /** Where this axis forms lateral buds (§C1.4; ADR 0009). */
  generator: "distichous" | "opposite" | "whorled" | "none";
  /** Whorled only: 0 = a tier at the start of each growth unit; k > 0 = at every k-th node. */
  tierEvery: number;
  /** Probability that the terminal bud ends when a shoot of this pa ends: sympodial growth. */
  pTerm: number;
  /**
   * R3 posture set-point from vertical, degrees, when it differs from the growth set-point
   * (Troll's model: shoots grow plagiotropic, the trunk straightens to 0 later; ADR 0011).
   */
  postureSetPoint?: number;
}

export const defaultParams: Params = {
  seed: 1,
  world: { width: 160, height: 120, walls: [] },
  trees: [{ x: 80 }],
  c1: {
    generator: "distichous",
    branchAngle: 45,
    internodeLength: 1,
    maxMetamersPerShoot: 3,
  },
  c2: {
    enabled: false,
    model: "sky", // M6; the M1–M5 presets pin "triangle"
    a: 0.15, // calibrate (M5: 0.2 stalled 5/40 stand seedlings; 0.15 stalled none)
    b: 1.5, // calibrate (M4: 1.5 shades deeper than 2 once shedding is on)
    qMax: 6,
    C: 1, // calibrate
    perceptionAngle: 45,
    perceptionDistance: 4,
    K: 7,
    kExt: 0.5, // calibrate
    skyExponent: 1,
    skyTilt: 0,
    minElevation: 15,
    rotate: false,
  },
  c3: { mode: "none", lambda: 0.5, alpha: 2 },
  c4: { enabled: false, wd: 1, xi: 0.3, eta: 0.15, setPoint: 0, epsilon: 0.5, sigma: 20 },
  c5: { enabled: false, T: 0.1, g: 3, Trel: 0, topQuantile: 0.9 }, // T, Trel: calibrate
  c6: { enabled: false, n: 2, r0: 0.02 },
  // M8 calibration (docs/experiments/2026-10-27-m8-carbon.md). With R1 on, the sky presets
  // also raise c3.alpha to 3, since costs and the L_h discount take ≈ 40% of the resource.
  r1: {
    enabled: false,
    mw: 1, // stem maintenance ≈ 5–13% of production (Ryan et al. 1995)
    mf: 0.06, // Q_c = m_f/α ≈ 0.02–0.03 of open sky
    Lh: 60, // the plateau cause: stand trees level off at ≈ 78 cells
    sr: 0.1,
    fRep: 0, // the alternative plateau cause, off
    maturity: 70,
    kStarve: 3,
    reserve0: 2,
    store: 2,
    shed: "carbon",
  },
  r2: { enabled: false, levels: [], aC: 0, dLambda: 0, ramp: 1 },
  // M9 calibration (docs/experiments/2026-10-27-m9-mechanics.md).
  r3: {
    enabled: false,
    rho: 1,
    leafMass: 0.002, // calibrate: a shoot's leaves weigh about as much as its first-year wood
    // Wood's E ≈ 4·10⁶ here, but a 2D limb carries less foliage than the 3D limb it stands for,
    // so the effective stiffness is lower (M9 note).
    E: 1e6, // calibrate
    sag: "increment",
    phi: 1, // calibrate
    posture: true,
    betaG: 0.1, // calibrate
    gamma: 0.2, // calibrate
    c: 0.05, // calibrate
    sigmaTarget: 3000, // calibrate: ≈ 7.5 MPa
    girthGain: 0.3, // calibrate
    sigmaBreak: 0, // off (M10 note)
  },
  // M10 calibration (docs/experiments/2026-10-27-m10-release-shade.md).
  r4: {
    enabled: false,
    vBreak: 2,
    qRel: 0.1,
    vCont: 1,
    delta: 0.02,
    lDorm: 40,
    juvenile: 1,
    bank: true,
  },
  r5: { enabled: false, eS: 0.1, dLambda: 0.02, dB: 1, dA: 0.5 },
  r6: { enabled: false, qMin: 0.2, leafArea: 1 }, // calibrate (M6d)
  // M11 calibration (docs/experiments/2026-10-27-m11-stand-dynamics.md).
  o2: { enabled: false, sway: 0.0005, maxSway: 3, pAbr: 0.5, stormP: 0, stormLoad: 1.5 },
  o4: { enabled: false, cSeed: 5, d: 20, qEst: 0.1, pEst: 0.3, m0: 0.002, maxTrees: 300 },
};

/** A partial set of overrides, merged one level deep into each section. */
export type ParamsPatch = {
  [K in keyof Params]?: Params[K] extends readonly unknown[]
    ? Params[K]
    : Params[K] extends object
      ? Partial<Params[K]>
      : Params[K];
};

/**
 * A species (ADR 0016): overrides of the groups that differ between trees (not the world, the
 * light model, the seed or the tree list), plus labels for the page: a common name, a Latin name
 * and the leaf style it is drawn with. O4's per-tree quantities (c_seed, d, Q_est, p_est, m₀) come
 * from the parent's (or the tree's) species; its cap on live trees stays the world's.
 */
export type SpeciesPatch = Omit<ParamsPatch, "seed" | "world" | "trees" | "species" | "c2"> & {
  common?: string;
  latin?: string;
  leaf?: string;
};

/** Returns a new Params with `patch` applied on top of `base` (sections merge, arrays replace). */
export function mergeParams(base: Params, patch: ParamsPatch): Params {
  const out = clone(base) as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = out[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      out[key] = { ...(current as object), ...clone(value) };
    } else {
      out[key] = clone(value);
    }
  }
  return out as unknown as Params;
}

/** Deep copy of plain JSON data (params never hold functions, dates or typed arrays). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const DEG = Math.PI / 180;
