/**
 * #138's ramp + low dose on M (docs/experiments/2026-11-20-ramp-and-low-dose.md; arms and bars fixed
 * before any run): ADR 0068's `topLight` ramp at θ_hi 0.10 (the ramp re-probe's "M + ramp 0.10") with
 * R5's shade term on λ (`r5.dLambda`, ADR 0071) at 0.10 and 0.15 on every species, on the candidate
 * garden M (s3d + o4's light memory τ 2.5). A copy of the low-dose ladder's run.ts
 * (code/2026-11-20-sapling-release-low-dose/), with its measures unchanged, the arms and the reuse
 * changed, and the ramp re-probe's cohort (code/2026-11-16-understorey-ramp-memory-probe/run.ts)
 * added to each garden.
 *
 * Reuse (each linked run's params are checked equal to this script's, or the script stops):
 * - from the low-dose ladder (`--reuse-dl`, its runs/138-dl-ladder): M's 160-cell gardens and sapling
 *   probes; Mdl10's and Mdl15's gardens at both widths, sapling probes and lone trees;
 * - from the ramp re-probe (`--reuse-ramp`, its runs/132-ramp-memory): Mr10's 160-cell gardens.
 * On seeds 1–3 every linked garden and sapling probe is re-run under check/ and must hash (garden)
 * and byte-compare (saplings.csv) equal. M's and Mr10's 66-cell gardens and M's lone trees are
 * re-run on all seeds (the phone's wall within one load) and each hash must equal its source's.
 *
 *   node docs/experiments/code/2026-11-20-ramp-low-dose/run.ts -j 10 --seeds 1-3 --reuse-dl <dir> --reuse-ramp <dir>
 *   node …/run.ts -j 10 --reuse-dl <dir> --reuse-ramp <dir>   seeds 1–20 (resumable: keeps the pilot's runs)
 *   node …/run.ts --summary-only                            the summary, no runs
 *
 * Writes runs/138-ramp-dl/<arm>/{w<width>-s<seed>/, saplings160-s<seed>/, summary.json}, lone/,
 * check/, reuse-check.txt (generated, never committed). bars.ts beside this file judges the bars;
 * stand.py reads bar 8 through #134's stand.py.
 */
import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { allometry, CELL, type Columns } from "../../../../cli/allometry.ts";
import { arg, median, type Patch, patched, pool, sim } from "../../../../cli/shared.ts";
import { type Params, speciesParams } from "../../../../src/core/params.ts";
import { DISPLAY_THRESHOLD, forestParams, loneTreeParams } from "../../../../src/core/presets.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const SPECIES = Object.keys(forestParams(160, 1).species ?? {});
const S3D = { stubs: true, stubLight: 0.15, stubDeath: 3, stubDemote: 0.075 };
const MEM = { ...S3D, lightMemory: 2.5 };
/** θ_sp per species, as the ramp re-probe set it (cli/understorey-probe.ts `SURVIVAL_LIGHT`). */
const SURVIVAL_LIGHT: Record<string, number> = {
  birch: 0.21,
  oak: 0.114,
  beech: 0.034,
  hornbeam: 0.033,
  willow: 0.16,
  rowan: 0.11,
  maple: 0.075,
  holly: 0.035,
  pine: 0.25,
  fir: 0.0275,
};
/** The ramp re-probe's ramp: `topLight` at θ_hi, m_s 1. */
const ramp = (theta: number) => ({
  suppressionSignal: "topLight",
  topLightThreshold: theta,
  mSuppression: 1,
});
type Src = "dl" | "ramp";
/**
 * `ramp`: θ_hi, with θ_sp on every species; `dl`: R5's δλ on the world and every species' own patch.
 * `link`: the keys (w160, w66, saplings160, lone) linked from `src`'s arm `from`; `rerun`: keys
 * re-run here whose hashes must equal `src`'s.
 */
type Arm = {
  ramp?: number;
  dl?: number;
  src?: Src;
  from?: string;
  link?: string[];
  rerun?: string[];
};
export const ARMS: Record<string, Arm> = {
  M: { src: "dl", from: "M", link: ["w160", "saplings160"], rerun: ["w66", "lone"] },
  Mr10: { ramp: 0.1, src: "ramp", from: "Mr10", link: ["w160"], rerun: ["w66"] },
  Mdl10: { dl: 0.1, src: "dl", from: "Mdl10", link: ["w160", "w66", "saplings160", "lone"] },
  Mdl15: { dl: 0.15, src: "dl", from: "Mdl15", link: ["w160", "w66", "saplings160", "lone"] },
  Mr10dl10: { ramp: 0.1, dl: 0.1 },
  Mr10dl15: { ramp: 0.1, dl: 0.15 },
};
export const paramsOf = (name: string, base: Params): Params => {
  const a = ARMS[name] as Arm;
  const o4 = a.ramp !== undefined ? { ...MEM, ...ramp(a.ramp) } : MEM;
  const patch: Patch = {
    params: (a.dl !== undefined ? { o4, r5: { dLambda: a.dl } } : { o4 }) as Patch["params"],
  };
  if (a.ramp !== undefined || a.dl !== undefined) {
    // Only species the base's table has: a lone tree's table holds its own species alone.
    const species = Object.keys(base.species ?? {});
    patch.species = Object.fromEntries(
      species
        .map((sp) => {
          const x: Record<string, unknown> = {};
          if (a.ramp !== undefined && SURVIVAL_LIGHT[sp] !== undefined)
            x.o4 = { survivalLight: SURVIVAL_LIGHT[sp] };
          if (a.dl !== undefined) x.r5 = { dLambda: a.dl };
          return [sp, x] as const;
        })
        .filter(([, x]) => Object.keys(x).length > 0),
    ) as Patch["species"];
  }
  return patched(base, patch);
};

const WIDTHS = [160, 66];
const SEASONS = 300;
const FRAMES = [100, 200, 300];
const SNAPSHOTS = "100,200";
const DRAWN = DISPLAY_THRESHOLD;
const DBH_FLOOR = 0.07;
const LIGHT_DEMANDING = 3;
/** The sapling class, cells (1–5 m), and the probe's window (1–10 m from season 40). */
const SAPLING = { lo: 4, hi: 20, probeHi: 40, from: 40 };
const LONE = { species: ["beech", "hornbeam", "oak", "maple"], seeds: [1, 2, 3], seasons: 100 };
/** The realism bar's saplings: beech and hornbeam whose top bud is shaded (R5's s = 1 − Q/C > 0.5). */
const SHADED = { species: ["beech", "hornbeam"], qTop: 0.5 };
/** Seeds whose linked runs are re-run under check/ and compared. */
const CHECK = [1, 2, 3];

const jobs = Math.min(10, Math.max(1, Number(arg("-j", "10"))));
const names = arg("--arms", Object.keys(ARMS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/138-ramp-dl"));
const sources: Record<Src, string> = { dl: arg("--reuse-dl", ""), ramp: arg("--reuse-ramp", "") };
const summaryOnly = process.argv.includes("--summary-only");

// The effective params each garden species reads, per arm (a check that the patch reaches them).
for (const name of names) {
  const p = paramsOf(name, forestParams(160, 1));
  const sp = SPECIES.map((s) => {
    const e = speciesParams(p, s);
    const o = e.o4 as unknown as Record<string, unknown>;
    return `${s} δλ ${e.r5.dLambda} (r5 ${e.r5.enabled}) ${o.suppressionSignal} θ${o.topLightThreshold} m${o.mSuppression} sp${o.survivalLight ?? "-"} c5 ${e.c5?.enabled}`;
  });
  const o = p.o4 as unknown as Record<string, unknown>;
  console.log(`${name}: stubs ${o.stubs} τ ${o.lightMemory}; ${sp.join(", ")}`);
}

type Job = { kind: "garden" | "saplings" | "lone"; cond: string; seed: number; key: string };
const dirOf = (j: Job) =>
  j.kind === "lone"
    ? join(out, "lone", j.cond, `${j.key}-s${j.seed}`)
    : join(out, j.cond, `${j.key}-s${j.seed}`);
/** The same run in a source's directory (the same layout in both probes). */
const sourceOf = (j: Job) => {
  const a = ARMS[j.cond] as Arm;
  const root = sources[a.src as Src];
  return j.kind === "lone"
    ? join(root, "lone", a.from as string, `${j.key}-s${j.seed}`)
    : join(root, a.from as string, `${j.key}-s${j.seed}`);
};
const keyOf = (j: Job) => (j.kind === "lone" ? "lone" : j.key);
const doneFile = { garden: "hash.txt", saplings: "saplings.csv", lone: "hash.txt" } as const;
const linked = (j: Job) => ARMS[j.cond]?.link?.includes(keyOf(j)) === true;
const rerun = (j: Job) => ARMS[j.cond]?.rerun?.includes(keyOf(j)) === true;
const checkDir = (j: Job) => join(out, "check", j.cond, `${j.key}-s${j.seed}`);
const all: Job[] = [
  ...seeds.flatMap((seed) =>
    names.flatMap((cond) => [
      { kind: "saplings" as const, cond, seed, key: "saplings160" },
      { kind: "garden" as const, cond, seed, key: "w160" },
      { kind: "garden" as const, cond, seed, key: "w66" },
    ]),
  ),
  ...names.flatMap((cond) =>
    LONE.species.flatMap((sp) =>
      LONE.seeds.map((seed) => ({ kind: "lone" as const, cond, seed, key: sp })),
    ),
  ),
];

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

const target = join(ROOT, "rust", "target", "native");
const PROBE = join(target, "release", "examples", "sapling_probe");
function probe(params: Params, dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "params.json");
  writeFileSync(file, JSON.stringify(params));
  const args = [file, SEASONS, SAPLING.from, SAPLING.lo, SAPLING.probeHi].map(String);
  const part = join(dir, "saplings.part");
  const fd = openSync(part, "w");
  const t0 = performance.now();
  return new Promise((ok, bad) => {
    const c = spawn(PROBE, args, { stdio: ["ignore", fd, "inherit"] });
    c.on("exit", (code) => {
      closeSync(fd);
      if (code !== 0) return bad(new Error(`${dir}: exit ${code}`));
      renameSync(part, join(dir, "saplings.csv"));
      writeFileSync(join(dir, "wall.txt"), String((performance.now() - t0) / 1000));
      ok();
    });
  });
}

if (!summaryOnly) {
  await sim(forestParams(66, 1), 1, join(out, "build"));
  execFileSync(
    "cargo",
    ["build", "--release", "--quiet", "--locked", "--example", "sapling_probe", "--target-dir", target],
    { cwd: join(ROOT, "rust", "core"), stdio: "inherit" },
  );
  const check: string[] = [];
  const baseOf = (j: Job) =>
    j.kind === "lone"
      ? loneTreeParams(j.key, j.seed)
      : forestParams(j.kind === "saplings" ? 160 : Number(j.key.slice(1)), j.seed);
  for (const j of all.filter(linked)) {
    const src = ARMS[j.cond]?.src as Src;
    if (!sources[src]) throw new Error(`${j.cond}: --reuse-${src} is needed`);
    const from = realpathSync(sourceOf(j));
    const theirs =
      j.kind === "saplings"
        ? JSON.parse(readFileSync(join(from, "params.json"), "utf8"))
        : JSON.parse(readFileSync(join(from, "record.json"), "utf8")).params;
    const same = canon(theirs) === canon(paramsOf(j.cond, baseOf(j)));
    check.push(`${j.cond} ${j.key} s${j.seed}: params ${same ? "=" : "≠"} (${from})`);
    if (!same) throw new Error(`${j.cond} ${j.key} s${j.seed}: the reused run's params differ`);
    if (!existsSync(dirOf(j))) {
      mkdirSync(join(dirOf(j), ".."), { recursive: true });
      symlinkSync(from, dirOf(j));
    }
  }
  const t0 = performance.now();
  // Linked gardens and sapling probes on CHECK's seeds are re-run (lone trees are cheap and linked).
  const checks = all.filter((j) => linked(j) && j.kind !== "lone" && CHECK.includes(j.seed));
  type Run = Job & { at?: string };
  const long = (j: Job) => Number(j.kind !== "lone" && j.key !== "w66");
  const todo: Run[] = [
    ...all.filter((j) => !linked(j)),
    ...checks.map((j) => ({ ...j, at: checkDir(j) })),
  ].sort((a, b) => long(b) - long(a)); // the longest first: 160-cell gardens and the sapling probe
  await pool(todo, jobs, async (j: Run) => {
    const at = j.at ?? dirOf(j);
    if (existsSync(join(at, doneFile[j.kind]))) return;
    if (j.kind === "lone") {
      await sim(paramsOf(j.cond, loneTreeParams(j.key, j.seed)), LONE.seasons, at);
    } else if (j.kind === "saplings") {
      await probe(paramsOf(j.cond, forestParams(160, j.seed)), at);
    } else {
      const w = Number(j.key.slice(1));
      await sim(paramsOf(j.cond, forestParams(w, j.seed)), SEASONS, at, ["--snapshots", SNAPSHOTS]);
    }
  });
  const wall = (performance.now() - t0) / 1000;
  let same = 0;
  let n = 0;
  // Re-runs on every seed (M's and Mr10's 66-cell gardens, M's lone trees): hashes equal the source's.
  for (const j of all.filter(rerun)) {
    const src = ARMS[j.cond]?.src as Src;
    if (!sources[src]) continue;
    const theirs = join(sourceOf(j), "hash.txt");
    if (!existsSync(theirs)) continue;
    const a = readFileSync(join(dirOf(j), "hash.txt"), "utf8").trim();
    const b = readFileSync(theirs, "utf8").trim();
    n++;
    if (a === b) same++;
    check.push(`${j.cond} ${j.key} s${j.seed} re-run: ${a} ${a === b ? "=" : "≠"} ${b}`);
  }
  // The linked runs, re-run on CHECK's seeds: the garden's hash and saplings.csv's bytes.
  for (const j of checks) {
    const file = j.kind === "saplings" ? "saplings.csv" : "hash.txt";
    const a = readFileSync(join(checkDir(j), file));
    const b = readFileSync(join(dirOf(j), file));
    n++;
    if (a.equals(b)) same++;
    check.push(`${j.cond} ${j.key} s${j.seed} check: ${file} ${a.equals(b) ? "=" : "≠"} linked`);
  }
  check.push(`params equal for every linked run; re-runs equal to their sources': ${same} of ${n}`);
  writeFileSync(join(out, "reuse-check.txt"), `${check.join("\n")}\n`);
  console.log(check.at(-1));
  console.log(`runs wall ${(wall / 60).toFixed(1)} min on ${jobs} simulators`);
}

// --- Reading.
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

/** DBH (metres) of each tree at each frame, keyed `${season}:${tree}` (cli/allometry.ts). */
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

/** One garden run: the ramp re-probe's run.ts measures, unchanged, with its cohort. */
function garden(cond: string, width: number, seed: number) {
  const dir = join(out, cond, `w${width}-s${seed}`);
  const params = JSON.parse(readFileSync(join(dir, "record.json"), "utf8")).params as Params;
  const ha = (width * (params.world.depth ?? 64) * 0.0625) / 10_000;
  const tolerance = (sp: string) =>
    params.species?.[sp]?.o4?.shadeTolerance ?? params.o4.shadeTolerance ?? 3;
  const stand = [...rows(join(dir, "stand.csv"))];
  const ref = new Map(stand.map((r) => [Number(r.season), Number(r.topHeight100)]));
  const isCanopy = (s: number, h: number) =>
    h >= DRAWN && h > 0.5 * (ref.get(s) ?? Number.POSITIVE_INFINITY);
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
  // The cohort (the ramp re-probe's run.ts, unchanged): drawn stems under 7 cm at 200, dead by 300?
  const alive300 = new Set((atFrame.get(300) ?? []).map((t) => t.id));
  let cohort = 0;
  let cohortDead = 0;
  let cohortCrossed = 0;
  for (const t of atFrame.get(200) ?? []) {
    if (t.h < DRAWN || (dbh.get(`200:${t.id}`) ?? 0) >= DBH_FLOOR) continue;
    cohort++;
    if (!alive300.has(t.id)) cohortDead++;
    else if ((dbh.get(`300:${t.id}`) ?? 0) >= DBH_FLOOR) cohortCrossed++;
  }
  const frames = FRAMES.map((s) => {
    const trees = atFrame.get(s) ?? [];
    const big = trees.filter((t) => (dbh.get(`${s}:${t.id}`) ?? 0) >= DBH_FLOOR);
    const stems7PerHa = Math.round(big.length / ha);
    return {
      season: s,
      stems7: big.length,
      stems7PerHa,
      inBand7: stems7PerHa >= 200 && stems7PerHa <= 400,
      canopyShare7: big.length ? big.filter((t) => isCanopy(s, t.h)).length / big.length : 0,
      lightDemanderInCanopy: trees.some(
        (t) => isCanopy(s, t.h) && tolerance(t.sp) < LIGHT_DEMANDING,
      ),
      bank: trees.filter((t) => t.h < DRAWN).length,
      canopyBySpecies: trees
        .filter((t) => isCanopy(s, t.h))
        .reduce<Record<string, number>>((m, t) => {
          m[t.sp] = (m[t.sp] ?? 0) + 1;
          return m;
        }, {}),
      topHeight: ref.get(s) ?? 0,
    };
  });
  const canopyFrom = (s: number) =>
    Math.min(...stand.filter((r) => Number(r.season) >= s).map((r) => Number(r.canopy)));
  return {
    seed,
    hash: readFileSync(join(dir, "hash.txt"), "utf8").trim(),
    gate1: canopyFrom(51) >= 1,
    gate2: canopyFrom(100) >= 1,
    canopyPerHa100: median(
      stand.filter((r) => Number(r.season) >= 100).map((r) => Number(r.canopy) / ha),
    ),
    canopyDeaths,
    thrown,
    // Canopy tree-seasons (stand.csv's own count, every season): the denominator of the death rate.
    canopySeasons: stand.reduce((a, r) => a + Number(r.canopy), 0),
    capSeasons: Number(meta.capSeasons),
    cohort,
    cohortDead,
    cohortCrossed,
    frames,
    wall: Number(readFileSync(join(dir, "wall.txt"), "utf8")),
  };
}
type G = ReturnType<typeof garden>;
const gardenCounts = (rs: G[]) => {
  const fr = rs.flatMap((r) => r.frames);
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
  const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
  return {
    runs: rs.length,
    gate1: rs.filter((r) => r.gate1).length,
    gate12: rs.filter((r) => r.gate1 && r.gate2).length,
    frames: fr.length,
    inBand7: fr.filter((f) => f.inBand7).length,
    canopyShare7At60: fr.filter((f) => f.canopyShare7 >= 0.6).length,
    canopyPerHa100: median(rs.map((r) => r.canopyPerHa100)),
    canopyDeathsPerRun: mean(rs.map((r) => r.canopyDeaths)),
    thrownPerRun: mean(rs.map((r) => r.thrown)),
    /** Canopy deaths (not thrown) per canopy tree-season, %, pooled over runs. */
    canopyDeathPct:
      (100 * rs.reduce((a, r) => a + r.canopyDeaths, 0)) /
      Math.max(1, rs.reduce((a, r) => a + r.canopySeasons, 0)),
    /** Each frame's canopy trees by species, pooled over runs, as shares. */
    canopySpeciesByFrame: FRAMES.map((s) => {
      const m: Record<string, number> = {};
      for (const f of fr.filter((f) => f.season === s))
        for (const [sp, k] of Object.entries(f.canopyBySpecies)) m[sp] = (m[sp] ?? 0) + k;
      const n = Object.values(m).reduce((a, k) => a + k, 0);
      return Object.fromEntries(Object.entries(m).map(([sp, k]) => [sp, k / Math.max(1, n)]));
    }),
    lightDemanderFrames: fr.filter((f) => f.lightDemanderInCanopy).length,
    stems7PerHaMedian: median(fr.map((f) => f.stems7PerHa)),
    stems7PerHaByFrame: FRAMES.map((s) =>
      median(fr.filter((f) => f.season === s).map((f) => f.stems7PerHa)),
    ),
    canopyShare7Median: median(fr.map((f) => f.canopyShare7)),
    bankMedian: median(fr.map((f) => f.bank)),
    topHeightMedian: median(fr.map((f) => f.topHeight)),
    capSeasonsMedian: median(rs.map((r) => r.capSeasons)),
    wallMedian: median(rs.map((r) => r.wall)),
    /** The ramp re-probe's cohort, pooled over runs: dead by 300, and survivors ≥ 7 cm at 300. */
    cohortPerRun: sum(rs.map((r) => r.cohort)) / Math.max(1, rs.length),
    cohortDeadShare: sum(rs.map((r) => r.cohortDead)) / Math.max(1, sum(rs.map((r) => r.cohort))),
    cohortCrossedShare:
      sum(rs.map((r) => r.cohortCrossed)) /
      Math.max(1, sum(rs.map((r) => r.cohort - r.cohortDead))),
    /** The phone's bar: stems ≥ 7 cm in the plot (a count) by frame, the median over runs. */
    stems7ByFrame: FRAMES.map((s) => median(fr.filter((f) => f.season === s).map((f) => f.stems7))),
    /** Runs with no stem ≥ 7 cm in the plot at frame 200 or at 300. */
    emptyLate: rs.filter((r) =>
      r.frames.some((f) => (f.season === 200 || f.season === 300) && f.stems7 === 0),
    ).length,
  };
};

type Row = Record<string, number> & { species: string; seed: number };
/** The sapling class over `ss` (the sapling-release probe's measures, unchanged). */
function saplings(cond: string, ss: number[]) {
  const rs: Row[] = [];
  for (const seed of ss) {
    const file = join(out, cond, `saplings160-s${seed}`, "saplings.csv");
    if (!existsSync(file)) continue;
    for (const r of rows(file)) {
      const x = Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, k === "species" ? v : Number(v)]),
      ) as Row;
      x.seed = seed;
      rs.push(x);
    }
  }
  const at = new Map(rs.map((r) => [`${r.seed}:${r.tree}:${r.season}`, r]));
  const sap = rs.filter(
    (r) => r.height >= SAPLING.lo && r.height <= SAPLING.hi && r.season >= 50 && r.season <= 290,
  );
  const gains: number[] = [];
  const shadedGains: number[] = [];
  for (const r of sap) {
    const later = at.get(`${r.seed}:${r.tree}:${r.season + 10}`);
    if (!later) continue;
    const g = (later.height - r.height) * CELL;
    gains.push(g);
    if (SHADED.species.includes(r.species as unknown as string) && r.qTop < SHADED.qTop)
      shadedGains.push(g);
  }
  const share = (xs: Row[], f: (r: Row) => boolean) => xs.filter(f).length / Math.max(1, xs.length);
  const bySpecies = Object.fromEntries(
    [...new Set(sap.map((r) => r.species))]
      .map((sp) => [sp, sap.filter((r) => r.species === sp)] as const)
      .map(([sp, xs]) => [sp, { n: xs.length, noGrowth: share(xs, (r) => r.grew === 0) }]),
  );
  return {
    treeSeasons: sap.length,
    trees: new Set(sap.map((r) => `${r.seed}:${r.tree}`)).size,
    noGrowth: share(sap, (r) => r.grew === 0),
    bySpecies,
    decades: gains.length,
    gainPerDecade: median(gains),
    gainP90: [...gains].sort((a, b) => a - b)[Math.floor(0.9 * (gains.length - 1))] ?? Number.NaN,
    noGainDecades: gains.filter((g) => g <= 0).length / Math.max(1, gains.length),
    shadedDecades: shadedGains.length,
    shadedGain: median(shadedGains),
  };
}

/** A lone tree at 100: its state hash, height and W/H (cells). */
function lone(cond: string, sp: string, seed: number) {
  const dir = join(out, "lone", cond, `${sp}-s${seed}`);
  if (!existsSync(join(dir, "hash.txt"))) return undefined;
  let last: Record<string, string> | undefined;
  for (const r of rows(join(dir, "metrics.csv"))) if (r.alive === "1") last = r;
  const h = Number(last?.height ?? 0);
  return {
    hash: readFileSync(join(dir, "hash.txt"), "utf8").trim(),
    height: h,
    wh: h > 0 ? Number(last?.crownWidth ?? 0) / h : 0,
  };
}

for (const cond of names) {
  const done = (w: number) =>
    seeds.filter((s) => existsSync(join(out, cond, `w${w}-s${s}`, "hash.txt")));
  const byWidth = Object.fromEntries(
    WIDTHS.map((w) => {
      const runs = done(w).map((s) => garden(cond, w, s));
      return [w, { ...gardenCounts(runs), list: runs }];
    }),
  );
  const perSeed = seeds.map((s) => ({ seed: s, ...saplings(cond, [s]) }));
  const summary = {
    cond,
    arm: ARMS[cond],
    seeds,
    byWidth,
    saplings: saplings(cond, seeds),
    perSeed,
    lone: Object.fromEntries(
      LONE.species.map((sp) => [sp, LONE.seeds.map((seed) => lone(cond, sp, seed))]),
    ),
  };
  mkdirSync(join(out, cond), { recursive: true });
  writeFileSync(join(out, cond, "summary.json"), JSON.stringify(summary, null, 1));
  const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "-");
  const s = summary.saplings;
  console.log(
    `${cond}: saplings ${s.treeSeasons} (${s.trees} trees) no growth ${f2(s.noGrowth)} gain ${f2(s.gainPerDecade)} m (P90 ${f2(s.gainP90)}, none ${f2(s.noGainDecades)}); shaded beech+hornbeam ${f2(s.shadedGain)} m (n ${s.shadedDecades}) | ${Object.entries(
      s.bySpecies,
    )
      .filter(([, x]) => x.n >= 30)
      .map(([sp, x]) => `${sp} ${f2(x.noGrowth)}`)
      .join(", ")}`,
  );
  for (const w of WIDTHS) {
    const c = byWidth[w] as ReturnType<typeof gardenCounts>;
    console.log(
      `  ${w}: runs ${c.runs} gate1 ${c.gate1} gate1+2 ${c.gate12} | canopy/ha ${f2(c.canopyPerHa100)} | ≥7 band ${c.inBand7}/${c.frames} (med ${c.stems7PerHaMedian}; ${c.stems7PerHaByFrame.join("/")}) share≥0.6 ${c.canopyShare7At60} | deaths ${f2(c.canopyDeathsPerRun)} (${f2(c.canopyDeathPct)}%/canopy-season) thrown ${f2(c.thrownPerRun)} | cap ${c.capSeasonsMedian} | wall ${f2(c.wallMedian)} s | cohort ${f2(c.cohortPerRun)}/run dead ${f2(c.cohortDeadShare)} crossed ${f2(c.cohortCrossedShare)} | ≥7 in plot ${c.stems7ByFrame.join("/")} (empty at 200|300: ${c.emptyLate})`,
    );
  }
  for (const sp of LONE.species)
    console.log(
      `  lone ${sp}: ${(summary.lone[sp] ?? []).map((x) => (x ? `${x.hash} H${x.height.toFixed(1)} W/H ${f2(x.wh)}` : "-")).join("; ")}`,
    );
}
