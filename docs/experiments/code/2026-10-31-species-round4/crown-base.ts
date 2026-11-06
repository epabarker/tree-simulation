// Species round 4, step B.2: the stand's three crown-base measures side by side, at a round's fits
// (the closed stand at 60, seeds 1001–1003): the limb measure the targets now read, the leaf
// measure round 3 read, and the branch measure (one twig sets it).
//   node docs/experiments/code/2026-10-31-species-round4/crown-base.ts round3 beech,hornbeam
import { readFileSync } from "node:fs";
import { runStand } from "../../../../cli/trials.ts";

const [round = "round3", list = "beech,hornbeam,maple,oak,birch,willow,rowan,holly"] = process.argv.slice(2);
console.log("species\tseed\tlimb\tleaf\tbranch\tlai\tfloor");
for (const sp of list.split(",")) {
  const assign = JSON.parse(readFileSync(`docs/experiments/fits/${round}/${sp}.json`, "utf8")).fit.assign;
  for (const seed of [1001, 1002, 1003]) {
    const t = runStand(sp, seed, assign);
    const f = (x: number) => x.toFixed(3);
    console.log([sp, seed, f(t.crownRatio), f(t.leafCrownRatio), f(t.boleCrownRatio), t.lai.toFixed(2), f(t.floor)].join("\t"));
  }
}
