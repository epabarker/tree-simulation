/**
 * The scoring of the oak's rounded-crown evidence (ticket #124, spec #111 "Rounded crown, oak";
 * docs/features/rounded-crown.md). Pure: it reads a lone tree's metrics.csv text and returns its
 * scores; the driver is cli/oak-crown.ts. The bars, fixed before the evidence run (2026-11-10):
 *
 * - **Upper flank:** the mean over seasons 60–100 of `upperFlankNew` (seasons where it is NaN are
 *   skipped) is ≥ 0.05. The window is the oak-λ note's (2026-11-08); the page gives the 5% bar but
 *   no window. It is a mean of seasonal shares, not the note's pooled share of all new metamers
 *   60–100 (metrics.csv carries no per-season count of new metamers), so the note's 5.5–7.3% on
 *   seeds 1–3 need not reproduce exactly.
 * - **w90** at season 100 in the divided-crown band 0.38–0.85 (the page); NaN fails.
 * - **The box:** a seed with any live bud outside the box in any season (`budsOutside` > 0) is
 *   named and excluded (ADR 0062's amendment of 2026-11-10): it counts neither as a pass nor as a
 *   fail.
 * - **The pass rate:** each bar holds on ≥ 15 of seeds 1–20, scaled to the held seeds
 *   (⌈0.75 × held⌉), and a verdict needs ≥ 15 held seeds.
 * - **Birch** under the same patch is bit-identical to birch at HEAD (hash.txt) on every seed.
 *
 * Reported, not bars: roundness in plan (min ÷ max of crownWidth and crownDepth, ≥ 0.75 as in
 * cli/open-grown.ts), and the form at seasons 30, 60 and 100 (height, reach as half the crown's
 * width, W/H), for the accepted cost of the early fall (a squat young form, a shorter low reach).
 */

/** Metres per cell. */
export const CELL = 0.25;
export const SEASONS = 100;
export const FLANK_FROM = 60;
export const FLANK_MIN = 0.05;
export const W90_BAND = [0.38, 0.85] as const;
export const PASS_SHARE = 0.75;
export const MIN_HELD = 15;
export const ROUND = 0.75;
export const FORM_SEASONS = [30, 60, 100] as const;

export interface Form {
  /** Metres. */
  height: number;
  /** Half the crown's width, metres. */
  reach: number;
  wh: number;
  /** min ÷ max of the crown's width and depth. */
  round: number;
}

export interface SeedScore {
  seed: number;
  alive: boolean;
  held: boolean;
  outsideSeasons: number[];
  outsideMax: number;
  flank: number;
  w90: number;
  flankPass: boolean;
  w90Pass: boolean;
  at: Partial<Record<number, Form>>;
}

export function scoreSeed(csvText: string, seed: number): SeedScore {
  const [head, ...lines] = csvText.trim().split("\n");
  const cols = (head as string).split(",");
  const col = (name: string) => {
    const k = cols.indexOf(name);
    if (k < 0) throw new Error(`metrics.csv has no column ${name}`);
    return k;
  };
  const [S, T, A, O, H, W, D, W90, F] = [
    "season",
    "tree",
    "alive",
    "budsOutside",
    "height",
    "crownWidth",
    "crownDepth",
    "w90",
    "upperFlankNew",
  ].map(col) as number[];
  const outsideSeasons: number[] = [];
  let outsideMax = 0;
  const flanks: number[] = [];
  const at: Partial<Record<number, Form>> = {};
  let last: string[] | undefined;
  for (const line of lines) {
    const v = line.split(",");
    if (Number(v[T as number]) !== 0) continue;
    const season = Number(v[S as number]);
    const n = Number(v[O as number]);
    if (n > 0) outsideSeasons.push(season);
    outsideMax = Math.max(outsideMax, n);
    const f = Number(v[F as number]);
    if (season >= FLANK_FROM && season <= SEASONS && Number.isFinite(f)) flanks.push(f);
    if ((FORM_SEASONS as readonly number[]).includes(season)) {
      const [h, w, d] = [H, W, D].map((k) => Number(v[k as number])) as [number, number, number];
      at[season] = {
        height: h * CELL,
        reach: (w * CELL) / 2,
        wh: h > 0 ? w / h : Number.NaN,
        round: Math.max(w, d) > 0 ? Math.min(w, d) / Math.max(w, d) : 0,
      };
    }
    last = v;
  }
  if (!last) throw new Error(`seed ${seed}: no rows for tree 0`);
  const flank = flanks.length ? flanks.reduce((a, x) => a + x, 0) / flanks.length : Number.NaN;
  const w90 = Number(last[W90 as number]);
  return {
    seed,
    alive: last[A as number] === "1" && Number(last[S as number]) === SEASONS,
    held: outsideMax === 0,
    outsideSeasons,
    outsideMax,
    flank,
    w90,
    flankPass: flank >= FLANK_MIN,
    w90Pass: w90 >= W90_BAND[0] && w90 <= W90_BAND[1],
    at,
  };
}

export interface Tally {
  runs: number;
  held: number;
  excluded: number[];
  bar: number;
  flank: number;
  w90: number;
  both: number;
  /** Both bars at the pass rate, on enough held seeds for a verdict. */
  pass: boolean;
}

export function tally(scores: SeedScore[]): Tally {
  const held = scores.filter((s) => s.held);
  const bar = Math.ceil(PASS_SHARE * held.length);
  const flank = held.filter((s) => s.flankPass).length;
  const w90 = held.filter((s) => s.w90Pass).length;
  return {
    runs: scores.length,
    held: held.length,
    excluded: scores.filter((s) => !s.held).map((s) => s.seed),
    bar,
    flank,
    w90,
    both: held.filter((s) => s.flankPass && s.w90Pass).length,
    pass: held.length >= MIN_HELD && flank >= bar && w90 >= bar,
  };
}

/** Seeds as a range ("1-20") or a list ("1,6,10"). */
export function parseSeeds(s: string): number[] {
  if (s.includes(",")) return s.split(",").map(Number);
  const [a, b] = s.split("-").map(Number) as [number, number | undefined];
  return Array.from({ length: (b ?? a) - a + 1 }, (_, k) => a + k);
}

/** A patch's arm: its file's name, or "patch" for the built-in d12a13 (round one's directory). */
export function armName(patchFile: string | undefined): string {
  if (!patchFile) return "patch";
  return (patchFile.split("/").at(-1) as string).replace(/\.json$/, "");
}

export function compareHashes(
  head: Map<number, string>,
  patch: Map<number, string>,
): { identical: number; differing: number[] } {
  const differing: number[] = [];
  let identical = 0;
  for (const [seed, h] of head) {
    if (patch.get(seed) === h) identical++;
    else differing.push(seed);
  }
  return { identical, differing };
}
