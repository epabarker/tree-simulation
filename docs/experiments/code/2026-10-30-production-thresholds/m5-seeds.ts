/**
 * The two M5 stand tests (tests/evidence/stand.test.ts) per seed, both builds, seeds 1–20, without
 * stopping at the first failure: the late tree's height against 0.6 × its neighbours', and the
 * left tree's crown shift into the gap against 2 cells.
 *
 *   node docs/experiments/code/2026-10-30-production-thresholds/m5-seeds.ts
 */
import { readFileSync } from "node:fs";
import { presetParams } from "../../../../src/core/presets.ts";
import { parityWasm } from "../../../../src/wasm/parity.ts";
import { productionWasm } from "../../../../src/wasm/production.ts";
import { type Build, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync("parity", readFileSync(parityWasm));
loadWorldsSync("production", readFileSync(productionWasm));

const m = (w: RustWorld, id: number) => w.metricsOf(w.trees[id] as never);

for (const build of ["parity", "production"] as Build[]) {
  console.log(`\n${build}: seed, late/min(h) (< 0.6), late/min(metamers) (< 0.3), late/min(qBase) (< 0.3), gap shift (> 2)`);
  let pass = [0, 0, 0, 0];
  for (let seed = 1; seed <= 20; seed++) {
    const w = RustWorld.create(presetParams("late", seed), build);
    w.run(45);
    const [l, t, r] = [0, 1, 2].map((id) => m(w, id));
    const h = t.height / Math.min(l.height, r.height);
    const n = t.metamers / Math.min(l.metamers, r.metamers);
    const q = t.qBase / Math.min(l.qBase, r.qBase);
    const removed = RustWorld.create(presetParams("pair", seed), build);
    removed.run(20);
    removed.removeTree(1);
    removed.run(20);
    const kept = RustWorld.create(presetParams("pair", seed), build);
    kept.run(40);
    const shift = m(removed, 0).centroidOffset - m(kept, 0).centroidOffset;
    const ok = [h < 0.6, n < 0.3, q < 0.3, shift > 2];
    pass = pass.map((p, k) => p + (ok[k] ? 1 : 0));
    const f = (x: number, o: boolean) => `${x.toFixed(3)}${o ? " " : "*"}`;
    console.log(`${String(seed).padStart(3)}  ${f(h, ok[0])}  ${f(n, ok[1])}  ${f(q, ok[2])}  ${f(shift, ok[3])}${seed <= 5 ? "   (tested)" : ""}`);
  }
  console.log(`passes of 20: height ${pass[0]}, metamers ${pass[1]}, qBase ${pass[2]}, shift ${pass[3]}`);
}
