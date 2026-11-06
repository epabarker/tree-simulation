/**
 * Golden runs: fixed presets and seeds whose state hash is stored in golden.json. A change in any
 * hash means simulation behaviour changed. (The TypeScript core's 2D goldens are archived at the
 * tag golden-2d-ts, where CI's golden-2d job runs them.) If that was intended, run `npm run golden:update` and say why in
 * docs/devlog.md (AGENTS.md).
 */
import { readFileSync } from "node:fs";

import { type FixtureName, fixtureParams, isFixtureName } from "../src/core/fixtures.ts";
import { type PresetName, presetParams } from "../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));

export interface GoldenCase {
  /** A preset, or a retired one kept as a fixture under its old name (ADR 0019). */
  preset: PresetName | FixtureName;
  seed: number;
  seasons: number;
}

/**
 * The 3D goldens (I2, ADR 0025): a dozen worlds that between them run every principle, short
 * enough to run natively and in WASM on every check. The 2D cases are archived at golden-2d-ts.
 */
export const GOLDEN_CASES: GoldenCase[] = [
  { preset: "explosion", seed: 1, seasons: 10 },
  { preset: "bh", seed: 1, seasons: 15 },
  { preset: "wall", seed: 1, seasons: 15 },
  { preset: "pair", seed: 1, seasons: 15 },
  { preset: "skyTree", seed: 1, seasons: 20 },
  { preset: "skyStand", seed: 1, seasons: 15 },
  { preset: "obliqueSun", seed: 1, seasons: 15 },
  { preset: "conifer", seed: 1, seasons: 15 },
  { preset: "weeping", seed: 1, seasons: 20 },
  { preset: "troll", seed: 1, seasons: 20 },
  { preset: "forest", seed: 1, seasons: 20 },
  { preset: "thinning", seed: 1, seasons: 15 },
  { preset: "mixedWood", seed: 1, seasons: 15 },
  { preset: "oakOpen", seed: 1, seasons: 15 },
  // The fresh-look round's beech rules (ADR 0039–0043, proposed), run long enough to act: the
  // lone beech exercises the fork's arm hold, the vigour drop, light orthotropy and own-crown
  // pruning; the beech wood the relay's neighbour gate, the fork, the drop and light orthotropy
  // (docs/experiments/code/2026-11-01-fresh-look-beech/golden-coverage.py). The cases above with
  // beech stop at 15, before any of them acts.
  { preset: "beechOpen", seed: 1, seasons: 40 },
  { preset: "beechWood", seed: 1, seasons: 30 },
];

export function caseKey(c: GoldenCase): string {
  return `${c.preset}:seed${c.seed}:s${c.seasons}`;
}

export const GOLDEN_FILE = new URL("./golden.json", import.meta.url);

export function runCase(c: GoldenCase): string {
  const params = isFixtureName(c.preset)
    ? fixtureParams(c.preset, c.seed)
    : presetParams(c.preset, c.seed);
  const world = RustWorld.create(params);
  world.run(c.seasons);
  const hash = world.hash();
  world.dispose();
  return hash;
}
