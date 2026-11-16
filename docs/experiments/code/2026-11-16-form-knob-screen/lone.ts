/**
 * #134's form-knob screen (docs/experiments/2026-11-16-form-knob-screen.md): one lone tree
 * (cli/trials.ts' lone stage, `withAssign` per species) to season 100, read at 25, 60 and 100.
 * Prints one JSON line. EXPLORATORY: seeds 1–5, never an adoption claim.
 *
 *   node docs/experiments/code/2026-11-16-form-knob-screen/lone.ts <species> <arm> <seed> '<assign JSON>'
 */
import { CELL, pooledDbh } from "../../../../cli/allometry.ts";
import { loneParams, newWorld, withAssign } from "../../../../cli/trials.ts";
import type { TreeView as Tree } from "../../../../src/wasm/world.ts";

const [species, arm, seedS, assignS] = process.argv.slice(2) as [string, string, string, string];
const seed = Number(seedS);
const assign = JSON.parse(assignS ?? "{}") as Record<string, unknown>;
const world = newWorld(withAssign(loneParams(species, seed), species, assign));
const out: Record<string, unknown> = { species, arm, seed };
let done = 0;
for (const s of [25, 60, 100]) {
  world.run(s - done);
  done = s;
  const t = world.trees[0] as Tree;
  const m = world.metricsOf(t);
  const d = pooledDbh(t.m.cols).dbh; // cells
  const w = Math.max(m.crownWidth, m.crownDepth);
  out[`alive${s}`] = t.alive;
  out[`H${s}`] = m.height * CELL; // m
  out[`W${s}`] = w * CELL; // m
  out[`WH${s}`] = m.height > 0 ? w / m.height : 0;
  out[`D${s}`] = d * CELL * 100; // cm at 1.3 m, forks pooled
  out[`HD${s}`] = d > 0 ? m.height / d : 0;
  out[`n${s}`] = t.m.cols.length.length;
}
world.dispose();
console.log(JSON.stringify(out));
