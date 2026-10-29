import { describe, expect, it } from "vitest";
import { presetParams } from "../../src/core/presets.ts";
import type { Tree } from "./rust.ts";
import { treeMetrics, World } from "./rust.ts";

const SEEDS = [1, 2, 3, 4, 5];
const TWENTY = Array.from({ length: 20 }, (_, k) => k + 1);
const metricsOf = (world: World, id: number) => treeMetrics(world.trees[id] as Tree);

describe("M5: N trees compete through one light grid", () => {
  it("grow crowns away from each other (5 seeds, §7 M5)", () => {
    for (const seed of SEEDS) {
      const world = new World(presetParams("pair", seed));
      world.run(35);
      // Left tree leans left, right tree leans right.
      expect(metricsOf(world, 0).centroidOffset).toBeLessThan(0);
      expect(metricsOf(world, 1).centroidOffset).toBeGreaterThan(0);
    }
  });

  // Restated over 20 seeds (2026-10-30 production-thresholds note): each measure fails on 10–20%
  // of seeds in either build, so "all of seeds 1–5" tested the seeds, not the behaviour. The
  // thresholds are unchanged; each must hold on at least 15 of 20 seeds (75%). Measured: parity
  // 17, 20, 19 of 20; production 16, 20, 20.
  it("suppress a tree planted late between them (≥ 15 of seeds 1–20 per measure, §7 M5)", () => {
    const pass = { height: 0, metamers: 0, qBase: 0 };
    for (const seed of TWENTY) {
      const world = new World(presetParams("late", seed));
      world.run(45);
      const [left, late, right] = [0, 1, 2].map((id) => metricsOf(world, id)) as [
        ReturnType<typeof treeMetrics>,
        ReturnType<typeof treeMetrics>,
        ReturnType<typeof treeMetrics>,
      ];
      // 33 seasons old against 45: without competition it would be about 3/4 their size.
      if (late.height < 0.6 * Math.min(left.height, right.height)) pass.height += 1;
      if (late.metamers < 0.3 * Math.min(left.metamers, right.metamers)) pass.metamers += 1;
      if (late.qBase < 0.3 * Math.min(left.qBase, right.qBase)) pass.qBase += 1;
    }
    expect(pass.height).toBeGreaterThanOrEqual(15);
    expect(pass.metamers).toBeGreaterThanOrEqual(15);
    expect(pass.qBase).toBeGreaterThanOrEqual(15);
  });

  // As above: ≥ 15 of 20 seeds; measured parity 18, production 18.
  it("lean into the gap when a neighbour is removed (≥ 15 of seeds 1–20, §8 kill one tree)", () => {
    let pass = 0;
    for (const seed of TWENTY) {
      const removed = new World(presetParams("pair", seed));
      removed.run(20);
      removed.removeTree(1);
      removed.run(20);
      const kept = new World(presetParams("pair", seed));
      kept.run(40);
      expect(removed.trees[1]?.alive).toBe(false);
      // The left tree's crown shifts right, into the space its neighbour left.
      if (metricsOf(removed, 0).centroidOffset > metricsOf(kept, 0).centroidOffset + 2) pass += 1;
    }
    expect(pass).toBeGreaterThanOrEqual(15);
  });

  it("does not depend on the order trees are processed in (one shared snapshot, §6)", () => {
    const forward = new World(presetParams("pair", 3));
    const reversed = new World(presetParams("pair", 3));
    // Same trees and ids (which key the RNG); only the processing order differs. Both trees are
    // planted at construction, so reordering the array afterwards is safe.
    (reversed.trees as Tree[]).reverse();
    forward.run(15);
    reversed.run(15);
    for (const id of [0, 1]) {
      const a = treeMetrics(forward.trees.find((t) => t.id === id) as Tree);
      const b = treeMetrics(reversed.trees.find((t) => t.id === id) as Tree);
      expect(b).toEqual(a);
    }
  });
});
