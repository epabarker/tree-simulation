// I3's memory problem (brief 2026-11-02): where the garden worker's linear memory goes. Runs the
// memstats build (tree-core under a counting allocator, ./memstats.sh) through a case, as the
// worker does: dead trees discarded every season, the garden's snapshot (no junctions, no field)
// every season. Every `every` seasons it prints linear memory, the allocator's live bytes and their
// peak, and the live bytes split by what holds them, as reserved capacity (and used, for the tables).
//   bash docs/experiments/code/2026-11-02-i3-remaining/memstats.sh <scratch>
//   node docs/experiments/code/2026-11-02-i3-remaining/memory-split.ts <scratch>/pkg <case> [seasons] [every]
// Cases: garden-<w> (forestParams(w, 10)); specimen (specimenParams(10)); swap-<w> (the worker's
// swap: the garden grown to `seasons`, saved as checkpoint bytes and freed, the specimen grown
// `seasons` in its place, freed, the garden loaded back and grown on 20); swapfree-<w> (the same,
// the garden saved by into_checkpoint, which frees what a checkpoint does not hold first).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { forestParams, specimenParams } from "../../../../src/core/presets.ts";

const [dir, name = "garden-160", seasonsArg = "200", everyArg = "20"] = process.argv.slice(2);
if (!dir) throw new Error("usage: memory-split.ts <pkg dir> <case> [seasons] [every]");
const pkg = await import(pathToFileURL(`${dir}/memstats.js`).href);
pkg.initSync({ module: readFileSync(`${dir}/memstats_bg.wasm`) });
const seasons = Number(seasonsArg);
const every = Number(everyArg);
const MB = (n: number) => Math.round(n / 1e5) / 10;
const FIELDS = [
  "metamers", "buds", "treeRows", "liveTrees", "metamerCap", "metamerUsed", "budCap", "budUsed",
  "scratchCap", "scratchUsed", "treeHeaders", "light", "owner", "snapshot", "live", "peak", "memory",
] as const;

function log(world: any, phase: string, season: number): void {
  const r = Object.fromEntries(FIELDS.map((k, i) => [k, world.report()[i]])) as Record<string, number>;
  const held = r.metamerCap + r.budCap + r.scratchCap + r.treeHeaders + r.light + r.owner + r.snapshot;
  console.log(
    JSON.stringify({
      case: name, phase, season, metamers: r.metamers, buds: r.buds, trees: r.liveTrees, treeRows: r.treeRows,
      memoryMB: MB(r.memory), peakLiveMB: MB(r.peak), liveMB: MB(r.live),
      metamerMB: MB(r.metamerCap), metamerUsedMB: MB(r.metamerUsed),
      budMB: MB(r.budCap), budUsedMB: MB(r.budUsed),
      scratchMB: MB(r.scratchCap), scratchUsedMB: MB(r.scratchUsed),
      headersMB: MB(r.treeHeaders), lightMB: MB(r.light), ownerMB: MB(r.owner), snapshotMB: MB(r.snapshot),
      otherMB: MB(r.live - held),
    }),
  );
}

function grow(world: any, phase: string, n: number, from = 0): void {
  for (let s = 1; s <= n; s++) {
    world.step(true);
    world.snapshot();
    if (s % every === 0 || s === n) log(world, phase, from + s);
  }
}

if (name.startsWith("swap")) {
  const width = Number(name.split("-")[1]);
  let forest = new pkg.World(JSON.stringify(forestParams(width, 10)));
  log(forest, "garden", 0);
  grow(forest, "garden", seasons);
  let bytes: Uint8Array;
  if (name.startsWith("swapfree-")) bytes = forest.into_checkpoint();
  else {
    bytes = forest.save();
    forest.free();
  }
  const spec = new pkg.World(JSON.stringify(specimenParams(10)));
  log(spec, "specimen", 0);
  grow(spec, "specimen", seasons);
  spec.free();
  forest = pkg.World.load(bytes);
  log(forest, "garden loaded", seasons);
  grow(forest, "garden on", 20, seasons);
  console.log(JSON.stringify({ case: name, checkpointMB: MB(bytes.byteLength) }));
} else {
  const params = name === "specimen" ? specimenParams(10) : forestParams(Number(name.slice(7)), 10);
  const world = new pkg.World(JSON.stringify(params));
  log(world, "grow", 0);
  grow(world, "grow", seasons);
}
