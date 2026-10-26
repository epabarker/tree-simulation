/**
 * Headless runner: the same core as the page, writing files for Python or R.
 *
 *   npm run sim -- --preset explosion --seed 3 --seasons 12 --out runs/m0
 *   npm run sim -- --params my.json --snapshots 25,50 --out runs/x   (patch over the preset)
 *   npm run sim -- --replay tree-run.json --out runs/replay          (page's "Export run")
 *   echo '{"c3":{"lambda":0.56}}' | npm run sim -- --params - --out runs/y
 *
 * Writes to --out: run.json (resolved params, events, metadata), metrics.csv (one row per tree
 * per season), metamers.csv (geometry at --snapshots seasons and the last), hash.txt.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { hashWorld } from "../src/core/hash.ts";
import { METRIC_COLUMNS, treeMetrics } from "../src/core/metrics.ts";
import { mergeParams, type Params, type ParamsPatch } from "../src/core/params.ts";
import { defaultPreset, isPresetName, presetParams } from "../src/core/presets.ts";
import { type RunEvent, type RunRecord, World } from "../src/core/world.ts";

const { values } = parseArgs({
  options: {
    preset: { type: "string", default: defaultPreset },
    params: { type: "string" },
    replay: { type: "string" },
    seed: { type: "string" },
    seasons: { type: "string" },
    snapshots: { type: "string", default: "" },
    out: { type: "string" },
    quiet: { type: "boolean", default: false },
  },
});

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path === "-" ? 0 : path, "utf8"));
}

function gitCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function num(x: number): string {
  return Number.isInteger(x) ? String(x) : String(+x.toPrecision(8));
}

let params: Params;
let events: RunEvent[] = [];
let seasons: number;
if (values.replay) {
  const record = readJson(values.replay) as RunRecord;
  params = record.params;
  events = record.events;
  seasons = values.seasons ? Number(values.seasons) : record.seasons;
} else {
  if (!isPresetName(values.preset)) throw new Error(`Unknown preset '${values.preset}'`);
  params = presetParams(values.preset);
  if (values.params) params = mergeParams(params, readJson(values.params) as ParamsPatch);
  seasons = values.seasons ? Number(values.seasons) : 30;
}
if (values.seed !== undefined) params.seed = Number(values.seed);

const out = values.out ?? join("runs", `${values.preset}-seed${params.seed}`);
mkdirSync(out, { recursive: true });
const snapshotSeasons = new Set(
  values.snapshots
    .split(",")
    .filter((s) => s.trim() !== "")
    .map(Number),
);
snapshotSeasons.add(seasons);

const metricsLines = [["season", ...METRIC_COLUMNS].join(",")];
const metamerLines = [
  "season,tree,birthId,parentBirthId,order,axis,x0,y0,x1,y1,length,angle,radius,qSum,nSum,vIn,birthSeason",
];

const world = new World(params);
const queue = [...events].sort((a, b) => a.season - b.season);
const t0 = performance.now();
for (let s = 0; s < seasons; s++) {
  world.run(
    1,
    queue.filter((e) => e.season === world.season),
  );
  for (const tree of world.trees) {
    if (tree.m.length === 0) continue;
    const m = treeMetrics(tree);
    metricsLines.push(
      [world.season, ...METRIC_COLUMNS.map((k) => m[k])]
        .map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : num(v as number)))
        .join(","),
    );
  }
  if (snapshotSeasons.has(world.season)) {
    for (const tree of world.trees) {
      if (!tree.alive) continue;
      const c = tree.m.cols;
      for (let i = 0; i < tree.m.length; i++) {
        const p = c.parent[i];
        metamerLines.push(
          [
            world.season,
            tree.id,
            c.birthId[i],
            p >= 0 ? c.birthId[p] : -1,
            c.order[i],
            c.axis[i],
            c.baseX[i],
            c.baseY[i],
            tree.tipX(i),
            tree.tipY(i),
            c.length[i],
            c.angle[i],
            c.radius[i],
            c.qSum[i],
            c.nSum[i],
            c.vIn[i],
            c.birthSeason[i],
          ]
            .map(num)
            .join(","),
        );
      }
    }
  }
}
const ms = performance.now() - t0;

const hash = hashWorld(world);
const run = {
  meta: {
    preset: values.replay ? null : values.preset,
    seasons,
    commit: gitCommit(),
    hash,
    ms: Math.round(ms),
  },
  ...world.record(),
};
writeFileSync(join(out, "run.json"), `${JSON.stringify(run, null, 2)}\n`);
writeFileSync(join(out, "metrics.csv"), `${metricsLines.join("\n")}\n`);
writeFileSync(join(out, "metamers.csv"), `${metamerLines.join("\n")}\n`);
writeFileSync(join(out, "hash.txt"), `${hash}\n`);
if (!values.quiet) {
  console.log(`${out}: ${seasons} seasons in ${ms.toFixed(0)} ms, hash ${hash}`);
}
