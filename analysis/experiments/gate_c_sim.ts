/**
 * Gate c v3.1's simulator side (reference-fidelity plan, session 1d-ii). cli/dump-trees.ts is hashed and fixed at
 * season 150 (stand) and 100 (lone); the registered rules read each species at its size-matched season
 * (phase1-tolerances.json `rules.size_match`), so this dumper takes the seasons. Its `dump` is dump-trees.ts's, line
 * for line, so analysis/treesim/simtree.py reads both alike (analysis/experiments/phase1_degradation.py checks that
 * `dump` at 150/100 reproduces dump-trees.ts --gate-c byte for byte). Out of any build.
 *
 *   node analysis/experiments/gate_c_sim.ts sizematch species seed out [assign.json]
 *       the stand's measured trees at seasons 50..300 by 10, the lone tree's at 50..100: cli/allometry.ts's dbh and
 *       height (parity with analysis/treesim/cylinders.py to 1e-9: test_level0_parity.py), to find the season
 *   node analysis/experiments/gate_c_sim.ts dump species seed out standSeason loneSeason [assign.json]
 *       the trees' columns at those seasons (a comma list each), for describe()
 *
 * assign.json: dotted-path assignments to the species' patch (a Level 0 fit's `fit.assign`); none: the shipped params.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RustWorld, TreeView } from "../../src/wasm/world.ts";
import { allometry } from "../../cli/allometry.ts";
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

const [, , mode, species, seedArg, out, ...rest] = process.argv;
const seed = Number(seedArg);
const assignFile = mode === "sizematch" ? rest[0] : rest[2];
const assign = assignFile ? JSON.parse(readFileSync(assignFile, "utf8")) : {};
const stand = withAssign(standParams(species as string, seed), species as string, assign);
const lone = withAssign(loneParams(species as string, seed), species as string, assign);

function advance(world: RustWorld, from: number, to: number): void {
  if (to > from) world.run(to - from);
}

if (mode === "sizematch") {
  const result: { species: string; seed: number; stand: unknown[]; lone: unknown[] } = {
    species: species as string,
    seed,
    stand: [],
    lone: [],
  };
  let world = newWorld(stand);
  let at = 0;
  for (const season of STAND_SEASONS) {
    advance(world, at, season);
    at = season;
    result.stand.push({
      season,
      trees: STAND_MEASURED.map((k) => {
        const t = world.trees[k] as TreeView;
        return { tree: k, alive: t.alive, ...(t.alive ? allometry(t.m.cols, t.b.cols) : {}) };
      }),
    });
  }
  world.dispose();
  world = newWorld(lone);
  at = 0;
  for (const season of LONE_SEASONS) {
    advance(world, at, season);
    at = season;
    const t = world.trees[0] as TreeView;
    result.lone.push({ season, alive: t.alive, ...(t.alive ? allometry(t.m.cols, t.b.cols) : {}) });
  }
  world.dispose();
  mkdirSync(dirname(out as string), { recursive: true });
  writeFileSync(out as string, JSON.stringify(result));
} else if (mode === "dump") {
  const seasons = (s: string): number[] => (s ? s.split(",").map(Number) : []);
  const trees = [];
  let world = newWorld(stand);
  let at = 0;
  for (const season of seasons(rest[0] as string)) {
    advance(world, at, season);
    at = season;
    for (const k of STAND_MEASURED)
      trees.push(dump(world, world.trees[k] as TreeView, "stand", seed, season));
  }
  world.dispose();
  world = newWorld(lone);
  at = 0;
  for (const season of seasons(rest[1] as string)) {
    advance(world, at, season);
    at = season;
    trees.push(dump(world, world.trees[0] as TreeView, "lone", seed, season));
  }
  world.dispose();
  mkdirSync(dirname(out as string), { recursive: true });
  writeFileSync(out as string, JSON.stringify({ trees }));
} else {
  throw new Error("usage: gate_c_sim.ts sizematch|dump species seed out ...");
}
