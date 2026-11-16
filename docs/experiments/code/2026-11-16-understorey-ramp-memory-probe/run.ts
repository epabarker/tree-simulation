/**
 * #132's ramp re-probe with O4's light memory on (docs/experiments/2026-11-16-understorey-ramp-
 * memory-probe.md; bars fixed before any run). ADR 0068's `topLight` ramp, ADR 0072's stubs (s3d)
 * and ADR 0073's light memory (τ 2.5), plus #134's B2 (beech λ₀ 0.6708), on the garden
 * (`forestParams`) at widths 160 and 66, seeds 1–20, to season 300, natively, metamers at 100, 200
 * and 300.
 *
 * Arms: head; s3d; M (s3d + o4.lightMemory 2.5, the light-memory probe's s3dT25); Mr10, Mr15, Mr25
 * (M + the ramp at θ_hi 0.10, 0.15, 0.25, m_s 1, θ_sp per species); s3dr15 (s3d + the ramp at 0.15,
 * memory off: the control); MB2 (M + B2); Mr15B2 (Mr15 + B2).
 *
 * Reuse: head, s3d and M at 160 cells are linked from the light-memory probe's runs (`--reuse`,
 * its runs/light-memory-probe; arm names head, s3d, s3dT25) after their record's params are
 * checked equal to this script's; at 66 cells they are re-run here (the phone's wall time within
 * one load, and the reuse check: each hash must equal the light-memory probe's).
 *
 *   node docs/experiments/code/2026-11-16-understorey-ramp-memory-probe/run.ts -j 10 --seeds 1-3 \
 *     --reuse <light-memory-probe runs dir>          the pilot
 *   node …/run.ts -j 10 --reuse <dir>                seeds 1–20 (resumable: reuses the pilot's runs)
 *   node …/run.ts --summary-only                     the summary and the tests, no runs
 *
 * Writes runs/132-ramp-memory/<arm>/{w<width>-s<seed>/, summary.json}, tests.json, reuse-check.txt
 * (generated, never committed). The bars are judged by bars.ts beside this file.
 */
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { allometry, type Columns } from "../../../../cli/allometry.ts";
import { arg, median, type Patch, patched, pool, sim } from "../../../../cli/shared.ts";
import { withAssign } from "../../../../cli/trials.ts";
import { type Params, speciesParams } from "../../../../src/core/params.ts";
import { DISPLAY_THRESHOLD, forestParams, loneTreeParams } from "../../../../src/core/presets.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** θ_sp per species, as the first #132 probe set it (cli/understorey-probe.ts `SURVIVAL_LIGHT`). */
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
const S3D = { stubs: true, stubLight: 0.15, stubDeath: 3, stubDemote: 0.075 };
const MEM = { ...S3D, lightMemory: 2.5 };
const ramp = (theta: number) => ({
  suppressionSignal: "topLight",
  topLightThreshold: theta,
  mSuppression: 1,
});
const B2 = { "r2.levels.0.lambda": 0.6708 };
type Arm = { o4?: Record<string, unknown>; ramp?: boolean; b2?: boolean; from?: string };
export const ARMS: Record<string, Arm> = {
  head: { from: "head" },
  s3d: { o4: S3D, from: "s3d" },
  M: { o4: MEM, from: "s3dT25" },
  Mr10: { o4: { ...MEM, ...ramp(0.1) }, ramp: true },
  Mr15: { o4: { ...MEM, ...ramp(0.15) }, ramp: true },
  Mr25: { o4: { ...MEM, ...ramp(0.25) }, ramp: true },
  s3dr15: { o4: { ...S3D, ...ramp(0.15) }, ramp: true },
  MB2: { o4: MEM, b2: true },
  Mr15B2: { o4: { ...MEM, ...ramp(0.15) }, ramp: true, b2: true },
};
/** `base` under arm `name`: the world's o4 fields, θ_sp per species, then beech's B2 assign. */
export const paramsOf = (name: string, base: Params): Params => {
  const a = ARMS[name] as Arm;
  const patch: Patch = {};
  if (a.o4) patch.params = { o4: a.o4 } as Patch["params"];
  if (a.ramp)
    patch.species = Object.fromEntries(
      Object.entries(SURVIVAL_LIGHT).map(([sp, q]) => [sp, { o4: { survivalLight: q } }]),
    ) as Patch["species"];
  const p = patched(base, patch);
  return a.b2 ? withAssign(p, "beech", B2) : p;
};

const WIDTHS = [160, 66];
const SEASONS = 300;
const FRAMES = [100, 200, 300];
const SNAPSHOTS = "100,200";
const DRAWN = DISPLAY_THRESHOLD;
const DBH_FLOOR = 0.07;
const LIGHT_DEMANDING = 3;
const LONE = { species: ["oak", "hornbeam"], seeds: [1, 2, 3], seasons: 100 };

const jobs = Math.min(10, Math.max(1, Number(arg("-j", "10"))));
const names = arg("--arms", Object.keys(ARMS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/132-ramp-memory"));
const reuse = arg("--reuse", "");
const summaryOnly = process.argv.includes("--summary-only");
const withTests = !process.argv.includes("--no-tests");

// The effective O4 params each garden species reads, per arm (a check that the patch reaches them).
const garden = forestParams(160, 1);
for (const name of names) {
  const p = paramsOf(name, garden);
  const sp = Object.keys(p.species ?? {}).map((s) => {
    const e = speciesParams(p, s);
    const o = e.o4 as unknown as Record<string, unknown>;
    const lam = (e.r2 as unknown as { levels: { lambda: number }[] }).levels[0]?.lambda;
    return `${s}[${o.suppressionSignal},θ${o.topLightThreshold},m${o.mSuppression},sp${o.survivalLight ?? "-"},c5 ${e.c5?.enabled},λ₀ ${lam?.toFixed(4)}]`;
  });
  const o = p.o4 as unknown as Record<string, unknown>;
  console.log(
    `${name}: stubs ${o.stubs ?? false} τ ${o.lightMemory ?? 0} rotate ${p.c2?.rotate} maxTrees ${o.maxTrees}; ${sp.join(" ")}`,
  );
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

let runsWall = 0;
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
  runsWall = (performance.now() - t0) / 1000;
  // The reuse check at 66 cells: this build's head, s3d and M against the light-memory probe's.
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
  console.log(`runs wall ${(runsWall / 60).toFixed(1)} min on ${jobs} simulators`);
}

// --- The summary (cli/understorey-probe.ts's measures, with the cohort and the cap per run).
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
  // The cohort (the first probe's cohort.ts): drawn stems under 7 cm at 200, dead by 300?
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
      bank: trees.filter((t) => t.h < DRAWN).length,
    };
  });
  const canopyFrom = (s: number) =>
    Math.min(...stand.filter((r) => Number(r.season) >= s).map((r) => Number(r.canopy)));
  return {
    ...j,
    commit: meta.commit as string,
    hash: readFileSync(join(dir, "hash.txt"), "utf8").trim(),
    gate1: canopyFrom(51) >= 1,
    gate2: canopyFrom(100) >= 1,
    canopyPerHa100: median(
      stand.filter((r) => Number(r.season) >= 100).map((r) => Number(r.canopy) / ha),
    ),
    canopyDeaths,
    thrown,
    capSeasons: Number(meta.capSeasons),
    cohort,
    cohortDead,
    cohortCrossed,
    frames,
    wall: Number(readFileSync(join(dir, "wall.txt"), "utf8")),
  };
}
type Summary = ReturnType<typeof summarise>;

const counts = (rs: Summary[]) => {
  const fr = rs.flatMap((r) => r.frames);
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
  const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
  const bySeed = [...rs].sort((a, b) => a.seed - b.seed);
  return {
    runs: rs.length,
    gate1: rs.filter((r) => r.gate1).length,
    gate2: rs.filter((r) => r.gate2).length,
    frames: fr.length,
    inBand7: fr.filter((f) => f.inBand7).length,
    canopyShare7At60: fr.filter((f) => f.canopyShare7 >= 0.6).length,
    canopyPerHa100: median(rs.map((r) => r.canopyPerHa100)),
    canopyDeathsPerRun: mean(rs.map((r) => r.canopyDeaths)),
    thrownPerRun: mean(rs.map((r) => r.thrown)),
    lightDemanderFrames: fr.filter((f) => f.lightDemanderInCanopy).length,
    stems7PerHaMedian: median(fr.map((f) => f.stems7PerHa)),
    stems7PerHaByFrame: FRAMES.map((s) =>
      median(fr.filter((f) => f.season === s).map((f) => f.stems7PerHa)),
    ),
    canopyShare7Median: median(fr.map((f) => f.canopyShare7)),
    drawnPerHaMedian: median(fr.map((f) => f.drawnPerHa)),
    bankMedian: median(fr.map((f) => f.bank)),
    capSeasonsMedian: median(rs.map((r) => r.capSeasons)),
    capPerRun: bySeed.map((r) => r.capSeasons),
    cohortPerRun: sum(rs.map((r) => r.cohort)) / Math.max(1, rs.length),
    cohortDeadShare: sum(rs.map((r) => r.cohortDead)) / Math.max(1, sum(rs.map((r) => r.cohort))),
    cohortCrossedShare:
      sum(rs.map((r) => r.cohortCrossed)) /
      Math.max(1, sum(rs.map((r) => r.cohort - r.cohortDead))),
    wallMedian: median(rs.map((r) => r.wall)),
    hashes: bySeed.map((r) => r.hash),
  };
};
export type Counts = ReturnType<typeof counts>;

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
    const c = byWidth[w] as Counts;
    console.log(
      `${cond} ${w}: runs ${c.runs} gate1 ${c.gate1} gate2 ${c.gate2} | ≥7 band ${c.inBand7}/${c.frames} (med ${c.stems7PerHaMedian}) share≥0.6 ${c.canopyShare7At60} | canopy/ha ${f2(c.canopyPerHa100)} deaths ${f2(c.canopyDeathsPerRun)} | LD ${c.lightDemanderFrames} | cap ${c.capSeasonsMedian} | cohort dead ${f2(c.cohortDeadShare)} | wall ${c.wallMedian.toFixed(0)} s`,
    );
  }
}

// --- The tests: gate 3 (checkpoints) and gate 4 (lone hashes), as the first #132 probe's.
if (withTests) {
  const tests: Record<string, Record<string, boolean | string>> = {};
  const lone = LONE.species.flatMap((sp) => LONE.seeds.map((seed) => ({ sp, seed })));
  const loneDir = (cond: string, x: { sp: string; seed: number }) =>
    join(out, "lone", cond, `${x.sp}-s${x.seed}`);
  for (const cond of [...new Set(["head", ...names])]) {
    await pool(lone, jobs, (x) =>
      existsSync(join(loneDir(cond, x), "hash.txt"))
        ? Promise.resolve()
        : sim(paramsOf(cond, loneTreeParams(x.sp, x.seed)), LONE.seasons, loneDir(cond, x)),
    );
  }
  const hash = (cond: string, x: { sp: string; seed: number }) =>
    readFileSync(join(loneDir(cond, x), "hash.txt"), "utf8").trim();
  for (const cond of names) {
    const t: Record<string, boolean | string> = {};
    for (const x of lone)
      t[`lone ${x.sp} s${x.seed} ${hash(cond, x)}`] = hash(cond, x) === hash("head", x);
    tests[cond] = t;
  }
  const { coreWasm, loadWorldsSync, RustWorld } = await import("../../../../src/wasm/world.ts");
  const { gunzipSync } = await import("node:zlib");
  loadWorldsSync(readFileSync(coreWasm));
  const saved = RustWorld.create(forestParams(66, 1));
  saved.run(30);
  const bytes = saved.save();
  saved.dispose();
  const fixtures: Record<string, Uint8Array> = {
    "checkpoint-v2": readFileSync(join(ROOT, "tests/fixtures/checkpoint-v2.bin")),
    "checkpoint-v3": readFileSync(join(ROOT, "tests/fixtures/checkpoint-v3.bin")),
    "garden-0.14.0": gunzipSync(
      readFileSync(join(ROOT, "tests/fixtures/garden-0.14.0-66-10.bin.gz")),
    ),
  };
  for (const cond of names) {
    const grow = () => {
      const w = RustWorld.load(new Uint8Array(bytes));
      const next = paramsOf(cond, w.params);
      w.setParams({ o4: next.o4, species: next.species } as never);
      w.step(10, true);
      const h = w.hash();
      const alive = w.trees.filter((t) => t.alive).length;
      const p = w.params;
      w.dispose();
      return { h, alive, p, next };
    };
    const a = grow();
    const b = grow();
    const took = canon(a.p.o4) === canon(a.next.o4) && canon(a.p.species) === canon(a.next.species);
    const t = tests[cond] ?? {};
    t["garden checkpoint (66, seed 1, season 30) loads, takes the arm's params, grows on alike"] =
      a.alive > 0 && a.h === b.h && took;
    for (const [name, fx] of Object.entries(fixtures)) {
      let ok = false;
      try {
        const w = RustWorld.load(new Uint8Array(fx));
        ok = w.trees.length > 0;
        w.dispose();
      } catch {}
      t[`${name} loads`] = ok;
    }
    tests[cond] = t;
  }
  writeFileSync(join(out, "tests.json"), JSON.stringify(tests, null, 1));
  for (const [cond, t] of Object.entries(tests))
    console.log(
      `${cond} tests: ${Object.values(t).filter((v) => v === true).length}/${Object.keys(t).length}`,
    );
}
