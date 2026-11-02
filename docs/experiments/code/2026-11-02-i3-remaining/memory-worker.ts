// I3's memory problem: the product package's linear memory (wasmMemoryBytes) through what the
// garden's worker does on a plate, to confirm the memstats probe on the shipped build. The garden
// (forestParams(width, 10)) grows `seasons` with the garden's snapshot every season (dead trees
// discarded); then, with `swap`, the worker's swap: the garden saved by intoCheckpoint, the
// specimen (specimenParams(10)) grown `seasons` in its place, the garden loaded back and grown on 20.
//   node docs/experiments/code/2026-11-02-i3-remaining/memory-worker.ts <width> [seasons] [swap]
import { readFileSync } from "node:fs";
import { forestParams, specimenParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld, wasmMemoryBytes } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const width = Number(process.argv[2] ?? 160);
const seasons = Number(process.argv[3] ?? 200);
const swap = process.argv[4] === "swap";
const lean = { junctions: false, field: false };
const mb = (n: number) => Math.round(n / 1e5) / 10;
const log = (phase: string, season: number, extra = {}) =>
  console.log(JSON.stringify({ width, phase, season, wasmMB: mb(wasmMemoryBytes()), ...extra }));
function grow(w: RustWorld, phase: string, n: number, from = 0): number {
  let metamers = 0;
  for (let s = 1; s <= n; s++) {
    w.step(1, true);
    metamers = w.snapshot(0, lean).metamerCount;
    if ((from + s) % 50 === 0) log(phase, from + s, { metamers });
  }
  return metamers;
}
let forest = RustWorld.create(forestParams(width, 10));
grow(forest, "garden", seasons);
if (swap) {
  const hash = forest.hash();
  const bytes = forest.intoCheckpoint();
  log("garden set aside", seasons, { checkpointMB: mb(bytes.byteLength) });
  const spec = RustWorld.create(specimenParams(10));
  grow(spec, "specimen", seasons);
  spec.dispose();
  forest = RustWorld.load(bytes);
  log("garden loaded", seasons, { sameHash: forest.hash() === hash });
  grow(forest, "garden on", 20, seasons);
}
