/**
 * The garden guard for the oak's rounded crown (#124, `d16a13`: oak `r2.dLambda` 0.16 from `aC`
 * 13.5) in the ADR 0062/0063 garden (#121, round 6's rates; ADR 0065). HEAD against HEAD + the
 * patch, on the same worlds: `forestParams(width, seed)` at widths 160 and 66, 300 seasons,
 * natively (release; `cli/run.ts` builds it when stale). Too slow for `npm run check` (about an hour
 * on 4 simulators): it runs by hand, as the other evidence scripts do.
 *
 * The bars were fixed before the run: docs/experiments/2026-11-10-oak-rounded-crown-evidence.md,
 * "Garden guard in the 0062/0063 garden". In short, per width:
 *   - the seeds: 1..N, N the smallest ≥ 20 with ≥ 20 gardens that plant an oak (a one-season
 *     screen of HEAD's planting; the patch plants the same, which the summary checks);
 *   - regeneration: runs with a live oak at 150 ≥ HEAD's − 2, and runs with a seeding oak at 150
 *     (a live oak with `seeds` > 0 in season 150) ≥ HEAD's − 2, over the oak-planting gardens;
 *   - bare bole: beech and hornbeam ≥ 10 m at 100/150/300, pooled medians: `liveCrownBase` within
 *     ±0.05 of HEAD's and `topFifthLeaf` within ±25%, judged where both arms have ≥ 5 trees;
 *   - the named regressions (phoneSeed3, forestRegeneration; cli/regressions.ts' worlds): hashes
 *     equal, or else the vectors no worse than HEAD's (run here, not read from tests/regressions.json,
 *     which #123 is re-baselining).
 * Reported: oak at 300, oaks that set seed by 150, oak recruits and those reaching 1.3 m.
 *
 *   node cli/oak-garden-guard.ts                 screen, runs (resumable), regressions, summary
 *   node cli/oak-garden-guard.ts -j 2 --widths 66
 *
 * Writes runs/oak-garden-guard/{screen/, <arm>/w<width>-s<seed>/, <arm>/regress-*, summary.json}.
 * Generated, never committed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Params, SpeciesPatch } from "../src/core/params.ts";
import { DISPLAY_THRESHOLD, forestParams } from "../src/core/presets.ts";
import { arg, median, runCli as node, patched, pool, sim } from "./shared.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
/** The user-approved schedule (#124's round two). HEAD's oak: dLambda 0.04 from aC 13.51. */
export const D16A13: Record<string, SpeciesPatch> = { oak: { r2: { dLambda: 0.16, aC: 13.5 } } };
export const ARMS: Record<string, Record<string, SpeciesPatch>> = { head: {}, d16a13: D16A13 };
export const SEASONS = 300;
export const OAK_AT = [150, 300];
export const BOLE_AT = [100, 150, 300];
export const BOLE_SPECIES = ["beech", "hornbeam"];
/** Gardens per width that must plant an oak (AGENTS.md: ≥ 20 seeds). */
export const GARDENS = 20;
/** Regeneration bar: d16a13's count ≥ HEAD's − SLACK, per width. */
export const SLACK = 2;
/** Stand trees for the bare-bole bars: ≥ 10 m (40 cells of 0.25 m). */
const TALL = 40;
/** The display threshold (stand.rs `is_drawn`): 1.3 m in cells. */
const DRAWN = DISPLAY_THRESHOLD;
/** A bare-bole cell (species × width × season) is judged when both arms have this many trees. */
const BOLE_MIN = 5;
const LCB_TOL = 0.05;
const LID_TOL = 0.25;

const jobs = Math.min(8, Math.max(1, Number(arg("-j", "4"))));
const widths = arg("--widths", "160,66").split(",").map(Number);
const out = join(ROOT, arg("--out", "runs/oak-garden-guard"));

const done = (dir: string) => existsSync(join(dir, "hash.txt"));

const COLS = [
  "season",
  "tree",
  "alive",
  "height",
  "seeds",
  "metamers",
  "liveCrownBase",
  "topFifthLeaf",
] as const;
type Row = { species: string } & Record<(typeof COLS)[number], number>;
/** metrics.csv (one row per tree per season), only the columns the guard reads. */
function metrics(dir: string): Row[] {
  const [head, ...lines] = readFileSync(join(dir, "metrics.csv"), "utf8").trim().split("\n");
  const h = (head as string).split(",");
  const idx = COLS.map((c) => h.indexOf(c));
  const sp = h.indexOf("species");
  return lines.map((l) => {
    const v = l.split(",");
    const r = { species: v[sp] as string } as Row;
    COLS.forEach((c, k) => {
      r[c] = Number(v[idx[k] as number]);
    });
    return r;
  });
}
const plantedCount = (p: Params, width: number) => {
  const ha = (width * (p.world.depth ?? 64) * 0.0625) / 10_000;
  return Math.round((p.o4.planting?.density ?? 0) * ha);
};

const t0 = performance.now();
// Build once before the pools, so the simulators do not race to build it.
await sim(forestParams(66, 1), 1, join(out, "build"));

// --- The screen: which seeds plant an oak (season 1 of HEAD's garden).
const seedsOf: Record<number, { seeds: number[]; oak: number[] }> = {};
for (const width of widths) {
  const seeds: number[] = [];
  const oak: number[] = [];
  for (let seed = 1; oak.length < GARDENS || seeds.length < GARDENS; seed++) {
    if (seed > 200) throw new Error(`width ${width}: under ${GARDENS} oak gardens in seeds 1–200`);
    const dir = join(out, "screen", `w${width}-s${seed}`);
    const p = forestParams(width, seed);
    if (!done(dir)) await sim(p, 1, dir);
    const n = plantedCount(p, width);
    const rows = metrics(dir);
    seeds.push(seed);
    if (rows.some((r) => r.season === 1 && r.tree < n && r.species === "oak")) oak.push(seed);
  }
  seedsOf[width] = { seeds, oak };
  console.log(`screen ${width}: seeds 1–${seeds.length}, oak planted in ${oak.length}`);
}

// --- The runs: desktop first, so the long runs do not tail the pool.
type Job = { arm: string; width: number; seed: number };
const runDir = ({ arm, width, seed }: Job) => join(out, arm, `w${width}-s${seed}`);
const all: Job[] = widths.flatMap((width) =>
  (seedsOf[width]?.seeds ?? []).flatMap((seed) =>
    Object.keys(ARMS).map((arm) => ({ arm, width, seed })),
  ),
);
// --- The named regressions' worlds (cli/regressions.ts' commands), each arm.
const SP = JSON.stringify(D16A13);
const phoneParams = join(out, "phoneSeed3.params.json");
mkdirSync(out, { recursive: true });
writeFileSync(phoneParams, JSON.stringify(forestParams(66, 3)));
const REGRESS: Record<string, string[]> = {
  phoneSeed3: ["--preset", "mixedWood", "--seasons", "150", "--params", phoneParams],
  forestRegeneration: ["--preset", "forest", "--seed", "1", "--seasons", "300"],
};
type Reg = { arm: string; name: string };
const regs: Reg[] = Object.keys(REGRESS).flatMap((name) =>
  Object.keys(ARMS).map((arm) => ({ arm, name })),
);
const regDir = (r: Reg) => join(out, r.arm, `regress-${r.name}`);
const tasks: (() => Promise<unknown>)[] = [
  ...all.map((j) => () => {
    const base = forestParams(j.width, j.seed);
    return done(runDir(j))
      ? Promise.resolve()
      : sim(patched(base, { species: ARMS[j.arm] ?? {} }), SEASONS, runDir(j));
  }),
  ...regs.map((r) => () => {
    const extra = r.arm === "head" ? [] : ["--species-patch", SP];
    return done(regDir(r))
      ? Promise.resolve()
      : node([...(REGRESS[r.name] ?? []), ...extra], regDir(r));
  }),
];
await pool(tasks, jobs, (f) => f());
const runsWall = (performance.now() - t0) / 1000;

// --- One run's summary.
function summarise(j: Job) {
  const dir = runDir(j);
  const params = JSON.parse(readFileSync(join(dir, "record.json"), "utf8")).params as Params;
  const planted = plantedCount(params, j.width);
  const rows = metrics(dir);
  const plantedOaks = rows
    .filter((r) => r.season === 1 && r.tree < planted)
    .map((r) => `${r.tree}:${r.species}`)
    .join(",");
  const oaks = rows.filter((r) => r.species === "oak");
  const live = (s: number) => oaks.filter((r) => r.alive === 1 && r.season === s);
  const oak = Object.fromEntries(
    OAK_AT.map((s) => [
      s,
      {
        live: live(s).length,
        drawn: live(s).filter((r) => r.height >= DRAWN).length,
        seeding: live(s).filter((r) => r.seeds > 0).length,
        seedingIn10: new Set(
          oaks
            .filter((r) => r.alive === 1 && r.season > s - 10 && r.season <= s && r.seeds > 0)
            .map((r) => r.tree),
        ).size,
      },
    ]),
  );
  const firstSeed = oaks.filter((r) => r.seeds > 0).reduce((a, r) => Math.min(a, r.season), 1e9);
  const recruits = new Set(oaks.filter((r) => r.tree >= planted).map((r) => r.tree));
  const recruitsDrawn = new Set(
    oaks.filter((r) => r.tree >= planted && r.height >= DRAWN).map((r) => r.tree),
  );
  const bole = Object.fromEntries(
    BOLE_SPECIES.map((sp) => [
      sp,
      Object.fromEntries(
        BOLE_AT.map((s) => [
          s,
          rows
            .filter((r) => r.species === sp && r.season === s && r.alive === 1 && r.height >= TALL)
            .map((r) => ({ lcb: r.liveCrownBase, lid: r.topFifthLeaf })),
        ]),
      ),
    ]),
  ) as Record<string, Record<number, { lcb: number; lid: number }[]>>;
  return {
    ...j,
    plantsOak: oaks.some((r) => r.season === 1 && r.tree < planted),
    planting: plantedOaks,
    oak,
    firstSeed: firstSeed < 1e9 ? firstSeed : null,
    seededBy150: oaks.some((r) => r.season <= 150 && r.seeds > 0),
    seedsBy150: oaks.filter((r) => r.season <= 150).reduce((a, r) => a + r.seeds, 0),
    recruits: recruits.size,
    recruitsDrawn: recruitsDrawn.size,
    bole,
    hash: readFileSync(join(dir, "hash.txt"), "utf8").trim(),
    wall: Number(readFileSync(join(dir, "wall.txt"), "utf8")),
  };
}
type Summary = ReturnType<typeof summarise>;
/** The median of the finite values; NaN with none. */
const finiteMedian = (xs: number[]) => median(xs.filter((x) => Number.isFinite(x)));
const runsWith = (rs: Summary[], s: number, k: "live" | "drawn" | "seeding" | "seedingIn10") =>
  rs.filter((r) => (r.oak[s]?.[k] ?? 0) > 0).length;
function counts(rs: Summary[]) {
  return {
    runs: rs.length,
    oak: Object.fromEntries(
      OAK_AT.map((s) => [
        s,
        {
          live: runsWith(rs, s, "live"),
          drawn: runsWith(rs, s, "drawn"),
          seeding: runsWith(rs, s, "seeding"),
          seedingIn10: runsWith(rs, s, "seedingIn10"),
          liveTrees: rs.reduce((a, r) => a + (r.oak[s]?.live ?? 0), 0),
        },
      ]),
    ),
    seededBy150: rs.filter((r) => r.seededBy150).length,
    seedsBy150: rs.reduce((a, r) => a + r.seedsBy150, 0),
    recruits: rs.reduce((a, r) => a + r.recruits, 0),
    recruitsDrawn: rs.reduce((a, r) => a + r.recruitsDrawn, 0),
  };
}

const res: Record<string, Summary[]> = {};
for (const arm of Object.keys(ARMS)) res[arm] = all.filter((j) => j.arm === arm).map(summarise);
const head = res.head ?? [];
const patch = res.d16a13 ?? [];
const pick = (rs: Summary[], width: number, seeds: number[]) =>
  rs.filter((r) => r.width === width && seeds.includes(r.seed));

const report: Record<string, unknown> = { arms: ARMS, seedsOf, widths: {} };
const lines: string[] = [];
const oakLine = (c: ReturnType<typeof counts>) => {
  const f = (s: number) => {
    const o = c.oak[s];
    return o ? `${o.live}/${o.drawn}/${o.seeding}/${o.seedingIn10}` : "-";
  };
  return `oak 150 live/drawn/seeding/seed10 ${f(150)}, 300 ${f(300)} of ${c.runs}; seeded by 150 ${c.seededBy150} (${c.seedsBy150} seeds); recruits ${c.recruits} (>= 1.3 m ${c.recruitsDrawn})`;
};
let regenPass = true;
let bolePass = true;
for (const width of widths) {
  const { seeds, oak: oakSeeds } = seedsOf[width] ?? { seeds: [], oak: [] };
  const h = pick(head, width, oakSeeds);
  const p = pick(patch, width, oakSeeds);
  const same = h.every((x) => p.find((y) => y.seed === x.seed)?.planting === x.planting);
  const plantsAgree = h.every((x) => x.plantsOak) && p.every((x) => x.plantsOak) && same;
  const [ch, cp] = [counts(h), counts(p)];
  const live = { head: ch.oak[150]?.live ?? 0, d16a13: cp.oak[150]?.live ?? 0 };
  const seeding = { head: ch.oak[150]?.seeding ?? 0, d16a13: cp.oak[150]?.seeding ?? 0 };
  const regen = {
    live150: live.d16a13 >= live.head - SLACK,
    seeding150: seeding.d16a13 >= seeding.head - SLACK,
  };
  if (!(regen.live150 && regen.seeding150)) regenPass = false;
  // #122's self-check: HEAD on seeds 1–20, all gardens (its table counts runs of 20).
  const first20 = Array.from({ length: 20 }, (_, k) => k + 1);
  const c122 = counts(pick(head, width, first20));
  lines.push(
    `\nwidth ${width}: seeds 1-${seeds.length}, ${oakSeeds.length} plant an oak (${oakSeeds.join(",")}); planting identical in both arms: ${plantsAgree}`,
    `  head: ${oakLine(ch)}`,
    `  d16a13: ${oakLine(cp)}`,
    `  #122 self-check (HEAD, seeds 1-20, all gardens): ${oakLine(c122)}`,
    `  regeneration: live150 ${live.d16a13} vs ${live.head} -> ${regen.live150}; seeding150 ${seeding.d16a13} vs ${seeding.head} -> ${regen.seeding150}`,
  );
  // Bare bole, pooled over every seed run at this width (oak-planting or not).
  const bole: Record<string, unknown> = {};
  for (const sp of BOLE_SPECIES)
    for (const s of BOLE_AT) {
      const trees = (rs: Summary[]) => pick(rs, width, seeds).flatMap((r) => r.bole[sp]?.[s] ?? []);
      const [th, tp] = [trees(head), trees(patch)];
      const m = (ts: { lcb: number; lid: number }[]) => ({
        n: ts.length,
        lcb: finiteMedian(ts.map((t) => t.lcb)),
        lid: finiteMedian(ts.map((t) => t.lid)),
      });
      const [mh, mp] = [m(th), m(tp)];
      const judged = mh.n >= BOLE_MIN && mp.n >= BOLE_MIN;
      const pass =
        !judged ||
        (Math.abs(mp.lcb - mh.lcb) <= LCB_TOL && Math.abs(mp.lid / mh.lid - 1) <= LID_TOL);
      if (!pass) bolePass = false;
      bole[`${sp}@${s}`] = { head: mh, d16a13: mp, judged, pass };
      lines.push(
        `  bole ${sp}@${s}: head n ${mh.n} lcb ${mh.lcb.toFixed(3)} lid ${mh.lid.toFixed(2)} | d16a13 n ${mp.n} lcb ${mp.lcb.toFixed(3)} lid ${mp.lid.toFixed(2)} | ${judged ? (pass ? "pass" : "FAIL") : "not judged"}`,
      );
    }
  (report.widths as Record<number, unknown>)[width] = {
    seeds: seeds.length,
    oakGardens: oakSeeds,
    plantsAgree,
    head: ch,
    d16a13: cp,
    regen,
    selfCheck122: c122,
    bole,
    perSeed: oakSeeds.map((seed) => {
      const a = h.find((r) => r.seed === seed);
      const b = p.find((r) => r.seed === seed);
      return {
        seed,
        firstSeed: [a?.firstSeed, b?.firstSeed],
        seedsBy150: [a?.seedsBy150, b?.seedsBy150],
        live150: [a?.oak[150]?.live, b?.oak[150]?.live],
        seeding150: [a?.oak[150]?.seeding, b?.oak[150]?.seeding],
        live300: [a?.oak[300]?.live, b?.oak[300]?.live],
        hashSame: a?.hash === b?.hash,
      };
    }),
    wallMedian: {
      head: finiteMedian(h.map((r) => r.wall)),
      d16a13: finiteMedian(p.map((r) => r.wall)),
    },
  };
}

// --- The named regressions: vectors as cli/regressions.ts computes them.
function vector(name: string, dir: string): Record<string, number> {
  const r = metrics(dir);
  const at = (s: number) => r.filter((x) => x.season === s && x.alive === 1);
  const sum = (xs: typeof r) => xs.reduce((a, x) => a + x.metamers, 0);
  const o: Record<string, number> = {};
  if (name === "phoneSeed3") {
    const planted = forestParams(66, 3).trees.length; // as cli/regressions.ts reads it
    for (const s of [50, 100, 150]) {
      o[`live${s}`] = at(s).length;
      o[`planted${s}`] = at(s).filter((x) => x.tree < planted).length;
      o[`canopy${s}`] = at(s).filter((x) => x.height >= 40).length;
      o[`metamers${s}`] = sum(at(s));
    }
  } else {
    const planted = new Set(r.filter((x) => x.season === 1).map((x) => x.tree)).size;
    const tallest = new Map<number, number>();
    for (const x of r)
      if (x.tree >= planted) tallest.set(x.tree, Math.max(tallest.get(x.tree) ?? 0, x.height));
    o.recruitsBorn = tallest.size;
    o.recruitsReaching20 = [...tallest.values()].filter((v) => v >= 20).length;
    o.live300 = at(300).length;
    o.plantedAlive300 = at(300).filter((x) => x.tree < planted).length;
    o.metamers300 = sum(at(300));
  }
  return o;
}
/** "No worse": the defect's own counts may not fall (the bars in the note). */
const NO_WORSE: Record<string, string[]> = {
  phoneSeed3: ["live150", "planted150", "canopy150"],
  forestRegeneration: ["recruitsReaching20", "live300"],
};
const regress: Record<string, unknown> = {};
let regPass = true;
for (const name of Object.keys(REGRESS)) {
  const dh = regDir({ arm: "head", name });
  const dp = regDir({ arm: "d16a13", name });
  const hh = readFileSync(join(dh, "hash.txt"), "utf8").trim();
  const hp = readFileSync(join(dp, "hash.txt"), "utf8").trim();
  const [vh, vp] = [vector(name, dh), vector(name, dp)];
  const pass =
    hh === hp || (NO_WORSE[name] ?? []).every((k) => (vp[k] ?? 0) >= (vh[k] ?? Number.NaN));
  if (!pass) regPass = false;
  regress[name] = { hash: [hh, hp], head: vh, d16a13: vp, pass };
  lines.push(
    `\n${name}: hash ${hh} vs ${hp}; pass ${pass}`,
    `  head ${JSON.stringify(vh)}`,
    `  d16a13 ${JSON.stringify(vp)}`,
  );
}
report.regressions = regress;
report.verdict = { regeneration: regenPass, bareBole: bolePass, regressions: regPass };
report.wallMinutes = runsWall / 60;
report.jobs = jobs;
writeFileSync(join(out, "summary.json"), JSON.stringify(report, null, 1));

// --- The tables.
console.log(lines.join("\n"));
console.log(`\nverdict ${JSON.stringify(report.verdict)}`);
console.log(`wall ${(runsWall / 60).toFixed(1)} min on ${jobs} simulators`);
