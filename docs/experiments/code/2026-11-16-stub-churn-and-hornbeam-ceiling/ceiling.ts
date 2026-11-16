/**
 * Trace A of docs/experiments/2026-11-16-stub-churn-and-hornbeam-ceiling.md: the lone hornbeam
 * (cli/trials.ts' lone stage, as #134's form-knob screen) season by season, with the share of the
 * surplus R1 sends to seed. Reproduction is cumulative on the tree, so a season's is the
 * difference. Prints one JSON line per season. EXPLORATORY (seeds 1–3): a trace, not a claim.
 *
 *   node docs/experiments/code/2026-11-16-stub-churn-and-hornbeam-ceiling/ceiling.ts <arm> <seed> <seasons> '<assign JSON>'
 */
import { CELL } from "../../../../cli/allometry.ts";
import { loneParams, newWorld, withAssign } from "../../../../cli/trials.ts";
import type { TreeView as Tree } from "../../../../src/wasm/world.ts";

const [arm, seedS, seasonsS, assignS] = process.argv.slice(2) as [string, string, string, string];
const species = "hornbeam";
const seed = Number(seedS);
const world = newWorld(withAssign(loneParams(species, seed), species, JSON.parse(assignS ?? "{}")));
const r1 = world.paramsOf({ species }).r1;
let rep = 0;
for (let s = 1; s <= Number(seasonsS); s++) {
  world.run(1);
  const t = world.trees[0] as Tree;
  const m = world.metricsOf(t);
  const toSeed = t.reproduction - rep;
  rep = t.reproduction;
  const net = t.production - t.maintenance;
  console.log(
    JSON.stringify({
      arm,
      seed,
      season: s,
      alive: t.alive,
      H: m.height * CELL,
      Hcells: m.height,
      mature: m.height >= r1.maturity,
      P: t.production,
      M: t.maintenance,
      net,
      toSeed,
      seedShare: net > 0 ? toSeed / net : 0,
      vBase: t.vBase,
      metamers: t.m.cols.length.length,
    }),
  );
}
world.dispose();
