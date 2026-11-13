/**
 * The feature probe (spec #111, "The feature probe"; promoted from the `wayfinder/feature-probe`
 * prototype): judge a Form feature in minutes. It runs HEAD against HEAD plus a params patch on
 *
 * - the lone-tree stage (presets.ts' `loneTreeParams`) at seasons 30/60/100, and
 * - the garden (presets.ts' `forestParams`) at 160 and 66 cells at seasons 50/100/150, to 300 with
 *   `--demography`,
 *
 * for seeds 1–3, each a native treesim run (cli/run.ts), and draws them on one HTML contact sheet:
 * every frame's crown outline and floor light first, the numbers over seasons charted under it.
 * Every number on the sheet is a column of the core's own output (metrics.csv, stand.csv,
 * stand-species.csv); the probe computes none of its own. The drawing reads metamers.csv,
 * buds.csv and ground.csv.
 *
 * EXPLORATORY: 1–3 seeds never support an adoption claim (AGENTS.md: ≥ 20 seeds and a stated pass
 * rate). Everything it writes says so.
 *
 *   npm run probe -- --patch patch.json [--species beech] [--label name] [--seeds 1,2,3]
 *        [--lone 30,60,100] [--garden 50,100,150] [--demography] [--widths 160,66] [--jobs N]
 *        [--head-from label]
 *
 * `--widths ""` runs the lone stage alone. `--head-from label` links HEAD's runs from
 * runs/probe/<label>/head/ where that probe ran the same params to the same seasons, and runs
 * the rest: several patches against one HEAD pay for HEAD once.
 *
 * patch.json: { "params":  <a Params patch for every world, merged as mergeParams merges>,
 *               "species": { "<name>": <a species patch, merged as patchSpecies merges> } }
 * Without --patch it runs HEAD alone. A patched species that a garden seed never grows is flagged
 * on the sheet and on stderr, so an empty comparison is not read as "no change".
 *
 * Writes runs/probe/<label>/: sheet.html, probe.json, README.txt, and one treesim run per arm,
 * stage and seed (head/ and patch/: lone-seed<s>/, garden<w>-seed<s>/). Generated, never committed.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeParams,
  type Params,
  type ParamsPatch,
  patchSpecies,
  type SpeciesPatch,
} from "../src/core/params.ts";
import { forestParams, loneTreeParams } from "../src/core/presets.ts";
import { arg } from "./shared.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RUN = join(ROOT, "cli", "run.ts");
const EXPLORATORY =
  "Exploratory: seeds 1–3 at most. Never quote it as an adoption claim (≥ 20 seeds and a stated pass rate, AGENTS.md).";

const argv = process.argv.slice(2);
const nums = (s: string): number[] => s.split(",").filter(Boolean).map(Number);

type Patch = { params?: ParamsPatch; species?: Record<string, SpeciesPatch> };

function applyPatch(p: Params, patch: Patch): Params {
  let out = patch.params ? mergeParams(p, patch.params) : p;
  for (const [name, sp] of Object.entries(patch.species ?? {})) out = patchSpecies(out, name, sp);
  return out;
}

// ---- the jobs: one treesim run each ----

type Kind = "lone" | "garden";
type Job = { kind: Kind; width: number; seed: number; arm: "head" | "patch"; dir: string };

/**
 * Links `job`'s directory to the same run of an earlier probe (`--head-from`), if that probe ran
 * these params to these seasons with these snapshots and finished. Returns whether it did.
 */
function linkRun(job: Job, from: string, text: string, seasons: number[]): boolean {
  const old = join(from, job.arm, basename(job.dir));
  try {
    const same =
      readFileSync(join(old, "probe-record.json"), "utf8") === text &&
      readFileSync(join(old, "probe-snapshots.txt"), "utf8") === seasons.join(",") &&
      existsSync(join(old, "hash.txt"));
    if (!same) return false;
  } catch {
    return false;
  }
  mkdirSync(dirname(job.dir), { recursive: true });
  symlinkSync(old, job.dir);
  return true;
}

function runJob(job: Job, params: Params, seasons: number[], from: string): Promise<void> {
  const last = Math.max(...seasons);
  // A replay record carries the whole params as they are: no merge over a preset in the runner.
  const text = JSON.stringify({ params, events: [], seasons: last });
  if (from && linkRun(job, from, text, seasons)) return Promise.resolve();
  mkdirSync(job.dir, { recursive: true });
  const record = join(job.dir, "probe-record.json");
  writeFileSync(record, text);
  writeFileSync(join(job.dir, "probe-snapshots.txt"), seasons.join(","));
  const args = [RUN, "--replay", record, "--seasons", String(last)];
  args.push("--snapshots", seasons.join(","), "--light", "--quiet", "--out", job.dir);
  return new Promise((ok, bad) => {
    const c = spawn(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"] });
    c.on("exit", (code) =>
      code === 0 ? ok() : bad(new Error(`${job.dir}: treesim exited ${code}`)),
    );
  });
}

// ---- reading the core's output ----

type Table = { head: string[]; rows: string[][] };

function csv(path: string): Table {
  const [head, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  return { head: (head as string).split(","), rows: lines.map((l) => l.split(",")) };
}
const col = (t: Table, name: string): number => {
  const k = t.head.indexOf(name);
  if (k < 0) throw new Error(`no column ${name}`);
  return k;
};
/** A core value as written: a number, or null for NaN (JSON has no NaN). */
const val = (s: string | undefined): number | null => {
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
};
const r1 = (x: number): number => Math.round(x * 10) / 10;
const r2 = (x: number): number => Math.round(x * 100) / 100;

/** The per-tree measures the sheet shows, as metrics.csv names them. */
const TREE_COLUMNS = [
  "height",
  "crownWidth",
  "crownDepth",
  "liveCrownBase",
  "topFifthLeaf",
  "leafBelowSixth",
  "w90",
  "upperFlankNew",
  "budsOutside",
] as const;

type Frame = {
  season: number;
  /** x0,y0,x1,y1,radius per drawn metamer (cells). */
  wood: number[];
  /** x,y,tree per leafy bud at its metamer's tip, deduplicated on a half-cell grid. */
  leaves: number[];
  /** The ground's light (q/C) per (x, z), row-major in z: ground.csv's `q`. */
  floor: { w: number; d: number; q: (number | null)[] };
  /** Each live tree's metrics.csv row at this season, the TREE_COLUMNS. */
  trees: { tree: number; species: string; values: (number | null)[] }[];
  /** stand.csv's row at this season. */
  stand: Record<string, number | null>;
};

function readJob(job: Job, seasons: number[]) {
  const metrics = csv(join(job.dir, "metrics.csv"));
  const mSeason = col(metrics, "season");
  const mTree = col(metrics, "tree");
  const mAlive = col(metrics, "alive");
  const mSpecies = col(metrics, "species");
  const mCols = TREE_COLUMNS.map((c) => col(metrics, c));
  const speciesOf = new Map<number, string>();
  for (const r of metrics.rows) speciesOf.set(Number(r[mTree]), r[mSpecies] as string);

  const stand = csv(join(job.dir, "stand.csv"));
  const standRows = stand.rows.map((r) =>
    Object.fromEntries(stand.head.map((h, k) => [h, val(r[k])])),
  );
  const spp = csv(join(job.dir, "stand-species.csv"));
  const speciesRows = spp.rows.map((r) => ({
    season: Number(r[col(spp, "season")]),
    species: r[col(spp, "species")] as string,
    live: val(r[col(spp, "live")]),
    drawn: val(r[col(spp, "drawn")]),
    share: val(r[col(spp, "share")]),
  }));

  const metamers = csv(join(job.dir, "metamers.csv"));
  const buds = csv(join(job.dir, "buds.csv"));
  const ground = csv(join(job.dir, "ground.csv"));
  // Drop the finest twigs from the drawing (only the drawing): the leaves carry the outline.
  const minR = job.kind === "lone" ? 0.03 : 0.05;
  const frames: Frame[] = seasons.map((season) => {
    const s = String(season);
    const tips = new Map<number, number[]>(); // tree -> tip x by metamer index
    const wood: number[] = [];
    const [S, T, X0, Y0, X1, Y1, R] = ["season", "tree", "x0", "y0", "x1", "y1", "radius"].map(
      (n) => col(metamers, n),
    ) as number[];
    for (const r of metamers.rows) {
      if (r[S as number] !== s) continue;
      const tree = Number(r[T as number]);
      const x1 = Number(r[X1 as number]);
      let list = tips.get(tree);
      if (!list) {
        list = [];
        tips.set(tree, list);
      }
      list.push(x1);
      const rad = Number(r[R as number]);
      if (rad < minR && list.length > 1) continue;
      wood.push(
        r1(Number(r[X0 as number])),
        r1(Number(r[Y0 as number])),
        r1(x1),
        r1(Number(r[Y1 as number])),
        r2(rad),
      );
    }
    const leaves: number[] = [];
    const seen = new Set<string>();
    const [bS, bT, bM, bY, bL] = ["season", "tree", "metamer", "y", "leaf"].map((n) =>
      col(buds, n),
    ) as number[];
    for (const r of buds.rows) {
      if (r[bS as number] !== s || !(Number(r[bL as number]) > 0)) continue;
      const tree = Number(r[bT as number]);
      const x = tips.get(tree)?.[Number(r[bM as number])];
      if (x === undefined) continue;
      const hx = Math.round(x * 2) / 2;
      const hy = Math.round(Number(r[bY as number]) * 2) / 2;
      const key = `${hx},${hy},${tree}`;
      if (seen.has(key)) continue;
      seen.add(key);
      leaves.push(hx, hy, tree);
    }
    const [gS, gX, gZ, gQ] = ["season", "col", "layer", "q"].map((n) => col(ground, n)) as number[];
    const cells = ground.rows.filter((r) => r[gS as number] === s);
    const w = 1 + Math.max(-1, ...cells.map((r) => Number(r[gX as number])));
    const d = 1 + Math.max(-1, ...cells.map((r) => Number(r[gZ as number])));
    const q: (number | null)[] = new Array(w * d).fill(null);
    for (const r of cells) {
      const v = val(r[gQ as number]);
      q[Number(r[gZ as number]) * w + Number(r[gX as number])] = v === null ? null : r2(v);
    }
    const trees = metrics.rows
      .filter((r) => r[mSeason] === s && r[mAlive] === "1")
      .map((r) => ({
        tree: Number(r[mTree]),
        species: r[mSpecies] as string,
        values: mCols.map((k) => val(r[k])),
      }));
    const standRow = standRows.find((r) => r.season === season) ?? {};
    return { season, wood, leaves, floor: { w, d, q }, trees, stand: standRow };
  });

  // The numbers over seasons: the lone tree's metrics rows; the garden's stand and species rows.
  const series =
    job.kind === "lone"
      ? metrics.rows
          .filter((r) => r[mAlive] === "1" && Number(r[mTree]) === 0)
          .map((r) => [Number(r[mSeason]), ...mCols.map((k) => val(r[k]))])
      : [];
  return {
    kind: job.kind,
    width: job.width,
    seed: job.seed,
    arm: job.arm,
    species: Object.fromEntries(speciesOf),
    frames,
    series,
    stand: job.kind === "garden" ? standRows : [],
    standSpecies: job.kind === "garden" ? speciesRows : [],
  };
}

/** The patched species a garden run never grows: a comparison there would show no change. */
function absences(result: ReturnType<typeof readJob>, patched: string[]): string[] {
  const grown = new Set(result.standSpecies.filter((r) => (r.live ?? 0) > 0).map((r) => r.species));
  return patched
    .filter((s) => !grown.has(s))
    .map(
      (s) =>
        `${s} is absent from the ${result.width}-cell garden, seed ${result.seed} (${result.arm}): its patch cannot show there`,
    );
}

// ---- the driver ----

async function main(): Promise<void> {
  const label = arg("--label", "probe");
  const dir = join(ROOT, "runs", "probe", label);
  const patchPath = argv.includes("--patch") ? arg("--patch", "") : "";
  const patch: Patch | null = patchPath ? JSON.parse(readFileSync(patchPath, "utf8")) : null;
  const species = arg("--species", "beech");
  const seeds = nums(arg("--seeds", "1,2,3"));
  const lone = nums(arg("--lone", "30,60,100"));
  const garden = nums(
    arg("--garden", argv.includes("--demography") ? "50,100,150,300" : "50,100,150"),
  );
  const widths = nums(arg("--widths", "160,66"));
  const limit = Math.max(1, Number(arg("--jobs", String(Math.min(12, cpus().length)))));
  const headFrom = argv.includes("--head-from")
    ? join(ROOT, "runs", "probe", arg("--head-from", ""))
    : "";

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "README.txt"), `Feature probe output (cli/probe.ts). ${EXPLORATORY}\n`);

  const jobs: { job: Job; params: Params; seasons: number[] }[] = [];
  for (const arm of patch ? (["head", "patch"] as const) : (["head"] as const)) {
    const p = (base: Params) => (arm === "patch" && patch ? applyPatch(base, patch) : base);
    for (const seed of seeds) {
      const job = {
        kind: "lone" as const,
        width: 0,
        seed,
        arm,
        dir: join(dir, arm, `lone-seed${seed}`),
      };
      const params = p(loneTreeParams(species, seed));
      job.width = params.world.width;
      jobs.push({ job, params, seasons: lone });
      for (const width of widths) {
        const g = { kind: "garden" as const, width, seed, arm };
        jobs.push({
          job: { ...g, dir: join(dir, arm, `garden${width}-seed${seed}`) },
          params: p(forestParams(width, seed)),
          seasons: garden,
        });
      }
    }
  }
  const t0 = Date.now();
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < jobs.length) {
      const j = jobs[next++] as (typeof jobs)[number];
      await runJob(j.job, j.params, j.seasons, j.job.arm === "head" ? headFrom : "");
      process.stderr.write(`probe: ${j.job.arm} ${j.job.kind} ${j.job.width} seed ${j.job.seed}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));

  const results = jobs.map((j) => readJob(j.job, j.seasons));
  const patched = Object.keys(patch?.species ?? {});
  const warnings = results.filter((r) => r.kind === "garden").flatMap((r) => absences(r, patched));
  for (const w of warnings) process.stderr.write(`probe: WARNING ${w}\n`);
  const meta = {
    status: "exploratory",
    note: EXPLORATORY,
    label,
    species,
    patch,
    seeds,
    stages: { lone, garden, widths },
    columns: TREE_COLUMNS,
    warnings,
    commit: (() => {
      try {
        return JSON.parse(readFileSync(join(jobs[0]?.job.dir ?? "", "run.json"), "utf8")).meta
          .commit;
      } catch {
        return "unknown";
      }
    })(),
    wall: (Date.now() - t0) / 1000,
    date: new Date().toISOString().slice(0, 16),
  };
  writeFileSync(join(dir, "probe.json"), `${JSON.stringify(meta, null, 2)}\n`);
  const tpl = readFileSync(new URL("./probe.html", import.meta.url), "utf8");
  // `<` escaped so no value can close the script element it sits in.
  const data = JSON.stringify({ meta, results }).replace(/</g, "\\u003c");
  const html = tpl.replace("/*DATA*/null", () => data);
  writeFileSync(join(dir, "sheet.html"), html);
  console.log(
    `${join(dir, "sheet.html")} (exploratory; ${(html.length / 1e6).toFixed(1)} MB, ${meta.wall.toFixed(0)} s` +
      `${warnings.length ? `, ${warnings.length} warning(s)` : ""})`,
  );
}

await main();
