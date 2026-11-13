/**
 * #132's probe, a re-read: do the drawn stems under 7 cm DBH at season 200 die, or survive and not
 * grow, by season 300? Separates "killed before release" from #138's "surplus that buys no
 * growth". Reads runs/understorey-probe/<arm>/w160-s<seed>/ (metamers.csv at 200 and 300,
 * metrics.csv); DBH by cli/allometry.ts.
 *
 *   node docs/experiments/code/2026-11-13-understorey-probe/cohort.ts head t10 t15 t25 t15m3
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { allometry } from "../../../../cli/allometry.ts";
import { DISPLAY_THRESHOLD } from "../../../../src/core/presets.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const FLOOR = 0.07;
const [FROM, TO] = [200, 300];

function lines(path: string): string[][] {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split(","));
}

/** DBH (m) per tree at `season`, from metamers.csv. */
function dbh(dir: string, season: number): Map<string, number> {
  const [head, ...rows] = lines(join(dir, "metamers.csv"));
  const c = (k: string) => (head as string[]).indexOf(k);
  const [S, T, B, P] = [c("season"), c("tree"), c("birthId"), c("parentBirthId")];
  const cols = ["x0", "y0", "z0", "hx", "hy", "hz", "length", "radius"].map(c);
  const trees = new Map<string, { m: number[][]; parent: number[]; index: Map<string, number> }>();
  for (const r of rows) {
    if (Number(r[S]) !== season) continue;
    const id = r[T] as string;
    let t = trees.get(id);
    if (!t) {
      t = { m: cols.map(() => []), parent: [], index: new Map() };
      trees.set(id, t);
    }
    t.index.set(r[B] as string, t.parent.length);
    t.parent.push(t.index.get(r[P] as string) ?? -1);
    cols.forEach((k, i) => t.m[i]?.push(Number(r[k])));
  }
  const out = new Map<string, number>();
  for (const [id, t] of trees) {
    const [baseX, baseY, baseZ, hx, hy, hz, length, radius] = t.m as number[][];
    const m = { parent: t.parent, baseX, baseY, baseZ, hx, hy, hz, length, radius };
    out.set(id, allometry(m as never, { metamer: [], state: [] }).dbh);
  }
  return out;
}

for (const arm of process.argv.slice(2)) {
  let cohort = 0;
  let dead = 0;
  let crossed = 0;
  let grew: number[] = [];
  for (let seed = 1; seed <= 20; seed++) {
    const dir = join(ROOT, "runs/understorey-probe", arm, `w160-s${seed}`);
    const [head, ...rows] = lines(join(dir, "metrics.csv"));
    const c = (k: string) => (head as string[]).indexOf(k);
    const [S, T, A, H] = [c("season"), c("tree"), c("alive"), c("height")];
    const at = (s: number) => new Map(rows.filter((r) => Number(r[S]) === s).map((r) => [r[T], r]));
    const [m0, m1] = [at(FROM), at(TO)];
    const [d0, d1] = [dbh(dir, FROM), dbh(dir, TO)];
    for (const [id, r] of m0) {
      if (r[A] !== "1" || Number(r[H]) < DISPLAY_THRESHOLD) continue;
      const before = d0.get(id as string) ?? 0;
      if (before >= FLOOR) continue;
      cohort++;
      if (m1.get(id)?.[A] !== "1") {
        dead++;
        continue;
      }
      const after = d1.get(id as string) ?? 0;
      if (after >= FLOOR) crossed++;
      grew = [...grew, after - before];
    }
  }
  grew.sort((a, b) => a - b);
  const live = cohort - dead;
  console.log(
    `${arm}: drawn < 7 cm at ${FROM}: ${cohort} (${(cohort / 20).toFixed(1)} a run); dead by ${TO}: ${dead} (${((100 * dead) / cohort).toFixed(0)}%); of ${live} survivors, ≥ 7 cm at ${TO}: ${crossed} (${((100 * crossed) / Math.max(1, live)).toFixed(0)}%); DBH gained, median ${(100 * (grew[grew.length >> 1] ?? Number.NaN)).toFixed(2)} cm`,
  );
}
