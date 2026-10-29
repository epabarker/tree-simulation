/**
 * Why the lone willow stops growing, then loses height (M27 diagnosis;
 * docs/experiments/2026-10-28-m27-height-curves.md). Four tables over the standard trials
 * (cli/trials.ts), on the Rust core's parity build (I1):
 *
 * 1. willow's height at seasons 30 and 60 with one cause switched off at a time;
 * 2. the topmost metamers at each willow's peak: shed by season 60, or still there and lower (sag);
 * 3. every species' H30/H60, lone and stand top, at its own L_h and at L_h 100 and 200;
 * 4. stand top heights under the exponential and the hyperbolic discount, and with the juvenile
 *    phase (h_j 80, ADR 0022), beside yield tables.
 *
 *   node cli/height-diagnosis.ts            # about two minutes
 */

import { speciesParams } from "../src/core/params.ts";
import type { TreeView as Tree, RustWorld as World } from "../src/wasm/world.ts";
import { loneParams, newWorld, standParams, withAssign } from "./trials.ts";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const height = (w: World, t: Tree): number => w.metricsOf(t).height;

/** Path length from the base to the highest tip, over the tree's height. */
function pathOverHeight(t: Tree): number {
  const c = t.m.cols;
  const path = new Float64Array(t.m.length);
  let top = 0;
  let topI = 0;
  for (let i = 0; i < t.m.length; i++) {
    const p = c.parent[i];
    path[i] = (p >= 0 ? (path[p] as number) : 0) + c.length[i];
    if (t.tipY(i) > top) {
      top = t.tipY(i);
      topI = i;
    }
  }
  return top > 0 ? (path[topI] as number) / top : Number.NaN;
}

function ablations(): void {
  const variants: Record<string, Record<string, unknown>> = {
    "hand-tuned": {},
    "no shedding at all": { "r1.shed": "c5", "c5.enabled": false },
    "no mechanics (R3 off)": { "r3.enabled": false },
    "no shedding, no R3": { "r1.shed": "c5", "c5.enabled": false, "r3.enabled": false },
    "posture rate c 0.3": { "r3.c": 0.3 },
    "L_h 45": { "r1.Lh": 45 },
    "L_h 45, c 0.3": { "r1.Lh": 45, "r3.c": 0.3 },
    "L_h 60": { "r1.Lh": 60 },
    "L_h 0 (no path discount)": { "r1.Lh": 0 },
    "a_C 30": { "r2.aC": 30 },
  };
  console.log("1. lone willow, 10 seeds");
  console.log("variant                    H30    H60  H30/H60  path/height  seeds losing >1 cell");
  for (const [name, assign] of Object.entries(variants)) {
    const h30: number[] = [];
    const h60: number[] = [];
    const path: number[] = [];
    for (const seed of SEEDS) {
      const w = newWorld(withAssign(loneParams("willow", seed), "willow", assign));
      const t = w.trees[0] as Tree;
      w.run(30);
      h30.push(height(w, t));
      w.run(30);
      h60.push(height(w, t));
      path.push(pathOverHeight(t));
    }
    const shrinking = SEEDS.filter((_, i) => (h30[i] as number) - (h60[i] as number) > 1).length;
    console.log(
      `${name.padEnd(26)} ${mean(h30).toFixed(1).padStart(5)} ${mean(h60).toFixed(1).padStart(6)}` +
        ` ${(mean(h30) / mean(h60)).toFixed(2).padStart(8)} ${mean(path).toFixed(2).padStart(12)}` +
        ` ${String(shrinking).padStart(21)}`,
    );
  }
}

function sagOrShed(): void {
  console.log("\n2. the 20 highest metamers at each willow's peak, at season 60");
  for (const seed of SEEDS) {
    const w = newWorld(loneParams("willow", seed));
    const t = w.trees[0] as Tree;
    let peak = 0;
    let peakSeason = 0;
    const atPeak = new Map<number, number>();
    for (let s = 1; s <= 60; s++) {
      w.step();
      const h = height(w, t);
      if (h <= peak) continue;
      peak = h;
      peakSeason = s;
      atPeak.clear();
      const order = [...Array(t.m.length).keys()].sort((a, b) => t.tipY(b) - t.tipY(a));
      for (const i of order.slice(0, 20)) atPeak.set(t.m.cols.birthId[i] as number, t.tipY(i));
    }
    const index = new Map<number, number>();
    for (let i = 0; i < t.m.length; i++) index.set(t.m.cols.birthId[i] as number, i);
    let shed = 0;
    let drop = 0;
    for (const [id, y] of atPeak) {
      const i = index.get(id);
      if (i === undefined) shed += 1;
      else drop += y - t.tipY(i);
    }
    const kept = atPeak.size - shed;
    console.log(
      `   seed ${seed}: peak ${peak.toFixed(1)} at season ${peakSeason}, H60 ${height(w, t).toFixed(1)};` +
        ` ${shed} shed, ${kept} still there ${(drop / Math.max(kept, 1)).toFixed(1)} cells lower`,
    );
  }
}

function curves(): void {
  console.log(
    "\n3. H30/H60 (and H60) by L_h, 5 seeds: lone tree, and the stand's tallest interior tree",
  );
  for (const sp of ["birch", "oak", "beech", "fir", "hornbeam", "pine", "willow"]) {
    const own = speciesParams(loneParams(sp, 1), sp).r1.Lh;
    const cells: string[] = [];
    for (const lh of [own, 100, 200]) {
      const assign = lh === own ? {} : { "r1.Lh": lh };
      const l30: number[] = [];
      const l60: number[] = [];
      const s30: number[] = [];
      const s60: number[] = [];
      for (const seed of SEEDS.slice(0, 5)) {
        const lone = newWorld(withAssign(loneParams(sp, seed), sp, assign));
        const t = lone.trees[0] as Tree;
        lone.run(30);
        l30.push(height(lone, t));
        lone.run(30);
        l60.push(height(lone, t));
        const stand = newWorld(withAssign(standParams(sp, seed), sp, assign));
        const top = (): number =>
          Math.max(...stand.trees.slice(2, -2).map((tr) => (tr.alive ? height(stand, tr) : 0)));
        stand.run(30);
        s30.push(top());
        stand.run(30);
        s60.push(top());
      }
      cells.push(
        `L_h ${lh}: ${(mean(l30) / mean(l60)).toFixed(2)} / ${(mean(s30) / mean(s60)).toFixed(2)}` +
          ` (${mean(l60).toFixed(0)})`,
      );
    }
    console.log(`   ${sp.padEnd(9)} ${cells.join("  |  ")}`);
  }
}

/** Stand top height (m, 0.25 m a cell) at seasons 30, 60 and 100, mean of 3 seeds. */
function standTop(sp: string, assign: Record<string, unknown>): string {
  const at = [30, 60, 100];
  const hs: number[][] = at.map(() => []);
  for (const seed of SEEDS.slice(0, 3)) {
    const w = newWorld(withAssign(standParams(sp, seed), sp, assign));
    let s = 0;
    at.forEach((season, k) => {
      w.run(season - s);
      s = season;
      const top = Math.max(...w.trees.slice(2, -2).map((t) => (t.alive ? height(w, t) : 0)));
      hs[k]?.push(top * 0.25);
    });
  }
  return hs.map((h) => mean(h).toFixed(1)).join(", ");
}

/**
 * ADR 0021–0022: the exponential discount against the hyperbolic one, then with the juvenile
 * phase (h_j 80), beside the yield tables.
 */
function hyperbolic(): void {
  console.log("\n4. stand top height (m) at seasons 30, 60, 100: exp, 1/(1 + L/L_h), and with h_j");
  const cases: [string, number, string][] = [
    ["hornbeam", 100, "14.2, 21.2, 26.0 (Lockow & Lockow 2009, SI 26)"],
    ["pine", 100, "13.8, 22.8, 29.0 (NW-FVA class 1)"],
    ["oak", 70, "13.1, 21.0, 27.0 (NW-FVA class 1)"],
    ["willow", 40, "13.9, 18.0, 18.9 (Paramonov et al. 2021, class I)"],
    ["beech", 70, "–, 23.1, 32.5 (NW-FVA class 1)"],
    ["fir", 100, "7.8, 20.4, 31.0 (Tirol, SI 31)"],
  ];
  for (const [sp, lh, table] of cases) {
    const exp = standTop(sp, {});
    const hyp = standTop(sp, { "r1.hydraulic": "hyperbolic", "r1.Lh": lh });
    const juv = standTop(sp, { "r1.hydraulic": "hyperbolic", "r1.Lh": lh, "r2.hJ": 80 });
    console.log(
      `   ${sp.padEnd(9)} exp ${exp}  |  hyperbolic L_h ${lh}: ${hyp}  |  with h_j 80: ${juv}` +
        `  |  table ${table}`,
    );
  }
}

ablations();
sagOrShed();
curves();
hyperbolic();
