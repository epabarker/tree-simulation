/**
 * The garden's 20-seed acceptance (#122; ADR 0063 as amended by ADR 0065; spec §O4): round 6
 * (HEAD's garden, `r6`) against the named patch d1, at widths 160 and 66, seeds 1–20, 300 seasons,
 * natively (release, `cli/run.ts` builds it when stale). Too slow for `npm run check` (about an hour
 * on 8 simulators): it runs as the open-grown evidence does, by hand.
 *
 * The bars were fixed before the run: docs/experiments/2026-11-12-garden-acceptance.md.
 * Hard gates, each ≥ 18 of seeds 1–20 per condition × width:
 *   1. a canopy tree (stand.csv `canopy`, over half the top height) in every season after 50;
 *   2. at 66 cells, a canopy tree in every season from 100;
 *   3. a checkpoint saved before the change still loads (a test, WASM: `--tests`);
 *   4. the lone open-grown tree is bit-identical to before #121 (a test, native: `--tests`).
 * Reported, not gated: drawn stems/ha in 200–400 at 100/200/300, the canopy share, seasons at the
 * cap, the top species' share (judged in frames with ≥ 8 drawn stems), the oak at 150 and 300.
 *
 *   npm run evidence:garden                      runs (resumable), tests, summary; 8 simulators
 *   npm run evidence:garden -- -j 4 --seeds 1-5 --conditions r6
 *   npm run evidence:garden -- --no-tests        the runs and summary only
 *
 * Writes runs/garden-acceptance/<condition>/{w<width>-s<seed>/, summary.json}, prints the tables
 * and the pre-registered choice. Generated, never committed.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Params } from "../src/core/params.ts";
import { DISPLAY_THRESHOLD, forestParams, loneTreeParams } from "../src/core/presets.ts";
import { arg, median, type Patch, patched, pool, sim } from "./shared.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const D1 = JSON.parse(
  readFileSync(
    join(ROOT, "docs/experiments/code/2026-11-10-garden-schedule/d1.patch.json"),
    "utf8",
  ),
) as Patch;
export const CONDITIONS: Record<string, Patch> = { r6: {}, d1: D1 };
export const WIDTHS = [160, 66];
export const SEASONS = 300;
/** `--seasons` is for a smoke run only: the gates and frames assume 300. */
export const FRAMES = [100, 200, 300];
export const OAK_AT = [150, 300];
/** Each hard gate passes at this many of seeds 1–20 (ADR 0065, #122). */
export const GATE_OF_20 = 18;
/** The display threshold (stand.rs `is_drawn`): 1.3 m in cells of 0.25 m. */
const DRAWN = DISPLAY_THRESHOLD;
/** The 70% bar is read only in frames with at least this many drawn stems (ADR 0065, 4). */
const JUDGED = 8;

/**
 * The lone tree's state hash at season 100 at 46f3cf4, the build before #121, each with that
 * commit's own `loneTreeParams` (recorded 2026-11-12, #122). The test asks every condition to
 * reproduce them.
 */
export const PRE121_LONE: Record<string, string> = {
  "oak:1": "9d18cdbd",
  "oak:2": "175ce3f9",
  "oak:3": "66d455d6",
  "hornbeam:1": "859812b6",
  "hornbeam:2": "66b88c89",
  "hornbeam:3": "f4a96f3e",
};
const LONE = { species: ["oak", "hornbeam"], seeds: [1, 2, 3], seasons: 100 };

const jobs = Math.min(8, Math.max(1, Number(arg("-j", "8"))));
const names = arg("--conditions", Object.keys(CONDITIONS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/garden-acceptance"));
const withTests = !process.argv.includes("--no-tests");
const seasons = Number(arg("--seasons", String(SEASONS)));

// Build once before the pool, so the simulators do not race to build it.
await sim(loneTreeParams("oak", 1), 1, join(out, "build"));

// --- The runs: desktop first, so the long runs do not tail the pool.
const t0 = performance.now();
type Job = { cond: string; width: number; seed: number };
const runDir = ({ cond, width, seed }: Job) => join(out, cond, `w${width}-s${seed}`);
const all: Job[] = WIDTHS.flatMap((width) =>
  seeds.flatMap((seed) => names.map((cond) => ({ cond, width, seed }))),
);
await pool(all, jobs, (j) =>
  existsSync(join(runDir(j), "stand.csv"))
    ? Promise.resolve()
    : sim(patched(forestParams(j.width, j.seed), CONDITIONS[j.cond] as Patch), seasons, runDir(j)),
);
const runsWall = (performance.now() - t0) / 1000;

// --- The summary.
const csv = (path: string) => {
  const [head, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  const h = (head as string).split(",");
  return lines.map((l) => {
    const v = l.split(",");
    return Object.fromEntries(h.map((k, i) => [k, v[i] as string]));
  });
};

function summarise(j: Job) {
  const dir = runDir(j);
  const params = JSON.parse(readFileSync(join(dir, "record.json"), "utf8")).params as Params;
  const depth = params.world.depth ?? 64;
  const ha = (j.width * depth * 0.0625) / 10_000;
  const stand = csv(join(dir, "stand.csv"));
  const spp = csv(join(dir, "stand-species.csv"));
  const meta = JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).meta;
  const row = (s: number) => stand.find((r) => Number(r.season) === s);
  const frames = FRAMES.map((s) => {
    const drawn = Number(row(s)?.drawn ?? 0);
    const canopy = Number(row(s)?.canopy ?? 0);
    const top = spp
      .filter((x) => Number(x.season) === s)
      .reduce(
        (a, x) =>
          Number(x.share) > a.share ? { sp: x.species as string, share: Number(x.share) } : a,
        {
          sp: "-",
          share: 0,
        },
      );
    const perHa = Math.round(drawn / ha);
    return {
      season: s,
      drawn,
      perHa,
      inBand: perHa >= 200 && perHa <= 400,
      canopy,
      canopyShare: drawn ? canopy / drawn : 0,
      topSpecies: top.sp,
      topShare: top.share,
      judged: drawn >= JUDGED,
      mixPass: drawn >= JUDGED && top.share <= 0.7,
    };
  });
  const canopyFrom = (s: number) =>
    Math.min(...stand.filter((r) => Number(r.season) >= s).map((r) => Number(r.canopy)));
  const capRows = stand.filter((r) => Number(r.capReached) > 0).length;
  // The oak: metrics.csv, one row per tree per season.
  const planted = Math.round((params.o4.planting?.density ?? 0) * ha);
  const oaks = csv(join(dir, "metrics.csv")).filter((r) => r.species === "oak");
  const live = (s0: number, s1: number) =>
    oaks.filter((r) => r.alive === "1" && Number(r.season) >= s0 && Number(r.season) <= s1);
  const oak = Object.fromEntries(
    OAK_AT.map((s) => {
      const now = live(s, s);
      return [
        s,
        {
          live: now.length,
          drawn: now.filter((r) => Number(r.height) >= DRAWN).length,
          seeding: now.filter((r) => Number(r.seeds) > 0).length,
          seedingIn10: new Set(
            live(s - 9, s)
              .filter((r) => Number(r.seeds) > 0)
              .map((r) => r.tree),
          ).size,
        },
      ];
    }),
  );
  const recruits = new Set(oaks.filter((r) => Number(r.tree) >= planted).map((r) => r.tree)).size;
  const recruitsDrawn = new Set(
    oaks.filter((r) => Number(r.tree) >= planted && Number(r.height) >= DRAWN).map((r) => r.tree),
  ).size;
  return {
    ...j,
    commit: meta.commit as string,
    gate1: canopyFrom(51) >= 1,
    gate2: canopyFrom(100) >= 1,
    minCanopyAfter50: canopyFrom(51),
    capSeasons: Number(meta.capSeasons),
    capRows,
    maxLive: Math.max(...stand.map((r) => Number(r.live))),
    cap: params.o4.maxTrees,
    frames,
    oak,
    oakRecruits: recruits,
    oakRecruitsDrawn: recruitsDrawn,
    wall: Number(readFileSync(join(dir, "wall.txt"), "utf8")),
  };
}
type Summary = ReturnType<typeof summarise>;

const counts = (rs: Summary[]) => {
  const fr = rs.flatMap((r) => r.frames);
  const judged = fr.filter((f) => f.judged);
  return {
    runs: rs.length,
    gate1: rs.filter((r) => r.gate1).length,
    gate2: rs.filter((r) => r.gate2).length,
    frames: fr.length,
    inBand: fr.filter((f) => f.inBand).length,
    canopyShareMedian: median(fr.map((f) => f.canopyShare)),
    canopyShare60: fr.filter((f) => f.canopyShare >= 0.6).length,
    capSeasons: rs.reduce((a, r) => a + r.capSeasons, 0),
    capFree: rs.filter((r) => r.capSeasons === 0).length,
    capMedian: median(rs.map((r) => r.capSeasons)),
    capMismatch: rs.filter((r) => r.capRows !== r.capSeasons).length,
    judged: judged.length,
    mixPass: judged.filter((f) => f.mixPass).length,
    mixFraction: judged.length
      ? judged.filter((f) => f.mixPass).length / judged.length
      : Number.NaN,
    oak: Object.fromEntries(
      OAK_AT.map((s) => [
        s,
        {
          live: rs.filter((r) => (r.oak[s]?.live ?? 0) > 0).length,
          drawn: rs.filter((r) => (r.oak[s]?.drawn ?? 0) > 0).length,
          seeding: rs.filter((r) => (r.oak[s]?.seeding ?? 0) > 0).length,
          seedingIn10: rs.filter((r) => (r.oak[s]?.seedingIn10 ?? 0) > 0).length,
          liveTrees: rs.reduce((a, r) => a + (r.oak[s]?.live ?? 0), 0),
        },
      ]),
    ),
    oakRecruits: rs.reduce((a, r) => a + r.oakRecruits, 0),
    oakRecruitsDrawn: rs.reduce((a, r) => a + r.oakRecruitsDrawn, 0),
    wallMedian: median(rs.map((r) => r.wall)),
  };
};

const result: Record<
  string,
  {
    byWidth: Record<number, ReturnType<typeof counts>>;
    pooled: ReturnType<typeof counts>;
    runs: Summary[];
  }
> = {};
for (const cond of names) {
  const runs = all.filter((j) => j.cond === cond).map(summarise);
  const byWidth = Object.fromEntries(
    WIDTHS.map((w) => [w, counts(runs.filter((r) => r.width === w))]),
  );
  result[cond] = { byWidth, pooled: counts(runs), runs };
  writeFileSync(
    join(out, cond, "summary.json"),
    JSON.stringify({ cond, patch: CONDITIONS[cond], seeds, ...result[cond] }, null, 1),
  );
}

// --- The tests (gates 3 and 4).
const tests: Record<string, Record<string, boolean | string>> = {};
if (withTests) {
  // Gate 4: the lone open-grown tree, natively, against the build before #121.
  const lone = LONE.species.flatMap((sp) => LONE.seeds.map((seed) => ({ sp, seed })));
  for (const cond of names) {
    const dirOf = (x: { sp: string; seed: number }) =>
      join(out, "lone", cond, `${x.sp}-s${x.seed}`);
    await pool(lone, jobs, (x) =>
      existsSync(join(dirOf(x), "hash.txt"))
        ? Promise.resolve()
        : sim(
            patched(loneTreeParams(x.sp, x.seed), CONDITIONS[cond] as Patch),
            LONE.seasons,
            dirOf(x),
          ),
    );
    const t: Record<string, boolean | string> = {};
    for (const x of lone) {
      const h = readFileSync(join(dirOf(x), "hash.txt"), "utf8").trim();
      const want = PRE121_LONE[`${x.sp}:${x.seed}`];
      t[`lone ${x.sp} s${x.seed} ${h}`] = want === undefined ? "no recorded hash" : h === want;
    }
    tests[cond] = t;
  }
  // Gate 3: a garden checkpoint saved by HEAD's build loads, takes the condition's params and grows
  // on; the frozen fixtures load. WASM (npm run build:wasm), as the page loads them.
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
    const patch = CONDITIONS[cond] as Patch;
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
      cond === "r6" ||
      ((a.p.o4 as { suppressionSignal?: string }).suppressionSignal === "topLight" &&
        a.p.species?.hornbeam?.o4?.cSeed === 300);
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

// --- The tables and the pre-registered choice.
const pct = (x: number) => (Number.isNaN(x) ? "-" : `${Math.round(100 * x)}%`);
for (const cond of names) {
  const r = result[cond];
  if (!r) continue;
  console.log(`\n${cond} ${JSON.stringify(CONDITIONS[cond])} at ${r.runs[0]?.commit}`);
  for (const w of WIDTHS) {
    const c = r.byWidth[w];
    if (!c) continue;
    const n = c.runs;
    console.log(
      `  ${w}: gate1 ${c.gate1}/${n}${w === 66 ? `, gate2 ${c.gate2}/${n}` : ""} | band ${c.inBand}/${c.frames} | canopy share med ${c.canopyShareMedian.toFixed(2)}, ≥0.6 ${c.canopyShare60}/${c.frames} | cap seasons ${c.capSeasons} (free ${c.capFree}/${n}, med ${c.capMedian}, mismatch ${c.capMismatch}) | 70% bar ${c.mixPass}/${c.judged} judged (${pct(c.mixFraction)}) | oak 150 live/drawn/seeding/seed10 ${Object.values(
        c.oak[150] ?? {},
      )
        .slice(0, 4)
        .join("/")}, 300 ${Object.values(c.oak[300] ?? {})
        .slice(0, 4)
        .join(
          "/",
        )} of ${n}; recruits ${c.oakRecruits} (drawn ${c.oakRecruitsDrawn}) | wall med ${c.wallMedian.toFixed(0)} s`,
    );
  }
  for (const [k, v] of Object.entries(tests[cond] ?? {})) console.log(`  test: ${k}: ${v}`);
}
console.log(`\nruns wall ${(runsWall / 60).toFixed(1)} min on ${jobs} simulators`);

const r6 = result.r6;
const d1 = result.d1;
if (r6 && d1) {
  const gatesOf = (r: (typeof result)[string]) =>
    WIDTHS.flatMap((w) => [
      { k: `gate1 w${w}`, n: r.byWidth[w]?.gate1 ?? 0 },
      ...(w === 66 ? [{ k: `gate2 w${w}`, n: r.byWidth[w]?.gate2 ?? 0 }] : []),
    ]);
  const testsPass = (cond: string) => Object.values(tests[cond] ?? {}).every((v) => v === true);
  const passes = (cond: string, r: (typeof result)[string]) =>
    gatesOf(r).every((g) => g.n >= GATE_OF_20 * (seeds.length / 20)) &&
    (!withTests || testsPass(cond));
  const notWorse = gatesOf(d1).every((g, i) => g.n >= (gatesOf(r6)[i]?.n ?? 0));
  const [a, b] = [r6.pooled, d1.pooled];
  const mixBetter =
    a.judged < 10 || b.judged < 10
      ? b.judged - b.mixPass < a.judged - a.mixPass
      : b.mixFraction > a.mixFraction;
  const better = [b.inBand > a.inBand, b.capSeasons < a.capSeasons, mixBetter];
  console.log(
    `\nr6 passes the gates: ${passes("r6", r6)}; d1: ${passes("d1", d1)}; d1 no worse on any gate: ${notWorse}`,
  );
  console.log(
    `d1 better on band ${better[0]} (${b.inBand} vs ${a.inBand}), cap ${better[1]} (${b.capSeasons} vs ${a.capSeasons}), 70% bar ${better[2]} (${b.mixPass}/${b.judged} vs ${a.mixPass}/${a.judged})`,
  );
  const pick =
    !passes("r6", r6) && !passes("d1", d1)
      ? "neither: a hard gate fails in both (the fail path)"
      : passes("d1", d1) && notWorse && better.filter(Boolean).length >= 2
        ? "d1"
        : "r6";
  console.log(`the pre-registered choice: ${pick}`);
}
