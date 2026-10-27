/**
 * Named starting points, shared by the page and the CLI. Each is a patch over defaultParams,
 * so it is type-checked against Params. Species presets (§9) use R2 (M7, ADR 0009).
 */

import {
  defaultParams,
  mergeParams,
  type PaLevel,
  type Params,
  type ParamsPatch,
} from "./params.ts";

export interface Preset {
  label: string;
  description: string;
  patch: ParamsPatch;
  /** Page only: how the page draws this preset's foliage (src/web/render/leaf-styles.ts). */
  leaf?: string;
}

/** Principles shared by every stand preset (C2–C6 on, λ = 0.5). */
const STAND = {
  c2: { enabled: true, model: "triangle" },
  c3: { mode: "bh", lambda: 0.5 },
  c4: { enabled: true },
  c5: { enabled: true },
  c6: { enabled: true },
} satisfies ParamsPatch;

/**
 * Principles of the M6 presets: as STAND, with the Beer–Lambert sky sweep as the light model,
 * relative shedding (ADR 0007: a shade-tolerance floor T = 0.03 and T_rel = 0.12, so canopy trees
 * prune as at T = 0.1 while overtopped trees keep deeper crowns) and short shoots (ADR 0006:
 * Q_ss = 0.1, a_ss = 2, about half the leaf area on short shoots). Calibrated in
 * docs/experiments/2026-10-27-m6d-shedding-short-shoots.md. From M8 they also carry R1's carbon
 * balance (ADR 0010), with α = 3 so that net production keeps young trees as vigorous as before.
 */
const SKY = {
  ...STAND,
  c2: { enabled: true, model: "sky" },
  c3: { mode: "bh", lambda: 0.5, alpha: 3 },
  c5: { enabled: true, T: 0.03, Trel: 0.12 },
  r1: { enabled: true },
  r6: { enabled: true, qMin: 0.1, leafArea: 2 },
} satisfies ParamsPatch;

/**
 * The sky presets before R1 (M6–M7): resource α·Q_base with no costs. Tests of those milestones
 * pin it, so their evidence still holds with R1 on in the presets.
 */
export const PRE_R1 = { c3: { alpha: 2 }, r1: { enabled: false } } satisfies ParamsPatch;

/**
 * The species keep the M7 resource scale and no carbon balance: under R1 their strong leaders
 * still reach the world's top or grow far too slender (M8 note), so they need their own R1
 * calibration (ROADMAP follow-up).
 */
const SPECIES_PRE_R1 = {
  c3: { mode: "bh", lambda: 0.5, alpha: 2 },
  r1: { enabled: false },
} satisfies ParamsPatch;

/** One R2 table row (ADR 0009); unspecified fields take baseline values. */
const level = (row: Partial<PaLevel>): PaLevel => ({
  lambda: 0.5,
  setPoint: 0,
  eta: 0.15,
  branchAngle: 45,
  generator: "distichous",
  tierEvery: 0,
  pTerm: 0,
  ...row,
});

/**
 * M7 species (§9, ADR 0009): generic types named after a real example, with qualitative values.
 * Light knobs follow the ROADMAP anchors: k_ext higher for plagiotropic crowns (Kitajima et al.
 * 2004), the shedding floor T low for shade-tolerant and high for light-demanding species.
 */
const CONIFER = {
  ...SKY,
  ...SPECIES_PRE_R1,
  c2: { enabled: true, model: "sky", kExt: 0.6 },
  c5: { enabled: true, T: 0.02, Trel: 0.12 },
  // Whorls carry few tips, so the pipe model gives a thin trunk; a thicker tip radius brings
  // stand H/D to ≈ 78 (stand-grown conifers 60–80, Watt et al. 2023; M7 note).
  c6: { enabled: true, r0: 0.035 },
  r2: {
    enabled: true,
    levels: [
      // Massart: monopodial orthotropic trunk with a whorl at the start of each growth unit,
      level({ lambda: 0.58, setPoint: 0, eta: 0.4, generator: "whorled" }),
      // plagiotropic branches and branchlets in the plane of the tier.
      level({ lambda: 0.52, setPoint: 85, eta: 2, branchAngle: 80 }),
      level({ lambda: 0.5, setPoint: 90, eta: 0.5, branchAngle: 45 }),
    ],
  },
} satisfies ParamsPatch;

const BIRCH = {
  ...SKY,
  ...SPECIES_PRE_R1,
  c2: { enabled: true, model: "sky", kExt: 0.35 },
  c5: { enabled: true, T: 0.08, Trel: 0.2 },
  r2: {
    enabled: true,
    // Excurrent when young; apical control fades from age 15 (λ −0.06 over 20 seasons).
    aC: 15,
    dLambda: 0.06,
    ramp: 20,
    levels: [
      level({ lambda: 0.56, setPoint: 0, eta: 0.3 }),
      // Fine, steep laterals; the finest twigs hang (A_set > 90°).
      level({ lambda: 0.53, setPoint: 40, eta: 0.2, branchAngle: 35 }),
      level({ lambda: 0.5, setPoint: 120, eta: 0.25, branchAngle: 40 }),
    ],
  },
} satisfies ParamsPatch;

const TROPICAL = {
  ...SKY,
  ...SPECIES_PRE_R1,
  c2: { enabled: true, model: "sky", kExt: 0.6 },
  r2: {
    enabled: true,
    levels: [
      // Aubréville: orthotropic trunk with a tier every 7 nodes,
      level({ lambda: 0.6, setPoint: 0, eta: 0.5, generator: "whorled", tierEvery: 7 }),
      // plagiotropic sympodial modules: each season's shoot ends and two relays fork on.
      level({ lambda: 0.5, setPoint: 88, eta: 2, branchAngle: 20, generator: "whorled", pTerm: 1 }),
    ],
  },
} satisfies ParamsPatch;

const STAND_X = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x }));

export const presets = {
  explosion: {
    label: "M0: unchecked growth",
    description: "Every bud grows every season: the Borchert–Slade explosion (spec §1, §7 M0).",
    patch: {
      world: { width: 80, height: 60, walls: [] },
      trees: [{ x: 40 }],
      c2: { enabled: false },
      c3: { mode: "none" },
    },
  },
  shadow: {
    label: "M1: shadow regulates density",
    description: "C2 on: buds in another bud's shadow triangle stop growing (spec §7 M1).",
    patch: {
      world: { width: 100, height: 70, walls: [] },
      trees: [{ x: 50 }],
      c2: { enabled: true, model: "triangle" },
      c3: { mode: "none" },
    },
  },
  bh: {
    label: "M2: Borchert–Honda, λ = 0.5",
    description: "C3 on: resource flows to well-lit branches; λ biases it to the main axis (§C3).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "triangle" },
      c3: { mode: "bh", lambda: 0.5 },
    },
  },
  leader: {
    label: "M2: dominant leader, λ = 0.56",
    description: "Strong apical control: an excurrent tree with a clear trunk (Guerra: 0.56).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "triangle" },
      c3: { mode: "bh", lambda: 0.56 },
    },
  },
  spreading: {
    label: "M2: spreading crown, λ = 0.46",
    description: "Weak apical control: a decurrent, spreading crown (Guerra: 0.46).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "triangle" },
      c3: { mode: "bh", lambda: 0.46 },
    },
  },
  direction: {
    label: "M3: shoots bend to light and tropism",
    description: "C4 on: each new metamer turns toward light V and its set-point (§C4).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "triangle" },
      c3: { mode: "bh", lambda: 0.5 },
      c4: { enabled: true },
    },
  },
  wall: {
    label: "M3: lean away from a wall",
    description: "A shaded wall left of the tree: the crown grows away from it (§7 M3).",
    patch: {
      world: { width: 100, height: 80, walls: [{ x: 36, y: 0, width: 8, height: 80, shade: 3 }] },
      trees: [{ x: 50 }],
      c2: { enabled: true, model: "triangle" },
      c3: { mode: "bh", lambda: 0.5 },
      c4: { enabled: true },
    },
  },
  pruned: {
    label: "M4: shedding and pipe girth",
    description: "C5 sheds shaded laterals; C6 thickens stems by the pipe model (§C5, §C6).",
    patch: {
      world: { width: 120, height: 100, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "triangle" },
      c3: { mode: "bh", lambda: 0.5 },
      c4: { enabled: true },
      c5: { enabled: true },
      c6: { enabled: true },
    },
  },
  pair: {
    label: "M5: two trees",
    description: "Two trees share one light grid: crowns grow away from each other (§7 M5).",
    patch: {
      world: { width: 120, height: 100, walls: [] },
      trees: [{ x: 48 }, { x: 72 }],
      ...STAND,
    },
  },
  late: {
    label: "M5: a late tree is suppressed",
    description: "A seedling planted at season 12 between two older trees stays small (§7 M5).",
    patch: {
      world: { width: 140, height: 100, walls: [] },
      trees: [{ x: 45 }, { x: 70, plantSeason: 12 }, { x: 95 }],
      ...STAND,
    },
  },
  grove: {
    label: "M5: grove of four",
    description: "Four trees: the stand at a size that reads well on a phone.",
    patch: {
      world: { width: 110, height: 100, walls: [] },
      trees: [22, 44, 66, 88].map((x) => ({ x })),
      ...STAND,
    },
  },
  stand: {
    label: "M5: stand of ten",
    description: "Ten trees: edge trees lean out, interior trees grow tall and narrow (§8).",
    patch: {
      world: { width: 230, height: 110, walls: [] },
      trees: [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x })),
      ...STAND,
    },
  },
  skyLate: {
    label: "M6d: an overtopped tree keeps its crown",
    description:
      "The M5 late tree under the sky sweep: relative shedding lets it keep a deeper crown (ADR 0007).",
    patch: {
      world: { width: 140, height: 100, walls: [] },
      trees: [{ x: 45 }, { x: 70, plantSeason: 12 }, { x: 95 }],
      ...SKY,
    },
  },
  skyStand: {
    label: "M6: stand under a full sky",
    description:
      "Beer–Lambert sky sweep: edge trees lean out, crowns lift, gaps get filled (§C2, M6).",
    patch: {
      world: { width: 230, height: 110, walls: [] },
      trees: [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x })),
      ...SKY,
    },
  },
  skyGrove: {
    label: "M6: grove under a full sky",
    description: "Four trees under the sky sweep, sized for a phone.",
    patch: {
      world: { width: 110, height: 100, walls: [] },
      trees: [22, 44, 66, 88].map((x) => ({ x })),
      ...SKY,
    },
  },
  skyTree: {
    label: "M6: one tree under a full sky",
    description: "An open-grown tree keeps its low, side-lit branches.",
    patch: {
      world: { width: 120, height: 100, walls: [] },
      trees: [{ x: 60 }],
      ...SKY,
    },
  },
  overcast: {
    label: "M6e: stand under an overcast sky",
    description:
      "The stand under a standard overcast sky (zenith three times as bright as the horizon, p = 1.5).",
    patch: {
      world: { width: 230, height: 110, walls: [] },
      trees: [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x })),
      ...SKY,
      c2: { enabled: true, model: "sky", skyExponent: 1.5 },
    },
  },
  obliqueSun: {
    label: "M6: oblique sun",
    description: "A sky brighter to the right (tilt 0.5): the crown grows toward the sun (§C2.6).",
    patch: {
      world: { width: 120, height: 100, walls: [] },
      trees: [{ x: 50 }],
      ...SKY,
      c2: { enabled: true, model: "sky", skyTilt: 0.5 },
    },
  },
  conifer: {
    leaf: "needle",
    label: "M7: conifer (fir-like)",
    description:
      "Massart's model, as in Abies: a straight trunk with a tier of flat branches each season (§9).",
    patch: { world: { width: 120, height: 160, walls: [] }, trees: [{ x: 60 }], ...CONIFER },
  },
  coniferStand: {
    leaf: "needle",
    label: "M7: conifer stand",
    description: "Ten fir-like trees: narrow spires with clear boles (§9).",
    patch: { world: { width: 230, height: 160, walls: [] }, trees: STAND_X, ...CONIFER },
  },
  birch: {
    leaf: "small",
    label: "M7: pioneer (birch-like)",
    description:
      "Light-demanding and slender, like Betula: a leader when young, fine steep branches, hanging twigs (§9).",
    patch: { world: { width: 120, height: 160, walls: [] }, trees: [{ x: 60 }], ...BIRCH },
  },
  birchStand: {
    leaf: "small",
    label: "M7: pioneer stand",
    description: "Ten birch-like trees: open, slender crowns that lift fast (§9).",
    patch: { world: { width: 230, height: 160, walls: [] }, trees: STAND_X, ...BIRCH },
  },
  tropical: {
    leaf: "large",
    label: "M7: tiered tropical tree (Terminalia-like)",
    description:
      "Aubréville's model, as in Terminalia catappa: a pagoda of flat tiers of forking branch modules (§9).",
    patch: { world: { width: 140, height: 160, walls: [] }, trees: [{ x: 70 }], ...TROPICAL },
  },
} satisfies Record<string, Preset>;

export type PresetName = keyof typeof presets;

export const defaultPreset: PresetName = "skyStand";

export function presetParams(name: PresetName, seed?: number): Params {
  const params = mergeParams(defaultParams, presets[name].patch);
  if (seed !== undefined) params.seed = seed;
  return params;
}

export function isPresetName(name: string): name is PresetName {
  return Object.hasOwn(presets, name);
}
