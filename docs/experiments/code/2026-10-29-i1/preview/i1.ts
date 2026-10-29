/**
 * THROWAWAY (I1, ADR 0024): the Rust core in a browser. Goldens in each core, the time per season
 * of two woods in each, and the snapshot's cost before (the TypeScript builder, arrays transferred
 * one by one) and after (built in Rust, copied out of linear memory once). Results as JSON.
 */
import { fixtureParams, isFixtureName } from "../../../../../src/core/fixtures.ts";
import { hashWorld } from "../../../../../src/core/hash.ts";
import type { Params } from "../../../../../src/core/params.ts";
import { forestParams, presetParams } from "../../../../../src/core/presets.ts";
import { FULL_SNAPSHOT, SnapshotBuilder, type SnapshotOptions } from "../../../../../src/core/snapshot.ts";
import { World } from "../../../../../src/core/world.ts";
import { parityWasm } from "../../../../../src/wasm/parity.ts";
import { productionWasm } from "../../../../../src/wasm/production.ts";
import { type Build, loadWorlds, RustWorld } from "../../../../../src/wasm/world.ts";
import golden from "../../../../../tests/golden.json";
import production from "../../../../../tests/golden-production.json";
import { caseKey, GOLDEN_CASES } from "../../../../../tests/golden-cases.ts";

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const status = (s: string) => {
  $("status").textContent = s;
};
const pause = () => new Promise((r) => setTimeout(r, 0));
const results: Record<string, unknown> = { userAgent: navigator.userAgent, cores: navigator.hardwareConcurrency };

function table(title: string, head: string[], rows: (string | number)[][]): void {
  const h = document.createElement("h2");
  h.textContent = title;
  const t = document.createElement("table");
  t.innerHTML = `<tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}`;
  $("out").append(h, t);
}

function caseParams(c: (typeof GOLDEN_CASES)[number]): Params {
  return isFixtureName(c.preset) ? fixtureParams(c.preset, c.seed) : presetParams(c.preset, c.seed);
}

async function goldens(): Promise<void> {
  const rows: (string | number)[][] = [];
  const engines: [string, (c: (typeof GOLDEN_CASES)[number]) => string, Record<string, string>][] = [
    ["TypeScript core", (c) => {
      const w = new World(caseParams(c));
      w.run(c.seasons);
      return hashWorld(w);
    }, golden as Record<string, string>],
    ["Rust, parity build", (c) => rust(c, "parity"), golden as Record<string, string>],
    ["Rust, production build", (c) => rust(c, "production"), production as Record<string, string>],
  ];
  for (const [name, run, want] of engines) {
    let pass = 0;
    const failed: string[] = [];
    const t0 = performance.now();
    for (const c of GOLDEN_CASES) {
      status(`${name}: ${caseKey(c)}`);
      await pause();
      if (run(c) === want[caseKey(c)]) pass += 1;
      else failed.push(caseKey(c));
    }
    rows.push([name, `${pass} of ${GOLDEN_CASES.length}`, `${((performance.now() - t0) / 1000).toFixed(1)} s`]);
    results[`goldens ${name}`] = { pass, of: GOLDEN_CASES.length, failed };
  }
  table("Goldens", ["Core", "Pass", "Time"], rows);
}

function rust(c: (typeof GOLDEN_CASES)[number], b: Build): string {
  const w = RustWorld.create(caseParams(c), b);
  w.run(c.seasons);
  const h = w.hash();
  w.dispose();
  return h;
}

const WOODS: [string, () => Params][] = [
  ["forest (seed 1)", () => presetParams("forest", 1)],
  ["mixed wood, 220 cells (seed 9)", () => forestParams(220, 9)],
];
const SEASONS = 60;
const FROM = 40;

async function seasons(): Promise<void> {
  const rows: (string | number)[][] = [];
  for (const [label, make] of WOODS) {
    const ms: Record<string, number> = {};
    for (const core of ["TypeScript", "Rust parity", "Rust production"]) {
      let total = 0;
      if (core === "TypeScript") {
        const w = new World(make());
        for (let s = 0; s < SEASONS; s++) {
          if (s % 5 === 0) {
            status(`${label}, ${core}: season ${s}`);
            await pause();
          }
          const t0 = performance.now();
          w.step();
          w.discardDead();
          if (s >= FROM) total += performance.now() - t0;
        }
      } else {
        const w = RustWorld.create(make(), core === "Rust parity" ? "parity" : "production");
        for (let s = 0; s < SEASONS; s++) {
          if (s % 5 === 0) {
            status(`${label}, ${core}: season ${s}`);
            await pause();
          }
          const t0 = performance.now();
          w.step(1, true);
          if (s >= FROM) total += performance.now() - t0;
        }
        w.dispose();
      }
      ms[core] = total / (SEASONS - FROM);
    }
    const ts = ms.TypeScript as number;
    rows.push([
      label,
      ts.toFixed(1),
      `${(ms["Rust parity"] as number).toFixed(1)} (${(ts / (ms["Rust parity"] as number)).toFixed(2)}×)`,
      `${(ms["Rust production"] as number).toFixed(1)} (${(ts / (ms["Rust production"] as number)).toFixed(2)}×)`,
    ]);
    results[`season ms ${label}`] = ms;
  }
  table(`Time per season, ms (mean of seasons ${FROM}–${SEASONS - 1})`, ["Wood", "TypeScript", "Rust parity (speed-up)", "Rust production (speed-up)"], rows);
}

const GARDEN: SnapshotOptions = { junctions: false, field: false };

async function snapshots(): Promise<void> {
  const rows: (string | number)[][] = [];
  for (const [label, make] of WOODS) {
    status(`snapshots: ${label}`);
    await pause();
    const ts = new World(make());
    const rw = RustWorld.create(make(), "production");
    for (let s = 0; s < FROM; s++) {
      ts.step();
      ts.discardDead();
      rw.step(1, true);
    }
    for (const [opt, options] of [["lab (full)", FULL_SNAPSHOT], ["garden", GARDEN]] as const) {
      const builder = new SnapshotBuilder();
      builder.build(ts, 0, options);
      rw.snapshot(0, options);
      const n = 15;
      let a = 0;
      let b = 0;
      for (let k = 0; k < n; k++) {
        let t0 = performance.now();
        const s1 = builder.build(ts, 0, options);
        // The old path transferred each array's own buffer: copy them, as structured clone would.
        for (const arr of [s1.parent, s1.x0, s1.budQ]) void arr.slice();
        a += performance.now() - t0;
        t0 = performance.now();
        rw.snapshot(0, options);
        b += performance.now() - t0;
      }
      rows.push([label, opt, (a / n).toFixed(2), (b / n).toFixed(2)]);
      results[`snapshot ms ${label} ${opt}`] = { ts: a / n, rust: b / n };
    }
    rw.dispose();
  }
  table(`snapshotMs at season ${FROM}`, ["Wood", "Snapshot", "TypeScript builder", "Rust (one copy)"], rows);
}

$("go").addEventListener("click", async () => {
  ($("go") as HTMLButtonElement).disabled = true;
  status("loading the Rust core");
  await loadWorlds("parity");
  await loadWorlds("production");
  await goldens();
  await seasons();
  await snapshots();
  status("done");
  $("json").textContent = JSON.stringify(results, null, 1);
});
