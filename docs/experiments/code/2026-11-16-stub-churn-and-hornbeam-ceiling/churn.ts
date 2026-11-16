/**
 * Trace B of docs/experiments/2026-11-16-stub-churn-and-hornbeam-ceiling.md: one garden run under
 * an arm of cli/seedling-stubs-probe.ts (default s3d), in WASM, season by season. Every new tree
 * is followed until it leaves the stand or reaches the display threshold; one standing on a
 * cell's centre exactly is a promoted stub (a seed lands there with probability ~0), any other a
 * seed that became a tree at once (its ground lit to stubLight at y 0.5). At its recruiting
 * season the script samples that season's light field (the one promotion read) at the cell's
 * centre at y 0.5 (promotion's measure) and higher; each later season it reads the tree's age,
 * height, Q_top/C (demotion's measure) and the cell's y 0.5 light again. A tree that leaves the
 * stand while below 1.3 m, at age ≥ 1, with Q_top/C < stubDemote is counted demoted (O4's deaths
 * run first, so a few of these are suppression deaths; bank trees die at ≤ 0.2 a season).
 * EXPLORATORY: one run, a trace, not a claim.
 *
 *   node docs/experiments/code/2026-11-16-stub-churn-and-hornbeam-ceiling/churn.ts [--arm s3d] [--width 160] [--seed 1] [--seasons 150] [--patch '{}'] [--out runs/137-churn/x.json]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { arg, type Patch, patched } from "../../../../cli/shared.ts";
import { DISPLAY_THRESHOLD, forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const { ARMS_FOR_TRACE } = await import("./arms.ts");
const armName = arg("--arm", "s3d");
const width = Number(arg("--width", "160"));
const seed = Number(arg("--seed", "1"));
const seasons = Number(arg("--seasons", "150"));
const extra = JSON.parse(arg("--patch", "{}")) as Patch["params"];
const out = arg("--out", `runs/137-churn/${armName}-w${width}-s${seed}.json`);
const arm = ARMS_FOR_TRACE[armName] as Patch;
const params = patched(patched(forestParams(width, seed), arm), { params: extra });
const world = RustWorld.create(params);
const C = world.params.c2.C;
const demoteAt = (world.params.o4 as { stubDemote?: number }).stubDemote ?? 0;
const YS = [0.5, 1.5, 2.5, 4.5];

type Track = {
  id: number;
  /** "promoted": a stub promoted at a cell's centre; "seed": a seed that became a tree at once. */
  kind: "promoted" | "seed";
  species: string;
  cell: [number, number]; // the root (x, z): the cell's centre for a promoted stub
  promoted: number; // the season whose O4 phase recruited it
  ground: number[]; // Q/C at the root at YS, the recruiting season's field
  seasons: { s: number; age: number; h: number; qTop: number; ground05: number }[];
  end?: { s: number; how: "demoted" | "died" | "drawn" | "alive" };
};
const tracks = new Map<number, Track>();
const live = new Set<number>();
let seen = 0;
let direct = 0;
const t0 = performance.now();
for (let s = 1; s <= seasons; s++) {
  world.run(1);
  const trees = world.trees;
  // Trees already followed: this season's reading, or their end.
  for (const id of [...live]) {
    const t = trees[id];
    const tr = tracks.get(id) as Track;
    if (!t) continue;
    const m = world.metricsOf(t);
    const q = t.qTop / C;
    const row = {
      s,
      age: t.age,
      h: m.height,
      qTop: q,
      ground05: world.sample(tr.cell[0], 0.5, tr.cell[1]).q / C,
    };
    tr.seasons.push(row);
    if (!t.alive) {
      const demoted = m.height < DISPLAY_THRESHOLD && t.age >= 1 && q < demoteAt;
      tr.end = { s, how: demoted ? "demoted" : "died" };
      live.delete(id);
    } else if (m.height >= DISPLAY_THRESHOLD) {
      tr.end = { s, how: "drawn" };
      live.delete(id);
    }
  }
  // New trees: promoted stubs stand on a cell's centre.
  for (let i = seen; i < trees.length; i++) {
    const t = trees[i];
    if (!t) continue;
    const x = t.rootX;
    const z = t.rootZ;
    const promoted = x - Math.floor(x) === 0.5 && z - Math.floor(z) === 0.5;
    if (!promoted) direct++;
    tracks.set(t.id, {
      id: t.id,
      kind: promoted ? "promoted" : "seed",
      species: t.species,
      cell: [x, z],
      promoted: s,
      ground: YS.map((y) => world.sample(x, y, z).q / C),
      seasons: [],
    });
    live.add(t.id);
  }
  seen = trees.length;
}
for (const id of live) (tracks.get(id) as Track).end = { s: seasons, how: "alive" };
const wall = (performance.now() - t0) / 1000;
world.dispose();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify({ arm: armName, width, seed, seasons, C, demoteAt, YS, direct, wall, tracks: [...tracks.values()] }),
);
console.log(
  `${out}: ${tracks.size - direct} promoted, ${direct} seeds as trees, ${wall.toFixed(0)} s`,
);
