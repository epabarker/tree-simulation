/** C4 evidence (M3) on the Rust core; the rule itself is tested in rust/core/src/principles/c4.rs. */
import { describe, expect, it } from "vitest";
import { mergeParams } from "../../src/core/params.ts";
import { presetParams } from "../../src/core/presets.ts";
import type { Tree } from "../world.ts";
import { World } from "../world.ts";

const SEEDS = [1, 2, 3, 4, 5];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function finalMetric(
  params: ReturnType<typeof presetParams>,
  seasons: number,
  f: (t: Tree) => number,
) {
  const world = new World(params);
  world.run(seasons);
  return f(world.trees[0] as Tree);
}

function centroidOffset(t: Tree): number {
  let sum = 0;
  for (let i = 0; i < t.m.length; i++) sum += t.tipX(i);
  return sum / t.m.length - t.rootX;
}

function crownWidth(t: Tree): number {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < t.m.length; i++) {
    lo = Math.min(lo, t.tipX(i));
    hi = Math.max(hi, t.tipX(i));
  }
  return hi - lo;
}

describe("M3: shoot direction shapes the crown", () => {
  it("leans away from a wall (5 seeds, §7 M3)", () => {
    const withWall = SEEDS.map((s) => finalMetric(presetParams("wall", s), 25, centroidOffset));
    const noWall = SEEDS.map((s) =>
      finalMetric(
        mergeParams(presetParams("wall", s), { world: { walls: [] } }),
        25,
        centroidOffset,
      ),
    );
    // The wall is on the left, so the crown's centroid moves right.
    expect(mean(withWall)).toBeGreaterThan(mean(noWall) + 1);
    expect(mean(withWall)).toBeGreaterThan(0);
  });

  it("spreads wider when tropism points down than up (5 seeds, §7 M3)", () => {
    const width = (eta: number) =>
      SEEDS.map((s) =>
        finalMetric(mergeParams(presetParams("direction", s), { c4: { eta } }), 25, crownWidth),
      );
    const up = width(0.5);
    const down = width(-0.5);
    for (const [i, d] of down.entries()) expect(d).toBeGreaterThan(up[i] as number);
    expect(mean(down)).toBeGreaterThan(mean(up) * 1.2);
  });
});
