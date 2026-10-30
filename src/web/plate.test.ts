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

  it("scales the recruits with the ground's area: 300 on the ring's 210 cells, 94 on a phone's 66", () => {
    expect(forestParams(210, 1).o4.maxTrees).toBe(300);
    expect(forestParams(66, 1).o4.maxTrees).toBe(94);
    expect(forestParams(160, 1).o4.maxTrees).toBe(229);
    expect(forestParams(54, 1).o4.maxTrees).toBeGreaterThanOrEqual(20);
    expect(presetParams("mixedWood").o4.maxTrees).toBe(300);
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
