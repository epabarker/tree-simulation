import { describe, expect, it } from "vitest";
import { allometry, pooledDbh } from "../cli/allometry.ts";

/** A vertical trunk of ten 1-cell metamers, radius shrinking upward, and two level side limbs at metamer 7. */
function tree() {
  const n = 12;
  const c = {
    parent: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 7],
    baseX: new Array(n).fill(10),
    baseY: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 8],
    baseZ: new Array(n).fill(32),
    hx: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, -1],
    hy: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    hz: new Array(n).fill(0),
    length: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 2],
    radius: [0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.02, 0.02],
  };
  // Live buds at the trunk's tip and both limbs' tips; a dead one (state 3) on metamer 4 is ignored.
  const b = { metamer: [9, 10, 11, 4], state: [1, 2, 5, 3] };
  return { c, b };
}

describe("Level 0 allometry (cli/allometry.ts)", () => {
  it("reads DBH at 1.3 m of stem length, height to the top, and the crown's half-extents", () => {
    const { c, b } = tree();
    const a = allometry(c, b);
    // 1.3 m = 5.2 cells: the sixth metamer (index 5) spans 5–6 cells of stem length.
    expect(a.dbh).toBeCloseTo(2 * 0.25 * 0.25, 12);
    expect(a.height).toBeCloseTo(10 * 0.25, 12);
    // Tips from the stem: +x 4 cells, −x 2, ±z 0 → mean 1.5 cells.
    expect(a.crownRadius).toBeCloseTo(1.5 * 0.25, 12);
    expect(a.maxOffset).toBeCloseTo(4 * 0.25, 12);
    expect(a.codominant).toBe(false);
  });

  it("flags a codominant stem below breast height", () => {
    const { c, b } = tree();
    // A side stem from the second metamer holding about as much wood as the trunk above it (0.5 vs 0.51).
    c.parent.push(1);
    c.baseX.push(10);
    c.baseY.push(2);
    c.baseZ.push(32);
    c.hx.push(0.6);
    c.hy.push(0.8);
    c.hz.push(0);
    c.length.push(8);
    c.radius.push(0.25);
    expect(allometry(c, b).codominant).toBe(true);
  });
});

/** Appends a metamer to `c`: its parent, base (cells), heading, length (cells) and radius (cells). */
function grow(
  c: ReturnType<typeof tree>["c"],
  parent: number,
  base: [number, number, number],
  h: [number, number, number],
  length: number,
  radius: number,
): number {
  c.parent.push(parent);
  c.baseX.push(base[0]);
  c.baseY.push(base[1]);
  c.baseZ.push(base[2]);
  c.hx.push(h[0]);
  c.hy.push(h[1]);
  c.hz.push(h[2]);
  c.length.push(length);
  c.radius.push(radius);
  return c.length.length - 1;
}

// ADR 0067 decision 2: D at 1.3 m, a codominant fork below it pooled as √Σd² (Tallo's convention).
describe("the pooled DBH (cli/allometry.ts pooledDbh)", () => {
  it("is the trunk's DBH on a single stem with minor limbs", () => {
    const { c } = tree();
    // The sixth metamer spans 1.25–1.5 m of stem length: radius 0.25 cells → 0.125 m.
    expect(pooledDbh(c)).toEqual({ dbh: 0.125, stems: 1 });
  });

  /** A side stem of three 2-cell metamers, radii 0.26, 0.22, 0.18 (r²·l 0.297), from metamer `from`. */
  function sideStem(c: ReturnType<typeof tree>["c"], from: number): void {
    let p = from;
    let y = (c.baseY[from] as number) + 1;
    for (const r of [0.26, 0.22, 0.18]) {
      p = grow(c, p, [10, y, 32], [0, 1, 0], 2, r);
      y += 2;
    }
  }

  it("pools a codominant fork below 1.3 m as √Σd²", () => {
    const { c, b } = tree();
    // From metamer 1 (0.5 m of stem below it): the trunk above holds r²·l 0.512, the side 0.297 (≥ half,
    // less than all). The side stem's second metamer spans 1.0–1.5 m: radius 0.22 cells → 0.11 m.
    sideStem(c, 1);
    expect(allometry(c, b).dbh).toBeCloseTo(0.125, 12);
    const p = pooledDbh(c);
    expect(p.stems).toBe(2);
    expect(p.dbh).toBeCloseTo(Math.sqrt(0.125 ** 2 + 0.11 ** 2), 12);
  });

  it("does not pool a fork above 1.3 m", () => {
    const { c, b } = tree();
    // From metamer 6 (1.75 m of stem below it): the side outweighs the trunk above and continues it,
    // but past breast height either way.
    sideStem(c, 6);
    expect(allometry(c, b).codominant).toBe(false);
    expect(pooledDbh(c)).toEqual({ dbh: 0.125, stems: 1 });
  });

  it("does not pool a minor side branch below 1.3 m", () => {
    const { c, b } = tree();
    // From metamer 1: r²·l 0.005, a hundredth of the trunk above.
    grow(c, 1, [10, 2, 32], [1, 0, 0], 2, 0.05);
    expect(allometry(c, b).codominant).toBe(false);
    expect(pooledDbh(c)).toEqual({ dbh: 0.125, stems: 1 });
  });
});
