// ADR 0052's probe cells as Snapshots for the contact sheet (docs/experiments/2026-11-05-crown-base-and-bole.md):
// the closed stand of seed 101 grown to each cell's size-matched season (runs/crown-base/limbloss.json), leaf-off on
// the sheet; one lone tree as the page's template only. Cells as analysis/experiments/crownbase_probes.py `limbloss`:
// the pilots' hand (`hand.assign`) and pilot v4's finalist (`fit.assign`), c5.Trel ×1/×3/×10 and O2 (pAbr 0.5).
//   node docs/experiments/code/2026-11-05-limb-loss-render/snapshots.ts runs/limb-loss-render 101
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { allometry } from "../../../../cli/allometry.ts";
import { loneParams, newWorld, STAND_MEASURED, standParams, withAssign } from "../../../../cli/trials.ts";
import type { Params } from "../../../../src/core/params.ts";

const [out = "runs/limb-loss-render", seedArg = "101"] = process.argv.slice(2);
const seed = Number(seedArg);
const fits = "docs/experiments/fits/level1-pilot-v4/beech.json";
const v4 = JSON.parse(readFileSync(fits, "utf8"));
// limbloss.json is Python's json (NaN allowed): read as null.
const probe = JSON.parse(readFileSync("runs/crown-base/limbloss.json", "utf8").replace(/\bNaN\b/g, "null"));
const sets: Record<string, Record<string, unknown>> = { hand: v4.hand.assign, v4: v4.fit.assign };
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
for (const [set, assign] of Object.entries(sets)) {
  const trel = assign["c5.Trel"] as number;
  const cells: [string, Record<string, unknown>, Record<string, Record<string, unknown>>][] = [
    ["Trel1", { ...assign, "c5.Trel": trel }, {}],
    ["Trel3", { ...assign, "c5.Trel": 3 * trel }, {}],
    ["Trel10", { ...assign, "c5.Trel": 10 * trel }, {}],
    ["O2", assign, { o2: { enabled: true, pAbr: 0.5 } }],
  ];
  for (const [cell, a, patch] of cells) {
    const key = `${set}-${cell}`;
    const season = probe.described[key].season as number;
    let p: Params = withAssign(standParams("beech", seed), "beech", a);
    for (const [g, v] of Object.entries(patch)) {
      const r = p as unknown as Record<string, Record<string, unknown>>;
      p = { ...p, [g]: { ...r[g], ...v } } as Params;
    }
    const w = newWorld(p);
    w.run(season);
    write(`${key}-stand-${seed}`, w.snapshot(0, { junctions: false, field: false }) as unknown as Record<string, unknown>);
    const measured = STAND_MEASURED.map((k) => w.trees[k])
      .filter((t) => t?.alive)
      .map((t) => allometry(t.m.cols, t.b.cols));
    summary[key] = {
      season,
      measuredDbhM: measured.map((m) => +m.dbh.toFixed(3)),
      measuredHeightM: measured.map((m) => +m.height.toFixed(2)),
      crownBase80: probe.described[key].raw.crownBase80,
      crownBase80z: probe.described[key].z.crownBase80.z,
    };
    console.log(key, JSON.stringify(summary[key]));
    w.dispose();
  }
}
const lone = newWorld(withAssign(loneParams("beech", seed), "beech", sets.hand as Record<string, unknown>));
lone.run(10);
write(`template-lone-${seed}`, lone.snapshot(0, { junctions: false, field: false }) as unknown as Record<string, unknown>);
lone.dispose();
writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 1));
