import { describe, expect, it } from "vitest";
import { crownProfile, formMetrics, olsSlope } from "./form.ts";
import { defaultParams, mergeParams } from "./params.ts";
import { addBud, addMetamer } from "./principles/c1-buds.ts";
import { updateGirth } from "./principles/c6-girth.ts";
import { Slot, Tree } from "./tree.ts";

const UP = Math.PI / 2;
const params = mergeParams(defaultParams, { c6: { enabled: true } });

/** A trunk of `n` unit metamers with a left and a right horizontal lateral of length `len(k)` at node k. */
function crown(n: number, len: (k: number) => number): Tree {
  const t = new Tree(0, 50);
  const trunk: number[] = [];
  for (let k = 0; k < n; k++) {
    trunk.push(addMetamer(t, k === 0 ? -1 : (trunk[k - 1] as number), Slot.main, UP, 1, 1, 0));
  }
  for (let k = 0; k < n - 1; k++) {
    const l = len(k + 1);
    addMetamer(t, trunk[k] as number, Slot.left, Math.PI, l, 0.1, 0);
    addMetamer(t, trunk[k] as number, Slot.right, 0, l, 0.1, 0);
  }
  return t;
}

/** A straight chain of `n` metamers from `parent`, its first metamer of radius `r`. */
function chain(t: Tree, parent: number, slot: Slot, angle: number, n: number, r: number): number {
  let m = addMetamer(t, parent, slot, angle, 1, r, 0);
  const first = m;
  for (let k = 1; k < n; k++) m = addMetamer(t, m, Slot.main, angle, 1, r * 0.5, 0);
  return first;
}

describe("crown profile (M26)", () => {
  it("tells a column from a cone and an inverted cone", () => {
    const column = formMetrics(
      crown(20, () => 5),
      params,
    );
    const cone = formMetrics(
      crown(20, (k) => 20 - k),
      params,
    );
    const vase = formMetrics(
      crown(20, (k) => k),
      params,
    );
    expect(column.crownFullness).toBeGreaterThan(0.85);
    expect(column.profileCentre).toBeCloseTo(0.5, 1);
    expect(cone.widestAt).toBeLessThan(0.2);
    expect(cone.profileCentre).toBeLessThan(0.42);
    expect(cone.crownFullness).toBeLessThan(0.65);
    expect(vase.widestAt).toBeGreaterThan(0.8);
    expect(vase.profileCentre).toBeGreaterThan(0.58);
  });

  it("is normalised to its widest band", () => {
    const p = crownProfile(crown(20, (k) => 20 - k));
    expect(Math.max(...p)).toBe(1);
    expect(p.every((w) => w >= 0 && w <= 1)).toBe(true);
  });
});

describe("apical control (M26)", () => {
  /** A 10-metamer trunk of radius 1 with one 6-metamer limb at node 5 of base radius `r`. */
  function forked(r: number): Tree {
    const t = new Tree(0, 50);
    let m = -1;
    for (let k = 0; k < 10; k++) {
      m = addMetamer(t, m, Slot.main, UP, 1, 1, 0);
      if (k === 4) chain(t, m, Slot.right, UP - 0.4, 6, r);
    }
    return t;
  }

  it("finds the fork where a limb reaches 0.7 of the leader, and none below that", () => {
    const decurrent = forked(0.8);
    const f = formMetrics(decurrent, params);
    const height = Math.max(
      ...Array.from({ length: decurrent.m.length }, (_, i) => decurrent.tipY(i)),
    );
    expect(f.forkHeight).toBeCloseTo(5 / height, 9);
    expect(f.leaderDominance).toBeCloseTo(1 / 0.8, 9);
    const excurrent = formMetrics(forked(0.3), params);
    expect(excurrent.forkHeight).toBe(1);
    expect(excurrent.leaderDominance).toBeCloseTo(1 / 0.3, 9);
  });

  it("counts a trunk that ends under its laterals as a fork (sympodial)", () => {
    const t = new Tree(0, 50);
    let m = -1;
    for (let k = 0; k < 4; k++) m = addMetamer(t, m, Slot.main, UP, 1, 1, 0);
    chain(t, m, Slot.left, UP + 0.5, 6, 0.6);
    chain(t, m, Slot.right, UP - 0.5, 6, 0.6);
    const height = Math.max(...Array.from({ length: t.m.length }, (_, i) => t.tipY(i)));
    expect(formMetrics(t, params).forkHeight).toBeCloseTo(4 / height, 9);
  });
});

describe("§10 allometries (M26)", () => {
  it("recovers a length–diameter slope of 2/3 from limbs built to it", () => {
    const t = new Tree(0, 50);
    let m = -1;
    for (let k = 0; k < 12; k++) {
      m = addMetamer(t, m, Slot.main, UP, 1, 5, 0);
      const n = 5 + k; // limb length n, base diameter ∝ n^(3/2)
      chain(
        t,
        m,
        k % 2 === 0 ? Slot.left : Slot.right,
        k % 2 === 0 ? Math.PI : 0,
        n,
        0.01 * n ** 1.5,
      );
    }
    expect(formMetrics(t, params).ldSlope).toBeCloseTo(2 / 3, 9);
  });

  it("gives a leaf–section slope of 1 and Δ = 2 on a pipe-model tree", () => {
    const t = new Tree(0, 50);
    const grow = (parent: number, angle: number, depth: number): void => {
      const main = addMetamer(t, parent, Slot.main, angle, 1, 0, 0);
      if (depth === 0) {
        addBud(t, main, Slot.main, angle, 1);
        return;
      }
      grow(main, angle + 0.3, depth - 1);
      const side = addMetamer(t, main, Slot.right, angle - 0.5, 1, 0, 0);
      grow(side, angle - 0.5, depth - 1);
    };
    // Parent before child is kept: every call appends the children after their parent.
    grow(-1, UP, 6);
    t.ensureScratch();
    updateGirth(t, params);
    const f = formMetrics(t, params);
    expect(f.leafStemSlope).toBeCloseTo(1, 9);
    expect(f.junctionDelta).toBeCloseTo(params.c6.n, 6);
  });

  it("fits a least-squares slope and refuses too few points", () => {
    expect(olsSlope([1, 2, 3, 4, 5], [3, 5, 7, 9, 11])).toBeCloseTo(2, 12);
    expect(olsSlope([1, 2, 3], [1, 2, 3])).toBeNaN();
    expect(olsSlope([1, 1, 1, 1, 1], [1, 2, 3, 4, 5])).toBeNaN();
  });
});
