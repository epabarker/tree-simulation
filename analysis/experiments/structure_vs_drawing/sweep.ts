import { patchSpecies } from "../../../src/core/params.ts";
import { presetParams } from "../../../src/core/presets.ts";
import { World } from "../../../src/core/world.ts";
const DEG = 180 / Math.PI;
function stats(w: World) {
  const t = w.trees[0]!; const c = t.m.cols; const n = t.m.length;
  const kids: number[][] = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) kids[c.parent[i]]!.push(i);
  let big = 0, steps = 0, tips = 0, down = 0;
  for (let i = 0; i < n; i++) {
    const k = kids[i]!;
    if (!k.length) { if (c.order[i] >= 1) { tips++; if (Math.sin(c.angle[i]) < -0.3) down++; } continue; }
    const j = k.reduce((a, b) => (c.radius[b] > c.radius[a] ? b : a));
    if (c.radius[j] < 0.2) continue;
    let d = c.angle[j] - c.angle[i]; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * DEG;
    steps++; if (d > 20) big++;
  }
  let x0 = 1e9, x1 = -1e9, h = 0; for (let i = 0; i < n; i++) { h = Math.max(h, t.tipY(i)); x0 = Math.min(x0, t.tipX(i)); x1 = Math.max(x1, t.tipX(i)); }
  return `kinks>20° ${String(big).padStart(3)}/${steps}  tips down ${(down / tips).toFixed(2)}  H ${(h * .25).toFixed(1)} W ${((x1 - x0) * .25).toFixed(1)} metamers ${n}`;
}
const g = [0.2, 0.5, 1], cs = [0.1866, 0.5];
for (const seed of [3, 4]) for (const gamma of g) for (const cc of cs) {
  const p = patchSpecies(presetParams("oakOpen", seed), "oak", { r3: { proprioception: "dominant", gamma, c: cc } });
  const w = new World(p); w.run(150);
  console.log(`seed ${seed} dominant γ ${gamma} c ${cc}  `, stats(w));
}
for (const seed of [3, 4]) { const w = new World(presetParams("oakOpen", seed)); w.run(150); console.log(`seed ${seed} default              `, stats(w)); }
