// The garden's planting at a few plate widths: metamers, snapshot bytes, WASM memory, season time
// in WASM under Node, and the picture's leaf coverage (share of 1-cell picture cells holding a
// leaf in the canopy's lower and upper halves; leaves per covered cell), at seasons 40 and 100.
import { readFileSync } from "node:fs";
import { forestParams } from "../../../../src/core/presets.ts";
import {
  coreWasm,
  loadWorldsSync,
  RustWorld,
  snapshotTransferables,
  wasmMemoryBytes,
} from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const LEAF_AGE = 4;

function coverage(s: any) {
  const W = Math.ceil(s.width);
  let maxY = 0;
  for (let j = 0; j < s.metamerCount; j++) maxY = Math.max(maxY, s.y0[j]);
  const H = Math.ceil(maxY) + 2;
  const cells = new Uint16Array(W * H);
  let leaves = 0;
  for (let j = 0; j < s.metamerCount; j++) {
    if (s.age[j] > LEAF_AGE + 1) continue;
    const x = ((Math.floor(s.x0[j]) % W) + W) % W;
    const y = Math.max(0, Math.floor(s.y0[j]));
    cells[y * W + x]++;
    leaves++;
  }
  const half = Math.floor(maxY / 2);
  let lo = 0, hi = 0, loCov = 0, hiCov = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = cells[y * W + x];
      if (y < half) { if (c) { lo++; loCov += c; } } else if (y < maxY) { if (c) { hi++; hiCov += c; } }
    }
  return {
    leaves,
    coverLow: +(lo / (W * half)).toFixed(3),
    coverHigh: +(hi / (W * Math.max(1, Math.ceil(maxY) - half))).toFixed(3),
    perCellLow: +(loCov / Math.max(1, lo)).toFixed(1),
    perCellHigh: +(hiCov / Math.max(1, hi)).toFixed(1),
    top: Math.round(maxY),
  };
}

for (const width of [66, 160, 200]) {
  const world = RustWorld.create(forestParams(width, 10));
  let season = 0;
  for (const at of [40, 100]) {
    const t0 = performance.now();
    while (season < at) {
      world.step(1, true);
      season++;
    }
    const ms = (performance.now() - t0) / (at === 40 ? 40 : 60);
    const t1 = performance.now();
    const s = world.snapshot(0, { junctions: false, field: false });
    const snapMs = performance.now() - t1;
    const bytes = snapshotTransferables(s).reduce((n: number, b: ArrayBuffer) => n + b.byteLength, 0);
    console.log(
      JSON.stringify({
        width, season: at, trees: s.metrics.filter((m: any) => m.alive).length,
        metamers: s.metamerCount, buds: s.budCount,
        snapshotKB: Math.round(bytes / 1024), bytesPerMetamer: +(bytes / s.metamerCount).toFixed(1),
        snapshotMs: +snapMs.toFixed(1), seasonMsMean: +ms.toFixed(0),
        memoryMB: Math.round(wasmMemoryBytes() / 1048576), ...coverage(s),
      }),
    );
  }
  world.dispose();
}
