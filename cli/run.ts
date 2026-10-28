/**
 * Headless runner: the same core as the page, writing files for Python or R.
 *
 *   npm run sim -- --preset explosion --seed 3 --seasons 12 --out runs/m0
 *   npm run sim -- --params my.json --snapshots 25,50 --out runs/x   (patch over the preset)
 *   npm run sim -- --replay tree-run.json --out runs/replay          (page's "Export run")
 *   echo '{"c3":{"lambda":0.56}}' | npm run sim -- --params - --out runs/y
 *   npm run sim -- --preset oakOpen --species-patch '{"oak":{"r3":{"posture":false}}}'   (M26)
 *   npm run sim -- --preset succession --checkpoint-at 60 --seasons 60 --out runs/c   (M21)
 *
 * Writes to --out: run.json (resolved params, events, metadata), metrics.csv (one row per tree
 * per season), metamers.csv (geometry at --snapshots seasons and the last), form.csv (crown form
 * and allometry per live tree at the same seasons, core/form.ts; M26), hash.txt, and with
 * --light light.csv (the light model's per-cell shade 1 − Q/C at the same seasons; M6e), and with
 * --checkpoint-at N checkpoint-N.bin.gz, the world after season N (core/checkpoint.ts; M21).
 *
 * --species-patch amends species in place, {name: patch}, each merged into that species' groups
 * (params.ts patchSpecies). A `species` entry in --params replaces the species' whole patch.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { saveWorld } from "../src/core/checkpoint.ts";
import { FORM_COLUMNS, formMetrics, PROFILE_BANDS } from "../src/core/form.ts";
import { hashWorld } from "../src/core/hash.ts";
import { METRIC_COLUMNS, treeMetrics } from "../src/core/metrics.ts";
import {
  mergeParams,
  type Params,
  type ParamsPatch,
  patchSpecies,
  type SpeciesPatch,
} from "../src/core/params.ts";
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
    light: { type: "boolean", default: false },
    "checkpoint-at": { type: "string" },
    "species-patch": { type: "string" },
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
  if (values["species-patch"]) {
    const amend = JSON.parse(values["species-patch"]) as Record<string, SpeciesPatch>;
    for (const [name, patch] of Object.entries(amend)) params = patchSpecies(params, name, patch);
  }
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
  "season,tree,birthId,parentBirthId,order,axis,x0,y0,x1,y1,length,angle,radius,qSum,nSum,vIn,birthSeason,stressWood",
];

const profileColumns = Array.from({ length: PROFILE_BANDS }, (_, k) => `p${k}`);
const formLines = [["season", "tree", "species", ...FORM_COLUMNS, ...profileColumns].join(",")];

const lightLines = ["season,col,row,shade"];

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
    const m = treeMetrics(tree, world);
    metricsLines.push(
      [world.season, ...METRIC_COLUMNS.map((k) => m[k])]
        .map((v) =>
          typeof v === "boolean" ? (v ? 1 : 0) : typeof v === "string" ? v : num(v as number),
        )
        .join(","),
    );
  }
  if (values["checkpoint-at"] !== undefined && world.season === Number(values["checkpoint-at"])) {
    const bytes = gzipSync(saveWorld(world), { level: 9 });
    writeFileSync(join(out, `checkpoint-${world.season}.bin.gz`), bytes);
  }
  const field = values.light && snapshotSeasons.has(world.season) ? world.light.field() : null;
  if (field) {
    // The field of the season just run, i.e. the start-of-season light its buds saw.
    const W = world.light.width;
    for (let c = 0; c < field.length; c++) {
      lightLines.push(`${world.season},${c % W},${Math.floor(c / W)},${num(field[c] as number)}`);
    }
  }
  if (snapshotSeasons.has(world.season)) {
    for (const tree of world.trees) {
      if (!tree.alive || tree.m.length === 0) continue;
      const f = formMetrics(tree, world.paramsOf(tree));
      formLines.push(
        [
          world.season,
          tree.id,
          tree.species,
          ...FORM_COLUMNS.map((k) => num(f[k])),
          ...f.profile.map(num),
        ].join(","),
      );
    }
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
            c.stressWood[i],
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
writeFileSync(join(out, "form.csv"), `${formLines.join("\n")}\n`);
writeFileSync(join(out, "hash.txt"), `${hash}\n`);
if (values.light) writeFileSync(join(out, "light.csv"), `${lightLines.join("\n")}\n`);
if (!values.quiet) {
  console.log(`${out}: ${seasons} seasons in ${ms.toFixed(0)} ms, hash ${hash}`);
}
