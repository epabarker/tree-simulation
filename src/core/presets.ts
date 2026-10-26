/**
 * Named starting points, shared by the page and the CLI. Each is a patch over defaultParams,
 * so it is type-checked against Params. Species presets (§9) arrive with R2 at M7.
 */

import { defaultParams, mergeParams, type Params, type ParamsPatch } from "./params.ts";

export interface Preset {
  label: string;
  description: string;
  patch: ParamsPatch;
}

/** Principles shared by every stand preset (C2–C6 on, λ = 0.5). */
const STAND = {
  c2: { enabled: true, model: "triangle" },
  c3: { mode: "bh", lambda: 0.5 },
  c4: { enabled: true },
  c5: { enabled: true },
  c6: { enabled: true },
} satisfies ParamsPatch;

/** Principles of the M6 presets: as STAND, with the Beer–Lambert sky sweep as the light model. */
const SKY = { ...STAND, c2: { enabled: true, model: "sky" } } satisfies ParamsPatch;

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
