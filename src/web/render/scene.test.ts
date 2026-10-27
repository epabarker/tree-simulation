import { describe, expect, it } from "vitest";
import { presetParams, presets } from "../../core/presets.ts";
import { SnapshotBuilder } from "../../core/snapshot.ts";
import { BudState, type Tree } from "../../core/tree.ts";
import { World } from "../../core/world.ts";
import { isLeafStyleName, LEAF_STYLES } from "./leaf-styles.ts";
import { CLUSTER_LEAVES, Scene } from "./scene.ts";

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

  it("x-ray view (depth off) draws the simulated geometry and one front leaf per young metamer", () => {
    scene.depth = false;
    scene.computeGeometry(1);
    expect(scene.leaves(3, 1).back).toBe(0);
  });
});

describe("Scene pseudo-depth view (ADR 0008)", () => {
  const { scene, world } = sceneAfter(20);
  const tree = world.trees[0] as Tree;
  const s = scene.next;
  if (!s) throw new Error("no snapshot");
  scene.depth = true;
  scene.computeGeometry(1);

  it("keeps the trunk where the core puts it and shortens laterals' spread, never lengthening", () => {
    const g = scene.geom;
    let squeezed = 0;
    for (let j = 0; j < s.metamerCount; j++) {
      const drawn = Math.hypot(g.tipX[j] - g.baseX[j], g.tipY[j] - g.baseY[j]);
      expect(drawn).toBeLessThanOrEqual(s.length[j] + 1e-4);
      if (drawn < s.length[j] - 1e-3) squeezed += 1;
      if (s.order[j] === 0) {
        expect(g.tipX[j]).toBeCloseTo(tree.tipX(j), 3);
        expect(g.tipY[j]).toBeCloseTo(tree.tipY(j), 3);
      }
    }
    expect(squeezed).toBeGreaterThan(0);
  });

  it("gives each young metamer and rosette a cluster split into back and front layers", () => {
    const leaves = scene.leaves(3, 1);
    const { young, rosettes } = leafSites(scene, 3);
    expect(leaves.count).toBe(CLUSTER_LEAVES * (young + rosettes));
    expect(leaves.back).toBeGreaterThan(0.2 * leaves.count);
    expect(leaves.back).toBeLessThan(0.8 * leaves.count);
    for (let k = 0; k < leaves.count; k++) {
      expect(leaves.size[k]).toBeGreaterThan(0);
      expect(leaves.size[k]).toBeLessThanOrEqual(1);
    }
  });

  it("is stable from frame to frame (depth is hashed from stable ids)", () => {
    const a = scene.leaves(3, 1);
    const first = { back: a.back, x: Array.from(a.x.subarray(0, a.count)) };
    scene.computeGeometry(1);
    const b = scene.leaves(3, 1);
    expect(b.back).toBe(first.back);
    expect(Array.from(b.x.subarray(0, b.count))).toEqual(first.x);
  });
});

describe("Leaf styles (page only, per species)", () => {
  const { scene } = sceneAfter(20);

  it("draws a needle spray of the style's cluster size, on both sides in the x-ray view", () => {
    scene.leafStyle = LEAF_STYLES.needle;
    const { young, rosettes } = leafSites(scene, 3);
    scene.depth = true;
    scene.computeGeometry(1);
    expect(scene.leaves(3, 1).count).toBe(LEAF_STYLES.needle.cluster * (young + rosettes));
    scene.depth = false;
    scene.computeGeometry(1);
    expect(scene.leaves(3, 1).count).toBe(2 * young + 2 * rosettes);
    scene.leafStyle = LEAF_STYLES.broadleaf;
  });

  it("names a known style for every preset that asks for one", () => {
    for (const preset of Object.values(presets) as { leaf?: string }[]) {
      if (preset.leaf !== undefined) expect(isLeafStyleName(preset.leaf)).toBe(true);
    }
    expect((presets.conifer as { leaf?: string }).leaf).toBe("needle");
  });
});
