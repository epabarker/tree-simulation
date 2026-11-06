// Species round 4, step B.4: why round 3's fitted birch dies at season 4 under every roof up to
// 15.8% (the hand-off's finding 5). Its seedling under one roof, per season: the light, R1's
// production, maintenance and reserve, and the starved count; then the seasons it lives under each
// of ROOFS, seeds 1001–1006 (the verification's).
//   node docs/experiments/code/2026-10-31-species-round4/birch-starve.ts [roof]
import { readFileSync } from "node:fs";
import { newWorld, ROOFS, runShade, shadeParams, withAssign } from "../../../../cli/trials.ts";

const fit = JSON.parse(readFileSync("docs/experiments/fits/round3/birch.json", "utf8"));
const assign = fit.fit.assign as Record<string, unknown>;
const roof = Number(process.argv[2] ?? 2);
const w = newWorld(withAssign(shadeParams("birch", 1001, roof), "birch", assign));
console.log("season\tlight\tproduction\tmaintenance\treserve\tstarved\tmetamers\talive");
for (let s = 1; s <= 8; s++) {
  w.step();
  const t = w.trees[0];
  if (!t) break;
  const m = w.metricsOf(t);
  const f = (x: number) => x.toFixed(4);
  console.log(
    [s, f(w.groundLight(0, 6)), f(m.production), f(m.maintenance), f(m.reserve), m.starved, m.metamers, t.alive].join("\t"),
  );
  if (!t.alive) break;
}
w.dispose();
console.log("\nroof\tlight\tseasons lived, seeds 1001–1006");
for (const r of ROOFS) {
  const runs = [1001, 1002, 1003, 1004, 1005, 1006].map((s) => runShade("birch", s, r, assign));
  console.log(`${r}\t${(100 * (runs[0]?.light ?? 0)).toFixed(1)}%\t${runs.map((x) => x.seasons).join(" ")}`);
}
