/**
 * #134's beech λ₀ confirmation: the note's table from runs/134-beech-lam0/<name>.jsonl, and each
 * arm's reading against the note's §3 bars (fixed before the runs).
 *
 *   node docs/experiments/code/2026-11-16-beech-lam0-confirm/table.ts [results.jsonl]
 */
import { readFileSync } from "node:fs";

type Row = Record<string, number | string | boolean>;
const file = process.argv[2] ?? "runs/134-beech-lam0/confirm.jsonl";
const rows: Row[] = readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Row);
const HD: [number, number] = [40, 56]; // lone.slenderness 48 ± 8 (bar 1)
const WH60: [number, number] = [0.4, 0.8]; // lone.spread 0.6 ± 0.2 (bar 2)
const WH100: [number, number] = [0.6, 1.2]; // ADR 0067 decision 1 (bar 3)
const NEED = 15;

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return Number.NaN;
  return n % 2 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
};
const range = (xs: number[], d: number): string =>
  `${Math.min(...xs).toFixed(d)}–${Math.max(...xs).toFixed(d)}`;
const col = (rs: Row[], k: string): number[] => rs.map((r) => r[k] as number);
const inBand = (xs: number[], [lo, hi]: [number, number]): number =>
  xs.filter((x) => x >= lo && x <= hi).length;
const dist = (x: number, [lo, hi]: [number, number]): number => (x < lo ? lo - x : x > hi ? x - hi : 0);
const edge = (r: Row): number => (((r.cr100 as number) - (r.cr60 as number)) / 40) * 100; // cm/season

const head = new Map(rows.filter((r) => r.arm === "head").map((r) => [r.seed as number, r]));
const headHD = median(col([...head.values()], "HD100").map((x) => dist(x, HD)));
const arms = [...new Set(rows.map((r) => r.arm as string))];

console.log(
  "| arm | n (alive) | W/H 100 (in 0.6–1.2) | H/D 100 (in 40–56); median distance | H/D 60 (in 40–56) | W/H 60 (in 0.4–0.8; nearer than HEAD) | H 60 m: median | H 100 m: median (range) | W 100 m: median (range) | D 1.3 m 100 cm | edge 60–100 cm/season: median (range; ≤ 3) | metamers 100 (k) |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
const verdicts: string[] = [];
for (const arm of arms) {
  const rs = rows.filter((r) => r.arm === arm).sort((a, b) => (a.seed as number) - (b.seed as number));
  const n = rs.length;
  const alive = rs.filter((r) => r.alive100 === true).length;
  const wh100 = col(rs, "WH100");
  const hd100 = col(rs, "HD100");
  const hd60 = col(rs, "HD60");
  const wh60 = col(rs, "WH60");
  const nearer = rs.filter((r) => {
    const h = head.get(r.seed as number);
    return h !== undefined && dist(r.WH60 as number, WH60) < dist(h.WH60 as number, WH60);
  }).length;
  const edges = rs.map(edge);
  const hdDist = median(hd100.map((x) => dist(x, HD)));
  const c100 = inBand(wh100, WH100);
  const cHD = inBand(hd100, HD);
  console.log(
    `| ${arm} | ${n} (${alive}) | ${range(wh100, 2)} (${c100}) | ${range(hd100, 0)} (${cHD}); ${hdDist.toFixed(1)} | ${range(hd60, 0)} (${inBand(hd60, HD)}) | ${range(wh60, 2)} (${inBand(wh60, WH60)}; ${arm === "head" ? "–" : nearer}) | ${median(col(rs, "H60")).toFixed(1)} | ${median(col(rs, "H100")).toFixed(1)} (${range(col(rs, "H100"), 1)}) | ${median(col(rs, "W100")).toFixed(1)} (${range(col(rs, "W100"), 1)}) | ${range(col(rs, "D100"), 0)} | ${median(edges).toFixed(1)} (${range(edges, 1)}; ${edges.filter((e) => e <= 3).length}) | ${range(col(rs, "n100").map((x) => x / 1000), 0)} |`,
  );
  if (arm !== "head") {
    const triad = c100 >= NEED && cHD >= NEED;
    const stand = c100 >= NEED && nearer >= NEED && hdDist <= headHD;
    verdicts.push(
      `- ${arm}: W/H 100 ${c100}/${n}, H/D 100 ${cHD}/${n}, bar 2 nearer ${nearer}/${n}, H/D distance ${hdDist.toFixed(1)} (HEAD ${headHD.toFixed(1)}): triad ${triad ? "passes" : "fails"}; stand check ${stand ? "**qualifies**" : "does not qualify"}`,
    );
  }
}
console.log();
console.log(verdicts.join("\n"));
