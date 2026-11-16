/**
 * #137's seedling-stubs probe: spec §O4.11's "keep seedlings as stubs until lit" (ADR 0071, off by
 * default: `o4.stubs`, `o4.stubLight`, `o4.stubDeath`) against HEAD's garden, at widths 160 and 66,
 * to season 300, natively (`cli/run.ts` builds it when stale). Too slow for `npm run check`: run by
 * hand. The bars were fixed before the runs: docs/experiments/2026-11-16-seedling-stubs-probe.md.
 *
 * Arms: head; s1 (stubs on, stubLight 0.15, stubDeath 1); s3 (stubDeath 3); s1q10 (stubLight 0.10,
 * a pilot-only light bracket); s1d, s3d (s1 and s3 with stubDemote 0.075: the addendum).
 *
 * Gates (#122; ≥ 18 of 20 seeds at both widths): a canopy tree in every season after 50; at 66
 * cells, one in every season from 100; checkpoints (frozen fixtures load with no stubs and grow on
 * under the arm's params; a stubs-on garden checkpoint round-trips; head's saves version 4); lone
 * hornbeam, seeds 1–3, hash-identical to head.
 *
 * Adoption bars (per seed, against head's run of the same seed and width; frames at 160 cells):
 *   1. median cap seasons ≤ ½ head's, and below head's in ≥ 15 of 20 runs, at each width;
 *   2. the median over runs of each run's median canopy trees/ha (seasons 100–300) ≥ head's, 160;
 *   3. hornbeam holds a canopy tree in ≥ 30 of 60 frames;
 *   4. frames where one species other than hornbeam holds over half the canopy trees ≤ head's + 6;
 *   5. median wall time per run at 66 cells ≤ 1.25 × head's.
 *
 *   node cli/seedling-stubs-probe.ts --seeds 1-3 -j 6        the pilot
 *   node cli/seedling-stubs-probe.ts -j 6 --arms head,s1,s3  seeds 1–20 (reuses the pilot's runs)
 *
 * Writes runs/seedling-stubs-probe/<arm>/{w<width>-s<seed>/, summary.json}, tests.json and
 * bars.json, and prints the tables. Generated, never committed.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Params } from "../src/core/params.ts";
import { DISPLAY_THRESHOLD, forestParams, loneTreeParams } from "../src/core/presets.ts";
import { allometry, type Columns } from "./allometry.ts";
import { arg, median, type Patch, patched, pool, sim } from "./shared.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/** Stubs on at `stubLight` and `stubDeath` (world params; no species sets either). */
const stubs = (stubLight: number, stubDeath: number): Patch => ({
  params: { o4: { stubs: true, stubLight, stubDeath } } as Patch["params"],
});

/** As `stubs`, with bank trees darker than `stubDemote` at the top returned to stubs (the addendum). */
const demoting = (stubLight: number, stubDeath: number, stubDemote: number): Patch => ({
  params: { o4: { stubs: true, stubLight, stubDeath, stubDemote } } as Patch["params"],
});

export const ARMS: Record<string, Patch> = {
  head: {},
  s1: stubs(0.15, 1),
  s3: stubs(0.15, 3),
  s1q10: stubs(0.1, 1),
  s1d: demoting(0.15, 1, 0.075),
  s3d: demoting(0.15, 3, 0.075),
};
export const WIDTHS = [160, 66];
export const SEASONS = 300;
export const FRAMES = [100, 200, 300];
const GATE_OF_20 = 18;
const DRAWN = DISPLAY_THRESHOLD;
/** The band's DBH floor, metres (ADR 0068, decision 3). */
const DBH_FLOOR = 0.07;
const FOCUS = "hornbeam";
const LONE = { species: [FOCUS], seeds: [1, 2, 3], seasons: 100 };

const jobs = Math.min(6, Math.max(1, Number(arg("-j", "6"))));
const names = arg("--arms", Object.keys(ARMS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/seedling-stubs-probe"));
const withTests = !process.argv.includes("--no-tests");
const snapshots = FRAMES.slice(0, -1).join(",");

// Build once before the pool, so the simulators do not race to build it.
await sim(loneTreeParams("oak", 1), 1, join(out, "build"));

// --- The runs: desktop first, so the long runs do not tail the pool.
const t0 = performance.now();
type Job = { cond: string; width: number; seed: number };
const runDir = ({ cond, width, seed }: Job) => join(out, cond, `w${width}-s${seed}`);
const done = (j: Job) =>
  existsSync(join(runDir(j), "stand.csv")) &&
  existsSync(join(runDir(j), "snapshots.txt")) &&
  readFileSync(join(runDir(j), "snapshots.txt"), "utf8") === snapshots;
const all: Job[] = WIDTHS.flatMap((width) =>
  seeds.flatMap((seed) => names.map((cond) => ({ cond, width, seed }))),
);
await pool(all, jobs, async (j) => {
  if (done(j)) return;
  const params = patched(forestParams(j.width, j.seed), ARMS[j.cond] as Patch);
  await sim(params, SEASONS, runDir(j), ["--snapshots", snapshots]);
  writeFileSync(join(runDir(j), "snapshots.txt"), snapshots);
});
const runsWall = (performance.now() - t0) / 1000;

// --- The summary.
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
  const out = new Map<string, number>();
  for (const [key, t] of trees) {
    out.set(key, allometry(t.cols, { metamer: [], state: [] }).dbh);
  }
  return out;
}

const bump = (a: Record<string, number>, k: string, n = 1) => {
  a[k] = (a[k] ?? 0) + n;
  return a;
};
const shareOf = (a: Record<string, number>, k: string) => {
  const n = Object.values(a).reduce((s, x) => s + x, 0);
  return n ? (a[k] ?? 0) / n : 0;
};

function summarise(j: Job) {
  const dir = runDir(j);
  const params = JSON.parse(readFileSync(join(dir, "record.json"), "utf8")).params as Params;
  const depth = params.world.depth ?? 64;
  const ha = (j.width * depth * 0.0625) / 10_000;
  const stand = [...rows(join(dir, "stand.csv"))];
  const ref = new Map(stand.map((r) => [Number(r.season), Number(r.topHeight100)]));
  const isCanopy = (season: number, h: number) =>
    h >= DRAWN && h > 0.5 * (ref.get(season) ?? Number.POSITIVE_INFINITY);
  const dbh = dbhs(dir);
  // The stub pool at the frames, by species (stubs.csv; absent with stubs off).
  const pool = new Map<number, Record<string, number>>(FRAMES.map((f) => [f, {}]));
  if (existsSync(join(dir, "stubs.csv")))
    for (const r of rows(join(dir, "stubs.csv"))) {
      const at = pool.get(Number(r.season));
      if (at) at[r.species || "-"] = Number(r.stubs);
    }
  const meta = JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).meta;

  // metrics.csv in one pass: the frames' trees, recruits, seeds made.
  type Seen = { id: string; sp: string; h: number };
  const atFrame = new Map<number, Seen[]>(FRAMES.map((s) => [s, []]));
  const first = new Map<string, number>();
  const reached = new Set<string>();
  const recruits: Record<string, number> = {};
  const recruitsDrawn: Record<string, number> = {};
  const seedsMade: Record<string, number> = {};
  let firstSeason = Number.POSITIVE_INFINITY;
  for (const r of rows(join(dir, "metrics.csv"))) {
    const season = Number(r.season);
    if (r.alive !== "1") continue;
    const id = r.tree as string;
    const sp = r.species as string;
    const h = Number(r.height);
    firstSeason = Math.min(firstSeason, season);
    if (!first.has(id)) {
      first.set(id, season);
      if (season > firstSeason) bump(recruits, sp);
    }
    if (h >= DRAWN && !reached.has(id) && (first.get(id) ?? 0) > firstSeason) {
      reached.add(id);
      bump(recruitsDrawn, sp);
    }
    const s = Number(r.seeds);
    if (s > 0) bump(seedsMade, sp, s);
    atFrame.get(season)?.push({ id, sp, h });
  }

  const frames = FRAMES.map((s) => {
    const row = stand.find((r) => Number(r.season) === s);
    const drawn = Number(row?.drawn ?? 0);
    const trees = atFrame.get(s) ?? [];
    const big = trees.filter((t) => (dbh.get(`${s}:${t.id}`) ?? 0) >= DBH_FLOOR);
    const bigCanopy = big.filter((t) => isCanopy(s, t.h)).length;
    const bank = trees.filter((t) => t.h < DRAWN);
    const canopy = trees
      .filter((t) => isCanopy(s, t.h))
      .reduce<Record<string, number>>((a, t) => bump(a, t.sp), {});
    const n = Object.values(canopy).reduce((a, x) => a + x, 0);
    const [topSp, topN] = Object.entries(canopy).reduce((a, x) => (x[1] > a[1] ? x : a), [
      "-",
      0,
    ] as [string, number]);
    return {
      season: s,
      drawnPerHa: Math.round(drawn / ha),
      stems7PerHa: Math.round(big.length / ha),
      canopyShare7: big.length ? bigCanopy / big.length : 0,
      canopyTrees: n,
      canopyBySpecies: canopy,
      focusInCanopy: (canopy[FOCUS] ?? 0) > 0,
      focusCanopyShare: n ? (canopy[FOCUS] ?? 0) / n : 0,
      otherOverHalf: topSp !== FOCUS && n > 0 && topN / n > 0.5,
      bank: bank.length,
      stubsPerHa: Object.values(pool.get(s) ?? {}).reduce((a, x) => a + x, 0) / ha,
      stubsBySpeciesPerHa: Object.fromEntries(
        Object.entries(pool.get(s) ?? {}).map(([k, v]) => [k, v / ha]),
      ),
      bankBySpecies: bank.reduce<Record<string, number>>((a, t) => bump(a, t.sp), {}),
    };
  });
  return {
    ...j,
    commit: meta.commit as string,
    gate1: Math.min(...stand.filter((r) => Number(r.season) >= 51).map((r) => +r.canopy)) >= 1,
    gate2: Math.min(...stand.filter((r) => Number(r.season) >= 100).map((r) => +r.canopy)) >= 1,
    canopyPerHa100: median(
      stand.filter((r) => Number(r.season) >= 100).map((r) => Number(r.canopy) / ha),
    ),
    capSeasons: Number(meta.capSeasons),
    recruits,
    recruitsDrawn,
    seedsMade,
    frames,
    wall: Number(readFileSync(join(dir, "wall.txt"), "utf8")),
  };
}
type Summary = ReturnType<typeof summarise>;

const sumBy = (xs: Record<string, number>[]) =>
  xs.reduce<Record<string, number>>((a, x) => {
    for (const [k, v] of Object.entries(x)) bump(a, k, v);
    return a;
  }, {});

const counts = (rs: Summary[], base?: Summary[]) => {
  const fr = rs.flatMap((r) => r.frames);
  const vsHead = base
    ? rs.filter((r) => {
        const h = base.find((b) => b.seed === r.seed && b.width === r.width);
        return h !== undefined && r.capSeasons < h.capSeasons;
      }).length
    : Number.NaN;
  const recruits = sumBy(rs.map((r) => r.recruits));
  const recruitsDrawn = sumBy(rs.map((r) => r.recruitsDrawn));
  const seedsMade = sumBy(rs.map((r) => r.seedsMade));
  return {
    runs: rs.length,
    gate1: rs.filter((r) => r.gate1).length,
    gate2: rs.filter((r) => r.gate2).length,
    frames: fr.length,
    capSeasonsMedian: median(rs.map((r) => r.capSeasons)),
    capBelowHead: vsHead,
    capFree: rs.filter((r) => r.capSeasons === 0).length,
    canopyPerHa100: median(rs.map((r) => r.canopyPerHa100)),
    focusInCanopyFrames: fr.filter((f) => f.focusInCanopy).length,
    otherOverHalfFrames: fr.filter((f) => f.otherOverHalf).length,
    // Reported.
    focusCanopyShareMedian: median(fr.map((f) => f.focusCanopyShare)),
    canopyBySpecies: sumBy(fr.map((f) => f.canopyBySpecies)),
    bankMedian: median(fr.map((f) => f.bank)),
    stubsPerHaMedian: median(fr.map((f) => f.stubsPerHa)),
    stubsPerHaRange: [
      Math.min(...fr.map((f) => f.stubsPerHa)),
      Math.max(...fr.map((f) => f.stubsPerHa)),
    ],
    stubsBySpeciesPerHa: Object.fromEntries(
      Object.entries(sumBy(fr.map((f) => f.stubsBySpeciesPerHa))).map(([k, v]) => [
        k,
        v / fr.length,
      ]),
    ),
    capSeasonsPerRun: rs.map((r) => r.capSeasons),
    pairedCapChangeMedian: base
      ? median(
          rs.map((r) => {
            const h = base.find((b) => b.seed === r.seed && b.width === r.width);
            return h ? r.capSeasons - h.capSeasons : Number.NaN;
          }),
        )
      : Number.NaN,
    bankBySpecies: Object.fromEntries(
      Object.entries(sumBy(fr.map((f) => f.bankBySpecies))).map(([k, v]) => [k, v / fr.length]),
    ),
    stems7PerHaMedian: median(fr.map((f) => f.stems7PerHa)),
    canopyShare7Median: median(fr.map((f) => f.canopyShare7)),
    drawnPerHaMedian: median(fr.map((f) => f.drawnPerHa)),
    recruitsPerRun: Object.values(recruits).reduce((a, x) => a + x, 0) / rs.length,
    focusRecruitShare: shareOf(recruits, FOCUS),
    recruitsDrawnPerRun: Object.values(recruitsDrawn).reduce((a, x) => a + x, 0) / rs.length,
    focusRecruitDrawnShare: shareOf(recruitsDrawn, FOCUS),
    focusSeedsPerRun: (seedsMade[FOCUS] ?? 0) / rs.length,
    seedsPerRun: Object.values(seedsMade).reduce((a, x) => a + x, 0) / rs.length,
    recruitsDrawnBySpecies: recruitsDrawn,
    wallMedian: median(rs.map((r) => r.wall)),
  };
};

const result: Record<string, { runs: Summary[]; byWidth?: Record<number, unknown> }> = {};
for (const cond of names)
  result[cond] = { runs: all.filter((j) => j.cond === cond).map(summarise) };
const headRuns = result.head?.runs;
const byWidth: Record<string, Record<number, ReturnType<typeof counts>>> = {};
for (const cond of names) {
  const runs = result[cond]?.runs ?? [];
  byWidth[cond] = Object.fromEntries(
    WIDTHS.map((w) => [
      w,
      counts(
        runs.filter((r) => r.width === w),
        cond === "head" ? undefined : headRuns?.filter((r) => r.width === w),
      ),
    ]),
  );
  writeFileSync(
    join(out, cond, "summary.json"),
    JSON.stringify({ cond, patch: ARMS[cond], seeds, byWidth: byWidth[cond], runs }, null, 1),
  );
}

// --- The tests (gates 3 and 4).
const tests: Record<string, Record<string, boolean | string>> = {};
if (withTests) {
  // Gate 4: the lone open-grown hornbeam under each arm's patch, hash-identical to head's.
  const lone = LONE.species.flatMap((sp) => LONE.seeds.map((seed) => ({ sp, seed })));
  const loneDir = (cond: string, x: { sp: string; seed: number }) =>
    join(out, "lone", cond, `${x.sp}-s${x.seed}`);
  for (const cond of [...new Set(["head", ...names])]) {
    await pool(lone, jobs, (x) =>
      existsSync(join(loneDir(cond, x), "hash.txt"))
        ? Promise.resolve()
        : sim(
            patched(loneTreeParams(x.sp, x.seed), ARMS[cond] as Patch),
            LONE.seasons,
            loneDir(cond, x),
          ),
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
  // Gate 3: checkpoints, in WASM (npm run build:wasm), as the page loads them. (a) the frozen
  // fixtures load with no stubs (re-saved: version ≤ 4, no `stubs` table) and grow on alike twice
  // under the arm's params; (b) a stubs-on garden checkpoint round-trips: hash (which folds the
  // pool in) equal on load, and 10 more seasons reach the unbroken world's hash; (c) head's
  // checkpoint is version 4.
  const { coreWasm, loadWorldsSync, RustWorld } = await import("../src/wasm/world.ts");
  const { gunzipSync } = await import("node:zlib");
  loadWorldsSync(readFileSync(coreWasm));
  const headerOf = (bytes: Uint8Array) => {
    const len = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true);
    return JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + len)));
  };
  const fixtures: Record<string, Uint8Array> = {
    "checkpoint-v2": readFileSync(join(ROOT, "tests/fixtures/checkpoint-v2.bin")),
    "checkpoint-v3": readFileSync(join(ROOT, "tests/fixtures/checkpoint-v3.bin")),
    "garden-0.14.0": gunzipSync(
      readFileSync(join(ROOT, "tests/fixtures/garden-0.14.0-66-10.bin.gz")),
    ),
  };
  for (const cond of names) {
    const patch = ARMS[cond] as Patch;
    const t = tests[cond] ?? {};
    // (b) and (c)
    const unbroken = RustWorld.create(patched(forestParams(66, 1), patch));
    unbroken.run(30);
    const bytes = unbroken.save();
    const version = headerOf(bytes).version;
    const loaded = RustWorld.load(new Uint8Array(bytes));
    const same = loaded.hash() === unbroken.hash();
    unbroken.run(10);
    loaded.run(10);
    const on = cond !== "head";
    t[`garden checkpoint (66, seed 1, season 30) v${version} round-trips and grows on alike`] =
      same && loaded.hash() === unbroken.hash() && version === (on ? 5 : 4);
    unbroken.dispose();
    loaded.dispose();
    // (a)
    for (const [name, fx] of Object.entries(fixtures)) {
      let ok = false;
      try {
        const grow = () => {
          const w = RustWorld.load(new Uint8Array(fx));
          const resaved = headerOf(w.save());
          const none = resaved.version <= 4 && resaved.stubs === undefined;
          w.setParams(patch.params ?? {});
          w.step(10, true);
          const h = w.hash();
          const n = w.trees.length;
          w.dispose();
          return { h, n, none };
        };
        const x = grow();
        const y = grow();
        ok = x.none && x.n > 0 && x.h === y.h;
      } catch {}
      t[`${name} loads with no stubs and grows on alike`] = ok;
    }
    tests[cond] = t;
  }
  writeFileSync(join(out, "tests.json"), JSON.stringify(tests, null, 1));
}

// --- The tables, the gates and the bars.
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "-");
const list = (a: Record<string, number>, d = 0) =>
  Object.entries(a)
    .sort((x, y) => y[1] - x[1])
    .map(([sp, x]) => `${sp} ${x.toFixed(d)}`)
    .join(", ");
for (const cond of names) {
  const r = result[cond];
  if (!r) continue;
  console.log(`\n${cond} at ${r.runs[0]?.commit} (${JSON.stringify(ARMS[cond])})`);
  for (const w of WIDTHS) {
    const c = byWidth[cond]?.[w];
    if (!c) continue;
    const n = c.runs;
    console.log(
      `  ${w}: gate1 ${c.gate1}/${n}${w === 66 ? `, gate2 ${c.gate2}/${n}` : ""} | cap seasons med ${c.capSeasonsMedian} (below head ${c.capBelowHead}/${n}, free ${c.capFree}) | canopy/ha med ${f2(c.canopyPerHa100)} | ${FOCUS} in canopy ${c.focusInCanopyFrames}/${c.frames}, share med ${f2(c.focusCanopyShareMedian)} | other > ½ canopy ${c.otherOverHalfFrames}/${c.frames}`,
    );
    console.log(
      `       stubs/ha med ${c.stubsPerHaMedian.toFixed(0)} [${c.stubsPerHaRange.map((x) => x.toFixed(0)).join("–")}] (${list(c.stubsBySpeciesPerHa)}) | cap per run ${c.capSeasonsPerRun.join(" ")} | paired change med ${c.pairedCapChangeMedian}
       bank med ${c.bankMedian} (${list(c.bankBySpecies)}) | ≥7cm med ${c.stems7PerHaMedian}/ha, share med ${f2(c.canopyShare7Median)} | drawn med ${c.drawnPerHaMedian}/ha | wall med ${c.wallMedian.toFixed(0)} s`,
    );
    console.log(
      `       seeds/run ${c.seedsPerRun.toFixed(0)} (${FOCUS} ${c.focusSeedsPerRun.toFixed(0)}) | recruits/run ${c.recruitsPerRun.toFixed(0)} (${FOCUS} ${f2(c.focusRecruitShare)}) | reaching 1.3 m/run ${c.recruitsDrawnPerRun.toFixed(1)} (${FOCUS} ${f2(c.focusRecruitDrawnShare)}; ${list(c.recruitsDrawnBySpecies)})`,
    );
    console.log(`       canopy tree-frames by species: ${list(c.canopyBySpecies)}`);
  }
  for (const [k, v] of Object.entries(tests[cond] ?? {})) console.log(`  test: ${k}: ${v}`);
}
console.log(`\nruns wall ${(runsWall / 60).toFixed(1)} min on ${jobs} simulators`);

const head = byWidth.head;
const bars: Record<string, unknown> = {};
if (head) {
  const scale = seeds.length / 20;
  const h = head[160] as ReturnType<typeof counts>;
  for (const cond of names.filter((c) => c !== "head")) {
    const by = byWidth[cond];
    if (!by) continue;
    const a = by[160] as ReturnType<typeof counts>;
    const gates =
      WIDTHS.every((w) => (by[w]?.gate1 ?? 0) >= GATE_OF_20 * scale) &&
      (by[66]?.gate2 ?? 0) >= GATE_OF_20 * scale &&
      (!withTests || Object.values(tests[cond] ?? {}).every((v) => v === true));
    const half = (w: number) =>
      (by[w]?.capSeasonsMedian ?? Number.POSITIVE_INFINITY) <=
      0.5 * (head[w]?.capSeasonsMedian ?? 0);
    const b = {
      gates,
      capWellBelowHead: WIDTHS.every((w) => half(w) && (by[w]?.capBelowHead ?? 0) >= 15 * scale),
      canopyPerHa: a.canopyPerHa100 >= h.canopyPerHa100,
      hornbeamInCanopy: a.focusInCanopyFrames >= 30 * scale,
      noTakeover: a.otherOverHalfFrames <= h.otherOverHalfFrames + 6 * scale,
      cheapOnPhone:
        (by[66]?.wallMedian ?? Number.POSITIVE_INFINITY) <= 1.25 * (head[66]?.wallMedian ?? 0),
    };
    bars[cond] = { ...b, passes: Object.values(b).every(Boolean) };
    console.log(
      `${cond}: ${Object.entries(b)
        .map(([k, v]) => `${k} ${v ? "pass" : "FAIL"}`)
        .join(", ")} → ${Object.values(b).every(Boolean) ? "PASSES" : "fails"}`,
    );
  }
  writeFileSync(join(out, "bars.json"), JSON.stringify({ seeds, bars }, null, 1));
}
