/**
 * Gate b's trees (docs/plans/2026-11-03-reference-fidelity.md §j): the skeletons and the Rust core's
 * own form metrics (rust/core/src/form.rs) of oak, beech and birch, seeds 1 and 2, the lone tree at
 * season 60 and the closed stand's four measured trees at 100: 30 trees. analysis/treesim/form.py
 * ports form.rs and must reproduce every value from these columns alone. Gate b only: not part of
 * any build. Reads the existing WASM API; writes JSON (NaN as null).
 *
 * Gate c (phase 1c, the degradation test) reads the same columns of one species and seed: the
 * closed stand's measured trees at 150 and the lone tree at 100 (reported only), one file a run
 * (analysis/experiments/phase1_degradation.py runs them in parallel). Out of any build, as gate b.
 *
 *   node cli/dump-trees.ts [out]                          # gate b: runs/gate-b/trees.json
 *   node cli/dump-trees.ts --gate-c species seed out      # gate c: one species and seed
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RustWorld, TreeView } from "../src/wasm/world.ts";
import { loneParams, newWorld, STAND_MEASURED, standParams } from "./trials.ts";

const SPECIES = ["oak", "beech", "birch"];
const SEEDS = [1, 2];
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

const plain = (xs: ArrayLike<number>): (number | null)[] =>
  Array.from(xs, (x) => (Number.isFinite(x) ? x : null));

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

function gateC(species: string, seed: number, out: string) {
  const trees = [];
  const stand = newWorld(standParams(species, seed));
  stand.run(GATE_C_STAND);
  for (const k of STAND_MEASURED)
    trees.push(dump(stand, stand.trees[k] as TreeView, "stand", seed, GATE_C_STAND));
  stand.dispose();
  const lone = newWorld(loneParams(species, seed));
  lone.run(GATE_C_LONE);
  trees.push(dump(lone, lone.trees[0] as TreeView, "lone", seed, GATE_C_LONE));
  lone.dispose();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ trees }));
}

const GATE_C_STAND = 150;
const GATE_C_LONE = 100;
if (process.argv[2] === "--gate-c") {
  gateC(process.argv[3], Number(process.argv[4]), process.argv[5]);
  process.exit(0);
}

const out = process.argv[2] ?? "runs/gate-b/trees.json";
const trees = [];
for (const species of SPECIES) {
  for (const seed of SEEDS) {
    const lone = newWorld(loneParams(species, seed));
    lone.run(60);
    trees.push(dump(lone, lone.trees[0] as TreeView, "lone", seed, 60));
    lone.dispose();
    const stand = newWorld(standParams(species, seed));
    stand.run(100);
    for (const k of STAND_MEASURED)
      trees.push(dump(stand, stand.trees[k] as TreeView, "stand", seed, 100));
    stand.dispose();
    process.stderr.write(`${species} seed ${seed}\n`);
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ trees }));
process.stderr.write(`${trees.length} trees → ${out}\n`);
