/**
 * #138's re-probe on M: its bars (docs/experiments/2026-11-19-sapling-release-on-m.md, "Bars",
 * fixed before any run), from run.ts' summary.json per arm and stand.py's summary.json (bar 6).
 *
 *   node docs/experiments/code/2026-11-19-sapling-release-on-m/bars.ts [runs/138-dl-on-m] [arms]
 *
 * Prints the tables and writes bars.json beside the runs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "runs/138-dl-on-m";
const ARMS = (process.argv[3] ?? "Mbh40,Mdl40,Mbh25").split(",").filter((a) =>
  existsSync(join(dir, a, "summary.json")),
);
type Sap = {
  treeSeasons: number;
  noGrowth: number;
  gainPerDecade: number;
  gainP90: number;
  noGainDecades: number;
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

const out: Record<string, unknown> = {};
const rows: string[] = [];
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
  };
  const pass = Object.values(b).every(Boolean);
  out[a] = { ...b, pass, falls, rises, lost, loneRead, mapleReadable };
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
writeFileSync(join(dir, "bars.json"), JSON.stringify(out, null, 1));
