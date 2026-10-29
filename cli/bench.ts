/**
 * Benchmark: per-phase cost of a season for fixed presets, as the worker runs them (one season,
 * then a snapshot for the page). Each case also records its final state hash, so `--compare`
 * shows at once whether an optimisation left behaviour bit-identical (M13).
 *
 *   npm run bench                                   all cases, 100 seasons, best of 3
 *   npm run bench -- --case forest --seasons 50     one case
 *   npm run bench -- --compare runs/bench/abc1234.json
 *   npm run bench -- --snapshot lean                 snapshots as the home page asks for them
 *   npm run bench -- --case forest --slab sweep:32:16:f32   also time a 3D slab light model (scratch,
 *                                                   cli/slab-light.ts) on the same deposits; see
 *                                                   docs/experiments/2026-10-29-3d-light-cost.md
 *
 * Writes runs/bench/<commit>[-dirty].json unless --out names another file.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { hashWorld } from "../src/core/hash.ts";
import { mergeParams, type Params } from "../src/core/params.ts";
import { presetParams } from "../src/core/presets.ts";
import { PHASES, type Phase } from "../src/core/season.ts";
import { FULL_SNAPSHOT, SnapshotBuilder, type SnapshotOptions } from "../src/core/snapshot.ts";
import { World } from "../src/core/world.ts";
import { Shadowed, type SlabLight, SlabPyramid, SlabSweep, type SlabTiming } from "./slab-light.ts";

const { values } = parseArgs({
  options: {
    case: { type: "string", multiple: true },
    seasons: { type: "string", default: "100" },
    repeat: { type: "string", default: "3" },
    compare: { type: "string" },
    snapshot: { type: "string", default: "full" },
    out: { type: "string" },
    // model:D:K:precision[:zsides], model sweep | fused | pyramid, e.g. sweep:32:16:f32 or pyramid:32:0:f64:periodic
    slab: { type: "string" },
    slabFrom: { type: "string", default: "60" },
    slabEvery: { type: "string", default: "4" },
    dumpDeposits: { type: "string" },
  },
});

/** The forest preset on a ring twice as wide, with twice the trees (M18's bigger worlds). */
function wideForest(): Params {
  const base = presetParams("forest");
  const W = base.world.width;
  const trees = base.trees.flatMap((t) => [t, { ...t, x: t.x + W }]);
  return mergeParams(base, { world: { ...base.world, width: 2 * W }, trees });
}

/** M18's target: the home woodland on a 520 × 140 ring, a tree every 21 cells (a panoramic screen). */
function panorama(): Params {
  const base = presetParams("succession");
  const W = 520;
  const n = Math.round(W / 21);
  const kinds = ["birch", "oak", "birch", "beech"];
  const trees = Array.from({ length: n }, (_, k) => ({
    x: ((k + 0.5) * W) / n,
    species: kinds[k % 4],
  }));
  return mergeParams(base, { world: { ...base.world, width: W, height: 140 }, trees });
}

const CASES: Record<string, () => Params> = {
  skyTree: () => presetParams("skyTree"),
  skyStand: () => presetParams("skyStand"),
  coniferStand: () => presetParams("coniferStand"),
  thinning: () => presetParams("thinning"),
  forest: () => presetParams("forest"),
  wideForest,
  panorama,
};

type Bucket = Phase | "snapshot";
const BUCKETS: Bucket[] = [...PHASES, "snapshot"];

interface CaseResult {
  grid: string;
  seasons: number;
  trees: number;
  metamers: number;
  hash: string;
  /** Milliseconds per season (simulation plus snapshot): mean, median, 95th percentile, last 20. */
  mean: number;
  p50: number;
  p95: number;
  late: number;
  /** Mean milliseconds per season spent in each phase. */
  phases: Record<Bucket, number>;
  /** With --slab: the 3D light model's own timings on the timed seasons. */
  slab?: { spec: string } & SlabTiming;
}

interface BenchFile {
  commit: string;
  date: string;
  node: string;
  repeat: number;
  snapshot: string;
  cases: Record<string, CaseResult>;
}

function git(args: string[]): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function quantile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] as number;
}

/** `full`: what the lab asks for (Δ histogram, shade overlay); `lean`: the home page. */
const SNAPSHOTS: Record<string, SnapshotOptions> = {
  full: FULL_SNAPSHOT,
  lean: { junctions: false, field: false },
};
const snapshotOptions = SNAPSHOTS[values.snapshot];
if (!snapshotOptions) throw new Error(`--snapshot must be full or lean`);

function makeSlab(spec: string, params: Params): SlabLight {
  const [model, d, k, precision = "f64", zSides = "open"] = spec.split(":");
  const A = precision === "f32" ? Float32Array : Float64Array;
  const { width: W, height: H, sides } = params.world;
  const px = sides === "periodic";
  const pz = zSides === "periodic";
  if (model === "sweep" || model === "fused") {
    return new SlabSweep(W, H, Number(d), params.c2, Number(k), px, pz, A, model === "fused");
  }
  if (model === "pyramid") return new SlabPyramid(W, H, Number(d), params.c2, px, pz, A);
  throw new Error(`--slab model must be sweep, fused or pyramid, not '${model}'`);
}

function runOnce(params: Params, seasons: number): CaseResult {
  const world = new World(params);
  let shadow: Shadowed | null = null;
  if (values.slab) {
    const from = Number(values.slabFrom);
    const every = Number(values.slabEvery);
    shadow = new Shadowed(
      world.light,
      makeSlab(values.slab, params),
      (s) => s >= from && (s - from) % every === 0,
    );
    world.light = shadow;
  }
  const builder = new SnapshotBuilder();
  const totals = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
  let last = 0;
  const mark = (phase: Phase): void => {
    const now = performance.now();
    totals[phase] += now - last;
    last = now;
  };
  const perSeason: number[] = [];
  for (let s = 0; s < seasons; s++) {
    const t0 = performance.now();
    last = t0;
    world.step(mark);
    const t1 = performance.now();
    builder.build(world, t1 - t0, snapshotOptions);
    const t2 = performance.now();
    totals.snapshot += t2 - t1;
    perSeason.push(t2 - t0);
  }
  shadow?.flush();
  if (shadow && values.dumpDeposits) {
    const d = shadow.lastDeposits;
    writeFileSync(values.dumpDeposits, new Uint8Array(d.buffer, d.byteOffset, d.byteLength));
  }
  const live = world.trees.filter((t) => t.alive);
  const sorted = [...perSeason].sort((a, b) => a - b);
  const late = perSeason.slice(-20);
  const phases = Object.fromEntries(BUCKETS.map((b) => [b, totals[b] / seasons])) as Record<
    Bucket,
    number
  >;
  return {
    grid: `${params.world.width}×${params.world.height}${params.world.sides === "periodic" ? " ring" : ""}`,
    seasons,
    trees: live.length,
    metamers: live.reduce((n, t) => n + t.m.length, 0),
    hash: hashWorld(world),
    mean: perSeason.reduce((a, b) => a + b, 0) / seasons,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    late: late.reduce((a, b) => a + b, 0) / late.length,
    phases,
    ...(shadow ? { slab: { spec: values.slab as string, ...shadow.timing } } : {}),
  };
}

const f1 = (x: number): string => x.toFixed(1);

function printTable(rows: string[][]): void {
  const widths = (rows[0] as string[]).map((_, j) =>
    Math.max(...rows.map((r) => r[j]?.length ?? 0)),
  );
  for (const r of rows) console.log(r.map((c, j) => c.padStart(widths[j] as number)).join("  "));
}

const names = values.case ?? Object.keys(CASES);
for (const n of names) if (!CASES[n]) throw new Error(`Unknown case '${n}'`);
const seasons = Number(values.seasons);
const repeat = Math.max(1, Number(values.repeat));

const results: Record<string, CaseResult> = {};
for (const name of names) {
  const make = CASES[name] as () => Params;
  let best: CaseResult | null = null;
  for (let r = 0; r < repeat; r++) {
    const res = runOnce(make(), seasons);
    if (best && res.hash !== best.hash) throw new Error(`${name}: hash differs between repeats`);
    if (!best || res.mean < best.mean) best = res;
  }
  results[name] = best as CaseResult;
  process.stderr.write(`${name} `);
}
process.stderr.write("\n");

const dirty = git(["status", "--porcelain", "--", "src", "cli"]) !== "";
const commit = `${git(["rev-parse", "--short", "HEAD"]) || "unknown"}${dirty ? "-dirty" : ""}`;
const file: BenchFile = {
  commit,
  date: new Date().toISOString(),
  node: process.version,
  repeat,
  snapshot: values.snapshot,
  cases: results,
};
const out = values.out ?? join("runs", "bench", `${commit}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);

console.log(
  `\n${commit}, ${seasons} seasons, best of ${repeat}, ${values.snapshot} snapshots (ms per season)\n`,
);
printTable([
  ["case", "grid", "trees", "metamers", "mean", "p50", "p95", "last 20", "hash"],
  ...names.map((n) => {
    const r = results[n] as CaseResult;
    return [
      n,
      r.grid,
      String(r.trees),
      String(r.metamers),
      f1(r.mean),
      f1(r.p50),
      f1(r.p95),
      f1(r.late),
      r.hash,
    ];
  }),
]);
console.log("\nmean ms per season by phase\n");
printTable([
  ["case", ...BUCKETS],
  ...names.map((n) => [n, ...BUCKETS.map((b) => f1((results[n] as CaseResult).phases[b]))]),
]);

if (values.compare) {
  const before = JSON.parse(readFileSync(values.compare, "utf8")) as BenchFile;
  console.log(`\nagainst ${before.commit} (mean ms per season; speed-up; same final state?)\n`);
  printTable([
    ["case", "before", "after", "speed-up", "light", "snapshot", "same hash"],
    ...names.map((n) => {
      const a = results[n] as CaseResult;
      const b = before.cases[n];
      if (!b) return [n, "—", f1(a.mean), "—", "—", "—", "—"];
      const ratio = (x: number, y: number) => (y > 0 ? `${(x / y).toFixed(2)}×` : "—");
      return [
        n,
        f1(b.mean),
        f1(a.mean),
        ratio(b.mean, a.mean),
        ratio(b.phases.light, a.phases.light),
        ratio(b.phases.snapshot, a.phases.snapshot),
        a.seasons === b.seasons ? (a.hash === b.hash ? "yes" : "NO") : "(seasons differ)",
      ];
    }),
  ]);
}
if (values.slab) {
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const median = (a: number[]) =>
    quantile(
      [...a].sort((x, y) => x - y),
      0.5,
    );
  console.log(`\nslab ${values.slab}: ms per timed season (median; mean)\n`);
  printTable([
    ["case", "seasons", "deposit", "compute", "sample", "Mupdates", "ns/update", "deposits"],
    ...names.map((n) => {
      const t = (results[n] as CaseResult).slab as SlabTiming;
      const ns = (1e6 * median(t.computeMs)) / Math.max(1, median(t.updates));
      return [
        n,
        String(t.seasons.length),
        `${median(t.depositMs).toFixed(2)}; ${mean(t.depositMs).toFixed(2)}`,
        `${median(t.computeMs).toFixed(1)}; ${mean(t.computeMs).toFixed(1)}`,
        `${median(t.sampleMs).toFixed(2)}; ${mean(t.sampleMs).toFixed(2)}`,
        (median(t.updates) / 1e6).toFixed(2),
        ns.toFixed(2),
        String(Math.round(mean(t.deposits))),
      ];
    }),
  ]);
}
console.log(`\nwrote ${out}`);
