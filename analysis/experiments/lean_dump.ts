/**
 * The lean audit (2026-11-05, docs/experiments/2026-11-05-lean-audit.md): crownbase_dump.ts's dump of one trial (the
 * closed stand or the lone tree) with params-only controls beside the species assign, no core change:
 *   - `lean`: each planted tree's lean (params.trees[i].lean, degrees in the x–y plane; c1.rs plant_seedling). ±1e-6°
 *     tilts the seedling by 1.7e-8 rad and flips the sign of the flat part `horizontal_heading` (c4.rs:13–19) reads
 *     for a vertical leader: L = +x at lean 0 or +ε, −x at −ε. Sky, slab and planting are untouched.
 *   - `plantSeason`: plant every tree at season k (params.trees[i].plantSeason), which shifts the sky's per-season
 *     rotation phase against the tree's age while L stays +x.
 *   - `mirror`: plant at x → W − x (the stand's stagger mirrored; the sky's handedness is not).
 *   - `world`: a world patch (faces).
 * Ages in `seasons` count from planting. Each tree also carries paramsOf(tree).r2.levels[0] (the trunk's level as the
 * core sees it after the assign).
 *
 *   node analysis/experiments/lean_dump.ts JOB.json OUT.json
 *
 * JOB: {species, seed, trial: "stand"|"lone", assign?, world?, lean?: number | number[], plantSeason?, mirror?,
 *       seasons: number[], all?: boolean (every stand tree; default the measured four)}
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RustWorld, TreeView } from "../../src/wasm/world.ts";
import type { Params } from "../../src/core/params.ts";
import { loneParams, newWorld, STAND_MEASURED, standParams, withAssign } from "../../cli/trials.ts";

const METAMER = ["parent", "slot", "order", "axis", "baseX", "baseY", "baseZ", "hx", "hy", "hz", "length", "radius",
  "stressWood"] as const;
const BUD = ["metamer", "state"] as const;
const plain = (xs: ArrayLike<number>): (number | null)[] => Array.from(xs, (x) => (Number.isFinite(x) ? x : null));

interface Job {
  species: string;
  seed: number;
  trial: "stand" | "lone";
  assign?: Record<string, unknown>;
  world?: Record<string, unknown>;
  lean?: number | number[];
  plantSeason?: number;
  mirror?: boolean;
  seasons: number[];
  all?: boolean;
}

function dump(world: RustWorld, tree: TreeView, job: Job, age: number, lean: number) {
  const m = tree.m.cols;
  const b = tree.b.cols;
  const p = world.paramsOf(tree);
  const { profile, ...values } = world.formOf(tree);
  return {
    species: tree.species, seed: job.seed, trial: job.trial, season: age, index: tree.index, alive: tree.alive, lean,
    root: [tree.rootX ?? null, tree.rootZ ?? null],
    level0: p.r2.levels[0] ?? null,
    r6: { enabled: p.r6.enabled, leafArea: p.r6.leafArea },
    m: Object.fromEntries(METAMER.map((k) => [k, plain(m[k])])),
    b: Object.fromEntries(BUD.map((k) => [k, plain(b[k])])),
    form: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, plain([v])[0]])),
    profile: plain(profile),
  };
}

const job = JSON.parse(readFileSync(process.argv[2] as string, "utf8")) as Job;
const out = process.argv[3] as string;
const make = job.trial === "stand" ? standParams : loneParams;
const base = withAssign(make(job.species, job.seed), job.species, job.assign ?? {});
const width = base.world.width;
const leanOf = (i: number) => (Array.isArray(job.lean) ? (job.lean[i] ?? 0) : (job.lean ?? 0));
const params: Params = {
  ...base,
  world: { ...base.world, ...(job.world ?? {}) },
  trees: base.trees.map((t, i) => ({
    ...t,
    x: job.mirror ? width - t.x : t.x,
    lean: leanOf(i),
    plantSeason: job.plantSeason ?? t.plantSeason,
  })),
};
const offset = job.plantSeason ?? 0;
const which = job.trial === "lone" ? [0] : job.all ? params.trees.map((_, i) => i) : STAND_MEASURED;
const world = newWorld(params);
const trees = [];
let at = 0;
for (const age of job.seasons) {
  const season = age + offset;
  if (season > at) world.run(season - at);
  at = season;
  for (const k of which) trees.push(dump(world, world.trees[k] as TreeView, job, age, leanOf(k)));
}
world.dispose();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ trees, plant: params.trees, world: params.world, sky: params.c2 }));
