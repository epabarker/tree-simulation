// Track C step 4 (I3 step 3): where the snapshot's time goes on the garden's plates. For the
// garden's planting (forestParams, seed 10) at 66 and 160 cells, at seasons 40 and 100: the
// snapshot as the garden asks for it (no junctions, no field), and the per-tree metrics alone
// (RustWorld.metrics: tree_metrics for every tree, with ground_light over each tree's extent),
// each the median of 5 calls. WASM under Node, one lane.
//   node docs/experiments/code/2026-11-01-foliage/snapshot-profile.ts
import { readFileSync } from "node:fs";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const median = (f: () => void): number => {
  const xs: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    f();
    xs.push(performance.now() - t0);
  }
  xs.sort((a, b) => a - b);
  return +(xs[2] as number).toFixed(1);
};
for (const width of [66, 160]) {
  const world = RustWorld.create(forestParams(width, 10));
  let season = 0;
  for (const at of [40, 100]) {
    const t0 = performance.now();
    while (season < at) {
      world.step(1, true);
      season++;
    }
    const seasonMs = (performance.now() - t0) / (at === 40 ? 40 : 60);
    let metamers = 0;
    let trees = 0;
    const snapshotMs = median(() => {
      const s = world.snapshot(0, { junctions: false, field: false });
      metamers = s.metamerCount;
      trees = s.metrics.length;
    });
    const metricsMs = median(() => (world as unknown as { metrics(): unknown }).metrics());
    console.log(
      JSON.stringify({
        width,
        season: at,
        trees,
        metamers,
        seasonMs: +seasonMs.toFixed(0),
        snapshotMs,
        metricsMs,
        metricsShare: +(metricsMs / snapshotMs).toFixed(2),
      }),
    );
  }
  world.dispose();
}
