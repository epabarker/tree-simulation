/**
 * Golden runs: fixed presets and seeds whose state hash is stored in golden.json (the parity
 * build's: the TypeScript core's until I1, archived at the tag golden-2d-ts) and
 * golden-production.json (the production build's, the page's). A change in any hash means
 * simulation behaviour changed. If that was intended, run `npm run golden:update` and say why in
 * docs/devlog.md (AGENTS.md).
 */
import { readFileSync } from "node:fs";

import { type FixtureName, fixtureParams, isFixtureName } from "../src/core/fixtures.ts";
import { type PresetName, presetParams } from "../src/core/presets.ts";
import { parityWasm } from "../src/wasm/parity.ts";
import { productionWasm } from "../src/wasm/production.ts";
import { type Build, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

loadWorldsSync("parity", readFileSync(parityWasm));
loadWorldsSync("production", readFileSync(productionWasm));

export interface GoldenCase {
  /** A preset, or a retired one kept as a fixture under its old name (ADR 0019). */
  preset: PresetName | FixtureName;
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
  { preset: "pair", seed: 1, seasons: 35 },
  { preset: "late", seed: 1, seasons: 45 },
  { preset: "stand", seed: 1, seasons: 30 },
  { preset: "skyStand", seed: 1, seasons: 30 },
  { preset: "skyTree", seed: 1, seasons: 40 },
  { preset: "obliqueSun", seed: 1, seasons: 30 },
  { preset: "skyLate", seed: 1, seasons: 40 },
  { preset: "overcast", seed: 1, seasons: 30 },
  { preset: "conifer", seed: 1, seasons: 30 },
  { preset: "birch", seed: 1, seasons: 30 },
  { preset: "tropical", seed: 1, seasons: 30 },
  { preset: "weeping", seed: 1, seasons: 40 },
  { preset: "troll", seed: 1, seasons: 40 },
  { preset: "forest", seed: 1, seasons: 50 },
  { preset: "thinning", seed: 1, seasons: 30 },
  { preset: "clearing", seed: 1, seasons: 50 },
];

export function caseKey(c: GoldenCase): string {
  return `${c.preset}:seed${c.seed}:s${c.seasons}`;
}

/** Where each build's hashes are stored. */
export const GOLDEN_FILES: Record<Build, URL> = {
  parity: new URL("./golden.json", import.meta.url),
  production: new URL("./golden-production.json", import.meta.url),
};

export function runCase(c: GoldenCase, build: Build): string {
  const params = isFixtureName(c.preset)
    ? fixtureParams(c.preset, c.seed)
    : presetParams(c.preset, c.seed);
  const world = RustWorld.create(params, build);
  world.run(c.seasons);
  const hash = world.hash();
  world.dispose();
  return hash;
}
