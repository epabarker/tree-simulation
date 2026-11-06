// Species round 4: s0, the seasons a seedling lives in the dark (fit.py's STARVE_SEASONS). One
// seedling under an opaque roof (shade 1000: no light reaches the ground) per species, with the
// species' patch as adopted (round 2) and round 3's fit, seeds 1–3: it bears no leaf, burns its
// reserve and starves (R1's kStarve). The survival light credits only the seasons past s0.
//   node docs/experiments/code/2026-10-31-species-round4/starve-s0.ts
import { readFileSync } from "node:fs";
import { runShade } from "../../../../cli/trials.ts";

const SPECIES = ["birch", "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple", "fir", "pine"];
console.log("species\tpatch\tlight\tseasons lived (seeds 1–3)");
for (const sp of SPECIES) {
  let fit: Record<string, unknown> | undefined;
  try {
    fit = JSON.parse(readFileSync(`docs/experiments/fits/round3/${sp}.json`, "utf8")).fit.assign;
  } catch {}
  for (const [name, assign] of [["round 2", {}], ["round 3", fit]] as const) {
    if (!assign) continue;
    const runs = [1, 2, 3].map((s) => runShade(sp, s, 1000, assign));
    console.log(`${sp}\t${name}\t${runs[0]?.light.toExponential(1)}\t${runs.map((r) => r.seasons).join(" ")}`);
  }
}
