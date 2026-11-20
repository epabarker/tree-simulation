/**
 * #138's ramp + low dose on M: its bars (docs/experiments/2026-11-20-ramp-and-low-dose.md, "Bars",
 * fixed before any run), from run.ts' summary.json per arm and stand.py's summary.json (bar 8).
 * Bars 1–13 are the low-dose ladder's bars.ts, unchanged, read against M for every arm; 14 (the
 * ramp lowers the late stems against the same dose alone), 15 (the cohort against Mr10) and 16
 * (the phone's stems against M) are new and judged on the paired arms only.
 *
 *   node docs/experiments/code/2026-11-20-ramp-low-dose/bars.ts [runs/138-ramp-dl] [arms]
 *
 * Prints the tables and writes bars.json beside the runs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "runs/138-ramp-dl";
const ARMS = (process.argv[3] ?? "Mr10,Mdl10,Mdl15,Mr10dl10,Mr10dl15").split(",").filter((a) =>
  existsSync(join(dir, a, "summary.json")),
);
type Sap = {
  treeSeasons: number;
  noGrowth: number;
  gainPerDecade: number;
  gainP90: number;
  noGainDecades: number;
  shadedDecades: number;
  shadedGain: number;
  bySpecies: Record<string, { n: number; noGrowth: number }>;
};
type W = {
  runs: number;
  gate1: number;
  gate12: number;
  frames: number;
  inBand7: number;
  canopyShare7At60: number;
  canopyPerHa100: number;
  canopyDeathsPerRun: number;
  thrownPerRun: number;
  stems7PerHaMedian: number;
  stems7PerHaByFrame: number[];
  canopyShare7Median: number;
  bankMedian: number;
  topHeightMedian: number;
  capSeasonsMedian: number;
  wallMedian: number;
  canopyDeathPct: number;
  canopySpeciesByFrame: Record<string, number>[];
  cohortPerRun: number;
  cohortDeadShare: number;
  cohortCrossedShare: number;
  stems7ByFrame: number[];
  emptyLate: number;
  list: {
    seed: number;
    frames: { season: number; stems7: number; stems7PerHa: number; bank: number }[];
  }[];
};
type L = { hash: string; height: number; wh: number } | null;
type S = {
  seeds: number[];
  byWidth: Record<string, W>;
  saplings: Sap;
  perSeed: (Sap & { seed: number })[];
  lone: Record<string, L[]>;
};
const read = (a: string) => JSON.parse(readFileSync(join(dir, a, "summary.json"), "utf8")) as S;
const M = read("M");
const stand = existsSync(join(dir, "summary.json"))
  ? (JSON.parse(readFileSync(join(dir, "summary.json"), "utf8")) as {
      gate: Record<string, Record<string, { readable: boolean; passes?: boolean; medianZ?: number }>>;
    })
  : undefined;
const yes = (b: boolean | undefined) => (b === undefined ? "?" : b ? "✓" : "✗");
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "-");
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

/** Bar 12's band (m a decade) and bar 13's: the distance of stems ≥ 7 cm/ha from ADR 0068's band. */
const REALISM = [0.1, 0.5] as const;
const BAND = [200, 400] as const;
const off = (x: number) => Math.max(0, BAND[0] - x, x - BAND[1]);
const LATE = [200, 300];
const at = (w: W, seed: number, f: number) =>
  w.list.find((r) => r.seed === seed)?.frames.find((x) => x.season === f)?.stems7PerHa ?? Number.NaN;
const byFrame = (w: W, f: number) => w.stems7PerHaByFrame[[100, 200, 300].indexOf(f)] as number;

/** Each paired arm's dose alone (bar 14). */
const PAIR: Record<string, string> = { Mr10dl10: "Mdl10", Mr10dl15: "Mdl15" };
const phoneAt = (w: W, f: number) => w.stems7ByFrame[[100, 200, 300].indexOf(f)] as number;
const pct = (x: number) => `${Math.round(100 * x)}%`;

const out: Record<string, unknown> = {};
const rows: string[] = [];
const rows2: string[] = [];
const rows3: string[] = [];
for (const a of ARMS) {
  const x = read(a);
  const n = x.seeds.length;
  const need = Math.ceil(0.75 * n);
  const ok = (s: Sap | undefined) => (s?.treeSeasons ?? 0) >= 30;
  const pair = x.perSeed.map((p) => ({ p, m: M.perSeed.find((q) => q.seed === p.seed) }));
  const falls = pair.filter(({ p, m }) => ok(p) && ok(m) && p.noGrowth < (m as Sap).noGrowth).length;
  const rises = pair.filter(
    ({ p, m }) => ok(p) && ok(m) && p.gainPerDecade > (m as Sap).gainPerDecade,
  ).length;
  const w = (s: S, k: string) => s.byWidth[k] as W;
  const maple = x.saplings.bySpecies.maple;
  const mapleM = M.saplings.bySpecies.maple;
  const mapleReadable = (maple?.n ?? 0) >= 30 && (mapleM?.n ?? 0) >= 30;
  // Bar 6: every species–season cell that passes under M passes here; hornbeam at 100 and 300.
  const g = stand?.gate[a];
  const gm = stand?.gate.M;
  const kept =
    g && gm ? Object.entries(gm).every(([k, c]) => !c.passes || g[k]?.passes === true) : undefined;
  const lost = g && gm ? Object.keys(gm).filter((k) => gm[k]?.passes && !g[k]?.passes) : [];
  const hornbeam = g ? [100, 300].every((s) => g[`hornbeam@${s}`]?.passes === true) : undefined;
  // The lone gate: hashes equal M's; where one differs, the pilot's bar 3 decides (the arm's median
  // H and W/H inside [0.9 × M's lowest seed, 1.1 × M's highest]).
  const loneRead = Object.entries(x.lone).map(([sp, ls]) => {
    const ms = M.lone[sp] ?? [];
    const same = ls.every((l, i) => l && ms[i] && l.hash === ms[i]?.hash);
    const inNoise = (k: "height" | "wh") => {
      const ref = ms.map((l) => (l as NonNullable<L>)[k]);
      const v = median(ls.map((l) => (l as NonNullable<L>)[k]));
      return v >= 0.9 * Math.min(...ref) && v <= 1.1 * Math.max(...ref);
    };
    return { sp, same, pass: same || (inNoise("height") && inNoise("wh")) };
  });
  const b = {
    b1PerSeedNoGrowth: falls >= need,
    b2PerSeedGain: rises >= need,
    b3Pooled: x.saplings.noGrowth <= 0.61,
    b4Gates: w(x, "160").gate1 >= n - 2 && w(x, "66").gate12 >= n - 2,
    b5Canopy: ["160", "66"].every((k) => w(x, k).canopyPerHa100 >= w(M, k).canopyPerHa100),
    b6Band: w(x, "160").inBand7 >= w(M, "160").inBand7,
    b7Maple: mapleReadable ? (maple?.noGrowth ?? 1) <= (mapleM?.noGrowth ?? 0) + 0.05 : false,
    b8Bar6: kept === true && hornbeam === true,
    b9Deaths: w(x, "160").canopyDeathsPerRun <= 1.5 * w(M, "160").canopyDeathsPerRun,
    b10Wall: w(x, "66").wallMedian <= 1.25 * w(M, "66").wallMedian,
    b11Lone: loneRead.every((l) => l.pass),
    b12Realism: x.saplings.shadedGain >= REALISM[0] && x.saplings.shadedGain <= REALISM[1],
    b13Late: LATE.every((f) => off(byFrame(w(x, "160"), f)) <= off(byFrame(w(M, "160"), f))),
  };
  // Per seed: bar 12's band (≥ 30 decades), and bar 13 (no farther from the band than M's seed).
  const realSeeds = x.perSeed.filter(
    (p) => p.shadedDecades >= 30 && p.shadedGain >= REALISM[0] && p.shadedGain <= REALISM[1],
  ).length;
  const lateSeeds = LATE.map(
    (f) =>
      x.seeds.filter((sd) => off(at(w(x, "160"), sd, f)) <= off(at(w(M, "160"), sd, f))).length,
  );
  const inBandSeeds = LATE.map(
    (f) => x.seeds.filter((sd) => off(at(w(x, "160"), sd, f)) === 0).length,
  );
  // Bars 14–16, the paired arms only: against the same dose without the ramp, Mr10, and M.
  const alone = PAIR[a];
  const paired: Record<string, boolean> = {};
  let lowerSeeds: number[] = [];
  if (alone && existsSync(join(dir, alone, "summary.json"))) {
    const d = read(alone);
    const r = read("Mr10");
    paired.b14RampLowers = LATE.every((f) => byFrame(w(x, "160"), f) < byFrame(w(d, "160"), f));
    paired.b15Cohort = ["160", "66"].every(
      (k) => w(x, k).cohortDeadShare <= w(r, k).cohortDeadShare,
    );
    paired.b16Phone = LATE.every(
      (f) => phoneAt(w(x, "66"), f) >= phoneAt(w(M, "66"), f),
    );
    lowerSeeds = LATE.map(
      (f) => x.seeds.filter((sd) => at(w(x, "160"), sd, f) < at(w(d, "160"), sd, f)).length,
    );
    const late = (s: S, k: string) => LATE.map((f) => byFrame(w(s, k), f)).join(" / ");
    const phone = (s: S) => LATE.map((f) => phoneAt(w(s, "66"), f)).join(" / ");
    const dead = (s: S) => ["160", "66"].map((k) => pct(w(s, k).cohortDeadShare)).join(" / ");
    rows3.push(
      `| ${a} | ${late(x, "160")} vs ${alone} ${late(d, "160")}; seeds lower ${lowerSeeds.join(" / ")} of ${n} ${yes(paired.b14RampLowers)} | ${dead(x)} (Mr10 ${dead(r)}; M ${dead(M)}) ${yes(paired.b15Cohort)} | ${phone(x)} stems (M ${phone(M)}; runs empty at 200 or 300: ${w(x, "66").emptyLate}, M ${w(M, "66").emptyLate}) ${yes(paired.b16Phone)} |`,
    );
  }
  const pass = Object.values(b).every(Boolean) && Object.values(paired).every(Boolean);
  out[a] = {
    ...b,
    ...paired,
    lowerSeeds,
    pass,
    falls,
    rises,
    lost,
    loneRead,
    mapleReadable,
    realSeeds,
    lateSeeds,
    inBandSeeds,
  };
  const late = (k: string) =>
    LATE.map((f) => {
      const v = byFrame(w(x, k), f);
      const m = byFrame(w(M, k), f);
      return `${v} (${off(v) === 0 ? "in" : "out"}; M ${m})`;
    }).join(" / ");
  rows2.push(
    `| ${a} | ${f2(x.saplings.shadedGain)} (n ${x.saplings.shadedDecades}; seeds in band ${realSeeds}/${n}) ${yes(b.b12Realism)} | ${late("160")}; seeds no worse than M ${lateSeeds.join(" / ")}, in band ${inBandSeeds.join(" / ")} ${yes(b.b13Late)} | ${late("66")} |`,
  );
  rows.push(
    `| ${a} | ${falls} ${yes(b.b1PerSeedNoGrowth)} | ${rises} ${yes(b.b2PerSeedGain)} | ${f2(x.saplings.noGrowth)} ${yes(b.b3Pooled)} | ${w(x, "160").gate1} / ${w(x, "66").gate12} ${yes(b.b4Gates)} | ${w(x, "160").canopyPerHa100.toFixed(0)} / ${w(x, "66").canopyPerHa100.toFixed(0)} ${yes(b.b5Canopy)} | ${w(x, "160").inBand7} (${w(x, "160").stems7PerHaMedian}/ha) ${yes(b.b6Band)} | ${f2(maple?.noGrowth ?? Number.NaN)} (n ${maple?.n ?? 0}) ${yes(b.b7Maple)} | ${hornbeam === undefined ? "?" : [100, 300].map((s) => f2(g?.[`hornbeam@${s}`]?.medianZ ?? Number.NaN)).join(" / ")}${lost.length ? `; lost ${lost.join(", ")}` : ""} ${yes(b.b8Bar6)} | ${f2(w(x, "160").canopyDeathsPerRun)} ${yes(b.b9Deaths)} | ${w(x, "66").wallMedian.toFixed(0)} s (${f2(w(x, "66").wallMedian / w(M, "66").wallMedian)}) ${yes(b.b10Wall)} | ${loneRead.map((l) => `${l.sp} ${l.same ? "=" : "≠"}`).join(", ")} ${yes(b.b11Lone)} | ${pass ? "**pass**" : "fail"} |`,
  );
}
const wm = (k: string) => M.byWidth[k] as W;
console.log(
  `M (reference): pooled no growth ${f2(M.saplings.noGrowth)} (M − 0.10 = ${f2(M.saplings.noGrowth - 0.1)}); gain ${f2(M.saplings.gainPerDecade)} m; canopy/ha ${wm("160").canopyPerHa100.toFixed(0)} / ${wm("66").canopyPerHa100.toFixed(0)}; band frames ${wm("160").inBand7} (${wm("160").stems7PerHaMedian}/ha); maple ${f2(M.saplings.bySpecies.maple?.noGrowth ?? Number.NaN)} (n ${M.saplings.bySpecies.maple?.n ?? 0}); hornbeam z ${[100, 300].map((s) => f2(stand?.gate.M?.[`hornbeam@${s}`]?.medianZ ?? Number.NaN)).join(" / ")}; deaths ${f2(wm("160").canopyDeathsPerRun)}; wall 66 ${wm("66").wallMedian.toFixed(0)} s; gates ${wm("160").gate1} / ${wm("66").gate12}\n`,
);
console.log(
  "| arm | 1: no growth falls per seed (≥ 15) | 2: gain rises per seed (≥ 15) | 3: pooled no growth (≤ 0.61) | 4: gates 160 / 66 (≥ 18) | 5: canopy/ha 160 / 66 (≥ M's) | 6: band frames, 160 (≥ M's) | 7: maple no growth (≤ M's + 0.05) | 8: bar 6, hornbeam z 100 / 300; M's cells kept | 9: canopy deaths/run (≤ 1.5× M's) | 10: phone wall (≤ 1.25× M's) | 11: lone vs M | verdict |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) console.log(r);

console.log(
  "\n| arm | gain/decade m (median; P90; share none) | ≥ 7 cm/ha at 160 by frame 100 / 200 / 300 | at 66 | ≥ 7 cm canopy share frames ≥ 0.6, 160 | bank per frame 160 / 66 | cap seasons 160 / 66 | top height cells 160 / 66 | thrown/run 160 | no growth by species (n ≥ 30) |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const a of ["M", ...ARMS]) {
  const x = read(a);
  const w = (k: string) => x.byWidth[k] as W;
  const s = x.saplings;
  console.log(
    `| ${a} | ${f2(s.gainPerDecade)}; ${f2(s.gainP90)}; ${f2(s.noGainDecades)} | ${w("160").stems7PerHaByFrame.join(" / ")} | ${w("66").stems7PerHaByFrame.join(" / ")} | ${w("160").canopyShare7At60} | ${w("160").bankMedian} / ${w("66").bankMedian} | ${w("160").capSeasonsMedian} / ${w("66").capSeasonsMedian} | ${w("160").topHeightMedian} / ${w("66").topHeightMedian} | ${f2(w("160").thrownPerRun)} | ${Object.entries(
      s.bySpecies,
    )
      .filter(([, v]) => v.n >= 30)
      .sort((p, q) => q[1].n - p[1].n)
      .map(([sp, v]) => `${sp} ${f2(v.noGrowth)}`)
      .join(", ")} |`,
  );
}
console.log("\nPer seed (arm / M no growth; sapling-seasons):");
for (const a of ARMS) {
  const x = read(a);
  console.log(
    `- ${a}: ${x.perSeed
      .map((p) => {
        const m = M.perSeed.find((q) => q.seed === p.seed);
        return `s${p.seed} ${f2(p.noGrowth)}/${f2(m?.noGrowth ?? Number.NaN)} (${p.treeSeasons}/${m?.treeSeasons ?? 0})`;
      })
      .join(", ")}`,
  );
}
console.log(
  `\nM: shaded beech+hornbeam gain ${f2(M.saplings.shadedGain)} m a decade (n ${M.saplings.shadedDecades}); ≥ 7 cm/ha at 200 / 300: 160 ${LATE.map((f) => byFrame(wm("160"), f)).join(" / ")}, 66 ${LATE.map((f) => byFrame(wm("66"), f)).join(" / ")}\n`,
);
console.log(
  `| arm | 12: shaded beech + hornbeam gain, m a decade (${REALISM.join("–")}) | 13: ≥ 7 cm/ha at 160, frames 200 / 300 (band ${BAND.join("–")}; no farther than M's) | at 66, frames 200 / 300 (reported) |`,
);
console.log("|---|---|---|---|");
for (const r of rows2) console.log(r);

console.log(
  "\n| arm | maple no growth (n) | bank per frame 160 / 66 | cap seasons 160 / 66 | thrown/run 160 / 66 | canopy deaths/run 160 / 66 | canopy deaths % of canopy trees a season, 160 / 66 | beech canopy share at 300, 160 / 66 | canopy at 300, 160 |",
);
console.log("|---|---|---|---|---|---|---|---|---|");
for (const a of ["M", ...ARMS]) {
  const x = read(a);
  const w = (k: string) => x.byWidth[k] as W;
  const mp = x.saplings.bySpecies.maple;
  const beech = (k: string) => f2(w(k).canopySpeciesByFrame[2]?.beech ?? 0);
  const mix = Object.entries(w("160").canopySpeciesByFrame[2] ?? {})
    .sort((p, q) => q[1] - p[1])
    .slice(0, 3)
    .map(([sp, v]) => `${sp} ${f2(v)}`)
    .join(", ");
  console.log(
    `| ${a} | ${f2(mp?.noGrowth ?? Number.NaN)} (${mp?.n ?? 0}) | ${w("160").bankMedian} / ${w("66").bankMedian} | ${w("160").capSeasonsMedian} / ${w("66").capSeasonsMedian} | ${f2(w("160").thrownPerRun)} / ${f2(w("66").thrownPerRun)} | ${f2(w("160").canopyDeathsPerRun)} / ${f2(w("66").canopyDeathsPerRun)} | ${f2(w("160").canopyDeathPct)} / ${f2(w("66").canopyDeathPct)} | ${beech("160")} / ${beech("66")} | ${mix} |`,
  );
}
console.log(
  "\n| arm | 14: ≥ 7 cm/ha at 160, frames 200 / 300, below the dose alone's | 15: cohort dead by 300, 160 / 66 (≤ Mr10's) | 16: the phone, ≥ 7 cm stems in the plot at 66, frames 200 / 300 (≥ M's) |",
);
console.log("|---|---|---|---|");
for (const r of rows3) console.log(r);

console.log(
  "\n| arm | cohort (drawn < 7 cm at 200) per run, 160 / 66 | dead by 300, 160 / 66 | survivors ≥ 7 cm at 300, 160 / 66 | ≥ 7 cm in the plot at 66, 100 / 200 / 300 | runs empty at 200 or 300, 66 |",
);
console.log("|---|---|---|---|---|---|");
for (const a of ["M", ...ARMS]) {
  const x = read(a);
  const w = (k: string) => x.byWidth[k] as W;
  const both = (f: (v: W) => string) => ["160", "66"].map((k) => f(w(k))).join(" / ");
  console.log(
    `| ${a} | ${both((v) => f2(v.cohortPerRun))} | ${both((v) => pct(v.cohortDeadShare))} | ${both((v) => pct(v.cohortCrossedShare))} | ${w("66").stems7ByFrame.join(" / ")} | ${w("66").emptyLate} |`,
  );
}
writeFileSync(join(dir, "bars.json"), JSON.stringify(out, null, 1));
