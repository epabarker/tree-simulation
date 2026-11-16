/**
 * The light-memory probe's bars (docs/experiments/2026-11-16-light-memory-probe.md, "Bars"), read
 * from cli/seedling-stubs-probe.ts' output in runs/light-memory-probe (summary.json per arm,
 * tests.json). Prints one table and writes memory-bars.json beside the runs.
 *
 *   node docs/experiments/code/2026-11-16-light-memory-probe/bars.ts [runs/light-memory-probe]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "runs/light-memory-probe";
const ARMS = ["s3dT25", "s3dT5", "s3dT10"];
type C = {
  runs: number;
  gate1: number;
  gate2: number;
  capSeasonsMedian: number;
  capBelowHead: number;
  canopyPerHa100: number;
  focusInCanopyFrames: number;
  otherOverHalfFrames: number;
  recruitsPerRun: number;
  leftWithin2Share: number;
  recruitsDrawnPerRun: number;
  bankMedian: number;
  stubsPerHaMedian: number;
  drawnPerHaMedian: number;
  stems7PerHaMedian: number;
  wallMedian: number;
};
const read = (arm: string) =>
  (JSON.parse(readFileSync(join(dir, arm, "summary.json"), "utf8")) as { byWidth: Record<string, C> })
    .byWidth;
const tests = JSON.parse(readFileSync(join(dir, "tests.json"), "utf8")) as Record<
  string,
  Record<string, boolean | string>
>;
const head = read("head");
const s3d = read("s3d");
const W = ["160", "66"];
const at = (b: Record<string, C>, w: string) => b[w] as C;

/** The stubs probe's gates 1–4 and adoption bars 1–5 against head. */
const stubsBars = (a: Record<string, C>, arm: string) => {
  const g12 = W.every((w) => at(a, w).gate1 >= 18) && at(a, "66").gate2 >= 18;
  const g34 = Object.values(tests[arm] ?? {}).every((v) => v === true);
  const b1 = W.every(
    (w) =>
      at(a, w).capSeasonsMedian <= 0.5 * at(head, w).capSeasonsMedian && at(a, w).capBelowHead >= 15,
  );
  const b2 = at(a, "160").canopyPerHa100 >= at(head, "160").canopyPerHa100;
  const b3 = at(a, "160").focusInCanopyFrames >= 30;
  const b4 = at(a, "160").otherOverHalfFrames <= at(head, "160").otherOverHalfFrames + 6;
  const b5 = at(a, "66").wallMedian <= 1.25 * at(head, "66").wallMedian;
  return { gates: g12 && g34, b1, b2, b3, b4, b5 };
};
const out: Record<string, unknown> = {};
const yes = (b: boolean) => (b ? "✓" : "✗");
const ratio = (x: number, y: number) => (x / y).toFixed(2);
console.log(
  "| arm | gates | stubs bars 1–5 | M1 recruits/run, 160 / 66 (÷ s3d) | left within 2, 160 / 66 | M2 cap median, 160 / 66 | below head | reach 1.3 m/run, 160 / 66 | canopy/ha, 160 | ≥ 7 cm/ha, 160 / 66 | bank, 160 / 66 | wall/run, 66 (÷ head) | verdict |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const arm of ["head", "s3d", ...ARMS]) {
  const a = read(arm);
  const ref = arm === "head" || arm === "s3d";
  const sb = ref ? undefined : stubsBars(a, arm);
  const m1 = W.every((w) => at(a, w).recruitsPerRun <= 0.5 * at(s3d, w).recruitsPerRun);
  const m2 = W.every((w) => at(a, w).capSeasonsMedian <= at(s3d, w).capSeasonsMedian);
  const pass = !!sb && sb.gates && sb.b1 && sb.b2 && sb.b3 && sb.b4 && sb.b5 && m1 && m2;
  if (sb) out[arm] = { ...sb, m1, m2, pass };
  const r = (w: string) => at(a, w).recruitsPerRun;
  const pct = (w: string) => `${(100 * (at(a, w).leftWithin2Share ?? Number.NaN)).toFixed(0)}%`;
  console.log(
    [
      arm,
      sb ? yes(sb.gates) : "–",
      sb ? [sb.b1, sb.b2, sb.b3, sb.b4, sb.b5].map(yes).join("") : "–",
      `${Math.round(r("160"))} / ${Math.round(r("66"))}${ref ? "" : ` (${ratio(r("160"), at(s3d, "160").recruitsPerRun)}, ${ratio(r("66"), at(s3d, "66").recruitsPerRun)}) ${yes(m1)}`}`,
      `${pct("160")} / ${pct("66")}`,
      `${at(a, "160").capSeasonsMedian} / ${at(a, "66").capSeasonsMedian}${ref ? "" : ` ${yes(m2)}`}`,
      arm === "head" ? "–" : `${at(a, "160").capBelowHead} / ${at(a, "66").capBelowHead}`,
      `${Math.round(at(a, "160").recruitsDrawnPerRun)} / ${Math.round(at(a, "66").recruitsDrawnPerRun)}`,
      at(a, "160").canopyPerHa100.toFixed(0),
      `${at(a, "160").stems7PerHaMedian} / ${at(a, "66").stems7PerHaMedian}`,
      `${at(a, "160").bankMedian} / ${at(a, "66").bankMedian}`,
      `${at(a, "66").wallMedian.toFixed(0)} s (${ratio(at(a, "66").wallMedian, at(head, "66").wallMedian)})`,
      ref ? (arm === "s3d" ? "reference" : "–") : pass ? "pass" : "fail",
    ]
      .join(" | ")
      .replace(/^/, "| ")
      .concat(" |"),
  );
}
writeFileSync(join(dir, "memory-bars.json"), JSON.stringify(out, null, 1));
