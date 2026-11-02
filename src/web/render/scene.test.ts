import { describe, expect, it } from "vitest";
import { productionWorld } from "../../../tests/production-world.ts";
import { presetParams, presets } from "../../core/presets.ts";
import { BudState } from "../../core/types.ts";
import type { RustWorld, TreeView as Tree } from "../../wasm/world.ts";
import { dimByte } from "./colors.ts";
import { FAR, NEAR, nearAndFar } from "./fixture.ts";
import { isLeafStyleName, LEAF_STYLES } from "./leaf-styles.ts";
import { DEPTH_SLICES, depthSlice, LEAF_LENGTH, Scene } from "./scene.ts";

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

  it("draws stems at `girth` times their radius and moves nothing (round 2's `&girth`)", () => {
    scene.computeGeometry(1);
    const radius = Float32Array.from(scene.geom.radius);
    const tipRadius = Float32Array.from(scene.geom.tipRadius);
    const tipX = Float32Array.from(scene.geom.tipX);
    scene.girth = 1.5;
    scene.computeGeometry(1);
    const g = scene.geom;
    for (let j = 0; j < tree.m.length; j++) {
      expect(g.radius[j]).toBeCloseTo(1.5 * (radius[j] as number), 6);
      expect(g.tipRadius[j]).toBeCloseTo(1.5 * (tipRadius[j] as number), 6);
      expect(g.tipX[j]).toBe(tipX[j]);
    }
    scene.girth = 1;
    scene.computeGeometry(1);
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
    // Leaves aging out this season keep their place in the list at size 0 (Scene.leaves).
    let drawn = 0;
    for (let k = 0; k < leaves.count; k++) {
      expect(leaves.size[k]).toBeGreaterThanOrEqual(0);
      expect(leaves.size[k]).toBeLessThanOrEqual(1);
      if (leaves.size[k] > 0) drawn++;
    }
    expect(drawn).toBe(young + 2 * rosettes);
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
    const leaves = scene.leaves(3, 1);
    let drawn = 0;
    for (let k = 0; k < leaves.count; k++) if (leaves.size[k] > 0) drawn++;
    expect(drawn).toBe(2 * young + 2 * rosettes);
    scene.leafStyle = LEAF_STYLES.broadleaf;
  });

  it("clumps the cards per species without adding or removing one (track C)", () => {
    scene.computeGeometry(1);
    const count = (style: (typeof LEAF_STYLES)[keyof typeof LEAF_STYLES]) => {
      scene.leafStyle = style;
      const l = scene.leaves(3, 1);
      let drawn = 0;
      for (let k = 0; k < l.count; k++) if (l.size[k] > 0) drawn++;
      return { drawn, l };
    };
    const { young, rosettes } = leafSites(scene, 3);
    for (const style of Object.values(LEAF_STYLES)) {
      const per = style.xray === 2 ? 2 : 1;
      expect(count(style).drawn).toBe(per * young + 2 * rosettes);
    }
    // Birch's cards hang: on average they point downward; oak's gather off their own tips.
    const birch = count(LEAF_STYLES.small).l;
    let uy = 0;
    let n = 0;
    for (let k = 0; k < birch.count; k++) {
      if (birch.size[k] <= 0) continue;
      uy += birch.uy[k] as number;
      n++;
    }
    expect(uy / n).toBeLessThan(-0.2);
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

describe("one scale (the lab's `&frame=height`, round 2's blind test)", () => {
  it("fixes the camera by the world's height, however tall the trees or wide the world", () => {
    const fitted = (frame: "trees" | "height", preset: "skyTree" | "forest", seasons: number) => {
      const world = productionWorld(presetParams(preset, 1));
      world.run(seasons);
      const scene = new Scene();
      scene.setSize(800, 600, 1);
      scene.frame = frame;
      scene.setSnapshot(world.snapshot(0));
      scene.fit(true);
      return { scene, world: world.params.world };
    };
    const young = fitted("height", "skyTree", 0);
    const grown = fitted("height", "skyTree", 20);
    expect(grown.scene.camera.scale).toBe(young.scene.camera.scale);
    expect(grown.scene.camera.cx).toBe(grown.world.width / 2);
    // The fitted frame, by contrast, follows the tree as it grows.
    expect(fitted("trees", "skyTree", 20).scene.camera.scale).not.toBe(
      fitted("trees", "skyTree", 0).scene.camera.scale,
    );
    // Pixels per cell from the height alone (600 px less the ground margin and the headroom),
    // for a ring 210 wide as for the lone tree's world.
    for (const { scene, world } of [grown, fitted("height", "forest", 10)])
      expect(scene.camera.scale).toBeCloseTo((600 - 18 - 52) / (world.height * 1.05 + LEAF_LENGTH));
  });
});

describe("clear boles (the lab's `&clearBole`, round 2)", () => {
  it("draws no rosettes on a trunk below its limb crown base, and every other leaf as before", () => {
    const world = productionWorld(presetParams("forest", 1));
    world.run(40);
    const scene = new Scene();
    scene.setSize(800, 600, 1);
    scene.setSnapshot(world.snapshot(0));
    scene.computeGeometry(1);
    const s = scene.next;
    if (!s) throw new Error("no snapshot");
    // Short shoots on order-0 wood older than the leafy shoots (leafAge 3), below the tree's
    // limb crown base: each carries a rosette of two cards.
    const limbBase = new Map(s.metrics.map((m) => [m.tree, Math.fround(m.limbBase)]));
    let bole = 0;
    for (let i = 0; i < s.budCount; i++) {
      const j = s.budMetamer[i] as number;
      if (s.budState[i] !== BudState.shortShoot || s.age[j] <= 4 || s.order[j] !== 0) continue;
      if ((s.y0[j] as number) < (limbBase.get(s.tree[j] as number) ?? 0)) bole++;
    }
    expect(bole).toBeGreaterThan(0);
    const all = scene.leaves(3, 1).count;
    scene.clearBole = true;
    expect(scene.leaves(3, 1).count).toBe(all - 2 * bole);
    scene.clearBole = false;
    expect(scene.leaves(3, 1).count).toBe(all);
  });

  it("darkens wood by the shade at its base under `barkLight`, boles more than the crown's shoots", () => {
    const world = productionWorld(presetParams("forest", 1));
    world.run(40);
    const scene = new Scene();
    scene.setSnapshot(world.snapshot(0));
    const s = scene.next;
    if (!s?.shadow) throw new Error("no field");
    expect(scene.woodLight(s)).toBeNull();
    scene.barkLight = 0.5;
    const light = scene.woodLight(s);
    if (!light) throw new Error("no wood light");
    const limbBase = new Map(s.metrics.map((m) => [m.tree, m.limbBase]));
    const mean = (pick: (j: number) => boolean) => {
      let sum = 0;
      let n = 0;
      for (let j = 0; j < s.metamerCount; j++)
        if (pick(j)) {
          sum += light[j] as number;
          n++;
        }
      return sum / n;
    };
    for (let j = 0; j < s.metamerCount; j++) {
      expect(light[j]).toBeGreaterThanOrEqual(0.5);
      expect(light[j]).toBeLessThanOrEqual(1);
    }
    const bole = mean((j) => s.order[j] === 0 && s.y0[j] < (limbBase.get(s.tree[j]) ?? 0));
    const shoots = mean((j) => s.age[j] <= 1);
    expect(bole).toBeLessThan(shoots);
    // Applied in linear light: no change at full light, and a 0.55 share takes beech's lit base
    // (#8f) into the measured trunk's range (#6b–#77).
    expect(dimByte(200, 1)).toBe(200);
    expect(dimByte(0x8f, 0.55)).toBeGreaterThanOrEqual(0x6b);
    expect(dimByte(0x8f, 0.55)).toBeLessThanOrEqual(0x77);
  });
});
