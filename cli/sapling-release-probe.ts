/**
 * #138's sapling-release probe: do understorey saplings (1–5 m) grow when their unspent v is
 * concentrated (R5's δλ, `r5.dLambda`) or banked in R1's reserve (`r1.unspent` "banked", built off
 * by default), without moving the lone trees or costing the garden its canopy? Natively, against
 * HEAD's garden at widths 160 and 66 to season 300, and lone beech, hornbeam and oak to 100. Too
 * slow for `npm run check`: run by hand. The bars were fixed before the runs:
 * docs/experiments/2026-11-16-sapling-release-probe.md.
 *
 *   node cli/sapling-release-probe.ts                    seeds 1–3, every arm, 6 simulators
 *   node cli/sapling-release-probe.ts -j 6 --arms head,bank --seeds 1-20
 *
 * Per arm and seed: the garden at 160 and 66 cells (treesim, snapshots 100 and 200 for DBH), the
 * sapling probe (`rust/core/examples/sapling_probe.rs`) on the same 160-cell params (it replays
 * them with `World::step`, as treesim does), and the lone trees. Writes
 * runs/sapling-release-probe/<arm>/…, summary.json and bars.json. Generated, never committed.
 */
import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Params } from "../src/core/params.ts";
import { DISPLAY_THRESHOLD, forestParams, loneTreeParams } from "../src/core/presets.ts";
import { allometry, CELL, type Columns } from "./allometry.ts";
import { arg, median, type Patch, patched, pool, sim } from "./shared.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SPECIES = [
  "birch",
  "beech",
  "oak",
  "fir",
  "hornbeam",
  "maple",
  "holly",
  "rowan",
  "willow",
  "pine",
];

/** R1 lives in each species' own patch (a full r1 group), so the bank is set per species. */
const r1Arm = (r1: Record<string, unknown>): Patch => ({
  species: Object.fromEntries(SPECIES.map((sp) => [sp, { r1 }])) as Patch["species"],
});
/** R5 is the world's (no species patch carries one). HEAD's δλ is 0.02. */
const r5Arm = (dLambda: number): Patch => ({
  params: { r5: { dLambda } } as Patch["params"],
});

export const ARMS: Record<string, Patch> = {
  head: {},
  dl0: r5Arm(0),
  dl10: r5Arm(0.1),
  dl25: r5Arm(0.25),
  bank: r1Arm({ unspent: "banked", keep: 1 }),
  bank4: r1Arm({ unspent: "banked", keep: 1, store: 4 }),
};
const WIDTHS = [160, 66];
const SEASONS = 300;
const FRAMES = [100, 200, 300];
const DRAWN = DISPLAY_THRESHOLD;
/** ADR 0068's band floor, metres. */
const DBH_FLOOR = 0.07;
/** The sapling class, cells (1–5 m), and the probe's window (1–10 m from season 40). */
const SAPLING = { lo: 4, hi: 20, probeHi: 40, from: 40 };
const LONE = { species: ["beech", "hornbeam", "oak"], seasons: 100 };

const jobs = Math.min(6, Math.max(1, Number(arg("-j", "6"))));
const names = arg("--arms", Object.keys(ARMS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-3").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/sapling-release-probe"));
const snapshots = FRAMES.slice(0, -1).join(",");

// Build treesim and the sapling probe once, before the pool.
await sim(loneTreeParams("oak", 1), 1, join(out, "build"));
const target = join(ROOT, "rust", "target", "native");
execFileSync(
  "cargo",
  [
    "build",
    "--release",
    "--quiet",
    "--locked",
    "--example",
    "sapling_probe",
    "--target-dir",
    target,
  ],
  { cwd: join(ROOT, "rust", "core"), stdio: "inherit" },
);
const PROBE = join(target, "release", "examples", "sapling_probe");

function probe(params: Params, dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "params.json");
  writeFileSync(file, JSON.stringify(params));
  const args = [file, SEASONS, SAPLING.from, SAPLING.lo, SAPLING.probeHi].map(String);
  const part = join(dir, "saplings.part");
  const fd = openSync(part, "w");
  return new Promise((ok, bad) => {
    const c = spawn(PROBE, args, { stdio: ["ignore", fd, "inherit"] });
    c.on("exit", (code) => {
      closeSync(fd);
      if (code !== 0) return bad(new Error(`${dir}: exit ${code}`));
      renameSync(part, join(dir, "saplings.csv"));
      ok();
    });
  });
}

// --- The runs: the long ones first.
const t0 = performance.now();
type Job = { kind: "garden" | "saplings" | "lone"; cond: string; seed: number; key: string };
const dirOf = (j: Job) => join(out, j.cond, `${j.key}-s${j.seed}`);
const doneFile = { garden: "stand.csv", saplings: "saplings.csv", lone: "hash.txt" } as const;
const all: Job[] = [
  ...seeds.flatMap((seed) =>
    names.flatMap((cond) => [
      { kind: "garden" as const, cond, seed, key: "w160" },
      { kind: "saplings" as const, cond, seed, key: "saplings160" },
      { kind: "garden" as const, cond, seed, key: "w66" },
    ]),
  ),
  ...names.flatMap((cond) =>
    LONE.species.flatMap((sp) =>
      seeds.map((seed) => ({ kind: "lone" as const, cond, seed, key: `lone-${sp}` })),
    ),
  ),
];
await pool(all, jobs, async (j) => {
  if (existsSync(join(dirOf(j), doneFile[j.kind]))) return;
  const patch = ARMS[j.cond] as Patch;
  if (j.kind === "lone") {
    const sp = j.key.slice(5);
    await sim(patched(loneTreeParams(sp, j.seed), patch), LONE.seasons, dirOf(j));
  } else if (j.kind === "saplings") {
    await probe(patched(forestParams(160, j.seed), patch), dirOf(j));
  } else {
    const width = Number(j.key.slice(1));
    await sim(patched(forestParams(width, j.seed), patch), SEASONS, dirOf(j), [
      "--snapshots",
      snapshots,
    ]);
  }
});
const runsWall = (performance.now() - t0) / 1000;

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

/** #122's gates and the garden's reported measures, one run. */
function garden(dir: string, width: number) {
  const params = JSON.parse(readFileSync(join(dir, "record.json"), "utf8")).params as Params;
  const ha = (width * (params.world.depth ?? 64) * 0.0625) / 10_000;
  const stand = [...rows(join(dir, "stand.csv"))];
  const ref = new Map(stand.map((r) => [Number(r.season), Number(r.topHeight100)]));
  const isCanopy = (s: number, h: number) =>
    h >= DRAWN && h > 0.5 * (ref.get(s) ?? Number.POSITIVE_INFINITY);
  const dbh = dbhs(dir);
  const atFrame = new Map<number, { id: string; h: number }[]>(FRAMES.map((s) => [s, []]));
  for (const r of rows(join(dir, "metrics.csv"))) {
    if (r.alive === "1")
      atFrame.get(Number(r.season))?.push({ id: r.tree as string, h: Number(r.height) });
  }
  const canopyFrom = (s: number) =>
    Math.min(...stand.filter((r) => Number(r.season) >= s).map((r) => Number(r.canopy)));
  const meta = JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).meta;
  return {
    gate1: canopyFrom(51) >= 1,
    gate2: canopyFrom(100) >= 1,
    canopyPerHa100: median(
      stand.filter((r) => Number(r.season) >= 100).map((r) => Number(r.canopy) / ha),
    ),
    capSeasons: Number(meta.capSeasons),
    frames: FRAMES.map((s) => {
      const trees = atFrame.get(s) ?? [];
      const big = trees.filter((t) => (dbh.get(`${s}:${t.id}`) ?? 0) >= DBH_FLOOR);
      return {
        season: s,
        bank: trees.filter((t) => t.h < DRAWN).length,
        stems7PerHa: Math.round(big.length / ha),
        canopyShare7: big.length ? big.filter((t) => isCanopy(s, t.h)).length / big.length : 0,
      };
    }),
  };
}

type Row = Record<string, number> & { species: string };
/** The sapling class's measures over one arm's seeds (rows from season 50, so a decade fits). */
function saplings(cond: string) {
  const rs: (Row & { seed: number })[] = [];
  for (const seed of seeds) {
    for (const r of rows(join(out, cond, `saplings160-s${seed}`, "saplings.csv"))) {
      const x = Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, k === "species" ? v : Number(v)]),
      ) as Row;
      x.seed = seed;
      rs.push(x as Row & { seed: number });
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
      .filter(([, xs]) => xs.length >= 30)
      .map(([sp, xs]) => [sp, { n: xs.length, noGrowth: share(xs, (r) => r.grew === 0) }]),
  );
  const surplus = sap.filter((r) => r.P > r.M);
  const vb = surplus.reduce((a, r) => a + r.vBase, 0);
  const grown = surplus.reduce((a, r) => a + r.grew, 0);
  return {
    treeSeasons: sap.length,
    trees: new Set(sap.map((r) => `${r.seed}:${r.tree}`)).size,
    noGrowth: share(sap, (r) => r.grew === 0),
    bySpecies,
    decades: gains.length,
    gainPerDecade: median(gains),
    gainP90: [...gains].sort((a, b) => a - b)[Math.floor(0.9 * (gains.length - 1))] ?? Number.NaN,
    noGainDecades: gains.filter((g) => g <= 0).length / Math.max(1, gains.length),
    reserveAtCap: share(sap, (r) => r.reserveCap > 0 && r.reserve >= 0.999 * r.reserveCap),
    vBasePerMetamer: vb / Math.max(1, grown),
    vBaseMedian: median(sap.map((r) => r.vBase)),
    pm: median(sap.filter((r) => r.M > 0).map((r) => r.P / r.M)),
  };
}

/** The lone tree's height and crown width at the last season, cells, and its state hash. */
function lone(cond: string, sp: string, seed: number) {
  const dir = join(out, cond, `lone-${sp}-s${seed}`);
  let last: Record<string, string> | undefined;
  for (const r of rows(join(dir, "metrics.csv"))) if (r.alive === "1") last = r;
  const h = Number(last?.height ?? 0);
  return {
    hash: readFileSync(join(dir, "hash.txt"), "utf8").trim(),
    height: h,
    wh: h > 0 ? Number(last?.crownWidth ?? 0) / h : 0,
    metamers: Number(last?.metamers ?? 0),
  };
}

const result: Record<string, unknown> = {};
for (const cond of names) {
  const g = WIDTHS.map((w) => ({
    w,
    runs: seeds.map((seed) => garden(join(out, cond, `w${w}-s${seed}`), w)),
  }));
  result[cond] = {
    saplings: saplings(cond),
    garden: Object.fromEntries(
      g.map(({ w, runs }) => {
        const fr = runs.flatMap((r) => r.frames);
        return [
          w,
          {
            gate1: runs.filter((r) => r.gate1).length,
            gate2: runs.filter((r) => r.gate2).length,
            canopyPerHa100: median(runs.map((r) => r.canopyPerHa100)),
            capSeasons: runs.map((r) => r.capSeasons),
            bankMedian: median(fr.map((f) => f.bank)),
            stems7PerHaMedian: median(fr.map((f) => f.stems7PerHa)),
            canopyShare7Median: median(fr.map((f) => f.canopyShare7)),
            runs,
          },
        ];
      }),
    ),
    lone: Object.fromEntries(
      LONE.species.map((sp) => [sp, seeds.map((seed) => lone(cond, sp, seed))]),
    ),
  };
}
writeFileSync(join(out, "summary.json"), JSON.stringify({ seeds, arms: ARMS, result }, null, 1));

// --- The bars (the note's, fixed before the runs).
type R = {
  saplings: ReturnType<typeof saplings>;
  garden: Record<number, { gate1: number; gate2: number; canopyPerHa100: number }>;
  lone: Record<string, ReturnType<typeof lone>[]>;
};
const head = result.head as R | undefined;
const bars: Record<string, Record<string, boolean>> = {};
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "-");
for (const cond of names) {
  const a = result[cond] as R;
  const s = a.saplings;
  console.log(
    `\n${cond}: saplings ${s.treeSeasons} tree-seasons (${s.trees} trees), P/M ${f2(s.pm)}, v_base ${f2(s.vBaseMedian)} | no growth ${f2(s.noGrowth)} (${Object.entries(
      s.bySpecies,
    )
      .map(([sp, x]) => `${sp} ${f2(x.noGrowth)}`)
      .join(
        ", ",
      )}) | gain/decade med ${f2(s.gainPerDecade)} m, P90 ${f2(s.gainP90)}, none ${f2(s.noGainDecades)} (${s.decades}) | reserve at cap ${f2(s.reserveAtCap)} | v_base per metamer ${f2(s.vBasePerMetamer)}`,
  );
  for (const w of WIDTHS) {
    const x = (a.garden as Record<number, Record<string, unknown>>)[w] as Record<string, unknown>;
    console.log(
      `  ${w}: gate1 ${x.gate1}/${seeds.length}${w === 66 ? `, gate2 ${x.gate2}/${seeds.length}` : ""} | canopy/ha med ${f2(x.canopyPerHa100 as number)} | cap seasons ${(x.capSeasons as number[]).join(",")} | bank med ${x.bankMedian} | ≥7cm ${x.stems7PerHaMedian}/ha, canopy share ${f2(x.canopyShare7Median as number)}`,
    );
  }
  for (const sp of LONE.species) {
    const l = a.lone[sp] ?? [];
    console.log(
      `  lone ${sp}: H ${l.map((x) => x.height.toFixed(1)).join(",")} W/H ${l.map((x) => f2(x.wh)).join(",")} metamers ${l.map((x) => x.metamers).join(",")} hashes ${l.map((x) => x.hash).join(",")}`,
    );
  }
  if (!head || cond === "head") continue;
  const h = head.saplings;
  const n = seeds.length;
  const inNoise = (sp: string, key: "height" | "wh") => {
    const ref = (head.lone[sp] ?? []).map((x) => x[key]);
    const m = median((a.lone[sp] ?? []).map((x) => x[key]));
    return m >= 0.9 * Math.min(...ref) && m <= 1.1 * Math.max(...ref);
  };
  const b = {
    s1NoGrowth: s.noGrowth <= h.noGrowth - 0.1,
    s2Gain:
      s.gainPerDecade >= 2 * h.gainPerDecade &&
      s.noGainDecades < h.noGainDecades &&
      s.gainPerDecade <= 3,
    lone: LONE.species.every((sp) => inNoise(sp, "height") && inNoise(sp, "wh")),
    gates: a.garden[160]?.gate1 === n && a.garden[66]?.gate1 === n && a.garden[66]?.gate2 === n,
    canopy: WIDTHS.every(
      (w) => (a.garden[w]?.canopyPerHa100 ?? 0) >= (head.garden[w]?.canopyPerHa100 ?? 0),
    ),
  };
  bars[cond] = { ...b, passes: Object.values(b).every(Boolean) };
  console.log(
    `  bars: ${Object.entries(b)
      .map(([k, v]) => `${k} ${v ? "pass" : "FAIL"}`)
      .join(", ")} → ${bars[cond]?.passes ? "PASSES" : "fails"}`,
  );
}
writeFileSync(join(out, "bars.json"), JSON.stringify({ seeds, bars }, null, 1));
console.log(`\nruns wall ${(runsWall / 60).toFixed(1)} min on ${jobs} simulators`);
