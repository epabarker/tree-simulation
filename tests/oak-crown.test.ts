import { describe, expect, it } from "vitest";
import { compareHashes, scoreSeed, tally } from "../cli/oak-crown-score.ts";

/** A metrics.csv for one lone tree (tree 0), with a second tree's rows that must be ignored. */
function metrics(
  rows: {
    season: number;
    flank?: number;
    w90?: number;
    outside?: number;
    h?: number;
    w?: number;
    d?: number;
  }[],
): string {
  const head =
    "season,tree,species,alive,height,crownWidth,crownDepth,w90,upperFlankNew,budsOutside";
  const lines = rows.flatMap((r) => [
    [
      r.season,
      0,
      "oak",
      1,
      r.h ?? 100,
      r.w ?? 80,
      r.d ?? 80,
      r.w90 ?? "NaN",
      r.flank ?? "NaN",
      r.outside ?? 0,
    ].join(","),
    [r.season, 1, "birch", 1, 1, 1, 1, 0, 1, 99].join(","),
  ]);
  return [head, ...lines].join("\n");
}

const seasons = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, k) => from + k);

describe("the oak's rounded-crown evidence (#124)", () => {
  it("averages the upper-flank share over seasons 60–100, skipping NaN seasons", () => {
    // 41 seasons 60–100: 0.04 in 20 of them, 0.08 in 20, NaN in one: the mean is 0.06.
    const rows = seasons(1, 100).map((s) => ({
      season: s,
      flank: s < 60 ? 0.9 : s === 80 ? Number.NaN : s % 2 ? 0.04 : 0.08,
      w90: 0.6,
    }));
    const r = scoreSeed(metrics(rows), 7);
    expect(r.flank).toBeCloseTo(0.06, 12);
    expect(r.flankPass).toBe(true);
  });

  it("passes w90 at season 100 only inside the divided-crown band 0.38–0.85", () => {
    const at = (w90: number) =>
      scoreSeed(
        metrics([
          { season: 60, flank: 0.1 },
          { season: 100, w90, flank: 0.1 },
        ]),
        1,
      );
    expect(at(0.38).w90Pass).toBe(true);
    expect(at(0.85).w90Pass).toBe(true);
    expect(at(0.3).w90Pass).toBe(false);
    expect(at(0.9).w90Pass).toBe(false);
    expect(at(Number.NaN).w90Pass).toBe(false);
  });

  it("names a seed with any bud outside the box, with its seasons, and excludes it", () => {
    const rows = seasons(1, 100).map((s) => ({
      season: s,
      flank: 0.1,
      w90: 0.6,
      outside: s >= 70 && s <= 72 ? 3 : 0,
    }));
    const r = scoreSeed(metrics(rows), 15);
    expect(r.held).toBe(false);
    expect(r.outsideSeasons).toEqual([70, 71, 72]);
    expect(r.outsideMax).toBe(3);
  });

  it("reads the form in metres at 30, 60 and 100: height, reach (half the width), W/H, roundness", () => {
    const r = scoreSeed(
      metrics([
        { season: 30, h: 60, w: 48, d: 40 },
        { season: 60, h: 120, w: 100, d: 100 },
        { season: 100, h: 132, w: 120, d: 90, w90: 0.6, flank: 0.1 },
      ]),
      2,
    );
    // A cell is 0.25 m.
    expect(r.at[30]).toEqual({ height: 15, reach: 6, wh: 0.8, round: 40 / 48 });
    expect(r.at[100]?.round).toBeCloseTo(0.75, 12);
    expect(r.alive).toBe(true);
  });

  it("counts the held seeds against a bar of 15 of 20, scaled to the held seeds", () => {
    const seed = (n: number, flankPass: boolean, w90Pass: boolean, held = true) => ({
      ...scoreSeed(metrics([{ season: 100, w90: 0.6, flank: 0.1 }]), n),
      held,
      flankPass,
      w90Pass,
    });
    const all = [
      ...seasons(1, 15).map((n) => seed(n, true, true)),
      seed(16, false, true),
      seed(17, true, false),
      seed(18, false, false),
      seed(19, true, true, false),
      seed(20, false, false, false),
    ];
    const t = tally(all);
    expect(t.held).toBe(18);
    expect(t.excluded).toEqual([19, 20]);
    expect(t.bar).toBe(14); // ⌈0.75 × 18⌉
    expect(t.flank).toBe(16);
    expect(t.w90).toBe(16);
    expect(t.both).toBe(15);
    expect(t.pass).toBe(true);
    // Below 15 held seeds there is no verdict: too many crowns reached a bound.
    expect(tally(all.slice(0, 14)).pass).toBe(false);
  });

  it("finds the seeds whose patched hash differs from HEAD's", () => {
    const head = new Map([
      [1, "aaaa0001"],
      [2, "aaaa0002"],
      [3, "aaaa0003"],
    ]);
    const patch = new Map([
      [1, "aaaa0001"],
      [2, "bbbb0002"],
      [3, "aaaa0003"],
    ]);
    expect(compareHashes(head, patch)).toEqual({ identical: 2, differing: [2] });
  });
});
