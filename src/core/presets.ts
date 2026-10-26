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
} satisfies Record<string, Preset>;

export type PresetName = keyof typeof presets;

export const defaultPreset: PresetName = "shadow";

export function presetParams(name: PresetName, seed?: number): Params {
  const params = mergeParams(defaultParams, presets[name].patch);
  if (seed !== undefined) params.seed = seed;
  return params;
}

export function isPresetName(name: string): name is PresetName {
  return Object.hasOwn(presets, name);
}
