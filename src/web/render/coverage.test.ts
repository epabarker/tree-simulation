import { describe, expect, it } from "vitest";
import { cellCoverage, isLeafPixel } from "./coverage.ts";
import { DEPTH_SLICES, type Leaves } from "./scene.ts";

function leavesAt(points: [number, number][], fallen = 0): Leaves {
  const n = points.length + fallen;
  const l = {
    count: n,
    slices: new Int32Array(DEPTH_SLICES + 1).fill(points.length),
    x: new Float32Array(n),
    y: new Float32Array(n),
    ux: new Float32Array(n),
    uy: new Float32Array(n),
    size: new Float32Array(n).fill(1),
    color: new Uint8Array(n),
    turn: new Float32Array(n),
    palette: new Uint8Array(n),
    shape: new Uint8Array(n),
    aspect: new Float32Array(n),
  };
  l.slices[0] = 0;
  points.forEach(([x, y], k) => {
    l.x[k] = x;
    l.y[k] = y;
  });
  return l;
}

describe("foliage coverage (I3 step 4)", () => {
  it("counts covered cells per canopy half and leaves per covered cell, wrapping on a ring", () => {
    // Top at 9.5: the lower half is y < 4 (4 rows), the upper 4 … 9 (6 rows); 10 cells wide.
    const c = cellCoverage(
      leavesAt(
        [
          [1.2, 1.5],
          [1.7, 1.2],
          [12.5, 2.5], // wraps to x 2
          [5, 9.5],
        ],
        3, // falling leaves after the crowns' are left out
      ),
      10,
    );
    expect(c.leaves).toBe(4);
    expect(c.coverLow).toBeCloseTo(2 / 40, 3);
    expect(c.perCellLow).toBe(1.5);
    expect(c.coverHigh).toBeCloseTo(1 / 60, 3);
    expect(c.perCellHigh).toBe(1);
  });

  it("tells a leaf's green from the sky, the bark and the ground", () => {
    expect(isLeafPixel(0x35, 0x50, 0x2a)).toBe(true); // --leaf-shade
    expect(isLeafPixel(0x17, 0x33, 0x1f)).toBe(true); // holly
    for (const [r, g, b] of [
      [0xcf, 0xe2, 0xee], // sky top
      [0xf4, 0xef, 0xe2], // sky bottom
      [0x0e, 0x16, 0x21], // dark sky
      [0xe9, 0xe6, 0xde], // birch bark
      [0x9f, 0xa3, 0x9a], // holly bark
      [0x8f, 0x7d, 0x58], // ground
    ])
      expect(isLeafPixel(r as number, g as number, b as number)).toBe(false);
  });
});
