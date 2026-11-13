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

  it("is the 0062/0063 garden: a periodic depth, planted per area, the two-part mortality", () => {
    for (const p of [forestParams(160, 1), forestParams(66, 3), presetParams("mixedWood")]) {
      // ADR 0062, decision 3: beyond each face lies the stand's own depth, D kept at 64.
      expect(p.world.sidesZ).toBe("periodic");
      expect(p.world.depth).toBe(64);
      expect(p.world.faceWood ?? 0).toBe(0);
      // ADR 0063: density from establishment and the two-part mortality, no band.
      expect(p.o4.mortality).toBe("twoPart");
      // The probed schedule (experiments/2026-11-10-garden-schedule.md): a canopy rate a third of
      // the bare params' 0.01, the other rates at their defaults.
      expect(p.o4.mCanopy).toBe(0.003);
      expect([p.o4.hCanopy, p.o4.gammaCanopy, p.o4.mSuppression]).toEqual([120, 2, 1]);
      expect(p.o4.suppressionSlope).toBe(0.92);
      expect("band" in p.o4).toBe(false);
      expect(p.o4.planting?.density).toBe(400);
      // Today's mix (user story 29), cycled by the seed in the core.
      expect(p.o4.planting?.species).toEqual([
        "birch",
        "oak",
        "willow",
        "beech",
        "birch",
        "hornbeam",
        "rowan",
        "birch",
        "holly",
        "maple",
      ]);
      // The planting replaces the row: no misleading `trees` left beside it.
      expect(p.trees).toEqual([]);
    }
  });

  it("plants about 400 saplings a hectare over the whole width × depth at every width", () => {
    // 160 × 64 cells at 0.25 m is 0.064 ha: 26 saplings; 66 × 64 is 0.0264 ha: 11.
    for (const [width, n] of [
      [160, 26],
      [66, 11],
    ] as const) {
      for (const seed of [1, 2, 3]) {
        const world = productionWorld(forestParams(width, seed));
        const trees = world.trees;
        expect(trees).toHaveLength(n);
        // Spread over the depth, not one row down the middle.
        const zs = trees.map((t) => t.rootZ);
        expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(32);
        world.dispose();
      }
    }
  });

  it("keeps the cap a guard well above the planting, the same per area at every width", () => {
    const at160 = forestParams(160, 1).o4.maxTrees;
    const at66 = forestParams(66, 1).o4.maxTrees;
    expect(at160).toBeGreaterThan(2 * 26);
    expect(at160 / 160).toBeCloseTo(at66 / 66, 1);
  });

  it("leaves the superseded faceWood off and bit-identical (ADR 0062, decision 7)", () => {
    const hashOf = (p: ReturnType<typeof forestParams>) => {
      const world = productionWorld(p);
      world.step(4);
      const h = world.hash();
      world.dispose();
      return h;
    };
    for (const p of [forestParams(66, 1, { faces: "woodEdge" }), presetParams("skyStand")]) {
      expect(hashOf({ ...p, world: { ...p.world, faceWood: 0 } })).toBe(hashOf(p));
    }
  });

  it("keeps the wood-edge and hedgerow faces selectable for a host page (ADR 0062, decision 5)", () => {
    const edge = forestParams(160, 1, { faces: "woodEdge" });
    expect(edge.world.sidesZ).toBe("open");
    expect(edge.world.faces).toEqual([1, 0.2]);
    const hedge = forestParams(66, 1, { faces: "hedgerow" });
    expect(hedge.world.sidesZ).toBe("open");
    expect(hedge.world.faces).toEqual([1, 1]);
    // An open-faced garden still runs, and differs from the periodic one.
    const hashes = [forestParams(66, 1), hedge, forestParams(66, 1, { faces: "woodEdge" })].map(
      (p) => {
        const world = productionWorld(p);
        world.step(3);
        const h = world.hash();
        world.dispose();
        return h;
      },
    );
    expect(new Set(hashes).size).toBe(3);
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
