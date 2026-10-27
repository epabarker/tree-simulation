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

export interface TreeSpec {
  /** Root position along the ground, in cells. */
  x: number;
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
  };
  trees: TreeSpec[];

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
  r6: { enabled: false, qMin: 0.2, leafArea: 1 }, // calibrate (M6d)
};

/** A partial set of overrides, merged one level deep into each section. */
export type ParamsPatch = {
  [K in keyof Params]?: Params[K] extends readonly unknown[]
    ? Params[K]
    : Params[K] extends object
      ? Partial<Params[K]>
      : Params[K];
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
