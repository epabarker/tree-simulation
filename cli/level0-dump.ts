/**
 * Level 0's parity trees (reference-fidelity phase 2): oak, beech and birch, seeds 1 and 2, the closed stand's measured
 * trees at 60, 100 and 150, with their columns (the keys cli/dump-trees.ts writes, which analysis/treesim/simtree.py
 * reads) and cli/allometry.ts's measurements beside them. analysis/tests/test_level0_parity.py checks the port
 * against analysis/treesim/cylinders.py on them. Out of any build, as dump-trees.ts is.
 *
 *   node cli/level0-dump.ts [out]          # default runs/level0-parity/trees.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TreeView } from "../src/wasm/world.ts";
import { allometry } from "./allometry.ts";
import { newWorld, STAND_MEASURED, standParams } from "./trials.ts";

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

const plain = (xs: ArrayLike<number>): (number | null)[] =>
  Array.from(xs, (x) => (Number.isFinite(x) ? x : null));

const out = process.argv[2] ?? "runs/level0-parity/trees.json";
const trees: unknown[] = [];
for (const species of SPECIES) {
  for (const seed of SEEDS) {
    const world = newWorld(standParams(species, seed));
    for (const [season, steps] of [
      [60, 60],
      [100, 40],
      [150, 50],
    ] as const) {
      world.run(steps);
      for (const k of STAND_MEASURED) {
        const t = world.trees[k] as TreeView;
        if (!t.alive) continue;
        const p = world.paramsOf(t);
        trees.push({
          species,
          seed,
          trial: "stand",
          season,
          index: k,
          alive: t.alive,
          r6: { enabled: p.r6.enabled, leafArea: p.r6.leafArea },
          m: Object.fromEntries(METAMER.map((c) => [c, plain(t.m.cols[c])])),
          b: { metamer: plain(t.b.cols.metamer), state: plain(t.b.cols.state) },
          form: {},
          profile: [],
          allometry: allometry(t.m.cols, t.b.cols),
        });
      }
    }
    world.dispose();
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ trees }));
console.log(`${trees.length} trees → ${out}`);
