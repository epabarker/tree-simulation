// Track C (foliage), the contact sheets' links: each species' lone tree at 60 (cli/trials.ts
// loneParams, seed 1) and its closed stand at 100 (standParams, seed 1), as lab links that play to
// that season and hold the plate (`&bench&seasons=N`), with the species' own patch (FITTED_FLORA,
// as the lab and garden draw it). Writes <out>/links.json.
//   node docs/experiments/code/2026-11-01-foliage/links.ts http://localhost:5173/ runs/foliage [species,…]
import { mkdirSync, writeFileSync } from "node:fs";
import { loneParams, standParams } from "../../../../cli/trials.ts";
import type { Params } from "../../../../src/core/params.ts";
import { encodePatch } from "../../../../src/web/ui/share.ts";

const [origin = "http://localhost:5173/", out = "runs/foliage"] = process.argv.slice(2);
const ALL = ["birch", "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple", "pine", "fir"];
const species = process.argv[4]?.split(",") ?? ALL;

function link(p: Params, seasons: number): string {
  const enc = encodePatch({ world: p.world, trees: p.trees } as never);
  return `${origin}?preset=oakOpen&seed=1&p=${enc}&bench&seasons=${seasons}`;
}

const links: Record<string, Record<string, string>> = {};
for (const sp of species) {
  links[sp] = { lone60: link(loneParams(sp, 1), 60), stand100: link(standParams(sp, 1), 100) };
}
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/links.json`, `${JSON.stringify(links, null, 1)}\n`);
console.log(`wrote ${out}/links.json`);
