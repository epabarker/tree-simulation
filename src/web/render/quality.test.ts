import { describe, expect, it } from "vitest";
import { GOOD_WINDOWS, governor, judge, qualityLevels, SETTLE_MS, WINDOW } from "./quality.ts";

/** Feeds `windows` windows of frames `dt` apart, starting at `now`; returns the level changes. */
function run(g: ReturnType<typeof governor>, dt: number, windows: number, now = 0) {
  const changes: number[] = [];
  let t = now;
  for (let i = 0; i < windows * WINDOW; i++) {
    t += dt;
    const next = judge(g, dt, t);
    if (next !== null) changes.push(next);
  }
  return { changes, end: t };
}

describe("adaptive quality (M15)", () => {
  it("steps the pixel ratio down to 1, then drops the back leaves", () => {
    expect(qualityLevels(3, 2)).toEqual([
      { dpr: 2, lite: false },
      { dpr: 1.5, lite: false },
      { dpr: 1, lite: false },
      { dpr: 1, lite: true },
    ]);
    expect(qualityLevels(1, 2)).toEqual([
      { dpr: 1, lite: false },
      { dpr: 1, lite: true },
    ]);
  });

  it("steps down one level per slow window, waiting for each change to settle, and stops at the last", () => {
    const g = governor(qualityLevels(3, 2));
    const { changes } = run(g, 40, 20); // 25 fps throughout
    expect(changes).toEqual([1, 2, 3]);
    expect(g.level).toBe(3);
  });

  it("ignores frames while a change settles", () => {
    const g = governor(qualityLevels(2, 2));
    run(g, 40, 1);
    expect(g.level).toBe(1);
    const frames = Math.floor(SETTLE_MS / 40) - 1;
    for (let i = 0; i < frames; i++) judge(g, 40, 2400 + i);
    expect(g.window).toHaveLength(0);
  });

  it("holds at 60 fps, and steps back up only after many good windows in a row", () => {
    const g = governor(qualityLevels(2, 2));
    const slow = run(g, 40, 1);
    expect(g.level).toBe(1);
    const almost = run(g, 16.7, GOOD_WINDOWS - 1, slow.end + SETTLE_MS);
    expect(almost.changes).toEqual([]);
    const more = run(g, 16.7, 1, almost.end);
    expect(more.changes).toEqual([0]);
    expect(run(g, 16.7, 30, more.end + SETTLE_MS).changes).toEqual([]); // best level already
  });

  it("starts the count of good windows again after a middling one", () => {
    const g = governor(qualityLevels(2, 2));
    const slow = run(g, 40, 1);
    let t = slow.end + SETTLE_MS;
    t = run(g, 16.7, GOOD_WINDOWS - 1, t).end;
    t = run(g, 20, 1, t).end; // between FAST_MS and SLOW_MS: no change, but the streak resets
    expect(run(g, 16.7, GOOD_WINDOWS - 1, t).changes).toEqual([]);
    expect(g.level).toBe(1);
  });
});
