/**
 * #135's floored height rule (docs/experiments/2026-11-19-floored-height-rule.md): one lone tree
 * (cli/trials.ts' lone stage) to season 100, read every 10 seasons and at 25. Prints one JSON line.
 * The world patch (`params`, e.g. the rule's `c1`) is merged into the world's params; the species
 * assign (dotted paths, `withAssign`) goes on the species' own patch, as the form-knob screen's
 * lone.ts did. The reads are that script's (H, W = the larger core extent, the mean crown radius
 * `cr`, D at 1.3 m with forks pooled), plus the root metamer's diameter for bar 4's taper window.
 *
 *   node docs/experiments/code/2026-11-19-floored-height/lone.ts <species> <arm> <seed> '<world JSON>' '<assign JSON>'
 */
import { CELL, pooledDbh } from "../../../../cli/allometry.ts";
import { loneParams, newWorld, withAssign } from "../../../../cli/trials.ts";
import type { Params } from "../../../../src/core/params.ts";
import type { TreeView as Tree } from "../../../../src/wasm/world.ts";

const [species, arm, seedS, worldS, assignS] = process.argv.slice(2) as [
  string,
  string,
  string,
  string,
  string,
];
const seed = Number(seedS);
const patch = JSON.parse(worldS || "{}") as Record<string, Record<string, unknown>>;
const assign = JSON.parse(assignS || "{}") as Record<string, unknown>;
const base = loneParams(species, seed) as unknown as Record<string, unknown>;
// One level deep: a section of the patch (`c1`) amends the world's section, key by key.
for (const [k, v] of Object.entries(patch)) {
  base[k] = { ...(base[k] as Record<string, unknown>), ...v };
}
const world = newWorld(withAssign(base as unknown as Params, species, assign));
const out: Record<string, unknown> = { species, arm, seed };
const reads = [10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];
let done = 0;
for (const s of reads) {
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
  out[`cr${s}`] = ((m.crownWidth + m.crownDepth) / 4) * CELL; // m, dbh.py's cr_m
  out[`D${s}`] = d * CELL * 100; // cm at 1.3 m, forks pooled
  out[`D0${s}`] = 2 * (t.m.cols.radius[0] ?? 0) * CELL * 100; // cm, the root metamer's
  out[`HD${s}`] = d > 0 ? m.height / d : 0;
  out[`n${s}`] = t.m.cols.length.length;
}
world.dispose();
console.log(JSON.stringify(out));
