/** The garden's plate (I3): its width, its recruits and the frame of a young garden. */
import { describe, expect, it } from "vitest";
import { productionWorld } from "../../tests/production-world.ts";
import { forestParams, presetParams } from "../core/presets.ts";
import { PLATE_HEIGHT, PLATE_MAX, PLATE_MIN, plateWidth } from "./plate.ts";
import { Scene, WORLD_ZOOM_MAX } from "./render/scene.ts";

describe("the garden's plate (I3)", () => {
  it("sizes the ring so the canvas shows PLATE_HEIGHT cells under the headroom, within the cap", () => {
    expect(PLATE_MAX).toBe(170);
    // The phone (garden.html's 140 px headroom): 140 × 390 / (844 − 18 − 140) cells.
    expect(plateWidth(390, 844, 140)).toBeCloseTo((PLATE_HEIGHT * 390) / 686, 9);
    expect(plateWidth(390, 844, 140)).toBeGreaterThan(PLATE_MIN);
    // The default headroom is the lab's title and hint.
    expect(plateWidth(400, 600)).toBeCloseTo((PLATE_HEIGHT * 400) / (600 - 18 - 52), 9);
    // A laptop and the site's wide plate would want more than the memory budget allows.
    expect(plateWidth(1440, 900, 140)).toBe(PLATE_MAX);
    expect(plateWidth(1200, 624, 140)).toBe(PLATE_MAX);
    expect(plateWidth(8000, 400)).toBe(PLATE_MAX);
    // A tall, narrow host still gets a few trees.
    expect(plateWidth(100, 2000)).toBe(PLATE_MIN);
    for (const [w, h] of [
      [390, 844],
      [1440, 900],
      [1200, 624],
      [3000, 600],
    ] as const) {
      expect(plateWidth(w, h)).toBeLessThanOrEqual(PLATE_MAX);
      expect(plateWidth(w, h)).toBeGreaterThanOrEqual(PLATE_MIN);
    }
  });

  it("plants one row down the slab's middle, a tree every 28 cells, recruits over the whole depth", () => {
    const p = forestParams(66, 1);
    const D = p.world.depth ?? 64;
    expect(p.trees).toHaveLength(2);
    expect(forestParams(160, 1).trees).toHaveLength(6);
    expect(p.trees.every((t) => t.z === D / 2)).toBe(true);
    // No establishment band (ADR 0063, decision 4): recruits use the whole depth.
    expect("band" in p.o4).toBe(false);
    // Recruits per cell of width: a quarter of the ring's 300 on 210 cells (the garden's clutter).
    expect(forestParams(210, 1).o4.maxTrees).toBe(75);
    expect(p.o4.maxTrees).toBe(24);
    expect(forestParams(160, 1).o4.maxTrees).toBe(57);
    expect(forestParams(160, 1, { recruits: 1 }).o4.maxTrees).toBe(229);
    expect(forestParams(66, 1, { recruits: 0.5 }).o4.maxTrees).toBe(47);
    expect(presetParams("mixedWood").o4.maxTrees).toBe(300);
  });

  it("plants rows across the depth when asked, staggered", () => {
    const p = forestParams(66, 1, { rows: 3, spacing: 22 });
    expect(p.trees).toHaveLength(9);
    expect(new Set(p.trees.map((t) => t.z)).size).toBe(3);
    expect(p.o4.maxTrees).toBe(71);
  });

  it("frames a young garden for half the plate's height, not half the 200-cell top", () => {
    const params = forestParams(66, 10);
    expect(params.world.height).toBe(200);
    const s = productionWorld(params).snapshot(0, { junctions: false, field: false });
    const fitted = (frameHeight: number, width: number, height: number): number => {
      const scene = new Scene();
      scene.setSize(width, height, 1);
      scene.frame = "world";
      scene.frameHeight = frameHeight;
      scene.setSnapshot(s);
      scene.fit(true);
      return scene.camera.scale;
    };
    const half = 0.5 * PLATE_HEIGHT;
    const fitH = 900 - 18 - 52; // the lab's headroom
    // The half plate decides while it is within WORLD_ZOOM_MAX laps: 10 px a cell across the ring.
    expect(fitted(half, 660, 900)).toBeCloseTo(fitH / half, 6);
    expect(fitted(0, 660, 900)).toBeCloseTo(10, 6); // half the world (100 cells) would fall below one lap
    // Beyond it the frame closes in no further: a ring seen across 330 px is 5 px a cell.
    expect(fitted(half, 330, 900)).toBeCloseTo(5 * WORLD_ZOOM_MAX, 6);
  });

  it("never shows the ring twice: crowns taller than the canvas crop at the top", () => {
    const params = forestParams(66, 10);
    const world = productionWorld(params);
    world.step(60);
    const s = world.snapshot(0, { junctions: false, field: false });
    const scene = new Scene();
    // Short and wide: one lap fits the width, the crowns do not fit the height.
    scene.setSize(1000, 300, 1);
    scene.frame = "world";
    scene.frameHeight = 0.5 * PLATE_HEIGHT;
    scene.setSnapshot(s);
    scene.fit(true);
    expect(scene.camera.scale).toBeCloseTo(1000 / s.width, 9);
    expect(scene.camera.cx).toBe(s.width / 2);
    // The camera sees exactly one lap, so the copies either side lie outside the canvas.
    const [left] = scene.worldToScreen(0, 0);
    const [right] = scene.worldToScreen(s.width, 0);
    expect(left).toBeCloseTo(0, 6);
    expect(right).toBeCloseTo(1000, 6);
  });
});
