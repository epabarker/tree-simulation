import { describe, expect, it } from "vitest";
import { presetParams } from "../src/core/presets.ts";
import { hashWorld, loadWorld, saveWorld, World } from "./world.ts";

describe("world checkpoints (M21)", () => {
  it("restores at season N so that k more seasons match N + k from scratch", () => {
    // The home woodland: species, storms, recruits, R1–R6; and a fell and a sown seed queued.
    for (const seed of [1]) {
      const params = presetParams("succession", seed);
      const straight = new World(params);
      straight.run(20);
      straight.removeTree(3);
      straight.plantTree(100.5);
      const saved = saveWorld(straight);
      straight.run(10);

      const restored = loadWorld(saved);
      expect(restored.season).toBe(20);
      restored.run(10);
      expect(hashWorld(restored)).toBe(hashWorld(straight));
      expect(restored.record().events).toEqual(straight.record().events);
    }
  });

  it("restores a single-species stand after a light-model change too", () => {
    const params = presetParams("skyStand", 3);
    const straight = new World(params);
    straight.setParams({ world: { ...params.world, faces: [1, 0.2] } });
    straight.run(12);
    const restored = loadWorld(saveWorld(straight));
    straight.run(6);
    restored.run(6);
    expect(hashWorld(restored)).toBe(hashWorld(straight));
  });

  it("keeps text beyond ASCII in the header (a species label, say)", () => {
    const base = presetParams("succession", 1);
    const birch = base.species?.birch as NonNullable<typeof base.species>[string];
    const world = new World({
      ...base,
      species: { ...base.species, birch: { ...birch, common: "Bouleau verruqueux – é" } },
    });
    world.run(3);
    expect(loadWorld(saveWorld(world)).params.species?.birch?.common).toBe(
      "Bouleau verruqueux – é",
    );
  });
});
