// The Rust snapshot's cost at the garden's 160- and 200-cell plates (the plan's sizes.ts planting),
// seasons 40 and 100: median of 15 snapshots of the same world, after 3 warm-up ones. Run in a
// checkout before I3 step 1 and after it for the cost of the zOrder column.
import { readFileSync } from "node:fs";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const lean = { junctions: false, field: false };
for (const width of [160, 200]) {
  const world = RustWorld.create(forestParams(width, 10));
  let season = 0;
  for (const at of [40, 100]) {
    while (season < at) {
      world.step(1, true);
      season++;
    }
    const ms: number[] = [];
    let n = 0;
    for (let k = 0; k < 18; k++) {
      const t0 = performance.now();
      n = world.snapshot(0, lean).metamerCount;
      if (k >= 3) ms.push(performance.now() - t0);
    }
    ms.sort((a, b) => a - b);
    console.log(JSON.stringify({ width, season: at, metamers: n, snapshotMs: +(ms[7] as number).toFixed(2) }));
  }
  world.dispose();
}
