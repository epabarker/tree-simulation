import { describe, expect, it } from "vitest";
import { hashWorld } from "../hash.ts";
import { mergeParams, type Obstacle } from "../params.ts";
import { presetParams } from "../presets.ts";
import type { Tree } from "../tree.ts";
import { World } from "../world.ts";
import { insideObstacle } from "./obstacles.ts";

/** Tips of every live tree's metamers that lie inside an obstacle. */
function tipsInside(world: World): number {
  let n = 0;
  for (const t of world.trees) {
    if (!t.alive) continue;
    for (let i = 0; i < t.m.length; i++) {
      if (insideObstacle(world.params, t.tipX(i), t.tipY(i))) n++;
    }
  }
  return n;
}

const height = (t: Tree): number => {
  let h = 0;
  for (let i = 0; i < t.m.length; i++) h = Math.max(h, t.tipY(i));
  return h;
};

describe("obstacles (ADR 0015)", () => {
  it("tests points against rectangles, wrapping x on a ring", () => {
    const ring = presetParams("forest");
    const p = mergeParams(ring, {
      world: { ...ring.world, obstacles: [{ x: 205, y: 10, width: 10, height: 5 }] },
    });
    expect(insideObstacle(p, 207, 12)).toBe(true);
    expect(insideObstacle(p, 3, 12)).toBe(true); // wrapped past the seam
    expect(insideObstacle(p, 6, 12)).toBe(false);
    expect(insideObstacle(p, 207, 15)).toBe(false); // top edge is open
    expect(insideObstacle(presetParams("skyTree"), 60, 10)).toBe(false); // none
  });

  it("keeps growth out: no tip ever enters, and the tree grows around and past it (5 seeds)", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const base = presetParams("skyTree", seed);
      const block: Obstacle = { x: 52, y: 18, width: 16, height: 8 };
      const world = new World(mergeParams(base, { world: { ...base.world, obstacles: [block] } }));
      for (let s = 0; s < 45; s++) {
        world.step();
        expect(tipsInside(world)).toBe(0);
      }
      expect(height(world.trees[0] as Tree)).toBeGreaterThan(block.y + block.height + 5);
    }
  });

  it("clears branches when an obstacle appears over a grown crown, and changes nothing without one", () => {
    const base = presetParams("skyTree", 2);
    const plain = new World(base);
    const covered = new World(base);
    plain.run(35);
    covered.run(35);
    expect(hashWorld(covered)).toBe(hashWorld(plain)); // no obstacles: identical
    const before = (covered.trees[0] as Tree).m.length;
    covered.setParams({
      world: { ...base.world, obstacles: [{ x: 40, y: 25, width: 40, height: 15 }] },
    });
    covered.step();
    const tree = covered.trees[0] as Tree;
    expect(tipsInside(covered)).toBe(0);
    expect(tree.alive).toBe(true);
    expect(tree.m.length).toBeLessThan(before);
  });

  it("kills a tree whose base an obstacle covers", () => {
    const base = presetParams("skyTree", 1);
    const world = new World(base);
    world.run(10);
    world.setParams({
      world: { ...base.world, obstacles: [{ x: 55, y: 0, width: 10, height: 3 }] },
    });
    world.step();
    expect((world.trees[0] as Tree).alive).toBe(false);
  });
});

describe("planting a seedling (D2)", () => {
  it("adds a tree at the next season boundary, and replays exactly from the record", () => {
    const world = new World(presetParams("skyStand", 1));
    world.run(5);
    const n = world.trees.length;
    world.plantTree(30.5);
    world.plantTree(20.2); // within a cell of a planted trunk at x = 20: refused
    world.run(10);
    expect(world.trees.length).toBe(n + 1);
    const seedling = world.trees[n] as Tree;
    expect(seedling.rootX).toBe(30.5);
    expect(seedling.m.length).toBeGreaterThan(1);
    const replay = new World(world.record().params);
    replay.run(world.season, world.record().events);
    expect(hashWorld(replay)).toBe(hashWorld(world));
  });
});
