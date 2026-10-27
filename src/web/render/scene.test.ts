import { describe, expect, it } from "vitest";
import { presetParams } from "../../core/presets.ts";
import { SnapshotBuilder } from "../../core/snapshot.ts";
import type { Tree } from "../../core/tree.ts";
import { World } from "../../core/world.ts";
import { Scene } from "./scene.ts";

function sceneAfter(seasons: number): { scene: Scene; world: World } {
  const world = new World(presetParams("skyTree", 3));
  const builder = new SnapshotBuilder();
  const scene = new Scene();
  scene.setSize(800, 600, 1);
  scene.setSnapshot(builder.build(world, 0));
  for (let s = 0; s < seasons; s++) {
    world.step();
    scene.setSnapshot(builder.build(world, 0));
  }
  return { scene, world };
}

describe("Scene (shared by the WebGL2 and Canvas 2D renderers)", () => {
  const { scene, world } = sceneAfter(20);
  const tree = world.trees[0] as Tree;

  it("rebuilds the core's positions from angles and lengths at the end of a tween", () => {
    scene.computeGeometry(1);
    const g = scene.geom;
    for (let j = 0; j < tree.m.length; j++) {
      expect(g.tipX[j]).toBeCloseTo(tree.tipX(j), 3);
      expect(g.tipY[j]).toBeCloseTo(tree.tipY(j), 3);
    }
  });

  it("tapers each segment toward its thickest child, never widening", () => {
    scene.computeGeometry(1);
    const g = scene.geom;
    const s = scene.next;
    if (!s) throw new Error("no snapshot");
    for (let j = 0; j < s.metamerCount; j++) {
      expect(g.tipRadius[j]).toBeLessThanOrEqual(g.radius[j] + 1e-6);
      const p = s.parent[j];
      if (p >= 0)
        expect(g.tipRadius[p]).toBeGreaterThanOrEqual(Math.min(g.radius[p], g.radius[j]) - 1e-6);
    }
  });

  it("grows new metamers in from nothing at the start of a tween", () => {
    scene.computeGeometry(0);
    const s = scene.next;
    if (!s) throw new Error("no snapshot");
    let fresh = 0;
    for (let j = 0; j < s.metamerCount; j++) {
      if (s.prevIndex[j] >= 0) continue;
      fresh += 1;
      expect(scene.geom.grown[j]).toBe(0);
      expect(scene.geom.tipX[j]).toBeCloseTo(scene.geom.baseX[j], 6);
    }
    expect(fresh).toBeGreaterThan(0);
  });

  it("picks the tree under a branch and nothing in open sky", () => {
    scene.fit(true);
    scene.computeGeometry(1);
    expect(scene.pickTree(tree.tipX(0), tree.tipY(0) * 0.5)).toBe(0);
    expect(scene.pickTree(-500, 500)).toBeNull();
  });

  it("puts leaves only on young metamers, sized 0…1", () => {
    scene.computeGeometry(1);
    const leaves = scene.leaves(3, 1);
    const s = scene.next;
    if (!s) throw new Error("no snapshot");
    let young = 0;
    for (let j = 0; j < s.metamerCount; j++) if (s.age[j] <= 3) young += 1;
    expect(leaves.count).toBe(young);
    for (let k = 0; k < leaves.count; k++) {
      expect(leaves.size[k]).toBeGreaterThan(0);
      expect(leaves.size[k]).toBeLessThanOrEqual(1);
    }
  });
});
