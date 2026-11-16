/**
 * #134's form-knob screen: the note's table from runs/134-form-screen/results.jsonl, and each
 * arm's verdict by the note's §3 rule (fixed before the runs).
 *
 *   node docs/experiments/code/2026-11-16-form-knob-screen/table.ts [results.jsonl]
 */
import { readFileSync } from "node:fs";

type Row = Record<string, number | string | boolean>;
const file = process.argv[2] ?? "runs/134-form-screen/results.jsonl";
const rows: Row[] = readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Row);
const HD_BAND: Record<string, [number, number]> = { beech: [40, 56], hornbeam: [48, 68] };
const WH60_BAND: Record<string, [number, number]> = { beech: [0.4, 0.8], hornbeam: [0.5, 0.9] };

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n === 0 ? Number.NaN : n % 2 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
};
const range = (xs: number[], d: number): string =>
  `${Math.min(...xs).toFixed(d)}–${Math.max(...xs).toFixed(d)}`;
const col = (rs: Row[], k: string): number[] => rs.map((r) => r[k] as number);
const inBand = (xs: number[], [lo, hi]: [number, number]): number =>
  xs.filter((x) => x >= lo && x <= hi).length;
const dist = (x: number, [lo, hi]: [number, number]): number => (x < lo ? lo - x : x > hi ? x - hi : 0);

console.log(
  "| species | arm | n | W/H 25 (med; ÷HEAD) | W/H 60 (in bar 2) | W/H 100 (in 0.6–1.2) | H 100 m (med) | D 1.3 m 100 cm | H/D 100 (in band) | metamers 100 (k) | verdict |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|");
for (const sp of ["beech", "hornbeam"]) {
  const head = rows.filter((r) => r.species === sp && r.arm === "head");
  const h25 = median(col(head, "WH25"));
  const hH = median(col(head, "H100"));
  const hHDdist = median(col(head, "HD100").map((x) => dist(x, HD_BAND[sp] as [number, number])));
  const arms = [...new Set(rows.filter((r) => r.species === sp).map((r) => r.arm as string))];
  for (const arm of arms) {
    const rs = rows.filter((r) => r.species === sp && r.arm === arm);
    const wh25 = col(rs, "WH25");
    const wh60 = col(rs, "WH60");
    const wh100 = col(rs, "WH100");
    const hd = col(rs, "HD100");
    const hdBand = HD_BAND[sp] as [number, number];
    const c100 = inBand(wh100, [0.6, 1.2]);
    const early = median(wh25) / h25;
    const cHD = inBand(hd, hdBand);
    const hdOk = cHD >= 4 || median(hd.map((x) => dist(x, hdBand))) <= hHDdist;
    const hOk = median(col(rs, "H100")) >= 0.9 * hH;
    const a = c100 >= 4;
    const b = early <= 0.85;
    const verdict =
      arm === "head"
        ? "baseline"
        : a && b && hdOk && hOk
          ? "**promising**"
          : a && b
            ? "partial"
            : "no";
    console.log(
      `| ${sp} | ${arm} | ${rs.length} | ${median(wh25).toFixed(2)} (${range(wh25, 2)}); ${early.toFixed(2)} | ${range(wh60, 2)} (${inBand(wh60, WH60_BAND[sp] as [number, number])}) | ${range(wh100, 2)} (${c100}) | ${median(col(rs, "H100")).toFixed(1)} (${range(col(rs, "H100"), 1)}) | ${range(col(rs, "D100"), 0)} | ${range(hd, 0)} (${cHD}) | ${range(col(rs, "n100").map((x) => x / 1000), 0)} | ${verdict} |`,
    );
  }
}
