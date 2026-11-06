/**
 * Benchmark: per-phase cost of a season for fixed presets, in the Rust core (I1, ADR 0024). Each
 * case runs twice: natively (rust/cli `--bench`: the per-phase split and the final state hash) and
 * in WASM as the page's worker runs it (one season, then a snapshot out of linear memory: the
 * per-season distribution and snapshotMs). The two hashes must agree. `--compare` shows at once
 * whether an optimisation left behaviour bit-identical (M13).
 *
 *   npm run bench                                   all cases, 100 seasons, best of 3
 *   npm run bench -- --case forest --seasons 50     one case
 *   npm run bench -- --compare runs/bench/abc1234.json
 *   npm run bench -- --snapshot lean                 snapshots as the home page asks for them
 *
 * Writes runs/bench/<commit>[-dirty].json unless --out names another file. Benches made before
 * I1 ran the TypeScript core, whose hashes the archived 2D build reproduces (tag golden-2d-ts).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { mergeParams, type Params } from "../src/core/params.ts";
import { presetParams } from "../src/core/presets.ts";
import { FULL_SNAPSHOT, type SnapshotOptions } from "../src/core/types.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

const { values } = parseArgs({
  options: {
    case: { type: "string", multiple: true },
    seasons: { type: "string", default: "100" },
    repeat: { type: "string", default: "3" },
    compare: { type: "string" },
    snapshot: { type: "string", default: "full" },
    out: { type: "string" },
  },
});

loadWorldsSync(readFileSync(coreWasm));
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
  firWood: () => presetParams("firWood"),
  thinning: () => presetParams("thinning"),
  forest: () => presetParams("forest"),
  wideForest,
  panorama,
};

/** The season loop's phases (§6; rust/core/src/season.rs PHASES), then the snapshot. */
const PHASES = [
  "light",
  "sample",
  "allocate",
  "grow",
  "shed",
  "girth",
  "mechanics",
  "commit",
  "deaths",
] as const;
type Bucket = (typeof PHASES)[number] | "snapshot";
const BUCKETS: Bucket[] = [...PHASES, "snapshot"];

interface CaseResult {
  grid: string;
  seasons: number;
  trees: number;
  metamers: number;
  hash: string;
  /** Milliseconds per season in WASM (simulation plus snapshot): mean, median, p95, last 20. */
  mean: number;
  p50: number;
  p95: number;
  late: number;
  /** Mean milliseconds per season natively, the whole season. */
  native: number;
  /** Mean milliseconds per season in each phase (natively), and the snapshot (in WASM). */
  phases: Record<Bucket, number>;
}

interface BenchFile {
  commit: string;
  date: string;
  node: string;
  repeat: number;
  snapshot: string;
  /** The core: "rust"; before I1, "ts" or "rust" (G2's sky sweep in the TypeScript core). */
  light: string;
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

const rust = fileURLToPath(new URL("../rust", import.meta.url));

/** The native binary's per-phase means and hash (cli/run.ts builds it when stale). */
function native(params: Params, seasons: number): Record<string, number | string> {
  const out = execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("./run.ts", import.meta.url)),
      "--bench",
      "--params",
      "-",
      "--seasons",
      String(seasons),
    ],
    { input: JSON.stringify(params), encoding: "utf8", cwd: rust },
  );
  return JSON.parse(out) as Record<string, number | string>;
}

function runOnce(params: Params, seasons: number): CaseResult {
  const world = RustWorld.create(params);
  let snapshotMs = 0;
  const perSeason: number[] = [];
  for (let s = 0; s < seasons; s++) {
    const t0 = performance.now();
    world.step();
    const t1 = performance.now();
    world.snapshot(t1 - t0, snapshotOptions);
    const t2 = performance.now();
    snapshotMs += t2 - t1;
    perSeason.push(t2 - t0);
  }
  const live = world.trees.filter((t) => t.alive);
  const hash = world.hash();
  const n = native(params, seasons);
  if (n.hash !== hash) throw new Error(`native hash ${n.hash} is not WASM's ${hash}`);
  const sorted = [...perSeason].sort((a, b) => a - b);
  const late = perSeason.slice(-20);
  const phases = Object.fromEntries(PHASES.map((p) => [p, n[p] as number])) as Record<
    Bucket,
    number
  >;
  phases.snapshot = snapshotMs / seasons;
  const result: CaseResult = {
    grid: `${params.world.width}×${params.world.height}${params.world.sides === "periodic" ? " ring" : ""}`,
    seasons,
    trees: live.length,
    metamers: live.reduce((k, t) => k + t.m.length, 0),
    hash,
    mean: perSeason.reduce((a, b) => a + b, 0) / seasons,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    late: late.reduce((a, b) => a + b, 0) / late.length,
    native: n.mean as number,
    phases,
  };
  world.dispose();
  return result;
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

const dirty = git(["status", "--porcelain", "--", "src", "cli", "rust"]) !== "";
const commit = `${git(["rev-parse", "--short", "HEAD"]) || "unknown"}${dirty ? "-dirty" : ""}`;
const file: BenchFile = {
  commit,
  date: new Date().toISOString(),
  node: process.version,
  repeat,
  snapshot: values.snapshot,
  light: "rust",
  cases: results,
};
const out = values.out ?? join("runs", "bench", `${commit}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);

console.log(
  `\n${commit}, ${seasons} seasons, best of ${repeat}, ${values.snapshot} snapshots (ms per season: WASM, then native)\n`,
);
printTable([
  ["case", "grid", "trees", "metamers", "mean", "p50", "p95", "last 20", "native", "hash"],
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
      f1(r.native),
      r.hash,
    ];
  }),
]);
console.log("\nmean ms per season by phase (natively; the snapshot in WASM)\n");
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
console.log(`\nwrote ${out}`);
