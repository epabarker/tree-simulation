// Species step 1b: forkHeight on a 3D lone beech at 60, by the radius rule alone (form.rs) and with
// co-dominance in height: the lateral's subtree climbs above the node at least 0.7 of what the
// continuing trunk's does. Also the band widths in x against z, to see the slab's depth in z.
//   node docs/experiments/code/2026-10-30-species-3d/fork-3d.ts [seed] [fit]
import { readFileSync } from "node:fs";
import { loneParams, newWorld, withAssign } from "../../../../cli/trials.ts";

const seed = Number(process.argv[2] ?? 1);
const assign =
  process.argv[3] === "fit"
    ? JSON.parse(readFileSync("docs/experiments/fits/round3-hedgerow/beech.json", "utf8")).fit.assign
    : {};
const w = newWorld(withAssign(loneParams("beech", seed), "beech", assign));
w.run(60);
const t = w.trees[0];
const c = t.m.cols;
const n = t.m.length;
const tipY = (i: number) => c.baseY[i] + c.length[i] * c.hy[i];
const tipX = (i: number) => c.baseX[i] + c.length[i] * c.hx[i];
const tipZ = (i: number) => c.baseZ[i] + c.length[i] * c.hz[i];
const top = Float64Array.from({ length: n }, (_, i) => tipY(i));
const count = new Int32Array(n).fill(1);
for (let i = n - 1; i > 0; i--) {
  count[c.parent[i]] += count[i];
  top[c.parent[i]] = Math.max(top[c.parent[i]], top[i]);
}
const main = new Int32Array(n).fill(-1);
const lats: number[][] = Array.from({ length: n }, () => []);
for (let i = 1; i < n; i++) (c.slot[i] === 0 ? (main[c.parent[i]] = i) : lats[c.parent[i]].push(i));
const height = Math.max(...Array.from({ length: n }, (_, i) => tipY(i)));
let radiusOnly = 1;
let codominant = 1;
for (let i = 0; i >= 0 && main[i] >= 0 && c.order[main[i]] === 0; i = main[i]) {
  const nx = main[i];
  const y = tipY(i);
  for (const j of lats[i]) {
    if (count[j] < 5 || c.radius[j] / c.radius[nx] < 0.7) continue;
    if (radiusOnly === 1) radiusOnly = y / height;
    const climb = (top[j] - y) / (top[nx] - y);
    if (codominant === 1 && climb >= 0.7) codominant = y / height;
    if (y / height < 0.3)
      console.log(`  y ${y.toFixed(1)}: lateral ratio ${(c.radius[j] / c.radius[nx]).toFixed(2)}, climbs ${climb.toFixed(2)} of the trunk's`);
  }
}
// Band extents in x and z over the crown (from the lowest first-order lateral).
const xs: number[][] = Array.from({ length: 10 }, () => []);
const zs: number[][] = Array.from({ length: 10 }, () => []);
let bole = height;
for (let i = 1; i < n; i++) if (c.order[i] === 1 && c.order[c.parent[i]] === 0) bole = Math.min(bole, c.baseY[i]);
for (let i = 0; i < n; i++) {
  const y = tipY(i);
  if (y < bole) continue;
  const k = Math.min(9, Math.floor(((y - bole) / (height - bole)) * 10));
  xs[k].push(tipX(i));
  zs[k].push(tipZ(i));
}
const ext = (v: number[]) => (v.length ? Math.max(...v) - Math.min(...v) : 0);
console.log(`height ${height.toFixed(1)}; forkHeight by radius ${radiusOnly.toFixed(3)}, with co-dominance ${codominant.toFixed(3)}`);
console.log(`band extents x: ${xs.map((v) => ext(v).toFixed(0)).join(" ")}`);
console.log(`band extents z: ${zs.map((v) => ext(v).toFixed(0)).join(" ")} (depth ${w.paramsOf(t).world.depth})`);
w.dispose();
