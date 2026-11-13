/**
 * #132's understorey probe (ADR 0068): O4's `topLight` signal as a ramp from a world ceiling θ_hi
 * down to each species' sapling survival light θ_sp (`o4.survivalLight`), against HEAD's garden,
 * at widths 160 and 66, to season 300, natively (`cli/run.ts` builds it when stale). Too slow for
 * `npm run check`: run by hand. The bars were fixed before the runs:
 * docs/experiments/2026-11-13-understorey-probe.md.
 *
 * Arms: head; t10, t15, t25 (θ_hi 0.10, 0.15, 0.25 at m_s 1); t15m3 (θ_hi 0.15 at m_s 3).
 *
 * Gates (#122; ≥ 18 of 20 seeds at both widths): a canopy tree in every season after 50; at 66
 * cells, one in every season from 100; a garden checkpoint saved by this build loads and takes the
 * arm's params; lone oak and hornbeam, seeds 1–3, hash-identical to head.
 *
 * Adoption bars (160 cells, 3 frames × 20 seeds = 60), each against head:
 *   1. stems ≥ 7 cm DBH at 200–400/ha in ≥ 30 of 60 frames, and in more frames than head;
 *   2. the canopy share of those stems ≥ 0.6 in ≥ 30 of 60, and in more frames than head;
 *   3. the median over runs of each run's median canopy trees/ha (seasons 100–300) ≥ head's;
 *   4. canopy deaths per run (mean) ≤ 1.5× head's;
 *   5. frames with a light-demanding species (shade tolerance < 3) in the canopy ≥ head's.
 *
 * DBH is `cli/allometry.ts`'s (the trunk cylinder at 1.3 m of stem), read from metamers.csv at
 * seasons 100, 200 and 300 (`--snapshots`). A canopy tree is stand.rs's: drawn (≥ 1.3 m) and over
 * half the top height (stand.csv `topHeight100`). A canopy death: a tree that was a canopy tree
 * the season before and died without being thrown (metrics.csv `broken` 0 on its death row).
 *
 *   node cli/understorey-probe.ts --seeds 1-3            the pilot
 *   node cli/understorey-probe.ts                        seeds 1–20 (reuses the pilot's runs)
 *   node cli/understorey-probe.ts -j 12 --arms head,t15 --no-tests
 *
 * Writes runs/understorey-probe/<arm>/{w<width>-s<seed>/, summary.json}, tests.json and
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

/**
 * θ_sp per species: the target file's `shade.survivalLight` point target where it has one
 * (Hagemeier & Leuschner 2019: birch, oak, beech, hornbeam), else the midpoint of its
 * `survivalLight` band (analysis/fit/targets/<species>.toml, "by score").
 */
export const SURVIVAL_LIGHT: Record<string, number> = {
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

const arm = (theta: number, mS: number): Patch => ({
  params: {
    o4: { suppressionSignal: "topLight", topLightThreshold: theta, mSuppression: mS },
  } as Patch["params"],
  species: Object.fromEntries(
    Object.entries(SURVIVAL_LIGHT).map(([sp, q]) => [sp, { o4: { survivalLight: q } }]),
  ) as Patch["species"],
});

export const ARMS: Record<string, Patch> = {
  head: {},
  t10: arm(0.1, 1),
  t15: arm(0.15, 1),
  t25: arm(0.25, 1),
  t15m3: arm(0.15, 3),
};
export const WIDTHS = [160, 66];
export const SEASONS = 300;
export const FRAMES = [100, 200, 300];
const GATE_OF_20 = 18;
const DRAWN = DISPLAY_THRESHOLD;
/** The band's DBH floor, metres (ADR 0068, decision 3). */
const DBH_FLOOR = 0.07;
/** Light-demanding: shade tolerance below the scale's middle (Niinemets & Valladares 2006). */
const LIGHT_DEMANDING = 3;
/** The adoption bars' frame count out of 60 (scaled by the seeds run). */
const BAR_FRAMES = 30;
const LONE = { species: ["oak", "hornbeam"], seeds: [1, 2, 3], seasons: 100 };

const jobs = Math.min(12, Math.max(1, Number(arg("-j", "12"))));
const names = arg("--arms", Object.keys(ARMS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/understorey-probe"));
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

  // metrics.csv in one pass: the frames' trees, canopy deaths, the bank's lifetimes.
  type Seen = { id: string; sp: string; h: number; ground: number };
  const atFrame = new Map<number, Seen[]>(FRAMES.map((s) => [s, []]));
  const last = new Map<string, { season: number; h: number; alive: boolean; tall: boolean }>();
  let canopyDeaths = 0;
  let thrown = 0;
  const bankLife: Record<string, number[]> = {};
  for (const r of rows(join(dir, "metrics.csv"))) {
    const season = Number(r.season);
    const h = Number(r.height);
    const id = r.tree as string;
    const before = last.get(id);
    if (r.alive === "1") {
      atFrame.get(season)?.push({ id, sp: r.species as string, h, ground: Number(r.groundLight) });
      last.set(id, { season, h, alive: true, tall: (before?.tall ?? false) || h >= DRAWN });
    } else if (before?.alive) {
      // The death row: the tree was alive at `before.season`.
      if (isCanopy(before.season, before.h)) {
        if (Number(r.broken) > 0) thrown++;
        else canopyDeaths++;
      }
      if (!before.tall) {
        const sp = r.species as string;
        const ages = bankLife[sp] ?? [];
        ages.push(Number(r.age));
        bankLife[sp] = ages;
      }
      last.set(id, { ...before, alive: false });
    }
  }

  const spp = [...rows(join(dir, "stand-species.csv"))];
  const frames = FRAMES.map((s) => {
    const row = stand.find((r) => Number(r.season) === s);
    const drawn = Number(row?.drawn ?? 0);
    const canopy = Number(row?.canopy ?? 0);
    const trees = atFrame.get(s) ?? [];
    const big = trees.filter((t) => (dbh.get(`${s}:${t.id}`) ?? 0) >= DBH_FLOOR);
    const bigCanopy = big.filter((t) => isCanopy(s, t.h)).length;
    const bank = trees.filter((t) => t.h < DRAWN);
    const top = spp
      .filter((x) => Number(x.season) === s)
      .reduce(
        (a, x) =>
          Number(x.share) > a.share ? { sp: x.species as string, share: Number(x.share) } : a,
        { sp: "-", share: 0 },
      );
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
      topSpecies: top.sp,
      topShare: top.share,
      bank: bank.length,
      bankBySpecies: bank.reduce<Record<string, number>>((a, t) => {
        a[t.sp] = (a[t.sp] ?? 0) + 1;
        return a;
      }, {}),
      bankGroundLight: median(bank.map((t) => t.ground).filter(Number.isFinite)),
    };
  });
  const canopyFrom = (s: number) =>
    Math.min(...stand.filter((r) => Number(r.season) >= s).map((r) => Number(r.canopy)));
  return {
    ...j,
    commit: meta.commit as string,
    gate1: canopyFrom(51) >= 1,
    gate2: canopyFrom(100) >= 1,
    canopyPerHa100: median(
      stand.filter((r) => Number(r.season) >= 100).map((r) => Number(r.canopy) / ha),
    ),
    canopyDeaths,
    thrown,
    capSeasons: Number(meta.capSeasons),
    bankLife: Object.fromEntries(
      Object.entries(bankLife).map(([sp, xs]) => [sp, { n: xs.length, median: median(xs) }]),
    ),
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
    canopyDeathsPerRun: mean(rs.map((r) => r.canopyDeaths)),
    thrownPerRun: mean(rs.map((r) => r.thrown)),
    lightDemanderFrames: fr.filter((f) => f.lightDemanderInCanopy).length,
    // Reported.
    stems7PerHaMedian: median(fr.map((f) => f.stems7PerHa)),
    canopyShare7Median: median(fr.map((f) => f.canopyShare7)),
    drawnPerHaMedian: median(fr.map((f) => f.drawnPerHa)),
    inBandDrawn: fr.filter((f) => f.drawnPerHa >= 200 && f.drawnPerHa <= 400).length,
    canopyShareDrawnMedian: median(fr.map((f) => f.canopyShareDrawn)),
    topShareMedian: median(fr.map((f) => f.topShare)),
    capSeasonsMedian: median(rs.map((r) => r.capSeasons)),
    capFree: rs.filter((r) => r.capSeasons === 0).length,
    bankMedian: median(fr.map((f) => f.bank)),
    bankGroundLightMedian: median(fr.map((f) => f.bankGroundLight).filter(Number.isFinite)),
    bankBySpecies: fr.reduce<Record<string, number>>((a, f) => {
      for (const [sp, n] of Object.entries(f.bankBySpecies)) a[sp] = (a[sp] ?? 0) + n / fr.length;
      return a;
    }, {}),
    bankLifeMedian: Object.fromEntries(
      [...new Set(rs.flatMap((r) => Object.keys(r.bankLife)))].map((sp) => [
        sp,
        median(rs.map((r) => r.bankLife[sp]?.median ?? Number.NaN).filter(Number.isFinite)),
      ]),
    ),
    wallMedian: median(rs.map((r) => r.wall)),
  };
};

const result: Record<
  string,
  { byWidth: Record<number, ReturnType<typeof counts>>; runs: Summary[] }
> = {};
for (const cond of names) {
  const runs = all.filter((j) => j.cond === cond).map(summarise);
  const byWidth = Object.fromEntries(
    WIDTHS.map((w) => [w, counts(runs.filter((r) => r.width === w))]),
  );
  result[cond] = { byWidth, runs };
  writeFileSync(
    join(out, cond, "summary.json"),
    JSON.stringify({ cond, patch: ARMS[cond], seeds, ...result[cond] }, null, 1),
  );
}

// --- The tests (gates 3 and 4).
const tests: Record<string, Record<string, boolean | string>> = {};
if (withTests) {
  // Gate 4: the lone open-grown tree under each arm's patch, hash-identical to head's.
  const lone = LONE.species.flatMap((sp) => LONE.seeds.map((seed) => ({ sp, seed })));
  const loneDir = (cond: string, x: { sp: string; seed: number }) =>
    join(out, "lone", cond, `${x.sp}-s${x.seed}`);
  const loneArms = [...new Set(["head", ...names])];
  for (const cond of loneArms) {
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
  // Gate 3: a garden checkpoint saved by this build loads, takes the arm's params and grows on;
  // the frozen fixtures load. WASM (npm run build:wasm), as the page loads them.
  const { coreWasm, loadWorldsSync, RustWorld } = await import("../src/wasm/world.ts");
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
    const patch = ARMS[cond] as Patch;
    const grow = () => {
      const w = RustWorld.load(new Uint8Array(bytes));
      const next = patched(w.params, patch);
      w.setParams({ ...(patch.params ?? {}), species: next.species });
      w.step(10, true);
      const h = w.hash();
      const alive = w.trees.filter((t) => t.alive).length;
      const p = w.params;
      w.dispose();
      return { h, alive, p };
    };
    const a = grow();
    const b = grow();
    const took =
      cond === "head" ||
      ((a.p.o4 as { suppressionSignal?: string }).suppressionSignal === "topLight" &&
        (a.p.species?.birch?.o4 as { survivalLight?: number } | undefined)?.survivalLight ===
          SURVIVAL_LIGHT.birch);
    const t = tests[cond] ?? {};
    t["garden checkpoint (66, seed 1, season 30) loads, takes the params, grows on"] =
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
}

// --- The tables, the gates and the bars.
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "-");
for (const cond of names) {
  const r = result[cond];
  if (!r) continue;
  console.log(`\n${cond} at ${r.runs[0]?.commit}`);
  for (const w of WIDTHS) {
    const c = r.byWidth[w];
    if (!c) continue;
    const n = c.runs;
    console.log(
      `  ${w}: gate1 ${c.gate1}/${n}${w === 66 ? `, gate2 ${c.gate2}/${n}` : ""} | ≥7cm band ${c.inBand7}/${c.frames} (med ${c.stems7PerHaMedian}/ha), share≥0.6 ${c.canopyShare7At60}/${c.frames} (med ${f2(c.canopyShare7Median)}) | canopy/ha med ${f2(c.canopyPerHa100)} | canopy deaths/run ${f2(c.canopyDeathsPerRun)} (thrown ${f2(c.thrownPerRun)}) | light-demander frames ${c.lightDemanderFrames}/${c.frames}`,
    );
    console.log(
      `       drawn ≥1.3 m: med ${c.drawnPerHaMedian}/ha, band ${c.inBandDrawn}/${c.frames}, share med ${f2(c.canopyShareDrawnMedian)} | top share med ${f2(c.topShareMedian)} | cap seasons med ${c.capSeasonsMedian} (free ${c.capFree}/${n}) | bank med ${c.bankMedian}, ground light med ${f2(c.bankGroundLightMedian)} | wall med ${c.wallMedian.toFixed(0)} s`,
    );
    console.log(
      `       bank by species (mean per frame): ${Object.entries(c.bankBySpecies)
        .map(([sp, x]) => `${sp} ${x.toFixed(0)}`)
        .join(", ")} | bank lifetimes (median of run medians, seasons): ${Object.entries(
        c.bankLifeMedian,
      )
        .map(([sp, x]) => `${sp} ${f2(x)}`)
        .join(", ")}`,
    );
  }
  for (const [k, v] of Object.entries(tests[cond] ?? {})) console.log(`  test: ${k}: ${v}`);
}
console.log(`\nruns wall ${(runsWall / 60).toFixed(1)} min on ${jobs} simulators`);

const head = result.head?.byWidth;
const bars: Record<string, unknown> = {};
if (head) {
  const scale = seeds.length / 20;
  const h = head[160] as ReturnType<typeof counts>;
  for (const cond of names.filter((c) => c !== "head")) {
    const by = result[cond]?.byWidth;
    if (!by) continue;
    const a = by[160] as ReturnType<typeof counts>;
    const gates =
      WIDTHS.every((w) => (by[w]?.gate1 ?? 0) >= GATE_OF_20 * scale) &&
      (by[66]?.gate2 ?? 0) >= GATE_OF_20 * scale &&
      (!withTests || Object.values(tests[cond] ?? {}).every((v) => v === true));
    const b = {
      gates,
      band7: a.inBand7 >= BAR_FRAMES * scale && a.inBand7 > h.inBand7,
      share7: a.canopyShare7At60 >= BAR_FRAMES * scale && a.canopyShare7At60 > h.canopyShare7At60,
      canopyPerHa: a.canopyPerHa100 >= h.canopyPerHa100,
      canopyDeaths: a.canopyDeathsPerRun <= 1.5 * h.canopyDeathsPerRun,
      lightDemanders: a.lightDemanderFrames >= h.lightDemanderFrames,
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
