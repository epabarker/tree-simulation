import { describe, expect, it } from "vitest";
import { type TreeMetrics, treeMetrics } from "./metrics.ts";
import { mergeParams } from "./params.ts";
import { type PresetName, presetParams } from "./presets.ts";
import type { Tree } from "./tree.ts";
import { World } from "./world.ts";

const SEEDS = [1, 2, 3, 4, 5];
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

function grown(preset: PresetName, seed: number, seasons: number): TreeMetrics[] {
  const world = new World(presetParams(preset, seed));
  world.run(seasons);
  return world.trees.map(treeMetrics);
}

// One set of 45-season stands shared by the first two tests.
const stands = SEEDS.map((seed) => grown("skyStand", seed, 45));

describe("M6: the Beer–Lambert sky sweep (§C2, §7 M6)", () => {
  it("makes edge trees lean outward, toward the open sky (5 seeds)", () => {
    for (const trees of stands) {
      expect((trees[0] as TreeMetrics).centroidOffset).toBeLessThan(-1);
      expect((trees[trees.length - 1] as TreeMetrics).centroidOffset).toBeGreaterThan(1);
    }
  });

  it("lifts the crown base in a stand but not on an open-grown tree (§8 single vs multi)", () => {
    const interior = stands.flatMap((trees) => trees.slice(1, -1).map((m) => m.boleHeight));
    const open = SEEDS.map((seed) => (grown("skyTree", seed, 45)[0] as TreeMetrics).boleHeight);
    expect(median(interior)).toBeGreaterThan(15);
    expect(median(interior)).toBeGreaterThan(5 * median(open));
  });

  it("grows stand trees with realistic slenderness, open-grown trees squatter (§10, M6c)", () => {
    const interior = stands.flatMap((trees) => trees.slice(1, -1).map((m) => m.slenderness));
    for (const hd of interior) {
      expect(hd).toBeGreaterThan(50);
      expect(hd).toBeLessThan(90);
    }
    const open = SEEDS.map((seed) => (grown("skyTree", seed, 45)[0] as TreeMetrics).slenderness);
    expect(median(open)).toBeLessThan(0.8 * median(interior));
  });

  it("lets neighbours lean into the gap left by a felled tree (5 seeds)", () => {
    for (const seed of SEEDS) {
      const felled = new World(presetParams("skyStand", seed));
      felled.run(25);
      felled.removeTree(5);
      felled.run(25);
      const kept = new World(presetParams("skyStand", seed));
      kept.run(50);
      const offset = (w: World, id: number) => treeMetrics(w.trees[id] as Tree).centroidOffset;
      expect(offset(felled, 4)).toBeGreaterThan(offset(kept, 4) + 1.5); // left neighbour leans right
      expect(offset(felled, 6)).toBeLessThan(offset(kept, 6) - 1); // right neighbour leans left
    }
  });

  it("grows crowns toward an oblique sun (§C2.6)", () => {
    const lean = (tilt: number) =>
      SEEDS.map((seed) => {
        const world = new World(
          mergeParams(presetParams("obliqueSun", seed), { c2: { skyTilt: tilt } }),
        );
        world.run(40);
        return treeMetrics(world.trees[0] as Tree).centroidOffset;
      });
    for (const offset of lean(0.5)) expect(offset).toBeGreaterThan(4);
    expect(Math.abs(median(lean(0)))).toBeLessThan(2);
  });

  it("does not depend on the order trees are processed in", () => {
    const params = mergeParams(presetParams("pair", 2), { c2: { model: "sky" } });
    const forward = new World(params);
    const reversed = new World(params);
    (reversed.trees as Tree[]).reverse();
    forward.run(15);
    reversed.run(15);
    for (const id of [0, 1]) {
      const a = treeMetrics(forward.trees.find((t) => t.id === id) as Tree);
      const b = treeMetrics(reversed.trees.find((t) => t.id === id) as Tree);
      expect(b).toEqual(a);
    }
  });
});
