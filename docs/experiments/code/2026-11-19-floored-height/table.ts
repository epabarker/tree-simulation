/**
 * #135's lone tables and bars (docs/experiments/2026-11-19-floored-height-rule.md, §2, fixed
 * before any rule run), from runs/135-floored-height/<name>.jsonl files (lone.ts' lines).
 *
 *   node docs/experiments/code/2026-11-19-floored-height/table.ts runs/135-floored-height/head.jsonl [more.jsonl …]
 */
import { readFileSync } from "node:fs";

type Row = Record<string, number | string | boolean>;
const rows: Row[] = process.argv
  .slice(2)
  .flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean))
  .map((l) => JSON.parse(l) as Row);

type Band = [number, number];
/** lone.slenderness (H/D at 1.3 m), the triad note's §5 and its triad.py (target ± band). */
const HD: Record<string, Band> = {
  beech: [40, 56],
  hornbeam: [48, 68],
  birch: [32, 48],
  oak: [40, 56],
  maple: [40, 56],
};
/** lone.spread at 60 (W/H), the same sources. */
const WH60: Record<string, Band> = {
  beech: [0.4, 0.8],
  hornbeam: [0.5, 0.9],
  oak: [0.5, 1.0],
  maple: [0.5, 0.9],
};
/** ADR 0067 decision 1: W/H at 100, beech and hornbeam. */
const WH100: Record<string, Band> = { beech: [0.6, 1.2], hornbeam: [0.6, 1.2] };
/** Pretzsch et al. 2015's open-grown 95% edge, 2·exp(a)·d^α (the pathlength note's anchors.py). */
const PRETZSCH: Record<string, [number, number]> = {
  oak: [-1.437, 0.816],
  beech: [0.011, 0.471],
  hornbeam: [-0.174, 0.547],
  maple: [-0.445, 0.534],
  birch: [-0.969, 0.648],
};
const CHOI = 3; // cm a season: Choi et al. 2001's 2–3 at this size (the crown-extent note's guard)
const NEED = 15; // of 20
const TRIAD = ["beech", "hornbeam"];
const READS = [10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

const median = (xs: number[]): number => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return Number.NaN;
  return n % 2 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
};
const fin = (xs: number[]) => xs.filter((x) => Number.isFinite(x));
const range = (xs: number[], d: number): string =>
  fin(xs).length ? `${Math.min(...fin(xs)).toFixed(d)}–${Math.max(...fin(xs)).toFixed(d)}` : "–";
const inBand = (xs: number[], b?: Band): number =>
  b ? xs.filter((x) => x >= b[0] && x <= b[1]).length : Number.NaN;
const dist = (x: number, b?: Band): number =>
  !b ? Number.NaN : x < b[0] ? b[0] - x : x > b[1] ? x - b[1] : 0;
const num = (r: Row, k: string) => r[k] as number;
export const edge = (r: Row): number => ((num(r, "cr100") - num(r, "cr60")) / 40) * 100;

/** W ÷ Pretzsch's edge where D at 1.3 m first reaches 40 cm, and the taper D ÷ D_root there. */
export function atDbh40(r: Row): { wp: number; taper: number; read: boolean } {
  const sp = r.species as string;
  const pz = PRETZSCH[sp];
  for (let k = 1; k < READS.length; k++) {
    const [a, b] = [READS[k - 1] as number, READS[k] as number];
    const [da, db] = [num(r, `D${a}`), num(r, `D${b}`)];
    if (da < 40 && db >= 40) {
      const f = (40 - da) / (db - da);
      const lerp = (key: string) => num(r, `${key}${a}`) + f * (num(r, `${key}${b}`) - num(r, `${key}${a}`));
      const w = 2 * lerp("cr");
      const taper = 40 / lerp("D0");
      const wp = pz ? w / (2 * Math.exp(pz[0]) * 40 ** pz[1]) : Number.NaN;
      return { wp, taper, read: taper >= 0.8 && taper <= 1.25 };
    }
  }
  return { wp: Number.NaN, taper: Number.NaN, read: false };
}

const arms = [...new Set(rows.map((r) => r.arm as string))];
const species = [...new Set(rows.map((r) => r.species as string))];
const of = (arm: string, sp: string) =>
  rows
    .filter((r) => r.arm === arm && r.species === sp)
    .sort((a, b) => num(a, "seed") - num(b, "seed"));

console.log(
  "| arm | species | n (alive 100) | edge 60–100 cm/season: median (range; seeds ≤ 3) | W/H 100: median (range; in 0.6–1.2) | H/D 100: median (range; in band); median distance | H/D 60 (in band) | W/H 60: median (in band; nearer than HEAD) | W ÷ Pretzsch at DBH 40: median (range; read of reached; ≤ 1.2) | the same, every seed reached, taper not read: median (range) | H 100 m: median (range) | W 100 m: median | D 1.3 m 100 cm: median | metamers 100 (k): median |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
type Stat = {
  edgeLow: number;
  wh100In: number;
  hd100In: number;
  hdDist: number;
  whDist: number;
  wp: number;
  h100: number;
  edgeMedian: number;
  n: number;
};
const stats = new Map<string, Stat>();
for (const arm of arms) {
  for (const sp of species) {
    const rs = of(arm, sp);
    if (rs.length === 0) continue;
    const head = new Map(of("head", sp).map((r) => [num(r, "seed"), r]));
    const edges = rs.map(edge);
    const wh100 = rs.map((r) => num(r, "WH100"));
    const hd100 = rs.map((r) => num(r, "HD100"));
    const hd60 = rs.map((r) => num(r, "HD60"));
    const wh60 = rs.map((r) => num(r, "WH60"));
    const nearer = rs.filter((r) => {
      const h = head.get(num(r, "seed"));
      return h !== undefined && dist(num(r, "WH60"), WH60[sp]) < dist(num(h, "WH60"), WH60[sp]);
    }).length;
    const d40 = rs.map(atDbh40);
    const reached = d40.filter((x) => Number.isFinite(x.taper)).length;
    const wp = d40.filter((x) => x.read).map((x) => x.wp);
    const wpAll = d40.filter((x) => Number.isFinite(x.wp)).map((x) => x.wp);
    const s: Stat = {
      edgeLow: edges.filter((e) => e <= CHOI).length,
      wh100In: inBand(wh100, WH100[sp]),
      hd100In: inBand(hd100, HD[sp]),
      hdDist: median(hd100.map((x) => dist(x, HD[sp]))),
      whDist: median(wh100.map((x) => dist(x, WH100[sp]))),
      wp: median(wp),
      h100: median(rs.map((r) => num(r, "H100"))),
      edgeMedian: median(edges),
      n: rs.length,
    };
    stats.set(`${arm}:${sp}`, s);
    const alive = rs.filter((r) => r.alive100 === true).length;
    const band = (x: number) => (Number.isFinite(x) ? String(x) : "–");
    console.log(
      `| ${arm} | ${sp} | ${rs.length} (${alive}) | ${s.edgeMedian.toFixed(1)} (${range(edges, 1)}; ${s.edgeLow}) | ${median(wh100).toFixed(2)} (${range(wh100, 2)}; ${band(s.wh100In)}) | ${median(hd100).toFixed(0)} (${range(hd100, 0)}; ${band(s.hd100In)}); ${Number.isFinite(s.hdDist) ? s.hdDist.toFixed(1) : "–"} | ${range(hd60, 0)} (${band(inBand(hd60, HD[sp]))}) | ${median(wh60).toFixed(2)} (${band(inBand(wh60, WH60[sp]))}; ${arm === "head" || !WH60[sp] ? "–" : nearer}) | ${Number.isFinite(s.wp) ? s.wp.toFixed(2) : "–"} (${range(wp, 2)}; ${wp.length} of ${reached}; ${wp.filter((x) => x <= 1.2).length}) | ${Number.isFinite(median(wpAll)) ? median(wpAll).toFixed(2) : "–"} (${range(wpAll, 2)}) | ${s.h100.toFixed(1)} (${range(rs.map((r) => num(r, "H100")), 1)}) | ${median(rs.map((r) => num(r, "W100"))).toFixed(1)} | ${median(rs.map((r) => num(r, "D100"))).toFixed(0)} | ${(median(rs.map((r) => num(r, "n100"))) / 1000).toFixed(0)} |`,
    );
  }
}

// --- The bars (§2 of the note).
const no = (x: number) => !Number.isFinite(x);
console.log();
for (const sp of species) {
  const h = stats.get(`head:${sp}`);
  if (h) {
    console.log(
      `- condition, ${sp}: HEAD's late edge rate median ${h.edgeMedian.toFixed(1)} cm/season, ${h.edgeLow} of ${h.n} seeds ≤ ${CHOI}: ${h.edgeMedian > CHOI ? "**above Choi's**" : "at or below Choi's"}`,
    );
  }
}
for (const arm of arms.filter((a) => a !== "head")) {
  const lines: string[] = [];
  let pass = true;
  for (const sp of species) {
    const s = stats.get(`${arm}:${sp}`);
    const h = stats.get(`head:${sp}`);
    if (!s || !h) continue;
    const e = h.edgeMedian > CHOI ? s.edgeLow >= NEED : true;
    const t1 = TRIAD.includes(sp) ? s.wh100In >= NEED : true;
    const t2 = TRIAD.includes(sp) ? s.hd100In >= NEED : true;
    const worse = [
      !no(h.hdDist) && s.hdDist > h.hdDist ? "H/D distance" : "",
      !no(h.whDist) && s.whDist > h.whDist ? "W/H 100 distance" : "",
      !no(h.wp) && !no(s.wp) && s.wp > h.wp ? "W ÷ Pretzsch" : "",
      s.h100 < 0.9 * h.h100 ? "height < 0.9 HEAD" : "",
    ].filter(Boolean);
    pass = pass && e && t1 && t2 && worse.length === 0;
    lines.push(
      `  - ${sp}: E ${h.edgeMedian > CHOI ? `${s.edgeLow}/${s.n} ${e ? "✓" : "✗"}` : "n/a (HEAD at or below)"}; T1 ${TRIAD.includes(sp) ? `${s.wh100In}/${s.n} ${t1 ? "✓" : "✗"}` : "n/a"}; T2 ${TRIAD.includes(sp) ? `${s.hd100In}/${s.n} ${t2 ? "✓" : "✗"}` : "n/a"}; T3 no worse than HEAD ${worse.length ? `✗ (${worse.join(", ")})` : "✓"}`,
    );
  }
  console.log(`- **${arm}** against HEAD: ${pass ? "**passes**" : "fails"}`);
  console.log(lines.join("\n"));
}
