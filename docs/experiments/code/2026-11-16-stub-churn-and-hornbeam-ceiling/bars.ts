/**
 * The churn probe's bars (docs/experiments/2026-11-16-stub-churn-and-hornbeam-ceiling.md §B.3),
 * read from cli/seedling-stubs-probe.ts' output in runs/stub-churn-probe (summary.json per arm,
 * tests.json). Prints one table and writes bars.json beside the runs.
 *
 *   node docs/experiments/code/2026-11-16-stub-churn-and-hornbeam-ceiling/bars.ts [runs/stub-churn-probe]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "runs/stub-churn-probe";
const ARMS = ["s3dY15", "s3dk3", "s3dk5"];
type C = {
  runs: number;
  gate1: number;
  gate2: number;
  capSeasonsMedian: number;
  capBelowHead: number;
  capFree: number;
  canopyPerHa100: number;
  focusInCanopyFrames: number;
  otherOverHalfFrames: number;
  recruitsPerRun: number;
  recruitsDrawnPerRun: number;
  bankMedian: number;
  stubsPerHaMedian: number;
  drawnPerHaMedian: number;
  wallMedian: number;
  capSeasonsPerRun: number[];
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

/** The stubs probe's adoption bars 1–5 against head (its §Bars), and its gates 1–4. */
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
  return { gates: g12 && g34, g34, b1, b2, b3, b4, b5 };
};
const out: Record<string, unknown> = {};
const yes = (b: boolean) => (b ? "✓" : "✗");
console.log(
  "| arm | gates | stubs bars 1–5 | C1 recruits/run, 160 / 66 (÷ s3d) | C3 wall/run 66 (÷ s3d) | cap median 160 / 66 | below head | reach 1.3 m/run, 160 | bank, 160 | pool/ha, 160 | drawn/ha, 160 | verdict |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const arm of ["s3d", ...ARMS]) {
  const a = read(arm);
  const sb = stubsBars(a, arm);
  const c1 = W.every((w) => at(a, w).recruitsPerRun <= 0.5 * at(s3d, w).recruitsPerRun);
  const c3 = at(a, "66").wallMedian <= at(s3d, "66").wallMedian;
  const stubsPass = sb.b1 && sb.b2 && sb.b3 && sb.b4 && sb.b5;
  const pass = arm !== "s3d" && sb.gates && stubsPass && c1 && c3;
  out[arm] = { ...sb, c1, c3, pass };
  const r = (w: string) => at(a, w).recruitsPerRun;
  const ratio = (x: number, y: number) => (x / y).toFixed(2);
  console.log(
    `| ${arm} | ${yes(sb.gates)} | ${[sb.b1, sb.b2, sb.b3, sb.b4, sb.b5].map(yes).join("")} | ${Math.round(r("160"))} / ${Math.round(r("66"))} (${ratio(r("160"), at(s3d, "160").recruitsPerRun)}, ${ratio(r("66"), at(s3d, "66").recruitsPerRun)}) ${arm === "s3d" ? "" : yes(c1)} | ${at(a, "66").wallMedian.toFixed(0)} s (${ratio(at(a, "66").wallMedian, at(s3d, "66").wallMedian)}) ${arm === "s3d" ? "" : yes(c3)} | ${at(a, "160").capSeasonsMedian} / ${at(a, "66").capSeasonsMedian} | ${at(a, "160").capBelowHead} / ${at(a, "66").capBelowHead} | ${Math.round(at(a, "160").recruitsDrawnPerRun)} | ${at(a, "160").bankMedian} | ${Math.round(at(a, "160").stubsPerHaMedian)} | ${at(a, "160").drawnPerHaMedian} | ${arm === "s3d" ? "reference" : pass ? "pass" : "fail"} |`,
  );
}
console.log(
  `head: cap median ${at(head, "160").capSeasonsMedian} / ${at(head, "66").capSeasonsMedian}, recruits/run ${Math.round(at(head, "160").recruitsPerRun)} / ${Math.round(at(head, "66").recruitsPerRun)}, wall 66 ${at(head, "66").wallMedian.toFixed(0)} s`,
);
writeFileSync(join(dir, "churn-bars.json"), JSON.stringify(out, null, 1));
