// Species step 3: lab links to the mixed wood (`mixedWood`, 300 trees on a 210-cell ring, the woods'
// top) with every fitted patch of round 3 at once, at faces τ 0.2 (the preset's) and τ 0.1.
//   node docs/experiments/code/2026-10-30-species-3d/mixed-links.ts http://192.168.178.130:5174/
import { existsSync, readFileSync } from "node:fs";
import { encodePatch } from "../../../../src/web/ui/share.ts";

const origin = process.argv[2] ?? "http://localhost:5173/";
const GARDEN = ["birch", "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple"];
const species = Object.fromEntries(
  GARDEN.filter((sp) => existsSync(`docs/experiments/fits/round3/${sp}.json`)).map((sp) => [
    sp,
    JSON.parse(readFileSync(`docs/experiments/fits/round3/${sp}.json`, "utf8")).fit.patch,
  ]),
);
for (const tau of [0.2, 0.1]) {
  const p = encodePatch({ world: { faces: [tau, tau] }, species } as never);
  console.log(`τ ${tau} (${Object.keys(species).join(", ")}):\n${origin}?preset=mixedWood&seed=1&p=${p}\n`);
}
