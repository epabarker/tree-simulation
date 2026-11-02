// I3's memory levers change where the core keeps its bytes, never the bytes: this prints a SHA-256
// of every season's snapshot (the garden's options and the lab's) and of the checkpoint after the
// last, for the garden's planting (seed 10) at 66 cells and the specimen, from a built package.
// Run it on a package built before the change and one after; the lines must match. With a
// package that has `into_checkpoint`, it also checks that its bytes are `save`'s.
//   node docs/experiments/code/2026-11-02-i3-remaining/same-bytes.ts <pkg dir> [seasons]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { forestParams, specimenParams } from "../../../../src/core/presets.ts";

const [dir = "src/wasm/pkg", seasonsArg = "60"] = process.argv.slice(2);
const pkg = await import(pathToFileURL(`${dir}/core.js`).href);
const { memory } = pkg.initSync({ module: readFileSync(`${dir}/core_bg.wasm`) });
const seasons = Number(seasonsArg);
for (const [name, params] of [
  ["garden-66", forestParams(66, 10)],
  ["specimen", specimenParams(10)],
] as const) {
  const w = new pkg.World(JSON.stringify(params));
  const snaps = createHash("sha256");
  for (let s = 1; s <= seasons; s++) {
    w.step(1, true);
    for (const [junctions, field] of [[false, false], [true, true]]) {
      w.snapshot(junctions, field);
      snaps.update(new Uint8Array(memory.buffer, w.snapshot_ptr(), w.snapshot_len()));
    }
  }
  const saved = createHash("sha256").update(w.save()).digest("hex").slice(0, 16);
  let into = "n/a";
  if (typeof w.into_checkpoint === "function")
    into = createHash("sha256").update(w.into_checkpoint()).digest("hex").slice(0, 16);
  else w.free();
  console.log(name, "snapshots", snaps.digest("hex").slice(0, 16), "checkpoint", saved, "intoCheckpoint", into);
}
