/**
 * The storm seasons of the garden at 160 cells, seeds 1-3, to season 300 (#133's probe). The draw
 * is one per season, keyed on the seed and season alone (season.rs, phase 1), so a world with the
 * garden's seed and `o2.stormP` and no trees draws the same seasons in a fraction of the time.
 * WASM (npm run build:wasm).
 *
 *   node docs/experiments/code/2026-11-15-wind-load/storms.ts > runs/probe/133-storms.json
 */
import { readFileSync } from "node:fs";
import { mergeParams } from "../../../../src/core/params.ts";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const out: Record<string, number[]> = {};
for (const seed of [1, 2, 3]) {
  const p = mergeParams(forestParams(160, seed), { trees: [] });
  const w = RustWorld.create(p);
  const storms: number[] = [];
  for (let s = 0; s < 300; s++) {
    w.step(1, false);
    if (w.storm) storms.push(w.season);
  }
  w.dispose();
  out[String(seed)] = storms;
}
console.log(JSON.stringify(out));
