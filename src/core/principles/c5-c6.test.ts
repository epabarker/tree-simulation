import { describe, expect, it } from "vitest";
import { defaultParams, mergeParams } from "../params.ts";
import { presetParams } from "../presets.ts";
import { BudState, Slot, Tree } from "../tree.ts";
import { World } from "../world.ts";
import { addBud, addMetamer } from "./c1-buds.ts";
import { shedBranches } from "./c5-shedding.ts";
import { junctionExponents, updateGirth } from "./c6-girth.ts";

const params = mergeParams(defaultParams, {
  c5: { enabled: true, T: 0.1, g: 2 },
  c6: { enabled: true },
});
const UP = Math.PI / 2;

/** root → (main continuation, lateral → lateral's continuation), with a bud on each tip. */
function smallTree(): Tree {
  const t = new Tree(0, 10);
  const r0 = params.c6.r0;
  const root = addMetamer(t, -1, Slot.main, UP, 1, r0, 0);
  const main = addMetamer(t, root, Slot.main, UP, 1, r0, 0);
  const lat = addMetamer(t, root, Slot.right, UP - 0.7, 1, r0, 0);
  const latTip = addMetamer(t, lat, Slot.main, UP - 0.7, 1, r0, 0);
  addBud(t, main, Slot.main, UP, 0);
  addBud(t, latTip, Slot.main, UP - 0.7, 1);
  t.ensureScratch();
  return t;
}

describe("C6 pipe girth with memory (§C6)", () => {
  it("adds r^n of the children and scars at each node; tips have r0", () => {
    const t = smallTree();
    updateGirth(t, params);
    const { radius } = t.m.cols;
    const r0 = params.c6.r0;
    expect(radius[1]).toBeCloseTo(r0, 12); // main tip
    expect(radius[3]).toBeCloseTo(r0, 12); // lateral tip
    expect(radius[2]).toBeCloseTo(r0, 12); // lateral base: one child
    expect(radius[0]).toBeCloseTo(Math.sqrt(2) * r0, 12); // n = 2: r² = r0² + r0²
    expect(junctionExponents(t)).toEqual([expect.closeTo(params.c6.n, 6)]);
  });

  it("never decreases a radius (memory)", () => {
    const t = smallTree();
    t.m.cols.radius[0] = 1;
    updateGirth(t, params);
    expect(t.m.cols.radius[0]).toBe(1);
  });
});

describe("C5 self-pruning (§C5)", () => {
  it("sheds a dim lateral with its subtree, leaves a scar and remaps indices", () => {
    const t = smallTree();
    const c = t.m.cols;
    // Lateral subtree (rows 2–3) gathered almost no light; the main axis is bright.
    c.qSum[2] = 0.05;
    c.nSum[2] = 2;
    c.qSum[1] = 1;
    c.nSum[1] = 1;
    updateGirth(t, params);
    const lateralR = c.radius[2];
    const removed = shedBranches(t, params, 5, t.m.length);
    expect(removed).toBe(2);
    expect(t.m.length).toBe(2);
    expect(Array.from(t.m.cols.parent.subarray(0, 2))).toEqual([-1, 0]);
    expect(t.m.cols.scarSumN[0]).toBeCloseTo(lateralR ** params.c6.n, 12);
    // The lateral's bud is gone; the main tip's bud now points at row 1.
    const b = t.b.cols;
    const live = [0, 1].filter((j) => b.state[j] !== BudState.gone);
    expect(live).toHaveLength(1);
    expect(b.metamer[live[0] as number]).toBe(1);
    // Girth below the scar does not shrink.
    const before = t.m.cols.radius[0];
    updateGirth(t, params);
    expect(t.m.cols.radius[0]).toBeCloseTo(before, 12);
  });

  it("respects the grace period g", () => {
    const t = smallTree();
    t.m.cols.qSum[2] = 0;
    t.m.cols.nSum[2] = 2;
    expect(shedBranches(t, params, 1, t.m.length)).toBe(0); // age 1 < g = 2
  });
});

const SEEDS = [1, 2, 3, 4, 5];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("M4: shedding and girth on growing trees", () => {
  it("never thins any metamer from one season to the next", () => {
    const world = new World(presetParams("pruned"));
    let prev = new Map<number, number>();
    for (let s = 0; s < 30; s++) {
      world.step();
      const t = world.trees[0] as Tree;
      const next = new Map<number, number>();
      for (let i = 0; i < t.m.length; i++) {
        const id = t.m.cols.birthId[i];
        const r = t.m.cols.radius[i];
        const before = prev.get(id);
        if (before !== undefined) expect(r).toBeGreaterThanOrEqual(before);
        next.set(id, r);
      }
      prev = next;
    }
  });

  it("gives Δ = n at every junction when nothing is shed (§10)", () => {
    const world = new World(mergeParams(presetParams("pruned"), { c5: { enabled: false } }));
    world.run(25);
    const deltas = junctionExponents(world.trees[0] as Tree);
    expect(deltas.length).toBeGreaterThan(20);
    for (const d of deltas) expect(d).toBeCloseTo(world.params.c6.n, 5);
  });

  it("clears the interior and does not lower the crown base (5 seeds, §8 C5 ablation)", () => {
    const run = (c5: boolean, seed: number) => {
      const world = new World(mergeParams(presetParams("pruned", seed), { c5: { enabled: c5 } }));
      let shed = 0;
      for (let s = 0; s < 40; s++) {
        world.step();
        shed += (world.trees[0] as Tree).shedCount;
      }
      const t = world.trees[0] as Tree;
      let bole = Number.POSITIVE_INFINITY;
      const c = t.m.cols;
      for (let i = 0; i < t.m.length; i++) {
        const p = c.parent[i];
        if (c.order[i] === 1 && p >= 0 && c.order[p] === 0) bole = Math.min(bole, c.baseY[i]);
      }
      return { metamers: t.m.length, shed, bole };
    };
    const on = SEEDS.map((s) => run(true, s));
    const off = SEEDS.map((s) => run(false, s));
    for (const r of on) expect(r.shed).toBeGreaterThan(0);
    expect(mean(on.map((r) => r.metamers))).toBeLessThan(mean(off.map((r) => r.metamers)));
    expect(mean(on.map((r) => r.bole))).toBeGreaterThanOrEqual(mean(off.map((r) => r.bole)));
  });
});
