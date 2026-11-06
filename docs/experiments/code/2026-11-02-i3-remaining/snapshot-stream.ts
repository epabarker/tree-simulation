// I3 step 3: the snapshot as the worker takes it, right after each season's step (its caches cold
// from the season), for the garden's planting (seed 10) at 66 and 160 cells: the mean and max over
// seasons 31–40 and 91–100 of the season, the Rust build and the copy-out. WASM under Node.
//   node docs/experiments/code/2026-11-02-i3-remaining/snapshot-stream.ts
import { readFileSync } from "node:fs";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const lean = { junctions: false, field: false };
const stat = (xs: number[]) => ({
  mean: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2),
  max: +Math.max(...xs).toFixed(2),
});
for (const width of [66, 160]) {
  const world = RustWorld.create(forestParams(width, 10));
  const inner = world.core();
  const rows: Record<string, number[]> = {};
  for (let s = 1; s <= 100; s++) {
    const t0 = performance.now();
    world.step(1, true);
    const t1 = performance.now();
    inner.snapshot(false, false);
    const t2 = performance.now();
    world.snapshot(0, lean);
    const t3 = performance.now();
    const band = s > 30 && s <= 40 ? "31-40" : s > 90 ? "91-100" : null;
    if (!band) continue;
    for (const [k, v] of [["season", t1 - t0], ["build", t2 - t1], ["snapshotAgain", t3 - t2]] as const)
      (rows[`${band} ${k}`] ??= []).push(v);
  }
  for (const [k, xs] of Object.entries(rows)) console.log(JSON.stringify({ width, [k]: stat(xs) }));
  world.dispose();
}
