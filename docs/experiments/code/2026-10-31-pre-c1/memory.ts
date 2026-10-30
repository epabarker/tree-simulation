/**
 * Pre-C1 item 1: the WASM core's memory, as the page's worker holds it. Each case runs in a fresh
 * module (one process each: linear memory never shrinks, so its size is the case's peak).
 *   node docs/experiments/code/2026-10-31-pre-c1/memory.ts <case> [seasons]
 * Cases: garden-66, garden-160, garden-320, garden-160-planted, forest, specimen,
 * garden-160+specimen (the garden's specimen focus holds both worlds, worker `swap`).
 * Prints JSON lines: {case, season, wasmMB, liveMetamers, trees, snapshotMB}.
 */
import { readFileSync } from "node:fs";
import { forestParams, presetParams, specimenParams } from "../../../../src/core/presets.ts";
import type { Params } from "../../../../src/core/params.ts";
import { type Snapshot, FULL_SNAPSHOT } from "../../../../src/core/types.ts";
import {
  coreWasm,
  loadWorldsSync,
  RustWorld,
  snapshotTransferables,
  wasmMemoryBytes,
} from "../../../../src/wasm/world.ts";

const name = process.argv[2] ?? "garden-66";
const seasons = Number(process.argv[3] ?? 100);
loadWorldsSync(readFileSync(coreWasm));

function garden(width: number, planted = false): Params {
  const p = forestParams(width, 10);
  if (planted) p.o4 = { ...p.o4, enabled: false };
  return p;
}

const cases: Record<string, () => Params[]> = {
  "garden-66": () => [garden(66)],
  "garden-160": () => [garden(160)],
  "garden-320": () => [garden(320)],
  "garden-520": () => [garden(520)],
  "garden-160-planted": () => [garden(160, true)],
  forest: () => [presetParams("forest", 10)],
  specimen: () => [specimenParams(10)],
  "garden-160+specimen": () => [garden(160), specimenParams(10)],
};

const bytes = (s: Snapshot) =>
  snapshotTransferables(s).reduce((sum, b) => sum + (b as ArrayBuffer).byteLength, 0);

const worlds = (cases[name] as () => Params[])().map((p) => RustWorld.create(p));
const mb = (n: number) => Math.round(n / 1e5) / 10;
for (let s = 0; s <= seasons; s++) {
  if (s > 0) for (const w of worlds) w.step(1, true); // the worker discards the dead as it goes
  if (s % 20 !== 0 && s !== seasons) continue;
  let live = 0;
  let trees = 0;
  let snap = 0;
  for (const w of worlds) {
    for (const t of w.trees) if (t.alive) { live += t.m.length; trees += 1; }
    snap += bytes(w.snapshot(0, FULL_SNAPSHOT));
  }
  console.log(JSON.stringify({ case: name, season: s, wasmMB: mb(wasmMemoryBytes()), liveMetamers: live, trees, snapshotMB: mb(snap) }));
}
