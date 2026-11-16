/**
 * #132's ramp re-probe: its bars (docs/experiments/2026-11-16-understorey-ramp-memory-probe.md, "Bars",
 * fixed before any run), from run.ts' summary.json per arm and tests.json, and b2.py's b2.json.
 *
 *   node docs/experiments/code/2026-11-16-understorey-ramp-memory-probe/bars.ts [runs/132-ramp-memory]
 *
 * Prints the tables and writes bars.json beside the runs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "runs/132-ramp-memory";
type C = {
  runs: number;
  gate1: number;
  gate2: number;
  frames: number;
  inBand7: number;
  canopyShare7At60: number;
  canopyPerHa100: number;
  canopyDeathsPerRun: number;
  lightDemanderFrames: number;
  stems7PerHaMedian: number;
  stems7PerHaByFrame: number[];
  canopyShare7Median: number;
  capSeasonsMedian: number;
  cohortDeadShare: number;
  cohortCrossedShare: number;
  cohortPerRun: number;
  wallMedian: number;
  drawnPerHaMedian: number;
  bankMedian: number;
};
const read = (arm: string) =>
  (JSON.parse(readFileSync(join(dir, arm, "summary.json"), "utf8")) as { byWidth: Record<string, C> })
    .byWidth;
const tests = JSON.parse(readFileSync(join(dir, "tests.json"), "utf8")) as Record<
  string,
  Record<string, boolean>
>;
const b2 = existsSync(join(dir, "b2.json"))
  ? (JSON.parse(readFileSync(join(dir, "b2.json"), "utf8")) as Record<string, Record<string, unknown>>)
  : {};
const ARMS = ["head", "s3d", "M", "Mr10", "Mr15", "Mr25", "s3dr15", "MB2", "Mr15B2"];
const RAMP = ["Mr10", "Mr15", "Mr25", "s3dr15"];
const NO_RAMP_REF: Record<string, string> = { Mr10: "M", Mr15: "M", Mr25: "M", s3dr15: "s3d" };
const B2_REF: Record<string, string> = { MB2: "M", Mr15B2: "Mr15" };
const by = Object.fromEntries(ARMS.map((a) => [a, read(a)]));
const at = (a: string, w: string) => by[a]?.[w] as C;
const scale = (a: string) => at(a, "160").runs / 20;
const yes = (b: boolean) => (b ? "✓" : "✗");

/** #122's gates 1–2 (≥ 18 of 20 at both widths, gate 2 at 66) and the tests (gates 3–4). */
const gates = (a: string) =>
  ["160", "66"].every((w) => at(a, w).gate1 >= 18 * scale(a)) &&
  at(a, "66").gate2 >= 18 * scale(a) &&
  (a === "head" || Object.values(tests[a] ?? { missing: false }).every((v) => v === true));
/** ADR 0068's adoption bars 1–5 against head, unchanged (160 cells). */
const adr0068 = (a: string) => {
  const x = at(a, "160");
  const h = at("head", "160");
  const s = scale(a);
  return {
    b1: x.inBand7 >= 30 * s && x.inBand7 > h.inBand7,
    b2: x.canopyShare7At60 >= 30 * s && x.canopyShare7At60 > h.canopyShare7At60,
    b3: x.canopyPerHa100 >= h.canopyPerHa100,
    b4: x.canopyDeathsPerRun <= 1.5 * h.canopyDeathsPerRun,
    b5: x.lightDemanderFrames >= h.lightDemanderFrames,
  };
};
const wall = (a: string) => at(a, "66").wallMedian <= 1.25 * at("head", "66").wallMedian;

const out: Record<string, unknown> = {};
console.log(
  "| arm | gates (#122 1–2: 160 / 66; tests) | ADR 0068 bars 1–5 vs head | ≥ 7 cm band frames, 160 (median/ha) | share ≥ 0.6 frames, 160 (median) | N1: no worse than its arm without the ramp | canopy/ha, 160 | canopy deaths/run, 160 | light-demander frames | wall/run 66 (÷ head) | cap seasons 160 / 66 | cohort dead by 300, 160 / 66 | verdict |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const a of ARMS) {
  const x = at(a, "160");
  const p = at(a, "66");
  const g = gates(a);
  const b = a === "head" ? undefined : adr0068(a);
  const ref = NO_RAMP_REF[a];
  const n1 = ref
    ? x.inBand7 >= at(ref, "160").inBand7 && x.canopyShare7At60 >= at(ref, "160").canopyShare7At60
    : undefined;
  const w = wall(a);
  const pass = RAMP.includes(a) && !!b && g && Object.values(b).every(Boolean) && !!n1 && w;
  if (b) out[a] = { gates: g, ...b, n1, wall: w, pass: RAMP.includes(a) ? pass : undefined };
  const t = tests[a] ?? {};
  console.log(
    [
      a,
      `${at(a, "160").gate1} / ${p.gate1}, ${p.gate2}; ${a === "head" ? "–" : `${Object.values(t).filter(Boolean).length}/${Object.keys(t).length}`} ${yes(g)}`,
      b ? Object.values(b).map(yes).join("") : "–",
      `${x.inBand7} (${x.stems7PerHaMedian})`,
      `${x.canopyShare7At60} (${x.canopyShare7Median.toFixed(2)})`,
      ref ? `vs ${ref} ${yes(!!n1)}` : "–",
      x.canopyPerHa100.toFixed(0),
      x.canopyDeathsPerRun.toFixed(1),
      String(x.lightDemanderFrames),
      `${p.wallMedian.toFixed(0)} s (${(p.wallMedian / at("head", "66").wallMedian).toFixed(2)}) ${a === "head" ? "" : yes(w)}`,
      `${x.capSeasonsMedian} / ${p.capSeasonsMedian}`,
      `${(100 * x.cohortDeadShare).toFixed(0)}% / ${(100 * p.cohortDeadShare).toFixed(0)}%`,
      RAMP.includes(a) ? (pass ? "**pass**" : "fail") : "reference",
    ]
      .join(" | ")
      .replace(/^/, "| ")
      .concat(" |"),
  );
}

console.log("\n| B2 arm | vs | B2a beech bar 6 | B2b hornbeam readable, passing, largest | B2c beech ≤ 0.4 | B2d maple@300 | B2e ≥ 7 cm band frames no worse | B2f gates | B2g phone cap no worse | wall | verdict |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|");
for (const [a, ref] of Object.entries(B2_REF)) {
  const s = b2[a] ?? {};
  const e = at(a, "160").inBand7 >= at(ref, "160").inBand7;
  const f = gates(a);
  const gcap = at(a, "66").capSeasonsMedian <= at(ref, "66").capSeasonsMedian;
  const w = wall(a);
  const bars = [s.B2a, s.B2b, s.B2c, s.B2d].map((v) => v === true);
  const pass = bars.every(Boolean) && e && f && gcap && w;
  out[a] = { ...(out[a] as object), B2a: bars[0], B2b: bars[1], B2c: bars[2], B2d: bars[3], B2e: e, B2f: f, B2g: gcap, wall: w, pass };
  console.log(
    `| ${a} | ${ref} | ${bars.map(yes).join(" | ")} | ${at(a, "160").inBand7} vs ${at(ref, "160").inBand7} ${yes(e)} | ${yes(f)} | ${at(a, "66").capSeasonsMedian} vs ${at(ref, "66").capSeasonsMedian} ${yes(gcap)} | ${yes(w)} | ${pass ? "**pass**" : "fail"} |`,
  );
}

console.log("\nReported: ≥ 7 cm/ha by frame (100 / 200 / 300) at 160 and 66; drawn/ha; bank; cohort");
for (const a of ARMS) {
  const f = (w: string) => at(a, w).stems7PerHaByFrame.join(" / ");
  console.log(
    `- ${a}: 160 ${f("160")}; 66 ${f("66")}; drawn ${at(a, "160").drawnPerHaMedian}/ha; bank ${at(a, "160").bankMedian}; cohort ${at(a, "160").cohortPerRun.toFixed(1)}/run, ${(100 * at(a, "160").cohortDeadShare).toFixed(0)}% dead, ${(100 * at(a, "160").cohortCrossedShare).toFixed(0)}% of survivors ≥ 7 cm; 66 band ${at(a, "66").inBand7}/${at(a, "66").frames}`,
  );
}
writeFileSync(join(dir, "bars.json"), JSON.stringify(out, null, 1));
