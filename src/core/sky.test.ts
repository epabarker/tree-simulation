import { describe, expect, it } from "vitest";
import { type TreeMetrics, treeMetrics } from "./metrics.ts";
import { mergeParams, type ParamsPatch } from "./params.ts";
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

  /** Neighbour shifts (left toward +x, right toward −x) after felling tree 5 at season 25. */
  const gapShifts = (patch: ParamsPatch) =>
    SEEDS.map((seed) => {
      const params = mergeParams(presetParams("skyStand", seed), patch);
      const felled = new World(params);
      felled.run(25);
      felled.removeTree(5);
      felled.run(25);
      const kept = new World(params);
      kept.run(50);
      const offset = (w: World, id: number) => treeMetrics(w.trees[id] as Tree).centroidOffset;
      return {
        left: offset(felled, 4) - offset(kept, 4),
        right: offset(kept, 6) - offset(felled, 6),
      };
    });

  it("lets neighbours lean into the gap left by a felled tree (5 seeds, M6 configuration)", () => {
    // The M6 light model alone: baseline shedding, no short shoots.
    for (const { left, right } of gapShifts({ c5: { T: 0.1, Trel: 0 }, r6: { enabled: false } })) {
      expect(left).toBeGreaterThan(1.5); // left neighbour leans right
      expect(right).toBeGreaterThan(1); // right neighbour leans left
    }
  });

  it("still fills gaps with relative shedding and short shoots on (5 seeds, M6d)", () => {
    const shifts = gapShifts({}).flatMap(({ left, right }) => [left, right]);
    for (const shift of shifts) expect(shift).toBeGreaterThan(0.5);
    expect(median(shifts)).toBeGreaterThan(2);
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

describe("M6d: relative shedding and short shoots (§C5, §R6; ADRs 0006, 0007)", () => {
  const baseline = { c5: { T: 0.1, Trel: 0 } } satisfies ParamsPatch;
  const lateTree = (patch: ParamsPatch) =>
    SEEDS.map((seed) => {
      const world = new World(mergeParams(presetParams("skyLate", seed), patch));
      world.run(50);
      return treeMetrics(world.trees[1] as Tree);
    });

  it("lets an overtopped tree keep a deeper crown than the absolute rule does (Sprugel 2002)", () => {
    const relative = lateTree({});
    const absolute = lateTree(baseline);
    for (const m of relative) expect(m.metamers).toBeGreaterThan(10); // all five survive
    const depth = (ms: TreeMetrics[]) => median(ms.map((m) => m.height - m.boleHeight));
    expect(median(relative.map((m) => m.metamers))).toBeGreaterThan(
      2 * median(absolute.map((m) => m.metamers)),
    );
    expect(depth(relative)).toBeGreaterThan(2 * depth(absolute));
  });

  it("puts a large share of a stand's leaf area on short shoots (Millan et al. 2022)", () => {
    const leafArea = (r6: boolean) =>
      SEEDS.flatMap((seed) => {
        const params = mergeParams(presetParams("skyStand", seed), { r6: { enabled: r6 } });
        const world = new World(params);
        world.run(45);
        return world.trees.slice(1, -1).map((tree) => {
          const m = treeMetrics(tree);
          const active = m.buds - m.dormantBuds - m.shortShoots;
          const short = params.r6.leafArea * m.shortShoots;
          return { total: r6 ? active + short : m.buds, share: short / (active + short) };
        });
      });
    const on = leafArea(true);
    expect(median(on.map((t) => t.share))).toBeGreaterThan(0.4);
    expect(median(on.map((t) => t.total))).toBeGreaterThan(
      median(leafArea(false).map((t) => t.total)),
    );
  });
});
