// I3 step 3 (brief 2026-11-02): where the worker's snapshot time goes on the garden's plates, with
// the species as adopted. The garden's planting (forestParams, seed 10) at 66 and 160 cells,
// seasons 40 and 100, stepped as the worker steps it (dead trees discarded). For each: the season
// (mean over the stretch), the snapshot as the garden asks for it (no junctions, no field) split
// into the Rust build (tree_metrics for every live tree and the columns), the metrics alone
// (RustWorld.metrics: tree_metrics for every tree), and the page-side copy-out and carve; each the
// median of 9 calls after 2 warm-up ones. WASM under Node, one lane.
//   node docs/experiments/code/2026-11-02-i3-remaining/snapshot-split.ts [widths] [seasons]
import { readFileSync } from "node:fs";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const widths = (process.argv[2] ?? "66,160").split(",").map(Number);
const stops = (process.argv[3] ?? "40,100").split(",").map(Number);
const median = (f: () => void): number => {
  const xs: number[] = [];
  for (let i = 0; i < 11; i++) {
    const t0 = performance.now();
    f();
    if (i >= 2) xs.push(performance.now() - t0);
  }
  xs.sort((a, b) => a - b);
  return +(xs[4] as number).toFixed(2);
};
const lean = { junctions: false, field: false };
for (const width of widths) {
  const world = RustWorld.create(forestParams(width, 10));
  const inner = world.core();
  let season = 0;
  for (const at of stops) {
    const from = season;
    const t0 = performance.now();
    while (season < at) {
      world.step(1, true);
      season++;
    }
    const seasonMs = (performance.now() - t0) / (at - from);
    let metamers = 0;
    let trees = 0;
    let bytes = 0;
    const totalMs = median(() => {
      const s = world.snapshot(0, lean);
      metamers = s.metamerCount;
      trees = s.metrics.length;
    });
    const buildMs = median(() => inner.snapshot(false, false));
    bytes = inner.snapshot_len();
    const metricsMs = median(() => inner.metrics());
    console.log(
      JSON.stringify({
        width,
        season: at,
        trees,
        metamers,
        snapshotKB: Math.round(bytes / 1024),
        seasonMs: +seasonMs.toFixed(1),
        snapshotMs: totalMs,
        rustBuildMs: buildMs,
        metricsMs,
        copyOutMs: +(totalMs - buildMs).toFixed(2),
        metricsShare: +(metricsMs / totalMs).toFixed(2),
      }),
    );
  }
  world.dispose();
}
