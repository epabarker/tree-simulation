/**
 * Golden runs: fixed presets and seeds whose state hash is stored in golden.json. A change in any
 * hash means simulation behaviour changed. If that was intended, run `npm run golden:update` and
 * say why in docs/devlog.md (AGENTS.md).
 */

import { hashWorld } from "../src/core/hash.ts";
import { type PresetName, presetParams } from "../src/core/presets.ts";
import { World } from "../src/core/world.ts";

export interface GoldenCase {
  preset: PresetName;
  seed: number;
  seasons: number;
}

export const GOLDEN_CASES: GoldenCase[] = [
  { preset: "explosion", seed: 1, seasons: 10 },
  { preset: "explosion", seed: 2, seasons: 10 },
  { preset: "shadow", seed: 1, seasons: 40 },
  { preset: "shadow", seed: 2, seasons: 40 },
  { preset: "bh", seed: 1, seasons: 40 },
  { preset: "leader", seed: 1, seasons: 30 },
  { preset: "spreading", seed: 1, seasons: 30 },
  { preset: "direction", seed: 1, seasons: 30 },
  { preset: "wall", seed: 1, seasons: 30 },
  { preset: "pruned", seed: 1, seasons: 40 },
  { preset: "pruned", seed: 2, seasons: 40 },
];

export function caseKey(c: GoldenCase): string {
  return `${c.preset}:seed${c.seed}:s${c.seasons}`;
}

export function runCase(c: GoldenCase): string {
  const world = new World(presetParams(c.preset, c.seed));
  world.run(c.seasons);
  return hashWorld(world);
}
