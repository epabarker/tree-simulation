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
      c2: { enabled: true },
      c3: { mode: "none" },
    },
  },
  bh: {
    label: "M2: Borchert–Honda, λ = 0.5",
    description: "C3 on: resource flows to well-lit branches; λ biases it to the main axis (§C3).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true },
      c3: { mode: "bh", lambda: 0.5 },
    },
  },
  leader: {
    label: "M2: dominant leader, λ = 0.56",
    description: "Strong apical control: an excurrent tree with a clear trunk (Guerra: 0.56).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true },
      c3: { mode: "bh", lambda: 0.56 },
    },
  },
  spreading: {
    label: "M2: spreading crown, λ = 0.46",
    description: "Weak apical control: a decurrent, spreading crown (Guerra: 0.46).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true },
      c3: { mode: "bh", lambda: 0.46 },
    },
  },
  direction: {
    label: "M3: shoots bend to light and tropism",
    description: "C4 on: each new metamer turns toward light V and its set-point (§C4).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true },
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
      c2: { enabled: true },
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
      c2: { enabled: true },
      c3: { mode: "bh", lambda: 0.5 },
      c4: { enabled: true },
      c5: { enabled: true },
      c6: { enabled: true },
    },
  },
} satisfies Record<string, Preset>;

export type PresetName = keyof typeof presets;

export const defaultPreset: PresetName = "pruned";

export function presetParams(name: PresetName, seed?: number): Params {
  const params = mergeParams(defaultParams, presets[name].patch);
  if (seed !== undefined) params.seed = seed;
  return params;
}

export function isPresetName(name: string): name is PresetName {
  return Object.hasOwn(presets, name);
}
