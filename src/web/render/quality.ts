/**
 * Adaptive quality (M15): when frames run slow, draw fewer pixels, then fewer leaves.
 *
 * Levels run from best to cheapest: the device pixel ratio (capped) stepping down through 1.5 to
 * 1, then 1 without the back layer of leaves. While the garden animates, every 60 frame intervals
 * form a window: if its 90th percentile is above SLOW_MS (under ≈ 42 fps) the quality steps down
 * one level; after GOOD_WINDOWS windows in a row under FAST_MS it steps back up one. A change waits
 * SETTLE_MS before frames count again, so a resize's own hitch is not judged.
 */

export interface QualityLevel {
  dpr: number;
  /** Leave out the back layer of leaves. */
  lite: boolean;
}

export const WINDOW = 60;
export const SLOW_MS = 24;
export const FAST_MS = 18;
export const GOOD_WINDOWS = 10;
export const SETTLE_MS = 1000;

/** The levels for a device pixel ratio, capped at `maxDpr`. */
export function qualityLevels(deviceDpr: number, maxDpr: number): QualityLevel[] {
  const cap = Math.min(deviceDpr || 1, maxDpr);
  const dprs = [cap, 1.5, 1].filter((d, i, all) => d <= cap && all.indexOf(d) === i);
  return [
    ...dprs.map((dpr) => ({ dpr, lite: false })),
    { dpr: dprs[dprs.length - 1] as number, lite: true },
  ];
}

export interface Governor {
  levels: QualityLevel[];
  level: number;
  window: number[];
  good: number;
  settleUntil: number;
}

export function governor(levels: QualityLevel[]): Governor {
  return { levels, level: 0, window: [], good: 0, settleUntil: 0 };
}

/**
 * Counts one animated frame interval `dt` at time `now` (ms). Returns the new level when the
 * quality should change, else null.
 */
export function judge(g: Governor, dt: number, now: number): number | null {
  if (now < g.settleUntil) return null;
  g.window.push(dt);
  if (g.window.length < WINDOW) return null;
  g.window.sort((a, b) => a - b);
  const p90 = g.window[Math.floor(0.9 * WINDOW)] as number;
  g.window.length = 0;
  let next: number | null = null;
  if (p90 > SLOW_MS && g.level < g.levels.length - 1) next = g.level + 1;
  else if (p90 < FAST_MS && g.level > 0 && ++g.good >= GOOD_WINDOWS) next = g.level - 1;
  else if (p90 >= FAST_MS) g.good = 0;
  if (next !== null) {
    g.level = next;
    g.good = 0;
    g.settleUntil = now + SETTLE_MS;
  }
  return next;
}
