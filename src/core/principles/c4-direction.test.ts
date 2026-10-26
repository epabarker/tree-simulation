import { describe, expect, it } from "vitest";
import { defaultParams, mergeParams } from "../params.ts";
import { presetParams } from "../presets.ts";
import type { Tree } from "../tree.ts";
import { World } from "../world.ts";
import { shootDirection } from "./c4-direction.ts";

const UP = Math.PI / 2;
const c4 = { ...defaultParams.c4, enabled: true };

describe("C4 shoot direction (§C4)", () => {
  it("keeps the default direction when only w_d acts", () => {
    const only = { ...c4, xi: 0, eta: 0, epsilon: 0 };
    expect(shootDirection(0.3, 1, 0, 0, only)).toBeCloseTo(0.3, 12);
  });

  it("turns toward the light direction V with weight ξ", () => {
    const light = { ...c4, eta: 0, epsilon: 0, xi: 1 };
    const d = shootDirection(UP, 1, 0, 0, light); // light from the right
    expect(d).toBeCloseTo(Math.PI / 4, 12);
  });

  it("bends toward the set-point; a negative η bends away (§8)", () => {
    const tropism = { ...c4, xi: 0, epsilon: 0, eta: 0.5, setPoint: 0 };
    const horizontal = 0.1; // nearly horizontal, heading right
    expect(shootDirection(horizontal, 0, 0, 0, tropism)).toBeGreaterThan(horizontal);
    expect(shootDirection(horizontal, 0, 0, 0, { ...tropism, eta: -0.5 })).toBeLessThan(horizontal);
  });

  it("adds noise as a rotated copy of the default direction", () => {
    const noisy = { ...c4, xi: 0, eta: 0, wd: 0, epsilon: 1 };
    expect(shootDirection(UP, 0, 1, 0.2, noisy)).toBeCloseTo(UP + 0.2, 12);
  });
});

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
