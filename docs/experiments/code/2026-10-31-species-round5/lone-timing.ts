// The lone trial to 60 and to 100, wall-clock per species at seed 1 (the round-5 plan, §3.1).
// node docs/experiments/code/2026-10-31-species-round5/lone-timing.ts > …/lone-timing.txt
import { runLone } from "../../../../cli/trials.ts";

const species = ["beech", "birch", "oak", "hornbeam", "willow", "rowan", "holly", "maple"];
console.log("species  to60_s  to100_s  ratio  elev60  elev100  spread60  spread100");
for (const sp of species) {
  let t = performance.now();
  const a = runLone(sp, 1);
  const s60 = (performance.now() - t) / 1000;
  t = performance.now();
  const b = runLone(sp, 1, {}, 100);
  const s100 = (performance.now() - t) / 1000;
  const f = (x: number | undefined, d = 1) => (x === undefined ? "–" : x.toFixed(d));
  console.log(
    [sp.padEnd(8), f(s60).padStart(6), f(s100).padStart(8), f(s100 / s60, 2).padStart(6),
      f(a.limbElevation).padStart(7), f(b.limbElevation100).padStart(8),
      f(a.spread, 2).padStart(9), f(b.spread100, 2).padStart(10)].join(" "),
  );
}
