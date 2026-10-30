import { describe, expect, it } from "vitest";
import { productionWorld } from "../../../tests/production-world.ts";
import { presetParams, presets } from "../../core/presets.ts";
import { BudState } from "../../core/types.ts";
import type { RustWorld, TreeView as Tree } from "../../wasm/world.ts";
import { FAR, NEAR, nearAndFar } from "./fixture.ts";
import { isLeafStyleName, LEAF_STYLES } from "./leaf-styles.ts";
import { DEPTH_SLICES, depthSlice, Scene } from "./scene.ts";

/** Young metamers (leafy shoots) and short shoots on older wood (rosettes) in a snapshot. */
function leafSites(scene: Scene, leafAge: number): { young: number; rosettes: number } {
  const s = scene.next;
  if (!s) throw new Error("no snapshot");
  let young = 0;
  for (let j = 0; j < s.metamerCount; j++) if (s.age[j] <= leafAge) young += 1;
  let rosettes = 0;
  for (let i = 0; i < s.budCount; i++)
    if (s.budState[i] === BudState.shortShoot && s.age[s.budMetamer[i] as number] > leafAge + 1)
      rosettes += 1;
  return { young, rosettes };
}

function sceneAfter(seasons: number): { scene: Scene; world: RustWorld } {
  const world = productionWorld(presetParams("skyTree", 3));
  const scene = new Scene();
  scene.setSize(800, 600, 1);
  scene.setSnapshot(world.snapshot(0));
  for (let s = 0; s < seasons; s++) {
    world.step();
    scene.setSnapshot(world.snapshot(0));
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

  it("puts leaves on young metamers and rosettes on short shoots of older wood, sized 0…1", () => {
    scene.computeGeometry(1);
    const leaves = scene.leaves(3, 1);
    const { young, rosettes } = leafSites(scene, 3);
    expect(rosettes).toBeGreaterThan(0); // skyTree has R6 on (M6d)
    expect(leaves.count).toBe(young + 2 * rosettes);
    for (let k = 0; k < leaves.count; k++) {
      expect(leaves.size[k]).toBeGreaterThan(0);
      expect(leaves.size[k]).toBeLessThanOrEqual(1);
    }
  });

  it("lays the leaves out far to near, each slice after the farther ones", () => {
    scene.computeGeometry(1);
    const leaves = scene.leaves(3, 1);
    expect(leaves.slices[0]).toBe(0);
    for (let i = 0; i < DEPTH_SLICES; i++)
      expect(leaves.slices[i + 1]).toBeGreaterThanOrEqual(leaves.slices[i] as number);
    expect(leaves.slices[DEPTH_SLICES]).toBe(leaves.count); // no falling leaves without seasons
  });
});

/** The slice holding position k of a list cut at `starts`. */
function sliceAt(starts: Int32Array, k: number): number {
  let i = 0;
  while ((starts[i + 1] as number) <= k) i++;
  return i;
}

describe("depth order (I3)", () => {
  for (const [name, order] of [
    ["the core's zOrder", [FAR, NEAR]],
    ["sorted on the page", []],
  ] as const) {
    it(`draws the near metamer after the far one, and the far one's leaves before the near wood (${name})`, () => {
      const scene = new Scene();
      scene.setSize(400, 400, 1);
      const s = nearAndFar([...order]);
      scene.setSnapshot(s);
      scene.computeGeometry(1);
      expect(Array.from(scene.drawOrder(s))).toEqual([FAR, NEAR]);
      const wood = scene.woodSlices(s);
      const leaves = scene.leaves(3, 1);
      expect(leaves.count).toBe(2);
      const farLeaf = sliceAt(leaves.slices, 0);
      const nearLeaf = sliceAt(leaves.slices, 1);
      const farWood = sliceAt(wood, 0);
      const nearWood = sliceAt(wood, 1);
      expect(farWood).toBe(depthSlice(50, 64));
      expect(nearWood).toBe(depthSlice(5, 64));
      // Slices draw in turn, wood then leaves: the far leaf (slice farLeaf) lands before the near wood.
      expect(farLeaf).toBe(farWood);
      expect(farLeaf).toBeLessThan(nearWood);
      expect(nearLeaf).toBe(nearWood);
      // The leaves sit at their own shoot's tip: the far one at y 2, the near one at y 4.
      expect(leaves.y[0]).toBeCloseTo(2, 5);
      expect(leaves.y[1]).toBeCloseTo(4, 5);
    });
  }

  it("foreshortens a leaf by its shoot's share in the picture's plane", () => {
    const scene = new Scene();
    scene.setSize(400, 400, 1);
    const s = nearAndFar();
    // The near shoot leans toward the viewer: its unit heading is 0.6 up and 0.8 along z.
    s.dirY[NEAR] = 0.6;
    s.dirZ[NEAR] = -0.8;
    scene.setSnapshot(s);
    scene.computeGeometry(1);
    const leaves = scene.leaves(3, 1);
    expect((leaves.size[1] as number) / (leaves.size[0] as number)).toBeCloseTo(0.6, 5);
  });
});

describe("Leaf styles (page only, per species)", () => {
  const { scene } = sceneAfter(20);

  it("draws needles on both sides of each shoot", () => {
    scene.leafStyle = LEAF_STYLES.needle;
    const { young, rosettes } = leafSites(scene, 3);
    scene.computeGeometry(1);
    expect(scene.leaves(3, 1).count).toBe(2 * young + 2 * rosettes);
    scene.leafStyle = LEAF_STYLES.broadleaf;
  });

  it("names a known style for every preset that asks for one", () => {
    for (const preset of Object.values(presets) as { leaf?: string }[]) {
      if (preset.leaf !== undefined) expect(isLeafStyleName(preset.leaf)).toBe(true);
    }
    expect((presets.firWood as { leaf?: string }).leaf).toBe("needle");
  });
});

describe("rings in the lab's frame (M26)", () => {
  it("frames one lap of a ring and draws the copies either side, so crowns wrap at the seam", () => {
    const world = productionWorld(presetParams("forest", 1));
    world.run(30);
    const scene = new Scene();
    scene.setSize(800, 600, 1);
    scene.frame = "trees";
    scene.setSnapshot(world.snapshot(0));
    scene.fit(true);
    const W = world.params.world.width;
    expect(scene.camera.cx).toBe(W / 2);
    expect(scene.wrapOffsets()).toEqual([-W, 0, W]);
    // An open world keeps the trees' own frame and one copy.
    const open = new Scene();
    open.setSize(800, 600, 1);
    open.frame = "trees";
    open.setSnapshot(productionWorld(presetParams("skyTree", 1)).snapshot(0));
    expect(open.wrapOffsets()).toEqual([0]);
  });
});
