/**
 * Crown base and bole (2026-11-05, docs/experiments/2026-11-05-crown-base-and-bole.md): gate_c_sim.ts's `dump`, line
 * for line in what it writes (analysis/treesim/simtree.py reads both alike), with a world patch beside the species
 * assign (O2's switch and C4's direction fields are world-level, as in crown_dump.ts). gate_c_sim.ts stays as it is:
 * its dump reproduces cli/dump-trees.ts byte for byte, and this one does not need to.
 *
 *   node analysis/experiments/crownbase_dump.ts JOB.json OUT.json
 *
 * JOB: {species, seed, assign?, patch?: {group: {...}}, stand: [seasons], lone: [seasons]}
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RustWorld, TreeView } from "../../src/wasm/world.ts";
import type { Params } from "../../src/core/params.ts";
import {
  loneParams,
  newWorld,
  STAND_MEASURED,
  standParams,
  withAssign,
} from "../../cli/trials.ts";

const METAMER = [
  "parent",
  "slot",
  "order",
  "axis",
  "baseX",
  "baseY",
  "baseZ",
  "hx",
  "hy",
  "hz",
  "length",
  "radius",
  "stressWood",
] as const;
const BUD = ["metamer", "state"] as const;
const STAND_SEASONS = Array.from({ length: 26 }, (_, k) => 50 + 10 * k);
const LONE_SEASONS = [50, 60, 70, 80, 90, 100];

const plain = (xs: ArrayLike<number>): (number | null)[] =>
  Array.from(xs, (x) => (Number.isFinite(x) ? x : null));

// cli/dump-trees.ts's dump, unchanged.
function dump(world: RustWorld, tree: TreeView, trial: string, seed: number, season: number) {
  const m = tree.m.cols;
  const b = tree.b.cols;
  const p = world.paramsOf(tree);
  const { profile, ...values } = world.formOf(tree);
  return {
    species: tree.species,
    seed,
    trial,
    season,
    index: tree.index,
    alive: tree.alive,
    r6: { enabled: p.r6.enabled, leafArea: p.r6.leafArea },
    m: Object.fromEntries(METAMER.map((k) => [k, plain(m[k])])),
    b: Object.fromEntries(BUD.map((k) => [k, plain(b[k])])),
    form: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, plain([v])[0]])),
    profile: plain(profile),
  };
}

interface Job {
  species: string;
  seed: number;
  assign?: Record<string, unknown>;
  patch?: Record<string, Record<string, unknown>>;
  stand: number[];
  lone: number[];
}

const job = JSON.parse(readFileSync(process.argv[2] as string, "utf8")) as Job;
const out = process.argv[3] as string;
const seed = job.seed;
function patched(p: Params): Params {
  let q = p;
  for (const [group, values] of Object.entries(job.patch ?? {})) {
    const r = q as unknown as Record<string, Record<string, unknown>>;
    q = { ...q, [group]: { ...r[group], ...values } } as Params;
  }
  return q;
}
const stand = patched(withAssign(standParams(job.species, seed), job.species, job.assign ?? {}));
const lone = patched(withAssign(loneParams(job.species, seed), job.species, job.assign ?? {}));

function advance(world: RustWorld, from: number, to: number): void {
  if (to > from) world.run(to - from);
}

const trees = [];
let world = newWorld(stand);
let at = 0;
for (const season of job.stand) {
  advance(world, at, season);
  at = season;
  for (const k of STAND_MEASURED) trees.push(dump(world, world.trees[k] as TreeView, "stand", seed, season));
}
world.dispose();
world = newWorld(lone);
at = 0;
for (const season of job.lone) {
  advance(world, at, season);
  at = season;
  trees.push(dump(world, world.trees[0] as TreeView, "lone", seed, season));
}
world.dispose();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ trees, effective: { o2: stand.o2, c4: stand.c4, r5: stand.r5 } }));
