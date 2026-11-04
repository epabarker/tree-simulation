/**
 * Crown competition diagnosis (2026-11-04, docs/experiments/2026-11-04-crown-competition.md): the closed stand
 * (cli/trials.ts `standParams`) run with a species assign, dumping every tree's live-bud tips at the asked seasons,
 * so analysis/experiments/crown_overlap.py can measure how far crowns reach into their neighbours' ground.
 * Read-only on the core: it only imports cli/trials.ts and cli/allometry.ts.
 *
 *   node analysis/experiments/crown_dump.ts JOB.json OUT.json
 *
 * JOB: {species, seed, assign?, patch?, depth?, seasons?: [60, 100, 150], laiEvery?: 5, checkParams?}
 * - patch: {group: {...}} merged into each top-level group of params (world, o2, c2: the world-level settings a
 *   species assign cannot reach; O2's switch is world-level, season.rs:382);
 * - depth: the slab's depth, with the rows planted by `perArea`'s rule for that depth (perArea itself reads the
 *   default depth, presets.ts:115–127).
 */

import { readFileSync, writeFileSync } from "node:fs";
import type { Params } from "../../src/core/params.ts";
import type { TreeView } from "../../src/wasm/world.ts";
import { allometry } from "../../cli/allometry.ts";
import { newWorld, STAND_ROW, STAND_WIDTH, standParams, withAssign } from "../../cli/trials.ts";

interface Job {
  species: string;
  seed: number;
  assign?: Record<string, unknown>;
  patch?: Record<string, Record<string, unknown>>;
  depth?: number;
  seasons?: number[];
  laiEvery?: number;
  checkParams?: string[];
}

const SPACING = 21;
const job = JSON.parse(readFileSync(process.argv[2] as string, "utf8")) as Job;
const out = process.argv[3] as string;

let params: Params = withAssign(standParams(job.species, job.seed), job.species, job.assign ?? {});
for (const [group, values] of Object.entries(job.patch ?? {})) {
  const p = params as unknown as Record<string, Record<string, unknown>>;
  params = { ...params, [group]: { ...p[group], ...values } } as Params;
}
if (job.depth) {
  // perArea's rule (presets.ts:115–127) at this depth.
  const depth = job.depth;
  const rows = Math.max(1, Math.round(depth / SPACING));
  const trees = [];
  for (let r = 0; r < rows; r++) {
    for (const x of STAND_ROW) {
      trees.push({ species: job.species, x: (x + (r * SPACING) / rows) % STAND_WIDTH, z: (depth * (r + 0.5)) / rows });
    }
  }
  params = { ...params, world: { ...params.world, depth }, trees } as Params;
}

const world = newWorld(params);
const seasons = job.seasons ?? [60, 100, 150];
const every = job.laiEvery ?? 5;
const lai: [number, number][] = [];
const snaps: unknown[] = [];
let at = 0;
const last = Math.max(...seasons);
while (at < last) {
  const next = Math.min(last, ...seasons.filter((s) => s > at), at + every - (at % every));
  world.run(next - at);
  at = next;
  if (at % every === 0) lai.push([at, world.lai(0, STAND_WIDTH)]);
  if (!seasons.includes(at)) continue;
  const trees = world.trees.map((tv, k) => {
    const t = tv as TreeView;
    if (!t.alive) return { index: k, alive: false, rootX: t.rootX, rootZ: t.rootZ };
    const m = t.m.cols;
    const b = t.b.cols;
    // One row per live bud: its metamer's tip, state, Q, resource v, age, and the metamer's birth season and order.
    const tips: number[][] = [];
    for (let j = 0; j < t.b.length; j++) {
      const s = b.state[j] as number;
      if (s !== 1 && s !== 2 && s !== 5) continue;
      const i = b.metamer[j] as number;
      if (i < 0) continue;
      const len = m.length[i] as number;
      tips.push([
        (m.baseX[i] as number) + (m.hx[i] as number) * len,
        (m.baseY[i] as number) + (m.hy[i] as number) * len,
        (m.baseZ[i] as number) + (m.hz[i] as number) * len,
        s,
        b.q[j] as number,
        b.v[j] as number,
        b.age[j] as number,
        m.birthSeason[i] as number,
        m.order[i] as number,
        i,
      ]);
    }
    const metrics = world.metricsOf(t);
    return {
      index: k,
      alive: true,
      rootX: t.rootX,
      rootZ: t.rootZ,
      allometry: allometry(m, b),
      height: metrics.height,
      limbCrownRatio: metrics.limbCrownRatio,
      tips,
    };
  });
  snaps.push({ season: at, lai: world.lai(0, STAND_WIDTH), trees });
}
const effective = job.checkParams
  ? Object.fromEntries(
      job.checkParams.map((path) => {
        let node: unknown = world.paramsOf(world.trees[0] as TreeView);
        for (const key of path.split(".")) node = (node as Record<string, unknown>)?.[key];
        return [path, node];
      }),
    )
  : undefined;
writeFileSync(
  out,
  JSON.stringify({
    job,
    width: params.world.width,
    depth: params.world.depth ?? 64,
    worldO2: params.o2,
    worldC2: params.c2,
    effective,
    lai,
    snaps,
  }),
);
world.dispose();
