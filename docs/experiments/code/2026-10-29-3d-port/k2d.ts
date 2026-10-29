import { readFileSync } from "node:fs";
import { SkySweep } from "../../../../src/core/light/sky-sweep.ts";
import { mergeParams } from "../../../../src/core/params.ts";
import { presetParams } from "../../../../src/core/presets.ts";
const SP = process.env.SLAB_DIR ?? "runs/slab";
for (const c of ["forest", "wideForest"]) for (const K of [7, 16, 32]) {
  const p = presetParams("forest");
  const W = c === "wideForest" ? 420 : 210;
  const buf = readFileSync(`${SP}/dep-${c}.bin`);
  const dep = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
  const s = new SkySweep(W, p.world.height, mergeParams(p, { c2: { K } }).c2, true);
  let top = 0;
  for (let i = 0; i < dep.length / 4; i++) { s.deposit(dep[4 * i], dep[4 * i + 1], dep[4 * i + 3]); top = Math.max(top, Math.floor(dep[4 * i + 1]) + 1); }
  const t: number[] = [];
  for (let r = 0; r < 40; r++) { const t0 = performance.now(); s.compute(0); if (r >= 10) t.push(performance.now() - t0); }
  t.sort((a, b) => a - b);
  const ms = t[Math.floor(t.length / 2)] as number;
  console.log(`${c} 2D K=${K}: top ${top}, ${(K * W * top / 1e3).toFixed(0)}k updates, ${ms.toFixed(2)} ms, ${(1e6 * ms / (K * W * top)).toFixed(1)} ns/update`);
}
