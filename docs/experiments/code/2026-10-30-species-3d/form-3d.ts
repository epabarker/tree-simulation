// Species step 1b: what the form metrics read on a 3D lone beech at 60 (round 2's point, and the
// first pilot's fit): crown extent in x and z, and the trunk walk behind forkHeight.
//   node docs/experiments/code/2026-10-30-species-3d/form-3d.ts [seed] [fit]
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
const m = w.metricsOf(t);
const f = w.formOf(t);
console.log({
  height: m.height.toFixed(1),
  crownWidth: m.crownWidth.toFixed(1),
  crownDepth: m.crownDepth.toFixed(1),
  depth: w.paramsOf(t).world.depth,
  forkHeight: f.forkHeight.toFixed(3),
  widestAt: f.widestAt,
  crownFullness: f.crownFullness.toFixed(3),
  profile: f.profile.map((p) => p.toFixed(2)).join(" "),
});
// The trunk walk: each node of the main chain with its main child and its thickest lateral.
const c = t.m.cols;
const n = t.m.length;
const main = new Int32Array(n).fill(-1);
const lats: number[][] = Array.from({ length: n }, () => []);
const count = new Int32Array(n).fill(1);
for (let i = n - 1; i > 0; i--) count[c.parent[i]] += count[i];
for (let i = 1; i < n; i++) {
  if (c.slot[i] === 0) main[c.parent[i]] = i;
  else lats[c.parent[i]].push(i);
}
let i = 0;
let k = 0;
while (i >= 0 && k < 400) {
  const nx = main[i];
  const big = lats[i].filter((j) => count[j] >= 5).sort((a, b) => c.radius[b] - c.radius[a])[0];
  const why =
    nx < 0 ? "main slot empty" : c.order[nx] !== 0 ? `main child order ${c.order[nx]}` : "";
  if (why || (big !== undefined && c.radius[big] / c.radius[nx] >= 0.5)) {
    console.log(
      `node ${k} y ${c.baseY[i].toFixed(1)}: r ${c.radius[i].toFixed(4)}, next ${nx < 0 ? "-" : c.radius[nx].toFixed(4)}` +
        (big !== undefined
          ? `, thickest lateral r ${c.radius[big].toFixed(4)} (n ${count[big]}, ratio ${nx >= 0 ? (c.radius[big] / c.radius[nx]).toFixed(2) : "-"})`
          : "") +
        ` laterals ${lats[i].length} ${why}`,
    );
  }
  if (why) break;
  i = nx;
  k++;
}
console.log(`trunk nodes walked: ${k}; trunk metamers (order 0): ${Array.from(c.order).filter((o) => o === 0).length}`);
w.dispose();
