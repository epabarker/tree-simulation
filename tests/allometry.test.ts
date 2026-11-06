import { describe, expect, it } from "vitest";
import { allometry } from "../cli/allometry.ts";

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
