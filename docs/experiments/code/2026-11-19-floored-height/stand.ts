/**
 * #135's stand check (docs/experiments/2026-11-19-floored-height-rule.md; bars fixed before any
 * run): the garden (`forestParams`) at widths 160 and 66, seeds 1–20, to season 300, natively,
 * metamers at 100 and 200 (and 300, the last season), for the candidate garden M (s3d + o4's light
 * memory τ 2.5, the ramp re-probe's `M`) and MR (M + the floored height rule, `rule`'s c1 of
 * arms.json). The summary is the ramp re-probe's run.ts (its measures, unchanged); bar 6 and the
 * stand H/D are #134's stand.py, through stand.py beside this file.
 *
 * Reuse: M at 160 cells is linked from the ramp re-probe's runs (`--reuse`, its runs/132-ramp-
 * memory; which linked the light-memory probe's s3dT25), after each record's params are checked
 * equal to this script's. At 66 cells M is re-run here: the reuse check (each hash must equal the
 * ramp re-probe's; if any differs, the 160-cell runs are re-run too) and the rule-off bit-identity
 * check of this build.
 *
 *   node docs/experiments/code/2026-11-19-floored-height/stand.ts -j 10 --reuse <ramp re-probe runs dir>
 *   node …/stand.ts --summary-only
 *
 * Writes runs/135-floored-height/garden/<arm>/{w<width>-s<seed>/, summary.json}, reuse-check.txt
 * (generated, never committed).
 */
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { allometry, type Columns } from "../../../../cli/allometry.ts";
import { arg, median, type Patch, patched, pool, sim } from "../../../../cli/shared.ts";
import { type Params, speciesParams } from "../../../../src/core/params.ts";
import { DISPLAY_THRESHOLD, forestParams } from "../../../../src/core/presets.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const RULE = JSON.parse(
  readFileSync(new URL("./arms.json", import.meta.url), "utf8"),
).arms.rule.params.c1 as Record<string, unknown>;

const S3D = { stubs: true, stubLight: 0.15, stubDeath: 3, stubDemote: 0.075 };
const MEM = { ...S3D, lightMemory: 2.5 };
type Arm = { o4: Record<string, unknown>; c1?: Record<string, unknown>; from?: string };
export const ARMS: Record<string, Arm> = {
  M: { o4: MEM, from: "M" },
  MR: { o4: MEM, c1: RULE },
};
export const paramsOf = (name: string, base: Params): Params => {
  const a = ARMS[name] as Arm;
  const p: Record<string, unknown> = { o4: a.o4 };
  if (a.c1) p.c1 = a.c1;
  return patched(base, { params: p } as Patch);
};

const WIDTHS = [160, 66];
const SEASONS = 300;
const FRAMES = [100, 200, 300];
const SNAPSHOTS = "100,200";
const DRAWN = DISPLAY_THRESHOLD;
const DBH_FLOOR = 0.07;
const LIGHT_DEMANDING = 3;

const jobs = Math.min(10, Math.max(1, Number(arg("-j", "10"))));
const names = arg("--arms", Object.keys(ARMS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/135-floored-height/garden"));
const reuse = arg("--reuse", "");
const summaryOnly = process.argv.includes("--summary-only");

// The effective params each garden species reads, per arm (a check that the patch reaches them).
const garden = forestParams(160, 1);
for (const name of names) {
  const p = paramsOf(name, garden);
  const sp = Object.keys(p.species ?? {}).map((s) => {
    const e = speciesParams(p, s);
    const c = e.c1 as unknown as Record<string, unknown>;
    return `${s}[${c.extentLimit ?? "off"},Lx ${c.extentScale ?? "-"},k ${c.extentSteepness ?? "-"},g ${c.extentFloor ?? "-"},spare ${c.extentSpare ?? false}]`;
  });
  const o = p.o4 as unknown as Record<string, unknown>;
  console.log(`${name}: stubs ${o.stubs ?? false} τ ${o.lightMemory ?? 0}; ${sp.join(" ")}`);
}

type Job = { cond: string; width: number; seed: number };
const runDir = ({ cond, width, seed }: Job) => join(out, cond, `w${width}-s${seed}`);
const reused = (j: Job) => reuse !== "" && j.width === 160 && ARMS[j.cond]?.from !== undefined;
const all: Job[] = WIDTHS.flatMap((width) =>
  seeds.flatMap((seed) => names.map((cond) => ({ cond, width, seed }))),
);

/** JSON with sorted keys, to compare params whatever their key order. */
const canon = (x: unknown): string =>
  Array.isArray(x)
    ? `[${x.map(canon).join(",")}]`
    : x && typeof x === "object"
      ? `{${Object.keys(x)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canon((x as Record<string, unknown>)[k])}`)
          .join(",")}}`
      : JSON.stringify(x);

if (!summaryOnly) {
  await sim(forestParams(66, 1), 1, join(out, "build"));
  const check: string[] = [];
  for (const j of all.filter(reused)) {
    const from = realpathSync(join(reuse, ARMS[j.cond]?.from as string, `w${j.width}-s${j.seed}`));
    const theirs = JSON.parse(readFileSync(join(from, "record.json"), "utf8")).params;
    const same = canon(theirs) === canon(paramsOf(j.cond, forestParams(j.width, j.seed)));
    check.push(`${j.cond} w${j.width} s${j.seed}: params ${same ? "=" : "≠"} (${from})`);
    if (!same) throw new Error(`${j.cond} w${j.width} s${j.seed}: the reused run's params differ`);
    if (!existsSync(runDir(j))) {
      mkdirSync(join(out, j.cond), { recursive: true });
      symlinkSync(from, runDir(j));
    }
  }
  const t0 = performance.now();
  await pool(
    all.filter((j) => !reused(j)),
    jobs,
    async (j) => {
      if (existsSync(join(runDir(j), "hash.txt"))) return;
      const params = paramsOf(j.cond, forestParams(j.width, j.seed));
      await sim(params, SEASONS, runDir(j), ["--snapshots", SNAPSHOTS]);
    },
  );
  const wall = (performance.now() - t0) / 1000;
  let same = 0;
  let n = 0;
  for (const j of all.filter((j) => j.width === 66 && ARMS[j.cond]?.from !== undefined)) {
    if (!reuse) break;
    const theirs = join(reuse, ARMS[j.cond]?.from as string, `w66-s${j.seed}`, "hash.txt");
    if (!existsSync(theirs)) continue;
    const a = readFileSync(join(runDir(j), "hash.txt"), "utf8").trim();
    const b = readFileSync(theirs, "utf8").trim();
    n++;
    if (a === b) same++;
    check.push(`${j.cond} w66 s${j.seed}: ${a} ${a === b ? "=" : "≠"} ${b}`);
  }
  check.push(`params equal for every linked run; hashes at 66 equal: ${same} of ${n}`);
  if (reuse) writeFileSync(join(out, "reuse-check.txt"), `${check.join("\n")}\n`);
  console.log(check.at(-1));
  console.log(`runs wall ${(wall / 60).toFixed(1)} min on ${jobs} simulators`);
}

// --- The summary: the ramp re-probe's run.ts measures, unchanged.
function* rows(path: string): Generator<Record<string, string>> {
  const text = readFileSync(path, "utf8");
  let at = text.indexOf("\n");
  const head = text.slice(0, at).split(",");
  while (at >= 0 && at < text.length - 1) {
    const next = text.indexOf("\n", at + 1);
    const line = text.slice(at + 1, next < 0 ? undefined : next);
    at = next;
    if (!line) continue;
    const v = line.split(",");
    yield Object.fromEntries(head.map((k, i) => [k, v[i] as string]));
  }
}

/** DBH (metres) of each tree at each frame, keyed `${season}:${tree}`. */
function dbhs(dir: string): Map<string, number> {
  type Cols = { [K in keyof Columns]: number[] };
  const trees = new Map<string, { cols: Cols; index: Map<string, number> }>();
  for (const r of rows(join(dir, "metamers.csv"))) {
    const key = `${r.season}:${r.tree}`;
    let t = trees.get(key);
    if (!t) {
      const cols: Cols = {
        parent: [],
        baseX: [],
        baseY: [],
        baseZ: [],
        hx: [],
        hy: [],
        hz: [],
        length: [],
        radius: [],
      };
      t = { cols, index: new Map() };
      trees.set(key, t);
    }
    const c = t.cols;
    t.index.set(r.birthId as string, c.length.length);
    c.parent.push(t.index.get(r.parentBirthId as string) ?? -1);
    c.baseX.push(Number(r.x0));
    c.baseY.push(Number(r.y0));
    c.baseZ.push(Number(r.z0));
    c.hx.push(Number(r.hx));
    c.hy.push(Number(r.hy));
    c.hz.push(Number(r.hz));
    c.length.push(Number(r.length));
    c.radius.push(Number(r.radius));
  }
  const res = new Map<string, number>();
  for (const [key, t] of trees) res.set(key, allometry(t.cols, { metamer: [], state: [] }).dbh);
  return res;
}

function summarise(j: Job) {
  const dir = runDir(j);
  const params = JSON.parse(readFileSync(join(dir, "record.json"), "utf8")).params as Params;
  const depth = params.world.depth ?? 64;
  const ha = (j.width * depth * 0.0625) / 10_000;
  const tolerance = (sp: string) =>
    params.species?.[sp]?.o4?.shadeTolerance ?? params.o4.shadeTolerance ?? 3;
  const stand = [...rows(join(dir, "stand.csv"))];
  const ref = new Map(stand.map((r) => [Number(r.season), Number(r.topHeight100)]));
  const isCanopy = (season: number, h: number) =>
    h >= DRAWN && h > 0.5 * (ref.get(season) ?? Number.POSITIVE_INFINITY);
  const dbh = dbhs(dir);
  const meta = JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).meta;
  type Seen = { id: string; sp: string; h: number };
  const atFrame = new Map<number, Seen[]>(FRAMES.map((s) => [s, []]));
  const last = new Map<string, { season: number; h: number; alive: boolean }>();
  let canopyDeaths = 0;
  let thrown = 0;
  for (const r of rows(join(dir, "metrics.csv"))) {
    const season = Number(r.season);
    const h = Number(r.height);
    const id = r.tree as string;
    const before = last.get(id);
    if (r.alive === "1") {
      atFrame.get(season)?.push({ id, sp: r.species as string, h });
      last.set(id, { season, h, alive: true });
    } else if (before?.alive) {
      if (isCanopy(before.season, before.h)) {
        if (Number(r.broken) > 0) thrown++;
        else canopyDeaths++;
      }
      last.set(id, { ...before, alive: false });
    }
  }
  const frames = FRAMES.map((s) => {
    const row = stand.find((r) => Number(r.season) === s);
    const drawn = Number(row?.drawn ?? 0);
    const canopy = Number(row?.canopy ?? 0);
    const trees = atFrame.get(s) ?? [];
    const big = trees.filter((t) => (dbh.get(`${s}:${t.id}`) ?? 0) >= DBH_FLOOR);
    const bigCanopy = big.filter((t) => isCanopy(s, t.h)).length;
    const stems7PerHa = Math.round(big.length / ha);
    return {
      season: s,
      drawnPerHa: Math.round(drawn / ha),
      canopyShareDrawn: drawn ? canopy / drawn : 0,
      stems7PerHa,
      inBand7: stems7PerHa >= 200 && stems7PerHa <= 400,
      canopyShare7: big.length ? bigCanopy / big.length : 0,
      lightDemanderInCanopy: trees.some(
        (t) => isCanopy(s, t.h) && tolerance(t.sp) < LIGHT_DEMANDING,
      ),
    };
  });
  const canopyFrom = (s: number) =>
    Math.min(...stand.filter((r) => Number(r.season) >= s).map((r) => Number(r.canopy)));
  return {
    ...j,
    hash: readFileSync(join(dir, "hash.txt"), "utf8").trim(),
    gate1: canopyFrom(51) >= 1,
    gate2: canopyFrom(100) >= 1,
    canopyPerHa100: median(
      stand.filter((r) => Number(r.season) >= 100).map((r) => Number(r.canopy) / ha),
    ),
    canopyDeaths,
    thrown,
    capSeasons: Number(meta.capSeasons),
    frames,
    wall: Number(readFileSync(join(dir, "wall.txt"), "utf8")),
  };
}
type Summary = ReturnType<typeof summarise>;

const counts = (rs: Summary[]) => {
  const fr = rs.flatMap((r) => r.frames);
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
  return {
    runs: rs.length,
    gate1: rs.filter((r) => r.gate1).length,
    gate2: rs.filter((r) => r.gate2).length,
    frames: fr.length,
    inBand7: fr.filter((f) => f.inBand7).length,
    canopyShare7At60: fr.filter((f) => f.canopyShare7 >= 0.6).length,
    canopyPerHa100: median(rs.map((r) => r.canopyPerHa100)),
    runsCanopy120: rs.filter((r) => r.canopyPerHa100 >= 120).length,
    canopyDeathsPerRun: mean(rs.map((r) => r.canopyDeaths)),
    thrownPerRun: mean(rs.map((r) => r.thrown)),
    lightDemanderFrames: fr.filter((f) => f.lightDemanderInCanopy).length,
    stems7PerHaMedian: median(fr.map((f) => f.stems7PerHa)),
    drawnPerHaMedian: median(fr.map((f) => f.drawnPerHa)),
    capSeasonsMedian: median(rs.map((r) => r.capSeasons)),
    wallMedian: median(rs.map((r) => r.wall)),
    hashes: [...rs].sort((a, b) => a.seed - b.seed).map((r) => r.hash),
  };
};

for (const cond of names) {
  const runs = all
    .filter((j) => j.cond === cond && existsSync(join(runDir(j), "hash.txt")))
    .map(summarise);
  const byWidth = Object.fromEntries(
    WIDTHS.map((w) => [w, counts(runs.filter((r) => r.width === w))]),
  );
  mkdirSync(join(out, cond), { recursive: true });
  writeFileSync(
    join(out, cond, "summary.json"),
    JSON.stringify({ cond, arm: ARMS[cond], seeds, byWidth, runs }, null, 1),
  );
  const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "-");
  for (const w of WIDTHS) {
    const c = byWidth[w] as ReturnType<typeof counts>;
    console.log(
      `${cond} ${w}: runs ${c.runs} gate1 ${c.gate1} gate2 ${c.gate2} | canopy/ha ${f2(c.canopyPerHa100)} (runs ≥120: ${c.runsCanopy120}) | ≥7 band ${c.inBand7}/${c.frames} (med ${c.stems7PerHaMedian}) share≥0.6 ${c.canopyShare7At60} | deaths ${f2(c.canopyDeathsPerRun)} thrown ${f2(c.thrownPerRun)} | LD ${c.lightDemanderFrames} | drawn ${c.drawnPerHaMedian}/ha | cap ${c.capSeasonsMedian} | wall ${c.wallMedian.toFixed(0)} s`,
    );
  }
}
