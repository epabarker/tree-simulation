import { describe, expect, it } from "vitest";
import { defaultParams, mergeParams } from "../params.ts";
import { presetParams } from "../presets.ts";
import { BudState, Slot, Tree } from "../tree.ts";
import { World } from "../world.ts";
import { addBud, addMetamer } from "./c1-buds.ts";
import { gatherLight } from "./c3-allocation.ts";
import { depositArea, lightWeight, restingState } from "./r6-short-shoots.ts";

const on = mergeParams(defaultParams, { r6: { enabled: true, qMin: 0.3, leafArea: 2 } }).r6;
const off = defaultParams.r6;

describe("R6 short shoots (§R6, ADR 0006)", () => {
  it("rests a bud as a short shoot when lit enough, else dormant; always dormant when off", () => {
    expect(restingState(0.5, on)).toBe(BudState.shortShoot);
    expect(restingState(0.3, on)).toBe(BudState.shortShoot);
    expect(restingState(0.29, on)).toBe(BudState.dormant);
    expect(restingState(0.9, off)).toBe(BudState.dormant);
  });

  it("gives foliage by shoot type: active 1, short shoot a_ss, dormant none; 1 for all when off", () => {
    expect(depositArea(BudState.active, on)).toBe(1);
    expect(depositArea(BudState.shortShoot, on)).toBe(2);
    expect(depositArea(BudState.dormant, on)).toBe(0);
    for (const state of [BudState.active, BudState.dormant])
      expect(depositArea(state, off)).toBe(1);
    expect(lightWeight(BudState.shortShoot, on)).toBe(2);
    expect(lightWeight(BudState.dormant, on)).toBe(1);
  });

  it("weights a short shoot's light by its leaf area in the basipetal sum", () => {
    const t = new Tree(0, 10);
    const root = addMetamer(t, -1, Slot.main, Math.PI / 2, 1, 0.02, 0);
    addBud(t, root, Slot.main, Math.PI / 2, 0);
    addBud(t, root, Slot.left, Math.PI / 2, 1);
    const b = t.b.cols;
    b.q[0] = 0.5;
    b.q[1] = 0.4;
    b.state[1] = BudState.shortShoot;
    t.ensureScratch();
    gatherLight(t, on);
    expect(t.qBase).toBeCloseTo(0.5 + 2 * 0.4, 12);
    gatherLight(t, off);
    expect(t.qBase).toBeCloseTo(0.9, 12);
  });

  it("forms short shoots in a growing tree only when on, and they can still break", () => {
    const run = (enabled: boolean) => {
      const world = new World(
        mergeParams(presetParams("skyTree", 1), { r6: { enabled }, c5: { enabled: false } }),
      );
      let broke = 0;
      for (let s = 0; s < 30; s++) {
        const tree = world.trees[0] as Tree;
        const resting = new Set<number>();
        for (let i = 0; i < tree.b.length; i++)
          if (tree.b.cols.state[i] === BudState.shortShoot) resting.add(tree.b.cols.birthId[i]);
        world.step();
        const after = new Map<number, number>();
        for (let i = 0; i < tree.b.length; i++)
          after.set(tree.b.cols.birthId[i], tree.b.cols.state[i]);
        for (const id of resting) if (!after.has(id)) broke += 1; // consumed: with C5 off only growth consumes buds
      }
      const tree = world.trees[0] as Tree;
      let shortShoots = 0;
      for (let i = 0; i < tree.b.length; i++)
        if (tree.b.cols.state[i] === BudState.shortShoot) shortShoots += 1;
      return { shortShoots, broke };
    };
    expect(run(false).shortShoots).toBe(0);
    const r = run(true);
    expect(r.shortShoots).toBeGreaterThan(0);
    expect(r.broke).toBeGreaterThan(0);
  });
});
