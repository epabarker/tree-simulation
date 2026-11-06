// Beech hand vs pilot fits: the sim columns' snapshots (docs/experiments/2026-11-05-level1-beech-pilot-v3.md).
// One process, no workers: for each column and seed, the closed stand (cli/trials.ts standParams) grown to the
// size-matched season and the lone tree (loneParams) to season 100, each as the core's own Snapshot, written as
// <out>/<column>-<trial>-<seed>.{json,bin} (typed arrays in the .bin, the rest in the .json) for page.ts.
//   node docs/experiments/code/2026-11-05-render/snapshots.ts runs/beech-render hand,fit,v4 101,102 [standSeason=70]
// Columns: hand = the shipped beech (no assign); fit = fits/level1-pilot-v3/beech.json's `fit.assign` over it;
// v4 = fits/level1-pilot-v4/beech-best.json's `assign` (provisional, search seeds).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { allometry } from "../../../../cli/allometry.ts";
import { loneParams, newWorld, STAND_MEASURED, standParams, withAssign } from "../../../../cli/trials.ts";

const [out = "runs/beech-render", cols = "hand,fit,v4", seeds = "101,102", standSeason = "70"] =
  process.argv.slice(2);
const fits = "docs/experiments/fits";
const assigns: Record<string, Record<string, unknown>> = {
  hand: {},
  fit: JSON.parse(readFileSync(`${fits}/level1-pilot-v3/beech.json`, "utf8")).fit.assign,
  v4: JSON.parse(readFileSync(`${fits}/level1-pilot-v4/beech-best.json`, "utf8")).assign,
};
mkdirSync(out, { recursive: true });

function write(name: string, snap: Record<string, unknown>): void {
  const head: Record<string, unknown> = {};
  const chunks: Buffer[] = [];
  let at = 0;
  for (const [k, v] of Object.entries(snap)) {
    if (ArrayBuffer.isView(v)) {
      const pad = (8 - (at % 8)) % 8;
      chunks.push(Buffer.alloc(pad));
      at += pad;
      head[k] = { t: v.constructor.name, off: at, len: v.length };
      chunks.push(Buffer.from(v.buffer, v.byteOffset, v.byteLength));
      at += v.byteLength;
    } else head[k] = { v };
  }
  writeFileSync(`${out}/${name}.json`, JSON.stringify(head));
  writeFileSync(`${out}/${name}.bin`, Buffer.concat(chunks));
}

const summary: Record<string, unknown> = {};
for (const col of cols.split(",")) {
  for (const seed of seeds.split(",").map(Number)) {
    for (const [trial, season] of [["stand", Number(standSeason)], ["lone", 100]] as const) {
      const base = trial === "stand" ? standParams("beech", seed) : loneParams("beech", seed);
      const w = newWorld(withAssign(base, "beech", assigns[col] as Record<string, unknown>));
      const t0 = Date.now();
      w.run(season);
      const snap = w.snapshot(0, { junctions: false, field: false }) as unknown as Record<string, unknown>;
      write(`${col}-${trial}-${seed}`, snap);
      const live = w.trees.filter((t) => t.alive).map((t) => w.metricsOf(t));
      // The labels' DBH and height: cli/allometry.ts (the pilot's own), the stand's middle row, or the lone tree.
      const measured = (trial === "stand" ? STAND_MEASURED : [0])
        .map((k) => w.trees[k])
        .filter((t) => t?.alive)
        .map((t) => allometry(t.m.cols, t.b.cols));
      summary[`${col}-${trial}-${seed}`] = {
        season,
        seconds: (Date.now() - t0) / 1000,
        metamers: snap.metamerCount,
        trees: live.length,
        height: live.map((m) => +(m.height * 0.25).toFixed(2)),
        measuredDbhM: measured.map((a) => +a.dbh.toFixed(3)),
        measuredHeightM: measured.map((a) => +a.height.toFixed(2)),
      };
      console.log(`${col}-${trial}-${seed}`, JSON.stringify(summary[`${col}-${trial}-${seed}`]));
      w.dispose();
    }
  }
}
writeFileSync(`${out}/summary-${cols}-${seeds}.json`, JSON.stringify(summary, null, 1));
