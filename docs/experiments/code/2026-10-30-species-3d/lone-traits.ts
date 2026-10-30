// Species step 1b: the lone beech of the lab links (oakOpen, one beech at x 80, seed 1), round 2's
// patch against round 3's, at seasons 60 and 100: height, H/D, spread (the fit's: the larger of
// crown width and depth over height), fork height and leaf crown ratio. Prints JSON.
//   node docs/experiments/code/2026-10-30-species-3d/lone-traits.ts
import { readFileSync } from "node:fs";
import { newWorld } from "../../../../cli/trials.ts";
import { mergeParams } from "../../../../src/core/params.ts";
import { FITTED_FLORA } from "../../../../src/core/flora-fitted.ts";
import { presetParams } from "../../../../src/core/presets.ts";

const round3 = JSON.parse(readFileSync("docs/experiments/fits/round3/beech.json", "utf8")).fit.patch;
const out: Record<string, Record<number, Record<string, number>>> = {};
for (const [name, patch] of [["round 2", FITTED_FLORA.beech], ["round 3", round3]] as const) {
  const w = newWorld(
    mergeParams(presetParams("oakOpen", 1), {
      trees: [{ x: 80, species: "beech" }],
      species: { beech: patch },
    } as never),
  );
  out[name] = {};
  for (const season of [60, 100]) {
    w.run(season - (season === 60 ? 0 : 60));
    const t = w.trees[0];
    const m = w.metricsOf(t);
    const f = w.formOf(t);
    out[name][season] = {
      height: m.height,
      hd: m.slenderness,
      spread: Math.max(m.crownWidth, m.crownDepth) / m.height,
      fork: f.forkHeight,
      leafCrownRatio: m.leafCrownRatio,
    };
  }
  w.dispose();
}
console.log(JSON.stringify(out));
