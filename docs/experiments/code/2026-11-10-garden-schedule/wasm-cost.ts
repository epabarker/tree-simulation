/**
 * WASM cost of the garden at a depth period D (#121's suppression probe, candidate B;
 * EXPLORATORY): `forestParams(width, seed)` at D cells, the cap scaled with D, stepped as the
 * page's worker steps it (one season at a time). Prints ms/season over seasons 101–120 (the
 * settled stand) and the WASM linear memory at the end (it never shrinks: run one case a process).
 *
 *   node docs/experiments/code/2026-11-10-garden-schedule/wasm-cost.ts <width> <depth> [seed] [patch.json]
 *
 * patch.json (the occupancy probe, 2026-11-11): a sweep.ts round patch, merged after the depth.
 */
import { readFileSync } from "node:fs";
import { mergeParams, type ParamsPatch, patchSpecies, type SpeciesPatch } from "../../../../src/core/params.ts";
import { forestParams } from "../../../../src/core/presets.ts";
import {
  coreWasm,
  loadWorldsSync,
  RustWorld,
  wasmMemoryBytes,
} from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const [width = 160, depth = 64, seed = 1] = process.argv.slice(2, 5).map(Number);
const patchPath = process.argv[5];
let p = forestParams(width, seed);
p = mergeParams(p, {
  world: { ...p.world, depth },
  o4: { ...p.o4, maxTrees: Math.round((p.o4.maxTrees * depth) / 64) },
});
if (patchPath) {
  const patch = JSON.parse(readFileSync(patchPath, "utf8")) as {
    params?: ParamsPatch;
    species?: Record<string, SpeciesPatch>;
  };
  if (patch.params) p = mergeParams(p, patch.params);
  for (const [name, sp] of Object.entries(patch.species ?? {})) p = patchSpecies(p, name, sp);
}
const world = RustWorld.create(p);
world.step(100);
const t0 = performance.now();
for (let s = 0; s < 20; s++) world.step(1);
const ms = (performance.now() - t0) / 20;
console.log(
  JSON.stringify({
    width,
    depth,
    seed,
    patch: patchPath ?? null,
    msPerSeason: Math.round(ms),
    memoryMB: Math.round(wasmMemoryBytes() / 2 ** 20),
    live: world.trees.filter((t) => t.alive).length,
  }),
);
