import { describe, expect, it } from "vitest";
import { presetParams } from "../../core/presets.ts";
import { SnapshotBuilder } from "../../core/snapshot.ts";
import { World } from "../../core/world.ts";
import { LEAF_STYLES, type LeafStyleName } from "./leaf-styles.ts";
import { Scene } from "./scene.ts";

function grown(style: LeafStyleName): Scene {
  const world = new World(presetParams("forest", 2));
  world.run(40);
  const scene = new Scene();
  scene.setSize(1000, 700, 1);
  scene.depth = true;
  scene.leafStyle = LEAF_STYLES[style];
  scene.setSnapshot(new SnapshotBuilder().build(world, 0, { junctions: false, field: false }));
  scene.computeGeometry(1);
  scene.seasons = true;
  return scene;
}

/** Plays the year from `from` to `to` in small steps (as frames would), returning the last leaves. */
function play(scene: Scene, from: number, to: number) {
  let leaves = scene.leaves(5, 1);
  for (let tau = from; tau <= to; tau += 0.004) {
    scene.tau = tau;
    scene.time += 0.05;
    leaves = scene.leaves(5, 1);
  }
  return leaves;
}

/** Leaves still on the trees: the falling and fallen ones come last in the list. */
const onTrees = (scene: Scene, l: ReturnType<Scene["leaves"]>) => l.count - scene.fallenLeaves;

describe("seasons (M17)", () => {
  it("leafs out in spring, keeps a full crown in summer, and stands bare in winter", () => {
    const scene = grown("broadleaf");
    const early = play(scene, 0, 0.005).count;
    const summer = play(scene, 0.005, 0.4).count;
    expect(early).toBeLessThan(0.2 * summer);
    expect(summer).toBeGreaterThan(500);
    const winter = play(scene, 0.4, 0.95);
    // What is left in winter is litter on the ground, not leaves on the trees or in the air.
    expect(onTrees(scene, winter)).toBeLessThan(0.02 * summer);
    let aloft = 0;
    for (let k = 0; k < winter.count; k++) if ((winter.y[k] as number) > 0.2) aloft++;
    expect(aloft).toBe(0);
  });

  it("turns shaded leaves first in autumn", () => {
    const scene = grown("broadleaf");
    const l = play(scene, 0.3, 0.6);
    let shadeTurned = 0;
    let shade = 0;
    let sunTurned = 0;
    let sun = 0;
    for (let k = 0; k < l.count; k++) {
      if ((l.y[k] as number) < 1) continue; // fallen leaves
      if ((l.color[k] as number) <= 3) {
        shade++;
        if ((l.turn[k] as number) > 0.5) shadeTurned++;
      } else if ((l.color[k] as number) >= 8) {
        sun++;
        if ((l.turn[k] as number) > 0.5) sunTurned++;
      }
    }
    expect(shadeTurned / Math.max(1, shade)).toBeGreaterThan(sunTurned / Math.max(1, sun));
  });

  it("drops leaves that drift down and lie on the ground, cleared at the new year", () => {
    const scene = grown("broadleaf");
    const autumn = play(scene, 0.4, 0.8);
    expect(scene.fallenLeaves).toBeGreaterThan(50);
    for (let k = 0; k < autumn.count; k++) expect(autumn.y[k] as number).toBeGreaterThan(0.1);
    play(scene, 0.8, 0.99);
    play(scene, 0, 0.004);
    expect(scene.fallenLeaves).toBe(0);
  });

  it("keeps evergreen needles through the winter", () => {
    const scene = grown("needle");
    const summer = play(scene, 0.3, 0.4).count;
    const winter = play(scene, 0.4, 0.95).count;
    expect(winter).toBe(summer);
  });
});
