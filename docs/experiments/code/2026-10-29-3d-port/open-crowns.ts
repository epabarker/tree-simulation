// Open-z inputs for the review's re-costing (2026-10-29, third session):
//  1. each home-wood species grown alone in the open (300-cell world, open sides, no recruits):
//     crown width, the depth a free 3D crown would want, against D;
//  2. leaf area per ground column: open-grown trees (per cell of crown width) against closed
//     stands (per cell of world), the factor side light adds to a hedgerow tree's foliage.
// usage: node docs/experiments/code/2026-10-29-3d-port/open-crowns.ts
import type { LightModel } from "../../../../src/core/light/light-model.ts";
import { treeMetrics } from "../../../../src/core/metrics.ts";
import { mergeParams, type Params } from "../../../../src/core/params.ts";
import { forestParams, presetParams } from "../../../../src/core/presets.ts";
import { World } from "../../../../src/core/world.ts";

/** Sums this season's deposited leaf area (wraps the real light model; behaviour unchanged). */
function tally(world: World): { area: number } {
  const t = { area: 0 };
  const inner = world.light;
  const wrap: LightModel = Object.create(inner);
  wrap.clear = () => { t.area = 0; inner.clear(); };
  wrap.deposit = (x: number, y: number, a = 1) => { t.area += a; inner.deposit(x, y, a); };
  wrap.compute = (s: number) => inner.compute(s);
  wrap.sample = (x, y, d, o) => inner.sample(x, y, d, o);
  wrap.addWall = (w) => inner.addWall(w);
  wrap.field = () => inner.field();
  world.light = wrap;
  return t;
}
const q = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))] ?? 0; };
const SEASONS = [60, 100, 150];
const SEEDS = [1, 2, 3];
const species = ["birch", "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple"];

console.log("open-grown (300-cell open world, one tree): crown width p50 [min–max] over seeds; leaf area per crown column");
for (const sp of species) {
  const row: string[] = [];
  for (const season of SEASONS) {
    const w: number[] = [];
    const lpc: number[] = [];
    for (const seed of SEEDS) {
      const base = presetParams("mixedWood", seed);
      const p: Params = mergeParams(base, { world: { ...base.world, width: 300, height: 160, sides: "open" }, trees: [{ x: 150, species: sp }], o4: { ...base.o4, enabled: false } });
      const world = new World(p);
      const t = tally(world);
      for (let s = 0; s < season; s++) world.step();
      const tree = world.trees[0];
      if (!tree?.alive) continue;
      const m = treeMetrics(tree, world);
      w.push(m.crownWidth);
      lpc.push(m.crownWidth > 0 ? t.area / m.crownWidth : 0);
    }
    row.push(`s${season}: ${q(w, 0.5).toFixed(0)} [${Math.min(...w).toFixed(0)}–${Math.max(...w).toFixed(0)}], ${q(lpc, 0.5).toFixed(2)}/col`);
  }
  console.log(sp.padEnd(9), row.join("  "));
}
console.log("\nclosed stands: leaf area per world column (ring, periodic)");
for (const [name, make] of [["forest", (s: number) => presetParams("forest", s)], ["home wood 210", (s: number) => forestParams(210, s)], ["home wood 520", (s: number) => forestParams(520, s)]] as const) {
  const row: string[] = [];
  for (const season of SEASONS) {
    const v: number[] = [];
    for (const seed of SEEDS) {
      const world = new World(make(seed));
      const t = tally(world);
      for (let s = 0; s < season; s++) { world.step(); world.discardDead(); }
      v.push(t.area / world.params.world.width);
    }
    row.push(`s${season}: ${q(v, 0.5).toFixed(2)}/col`);
  }
  console.log(name.padEnd(14), row.join("  "));
}
