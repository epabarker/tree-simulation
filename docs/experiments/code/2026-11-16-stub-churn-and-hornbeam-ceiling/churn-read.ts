/**
 * Reads trace B's JSON (churn.ts): how promoted stubs end, how long the demoted lasted, and the
 * two light measures (promotion's ground light at the centre, demotion's Q_top/C) for them.
 *
 *   node docs/experiments/code/2026-11-16-stub-churn-and-hornbeam-ceiling/churn-read.ts runs/137-churn/s3d-w160-s1.json
 */
import { readFileSync } from "node:fs";

type Row = { s: number; age: number; h: number; qTop: number; ground05: number };
type Track = {
  kind: string;
  species: string;
  promoted: number;
  ground: number[];
  seasons: Row[];
  end: { s: number; how: string };
};
const file = process.argv[2] as string;
const run = JSON.parse(readFileSync(file, "utf8")) as {
  YS: number[];
  direct: number;
  seasons: number;
  demoteAt: number;
  tracks: Track[];
};
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[Math.min(s.length - 1, Math.floor(p * s.length))] as number) : Number.NaN;
};
const f = (x: number, d = 3) => x.toFixed(d);
const sum = (xs: number[]) => `median ${f(q(xs, 0.5))} [p10 ${f(q(xs, 0.1))}, p90 ${f(q(xs, 0.9))}]`;
function report(label: string, t: Track[]) {
  console.log(`${file}, ${label}: ${t.length} trees, ${run.seasons} seasons`);
const by = (how: string) => t.filter((x) => x.end.how === how);
for (const how of ["demoted", "died", "drawn", "alive"]) {
  const n = by(how).length;
  console.log(`  ${how}: ${n} (${f((100 * n) / t.length, 1)}%)`);
}
const dem = by("demoted");
const lasted = dem.map((x) => x.end.s - x.promoted);
const hist = new Map<number, number>();
for (const l of lasted) hist.set(l, (hist.get(l) ?? 0) + 1);
console.log(
  "  demoted, seasons from promotion to demotion:",
  [...hist.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 12)
    .map(([k, v]) => `${k}:${v}`)
    .join(" "),
);
const ages = dem.map((x) => (x.seasons.at(-1) as Row).age);
console.log(`  demoted, age at demotion: ${sum(ages)}`);
const atCentre = (i: number) => (x: Track) => x.ground[i] as number;
for (const [label, set] of [
  ["demoted", dem],
  ["drawn", by("drawn")],
  ["alive", by("alive")],
  ["all", t],
] as const) {
  if (!set.length) continue;
  console.log(`  ${label} (${set.length}):`);
  run.YS.forEach((y, i) => {
    console.log(`    promotion's ground Q/C at y ${y}: ${sum(set.map(atCentre(i)))}`);
  });
  const first = set.filter((x) => x.seasons.length > 0).map((x) => x.seasons[0] as Row);
  console.log(`    next season: the centre's y 0.5 Q/C ${sum(first.map((r) => r.ground05))}`);
  console.log(`    next season: Q_top/C ${sum(first.map((r) => r.qTop))}, age ${sum(first.map((r) => r.age))}, h ${sum(first.map((r) => r.h))}`);
  const last = set.filter((x) => x.seasons.length > 0).map((x) => x.seasons.at(-1) as Row);
  console.log(`    last read: Q_top/C ${sum(last.map((r) => r.qTop))}`);
}
// Of the promoted, the share whose first-season Q_top/C is already below the demotion threshold.
const firsts = t.filter((x) => x.seasons.length > 0);
const below = firsts.filter((x) => (x.seasons[0] as Row).qTop < run.demoteAt).length;
console.log(`  first season Q_top/C < ${run.demoteAt}: ${below} of ${firsts.length}`);
// How well does each promotion-time measure predict the first season's Q_top/C (rank correlation)?
const rank = (xs: number[]) => {
  const idx = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  idx.forEach(([, i], k) => {
    r[i] = k;
  });
  return r;
};
const spearman = (a: number[], b: number[]) => {
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const m = (n - 1) / 2;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = (ra[i] as number) - m;
    const db = (rb[i] as number) - m;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return sab / Math.sqrt(saa * sbb);
};
const top1 = firsts.map((x) => (x.seasons[0] as Row).qTop);
run.YS.forEach((y, i) => {
  console.log(`  ρ(promotion ground y ${y}, first Q_top/C): ${f(spearman(firsts.map(atCentre(i)), top1), 2)}`);
});
console.log(
  `  ρ(next season's centre y 0.5, first Q_top/C): ${f(spearman(firsts.map((x) => (x.seasons[0] as Row).ground05), top1), 2)}`,
);
console.log(
  `  ρ(promotion y 0.5, next season's y 0.5): ${f(spearman(firsts.map(atCentre(0)), firsts.map((x) => (x.seasons[0] as Row).ground05)), 2)}`,
);
}
report("promoted stubs", run.tracks.filter((x) => x.kind === "promoted"));
report("seeds that became trees at once", run.tracks.filter((x) => x.kind === "seed"));
report("every recruit", run.tracks);
