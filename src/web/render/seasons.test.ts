import { describe, expect, it } from "vitest";
import { productionWorld } from "../../../tests/production-world.ts";
import { mergeParams } from "../../core/params.ts";
import { presetParams } from "../../core/presets.ts";
import { LEAF_PALETTES, LEAF_STYLES, type LeafStyleName } from "./leaf-styles.ts";
import { Scene } from "./scene.ts";

function grown(style: LeafStyleName): Scene {
  const world = productionWorld(presetParams("forest", 2));
  world.run(40);
  const scene = new Scene();
  scene.setSize(1000, 700, 1);
  scene.leafStyle = LEAF_STYLES[style];
  scene.setSnapshot(world.snapshot(0, { junctions: false, field: false }));
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

/** Leaves drawn this frame: a leaf not drawn keeps its place in the list at size 0 (I3). */
const drawn = (l: ReturnType<Scene["leaves"]>, from = 0, to = l.count) => {
  let n = 0;
  for (let k = from; k < to; k++) if ((l.size[k] as number) > 0) n++;
  return n;
};
/** Leaves still on the trees: the falling and fallen ones come last in the list. */
const onTrees = (scene: Scene, l: ReturnType<Scene["leaves"]>) =>
  drawn(l, 0, l.count - scene.fallenLeaves);

describe("seasons (M17)", () => {
  it("leafs out in spring, keeps a full crown in summer, and stands bare in winter", () => {
    const scene = grown("broadleaf");
    const early = drawn(play(scene, 0, 0.005));
    const summer = drawn(play(scene, 0.005, 0.4));
    expect(early).toBeLessThan(0.2 * summer);
    expect(summer).toBeGreaterThan(500);
    const winter = play(scene, 0.4, 0.95);
    // What is left in winter is litter on the ground, not leaves on the trees or in the air.
    expect(onTrees(scene, winter)).toBeLessThan(0.02 * summer);
    let aloft = 0;
    for (let k = 0; k < winter.count; k++)
      if ((winter.size[k] as number) > 0 && (winter.y[k] as number) > 0.2) aloft++;
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
      if ((l.size[k] as number) <= 0 || (l.y[k] as number) < 1) continue; // not drawn, or fallen
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
    for (let k = 0; k < autumn.count; k++)
      if ((autumn.size[k] as number) > 0) expect(autumn.y[k] as number).toBeGreaterThan(0.1);
    play(scene, 0.8, 0.99);
    play(scene, 0, 0.004);
    expect(scene.fallenLeaves).toBe(0);
  });

  it("keeps evergreen needles through the winter", () => {
    const scene = grown("needle");
    const summer = drawn(play(scene, 0.3, 0.4));
    const winter = drawn(play(scene, 0.4, 0.95));
    expect(winter).toBe(summer);
  });

  it("draws each tree as its species, on its own calendar (M19)", () => {
    // Birch, oak and beech side by side, young enough that the beech keeps its dead leaves.
    const base = presetParams("succession", 3);
    const world = productionWorld(
      mergeParams(base, {
        world: { width: 120, height: 100, walls: [], sides: "periodic" },
        trees: [
          { x: 20, species: "birch" },
          { x: 60, species: "oak" },
          { x: 100, species: "beech" },
        ],
        o4: { enabled: false },
        o2: { stormP: 0 },
      }),
    );
    world.run(12);
    const scene = new Scene();
    scene.setSize(1000, 700, 1);
    scene.setSnapshot(world.snapshot(0, { junctions: false, field: false }));
    scene.computeGeometry(1);
    scene.seasons = true;
    const share = (
      l: ReturnType<Scene["leaves"]>,
      palette: string,
      test: (k: number) => boolean,
    ) => {
      const p = LEAF_PALETTES.indexOf(palette as (typeof LEAF_PALETTES)[number]);
      let n = 0;
      let hit = 0;
      for (let k = 0; k < l.count - scene.fallenLeaves; k++) {
        if ((l.size[k] as number) <= 0 || l.palette[k] !== p) continue;
        n++;
        if (test(k)) hit++;
      }
      return n === 0 ? Number.NaN : hit / n;
    };
    // Each species keeps its own palette.
    const summer = play(scene, 0, 0.4);
    for (const p of ["birch", "oak", "beech"]) expect(share(summer, p, () => true)).toBe(1);
    // Mid-autumn, birch has turned further than oak.
    const autumn = play(scene, 0.4, 0.6);
    const turned = (k: number) => (autumn.turn[k] as number) > 0.5;
    expect(share(autumn, "birch", turned)).toBeGreaterThan(share(autumn, "oak", turned) + 0.2);
    // In winter the young beech still holds its leaves, turned; birch and oak stand bare.
    const winter = play(scene, 0.6, 0.95);
    const p = (name: string) => LEAF_PALETTES.indexOf(name as (typeof LEAF_PALETTES)[number]);
    let beech = 0;
    let others = 0;
    for (let k = 0; k < winter.count - scene.fallenLeaves; k++) {
      if ((winter.size[k] as number) <= 0) continue;
      if (winter.palette[k] === p("beech")) beech++;
      else others++;
    }
    expect(beech).toBeGreaterThan(50);
    expect(others).toBe(0);
  });
});
