import { describe, expect, it } from "vitest";
import { epicormic } from "../../cli/trials.ts";
import { mergeParams, type ParamsPatch } from "../../src/core/params.ts";
import { presetParams } from "../../src/core/presets.ts";
import type { Tree } from "../world.ts";
import { type TreeMetrics, treeMetrics, World } from "../world.ts";

// M10 visible test (§7, ADR 0012): an epicormic flush after a neighbour is felled, and slender
// stand trees. The sky presets carry R4 and R5. 5 seeds.
const SEEDS = [1, 2, 3, 4, 5];
const FELL = 50;
const WINDOW = 6;
const NO_R5 = { r5: { enabled: false } } satisfies ParamsPatch;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

/** Epicormic shoots on the felled tree's two neighbours (3 and 5) in the seasons after felling. */
function flush(seed: number, fell: boolean, patch: ParamsPatch = {}): number {
  const world = new World(mergeParams(presetParams("skyStand", seed), patch));
  for (let s = 0; s < FELL + WINDOW; s++) {
    if (fell && s === FELL) world.removeTree(4); // takes effect in season FELL
    world.step();
  }
  return [3, 5].reduce((n, k) => n + epicormic(world.trees[k] as Tree, FELL, FELL + WINDOW - 1), 0);
}

function slenderness(preset: "skyStand" | "skyTree", seed: number, patch: ParamsPatch) {
  const world = new World(mergeParams(presetParams(preset, seed), patch));
  world.run(FELL);
  const trees = preset === "skyStand" ? world.trees.slice(1, 9) : world.trees;
  return trees.map((t) => treeMetrics(t, world)).map((m: TreeMetrics) => m.slenderness);
}

describe("M10: dormancy, release and shade avoidance (§R4, §R5, ADR 0012)", () => {
  it("flushes epicormic shoots on the neighbours' trunks after a tree is felled", () => {
    const felled = SEEDS.map((s) => flush(s, true));
    const control = SEEDS.map((s) => flush(s, false));
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    // Measured: 64 against 22 (10 seeds: 143 against 39).
    expect(sum(felled)).toBeGreaterThan(2 * sum(control));
    expect(sum(felled)).toBeGreaterThan(40);
    // Without R4 (no bud bank, no light release) dormant trunk buds never break.
    const noR4 = SEEDS.map((s) => flush(s, true, { r4: { enabled: false } }));
    expect(sum(noR4)).toBe(0);
  });

  it("makes stand trees slenderer (H/D in the 60–80 target), open-grown ones stay squat", () => {
    const stand = median(SEEDS.flatMap((s) => slenderness("skyStand", s, {})));
    const standOff = median(SEEDS.flatMap((s) => slenderness("skyStand", s, NO_R5)));
    const open = median(SEEDS.flatMap((s) => slenderness("skyTree", s, {})));
    // Measured: 73 against 58 without R5; open-grown 48.
    expect(stand).toBeGreaterThan(1.1 * standOff);
    expect(stand).toBeGreaterThan(60);
    expect(stand).toBeLessThan(85);
    expect(open).toBeLessThan(0.75 * stand);
  });
});
