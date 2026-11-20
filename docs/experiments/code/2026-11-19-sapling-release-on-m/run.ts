/**
 * #138's re-probe on the candidate garden M (docs/experiments/2026-11-19-sapling-release-on-m.md;
 * arms and bars fixed before any run): R5's shade term on λ (`r5.dLambda`, ADR 0071) raised on M
 * (s3d + o4's light memory τ 2.5, the ramp re-probe's `M`), per species (beech and hornbeam) and
 * for every species. Natively: the garden (`forestParams`) at widths 160 and 66 to season 300
 * (metamers at 100, 200 and 300), the sapling probe (`rust/core/examples/sapling_probe.rs`) on the
 * same 160-cell params, and lone beech, hornbeam, oak and maple to 100 (the hash gate).
 *
 * Reuse: M's gardens at 160 cells are linked from the ramp re-probe's runs (`--reuse`, its
 * runs/132-ramp-memory) after each record's params are checked equal to this script's. At 66 cells
 * M is re-run here: the phone's wall times within one load, and the reuse check (each hash must
 * equal the ramp re-probe's; if any differs, the 160-cell runs are re-run too). M's sapling probe
 * and lone trees are new.
 *
 *   node docs/experiments/code/2026-11-19-sapling-release-on-m/run.ts -j 10 --seeds 1-3 --reuse <dir>
 *   node …/run.ts -j 10 --reuse <dir>                 seeds 1–20 (resumable: keeps the pilot's runs)
 *   node …/run.ts --summary-only                      the summary, no runs
 *
 * Writes runs/138-dl-on-m/<arm>/{w<width>-s<seed>/, saplings160-s<seed>/, summary.json}, lone/,
 * reuse-check.txt (generated, never committed). bars.ts beside this file judges the bars; stand.py
 * reads bar 6 through #134's stand.py.
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
/** R5's δλ on the named species' own patches (and on the world's, when `world`). */
type Arm = { dl?: number; on?: string[]; world?: boolean; from?: string };
export const ARMS: Record<string, Arm> = {
  M: { from: "M" },
  Mbh40: { dl: 0.4, on: ["beech", "hornbeam"] },
  Mdl40: { dl: 0.4, on: SPECIES, world: true },
  Mbh25: { dl: 0.25, on: ["beech", "hornbeam"] },
};
export const paramsOf = (name: string, base: Params): Params => {
  const a = ARMS[name] as Arm;
  const patch: Patch = { params: { o4: MEM } as Patch["params"] };
  if (a.dl !== undefined) {
    if (a.world) patch.params = { o4: MEM, r5: { dLambda: a.dl } } as Patch["params"];
    // Only species the base's table has: a lone tree's table holds its own species alone.
    patch.species = Object.fromEntries(
      (a.on ?? [])
        .filter((sp) => base.species?.[sp] !== undefined)
        .map((sp) => [sp, { r5: { dLambda: a.dl } }]),
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

const jobs = Math.min(10, Math.max(1, Number(arg("-j", "10"))));
const names = arg("--arms", "M,Mbh40,Mdl40").split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/138-dl-on-m"));
const reuse = arg("--reuse", "");
const summaryOnly = process.argv.includes("--summary-only");

// The effective params each garden species reads, per arm (a check that the patch reaches them).
for (const name of names) {
  const p = paramsOf(name, forestParams(160, 1));
  const sp = SPECIES.map((s) => {
    const e = speciesParams(p, s);
    return `${s} δλ ${e.r5.dLambda} (r5 ${e.r5.enabled})`;
  });
  const o = p.o4 as unknown as Record<string, unknown>;
  console.log(`${name}: stubs ${o.stubs} τ ${o.lightMemory}; ${sp.join(", ")}`);
}

type Job = { kind: "garden" | "saplings" | "lone"; cond: string; seed: number; key: string };
const dirOf = (j: Job) =>
  j.kind === "lone"
    ? join(out, "lone", j.cond, `${j.key}-s${j.seed}`)
    : join(out, j.cond, `${j.key}-s${j.seed}`);
const doneFile = { garden: "hash.txt", saplings: "saplings.csv", lone: "hash.txt" } as const;
const reused = (j: Job) =>
  reuse !== "" && j.kind === "garden" && j.key === "w160" && ARMS[j.cond]?.from !== undefined;
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
  for (const j of all.filter(reused)) {
    const from = realpathSync(join(reuse, ARMS[j.cond]?.from as string, `w160-s${j.seed}`));
    const theirs = JSON.parse(readFileSync(join(from, "record.json"), "utf8")).params;
    const same = canon(theirs) === canon(paramsOf(j.cond, forestParams(160, j.seed)));
    check.push(`${j.cond} w160 s${j.seed}: params ${same ? "=" : "≠"} (${from})`);
    if (!same) throw new Error(`${j.cond} w160 s${j.seed}: the reused run's params differ`);
    if (!existsSync(dirOf(j))) {
      mkdirSync(join(out, j.cond), { recursive: true });
      symlinkSync(from, dirOf(j));
    }
  }
  const t0 = performance.now();
  await pool(
    all.filter((j) => !reused(j)),
    jobs,
    async (j) => {
      if (existsSync(join(dirOf(j), doneFile[j.kind]))) return;
      if (j.kind === "lone") {
        await sim(paramsOf(j.cond, loneTreeParams(j.key, j.seed)), LONE.seasons, dirOf(j));
      } else if (j.kind === "saplings") {
        await probe(paramsOf(j.cond, forestParams(160, j.seed)), dirOf(j));
      } else {
        const w = Number(j.key.slice(1));
        await sim(paramsOf(j.cond, forestParams(w, j.seed)), SEASONS, dirOf(j), [
          "--snapshots",
          SNAPSHOTS,
        ]);
      }
    },
  );
  const wall = (performance.now() - t0) / 1000;
  let same = 0;
  let n = 0;
  for (const j of all.filter((j) => j.key === "w66" && ARMS[j.cond]?.from !== undefined)) {
    if (!reuse) break;
    const theirs = join(reuse, ARMS[j.cond]?.from as string, `w66-s${j.seed}`, "hash.txt");
    if (!existsSync(theirs)) continue;
    const a = readFileSync(join(dirOf(j), "hash.txt"), "utf8").trim();
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

/** One garden run: the ramp re-probe's run.ts measures, unchanged. */
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
  const frames = FRAMES.map((s) => {
    const trees = atFrame.get(s) ?? [];
    const big = trees.filter((t) => (dbh.get(`${s}:${t.id}`) ?? 0) >= DBH_FLOOR);
    const stems7PerHa = Math.round(big.length / ha);
    return {
      season: s,
      stems7PerHa,
      inBand7: stems7PerHa >= 200 && stems7PerHa <= 400,
      canopyShare7: big.length ? big.filter((t) => isCanopy(s, t.h)).length / big.length : 0,
      lightDemanderInCanopy: trees.some(
        (t) => isCanopy(s, t.h) && tolerance(t.sp) < LIGHT_DEMANDING,
      ),
      bank: trees.filter((t) => t.h < DRAWN).length,
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
    capSeasons: Number(meta.capSeasons),
    frames,
    wall: Number(readFileSync(join(dir, "wall.txt"), "utf8")),
  };
}
type G = ReturnType<typeof garden>;
const gardenCounts = (rs: G[]) => {
  const fr = rs.flatMap((r) => r.frames);
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
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
  for (const r of sap) {
    const later = at.get(`${r.seed}:${r.tree}:${r.season + 10}`);
    if (later) gains.push((later.height - r.height) * CELL);
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
    `${cond}: saplings ${s.treeSeasons} (${s.trees} trees) no growth ${f2(s.noGrowth)} gain ${f2(s.gainPerDecade)} m (P90 ${f2(s.gainP90)}, none ${f2(s.noGainDecades)}) | ${Object.entries(
      s.bySpecies,
    )
      .filter(([, x]) => x.n >= 30)
      .map(([sp, x]) => `${sp} ${f2(x.noGrowth)}`)
      .join(", ")}`,
  );
  for (const w of WIDTHS) {
    const c = byWidth[w] as ReturnType<typeof gardenCounts>;
    console.log(
      `  ${w}: runs ${c.runs} gate1 ${c.gate1} gate1+2 ${c.gate12} | canopy/ha ${f2(c.canopyPerHa100)} | ≥7 band ${c.inBand7}/${c.frames} (med ${c.stems7PerHaMedian}; ${c.stems7PerHaByFrame.join("/")}) share≥0.6 ${c.canopyShare7At60} | deaths ${f2(c.canopyDeathsPerRun)} thrown ${f2(c.thrownPerRun)} | cap ${c.capSeasonsMedian} | wall ${f2(c.wallMedian)} s`,
    );
  }
  for (const sp of LONE.species)
    console.log(
      `  lone ${sp}: ${(summary.lone[sp] ?? []).map((x) => (x ? `${x.hash} H${x.height.toFixed(1)} W/H ${f2(x.wh)}` : "-")).join("; ")}`,
    );
}
