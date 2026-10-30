/** The garden's plate (I3): its width, its recruits and the frame of a young garden. */
import { describe, expect, it } from "vitest";
import { productionWorld } from "../../tests/production-world.ts";
import { forestParams, presetParams } from "../core/presets.ts";
import { PLATE_HEIGHT, PLATE_MAX, plateWidth } from "./plate.ts";
import { Scene } from "./render/scene.ts";

describe("the garden's plate (I3)", () => {
  it("caps the ring's width at PLATE_MAX for any aspect", () => {
    expect(PLATE_MAX).toBe(160);
    for (const [w, h] of [
      [390, 844],
      [1440, 900],
      [1200, 624],
      [3000, 600],
      [8000, 400],
    ] as const) {
      expect(plateWidth(w, h)).toBeLessThanOrEqual(PLATE_MAX);
    }
    expect(plateWidth(8000, 400)).toBe(PLATE_MAX);
    expect(plateWidth(1000, 900)).toBeCloseTo(PLATE_HEIGHT * (1000 / 900) * 0.7, 9);
    expect(plateWidth(1200, 624)).toBe(PLATE_MAX); // the site's wide plate: 175 cells before the cap
  });

  it("plants one row down the slab's middle, a tree every 21 cells, recruits kept to its band", () => {
    const p = forestParams(66, 1);
    const D = p.world.depth ?? 64;
    expect(p.trees).toHaveLength(3);
    expect(p.trees.every((t) => t.z === D / 2)).toBe(true);
    expect(p.o4.band).toBe(21);
    // Recruits per cell of width: the ring's 300 on 210 cells.
    expect(forestParams(210, 1).o4.maxTrees).toBe(300);
    expect(p.o4.maxTrees).toBe(94);
    expect(forestParams(160, 1).o4.maxTrees).toBe(229);
    expect(forestParams(66, 1, { recruits: 0.5 }).o4.maxTrees).toBe(47);
    expect(presetParams("mixedWood").o4.maxTrees).toBe(300);
    expect(presetParams("mixedWood").o4.band).toBeUndefined();
  });

  it("plants rows across the depth when asked, staggered, the band widening with them", () => {
    const p = forestParams(66, 1, { rows: 3, spacing: 22 });
    expect(p.trees).toHaveLength(9);
    expect(new Set(p.trees.map((t) => t.z)).size).toBe(3);
    expect(p.o4.band).toBe(64);
    expect(p.o4.maxTrees).toBe(283);
  });

  it("frames a young garden for half the plate's height (65 cells), not half the 200-cell top", () => {
    const params = forestParams(66, 10);
    expect(params.world.height).toBe(200);
    const s = productionWorld(params).snapshot(0, { junctions: false, field: false });
    const fitted = (frameHeight: number): number => {
      const scene = new Scene();
      // Wide and short, so the height decides the scale: (400 − 18 − 52) px over the span.
      scene.setSize(4000, 400, 1);
      scene.frame = "world";
      scene.frameHeight = frameHeight;
      scene.setSnapshot(s);
      scene.fit(true);
      return 330 / scene.camera.scale;
    };
    expect(fitted(0.5 * PLATE_HEIGHT)).toBeCloseTo(65, 6);
    expect(fitted(0)).toBeCloseTo(100, 6);
  });
});
