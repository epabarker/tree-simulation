import { describe, expect, it } from "vitest";
import { type TreeMetrics, treeMetrics } from "./metrics.ts";
import { mergeParams } from "./params.ts";
import { presetParams } from "./presets.ts";
import type { Tree } from "./tree.ts";
import { World } from "./world.ts";

// M8 visible test (§7, ADR 0010): a height plateau, a suppressed tree that dies, a rising crown
// base, with the sky presets' R1 settings. 5 seeds, 100 seasons.
const SEEDS = [1, 2, 3, 4, 5];
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
const STAND_X = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209];

/** skyStand with a seedling planted at season 20 under the closed canopy (tree 10). */
const runs = SEEDS.map((seed) => {
  const params = mergeParams(presetParams("skyStand", seed), {
    trees: [...STAND_X.map((x) => ({ x })), { x: 93.5, plantSeason: 20 }],
  });
  const world = new World(params);
  const at: Record<number, TreeMetrics[]> = {};
  let seedlingDied = -1;
  for (let s = 1; s <= 100; s++) {
    world.step();
    if (seedlingDied < 0 && world.trees[10]?.m.length && !world.trees[10].alive) seedlingDied = s;
    if (s === 50 || s === 70 || s === 100) {
      at[s] = world.trees.slice(1, 9).map((t) => treeMetrics(t, world));
    }
  }
  return { at, seedlingDied, world };
});
const interior = (season: number) =>
  runs.flatMap((r) => (r.at[season] as TreeMetrics[]).filter((m) => m.alive));

describe("M8: carbon balance with the cost of size (§R1, ADR 0010)", () => {
  it("levels height off below the world's top (a plateau, not the ceiling)", () => {
    const h70 = median(interior(70).map((m) => m.height));
    const h100 = median(interior(100).map((m) => m.height));
    const h50 = median(interior(50).map((m) => m.height));
    expect(h100 - h70).toBeLessThan(0.25 * h50); // 30 late seasons add < ¼ of the first 50's
    expect(h100).toBeLessThan(0.85 * 110);
  });

  it("starves a seedling under the closed canopy within 20 seasons (5 seeds)", () => {
    for (const r of runs) {
      expect(r.seedlingDied).toBeGreaterThan(20);
      expect(r.seedlingDied).toBeLessThanOrEqual(40);
    }
  });

  it("raises the crown base after the canopy closes", () => {
    const bole = (season: number) => median(interior(season).map((m) => m.boleHeight));
    expect(bole(100)).toBeGreaterThan(bole(50));
    expect(bole(50)).toBeGreaterThan(15);
  });

  it("spends a plausible share of production on maintenance", () => {
    const share = median(interior(50).map((m) => m.maintenance / m.production));
    expect(share).toBeGreaterThan(0.08); // stems alone are 5–13% (Ryan et al. 1995)
    expect(share).toBeLessThan(0.35);
  });

  it("keeps the M6 sky patterns: edge trees lean out", () => {
    for (const r of runs) {
      expect(treeMetrics(r.world.trees[0] as Tree).centroidOffset).toBeLessThan(-1);
      expect(treeMetrics(r.world.trees[9] as Tree).centroidOffset).toBeGreaterThan(1);
    }
  });

  it("leaves pre-R1 presets on α·Q_base (R1 off: no costs, no deaths)", () => {
    const world = new World(presetParams("stand", 1));
    world.run(40);
    for (const t of world.trees) {
      expect(t.alive).toBe(true);
      expect(t.maintenance).toBe(0);
    }
  });
});
