/**
 * Track C step 4 (STATUS's known issue, ADR 0026): the garden's worker memory on the laptop's
 * 160-cell plate with the specimen beside it, and what a narrower specimen world would hold. One
 * case per process (linear memory never shrinks, so its size is the case's peak), the garden's
 * snapshot options (no junctions, no field), 200 seasons, dead trees discarded as the worker does.
 *   node docs/experiments/code/2026-11-01-foliage/memory.ts <case> [seasons]
 * Cases: garden-160, specimen (oakOpen, 160 wide), specimen-<w> (the same oak in a w-cell world),
 * garden-160+specimen, garden-160+specimen-<w>, and swap: the garden grown to `seasons`, then
 * set aside as checkpoint bytes and freed while the specimen grows `seasons` in the space it left,
 * then the garden loaded back from its bytes and grown on 20 seasons (the worker's `swap` with the
 * forest held as bytes, not as a live world). Prints JSON lines {case, season, wasmMB, ...}.
 */
import { readFileSync } from "node:fs";
import type { Params } from "../../../../src/core/params.ts";
import { forestParams, specimenParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld, wasmMemoryBytes } from "../../../../src/wasm/world.ts";

const name = process.argv[2] ?? "garden-160+specimen";
const seasons = Number(process.argv[3] ?? 200);
loadWorldsSync(readFileSync(coreWasm));

function specimen(width?: number): Params {
  const p = specimenParams(10);
  if (!width) return p;
  return { ...p, world: { ...p.world, width }, trees: p.trees.map((t) => ({ ...t, x: width / 2 })) };
}
const mb = (n: number) => Math.round(n / 1e5) / 10;
if (name === "swap") {
  const log = (phase: string, season: number, extra = {}) =>
    console.log(JSON.stringify({ case: name, phase, season, wasmMB: mb(wasmMemoryBytes()), ...extra }));
  let forest = RustWorld.create(forestParams(160, 10));
  for (let s = 1; s <= seasons; s++) forest.step(1, true);
  forest.snapshot(0, { junctions: false, field: false });
  const hashBefore = forest.hash();
  log("garden grown", seasons);
  const bytes = forest.save();
  forest.dispose();
  log("garden set aside", seasons, { checkpointMB: mb(bytes.byteLength) });
  const spec = RustWorld.create(specimen());
  for (let s = 1; s <= seasons; s++) {
    spec.step(1, true);
    if (s % 50 === 0) {
      spec.snapshot(0, { junctions: false, field: false });
      log("specimen", s);
    }
  }
  spec.dispose();
  forest = RustWorld.load(bytes);
  log("garden loaded", seasons, { sameHash: forest.hash() === hashBefore });
  for (let s = 1; s <= 20; s++) forest.step(1, true);
  forest.snapshot(0, { junctions: false, field: false });
  log("garden grown on", seasons + 20);
  process.exit(0);
}
const params: Params[] = [];
for (const part of name.split("+")) {
  if (part === "garden-160") params.push(forestParams(160, 10));
  else if (part === "specimen") params.push(specimen());
  else if (part.startsWith("specimen-")) params.push(specimen(Number(part.slice(9))));
  else throw new Error(`unknown case ${part}`);
}
const worlds = params.map((p) => RustWorld.create(p));
for (let s = 0; s <= seasons; s++) {
  if (s > 0) for (const w of worlds) w.step(1, true);
  if (s % 50 !== 0 && s !== seasons) continue;
  let live = 0;
  let height = 0;
  for (const w of worlds) {
    w.snapshot(0, { junctions: false, field: false });
    for (const t of w.trees)
      if (t.alive) {
        live += t.m.length;
        height = Math.max(height, w.metricsOf(t).height);
      }
  }
  console.log(JSON.stringify({ case: name, season: s, wasmMB: mb(wasmMemoryBytes()), liveMetamers: live, tallest: Math.round(height) }));
}
