import { describe, expect, it } from "vitest";
import {
  LEAF_SHAPES,
  LEAF_STYLES,
  leafProfile,
  leafStudyPath,
  palmateRadius,
} from "./leaf-styles.ts";

describe("leaf styles (M23)", () => {
  it("gives every style a known outline, smaller leaves for smaller-leaved species", () => {
    for (const style of Object.values(LEAF_STYLES)) expect(LEAF_SHAPES).toContain(style.shape);
    // Real leaf lengths: birch ≈ 5 cm < beech ≈ 8 < oak ≈ 10.
    expect(LEAF_STYLES.small.length).toBeLessThan(LEAF_STYLES.beech.length);
    expect(LEAF_STYLES.beech.length).toBeLessThan(LEAF_STYLES.oak.length);
  });

  it("keeps every outline within the leaf's box, closed at base and tip", () => {
    for (const shape of LEAF_SHAPES) {
      if (shape === "palmate") continue;
      for (let i = 0; i <= 200; i++) {
        const w = leafProfile(shape, i / 200);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1.35);
      }
      expect(leafProfile(shape, 1)).toBeLessThan(0.1);
    }
    for (let i = 0; i < 100; i++) {
      const r = palmateRadius((2 * Math.PI * i) / 100);
      expect(r).toBeGreaterThanOrEqual(0.55);
      expect(r).toBeLessThanOrEqual(1);
    }
  });

  it("draws a leaf study inside its 100 × 100 box, stalk at the foot (M24)", () => {
    for (const style of Object.values(LEAF_STYLES)) {
      const path = leafStudyPath(style);
      expect(path.startsWith("M50 99L50 92L")).toBe(true);
      expect(path.endsWith("Z")).toBe(true);
      for (const n of path.slice(1, -1).split(/[ L]/).map(Number)) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });
});
