import { describe, expect, it } from "vitest";
import { mergeParams, type ParamsPatch } from "../../src/core/params.ts";
import { presetParams } from "../../src/core/presets.ts";
import { BudState } from "../../src/core/types.ts";
import { type Tree, treeMetrics, World } from "../world.ts";

// The §8 ablations (M22): switch one rule off and check the predicted change, against the same
// runs with every rule on. Measured values are in docs/experiments/2026-10-28-m22-ablations.md.
const SEEDS = [1, 2, 3, 4, 5];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const STAND_X = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209];

/** The `preset` grown `seasons` seasons with `patch` on top. */
function grown(
  preset: Parameters<typeof presetParams>[0],
  seed: number,
  seasons: number,
  patch: ParamsPatch = {},
): World {
  const world = new World(mergeParams(presetParams(preset, seed), patch));
  world.run(seasons);
  return world;
}

describe("§8 ablations (M22)", () => {
  it("C3 → equal sharing: a low, broad crown, and a tree that loses to its neighbour", () => {
    // Measured: 27 cells tall against 73, width over height 1.72 against 1.04.
    const open = (mode: "bh" | "equal") =>
      SEEDS.map((s) => treeMetrics(grown("skyTree", s, 50, { c3: { mode } }).trees[0] as Tree));
    const bh = open("bh");
    const equal = open("equal");
    expect(mean(equal.map((m) => m.height))).toBeLessThan(0.6 * mean(bh.map((m) => m.height)));
    const spread = (ms: typeof bh) => mean(ms.map((m) => m.crownWidth / m.height));
    expect(spread(equal)).toBeGreaterThan(1.3 * spread(bh));
    // Side by side (species per tree carry their own C3 mode): the equal-sharing tree ends
    // shorter and catches less light in every seed (Takenaka 1994).
    for (const seed of SEEDS) {
      const base = presetParams("skyTree", seed);
      const world = new World(
        mergeParams(base, {
          world: { width: 100, height: 100, walls: [] },
          species: { bh: {}, eq: { c3: { ...base.c3, mode: "equal" } } },
          trees: [
            { x: 38, species: "bh" },
            { x: 62, species: "eq" },
          ],
        }),
      );
      world.run(40);
      const [bhTree, eqTree] = [0, 1].map((k) => treeMetrics(world.trees[k] as Tree, world));
      expect(eqTree?.height).toBeLessThan(bhTree?.height as number);
      expect(eqTree?.qBase).toBeLessThan(bhTree?.qBase as number);
    }
  });

  it("ξ = 0: shoots stop turning to the light, though the crown still leans by allocation", () => {
    // The spec predicts crowns that ignore gaps; here phototropism is only part of the lean. Under
    // an oblique sun, measured: shoots' mean cos 0.163 against 0.225, crown offset 7.3 against 9.3.
    const toSun = (xi: number) =>
      SEEDS.map((seed) => {
        const p = presetParams("obliqueSun", seed);
        const t = grown("obliqueSun", seed, 40, { c4: { ...p.c4, xi } }).trees[0] as Tree;
        const c = t.m.cols;
        let cos = 0;
        for (let i = 0; i < t.m.length; i++)
          cos += Math.cos(Math.atan2(c.hy[i] as number, c.hx[i] as number));
        return { cos: cos / t.m.length, offset: treeMetrics(t).centroidOffset };
      });
    const on = toSun(0.3);
    const off = toSun(0);
    expect(mean(off.map((r) => r.cos))).toBeLessThan(0.85 * mean(on.map((r) => r.cos)));
    expect(mean(off.map((r) => r.offset))).toBeLessThan(mean(on.map((r) => r.offset)));
    // Allocation and shedding alone still lean it toward the sun.
    expect(mean(off.map((r) => r.offset))).toBeGreaterThan(3);
  });

  it("R1 off: no height plateau, no death in the shade, no self-thinning", () => {
    const stand = (patch: ParamsPatch) =>
      [1, 2, 3].map((seed) => {
        const world = new World(
          mergeParams(presetParams("skyStand", seed), {
            ...patch,
            // A seedling planted under the closed canopy at season 20 (as in the M8 test).
            trees: [...STAND_X.map((x) => ({ x })), { x: 93.5, plantSeason: 20 }],
          }),
        );
        world.run(100);
        const height = mean(world.trees.slice(2, 8).map((t) => treeMetrics(t).height));
        return { height, seedling: (world.trees[10] as Tree).alive };
      });
    const thinningDeaths = (patch: ParamsPatch) =>
      [1, 2, 3].map(
        (seed) => grown("thinning", seed, 50, patch).trees.filter((t) => !t.alive).length,
      );
    const off = { r1: { enabled: false } };
    // Measured: 106 cells (the 110-cell world's top) against 95; the seedling lives in every
    // seed against none; no thinning deaths against about 40 of 60.
    const without = stand(off);
    const withR1 = stand({});
    expect(mean(without.map((r) => r.height))).toBeGreaterThan(100);
    expect(mean(withR1.map((r) => r.height))).toBeLessThan(100);
    expect(without.every((r) => r.seedling)).toBe(true);
    expect(withR1.some((r) => r.seedling)).toBe(false);
    expect(thinningDeaths(off)).toEqual([0, 0, 0]);
    expect(mean(thinningDeaths({}))).toBeGreaterThan(20);
  });

  it("R6 off: foliage only on the young shoots, none on older wood", () => {
    // Foliage as the page draws it: shoots up to 5 seasons old, and short shoots on older wood.
    // Measured: 39% of it on older wood with R6, none without.
    const oldWoodShare = (enabled: boolean) =>
      mean(
        SEEDS.map((seed) => {
          const p = presetParams("skyTree", seed);
          const world = grown("skyTree", seed, 50, { r6: { ...p.r6, enabled } });
          const t = world.trees[0] as Tree;
          const born = t.m.cols.birthSeason;
          let young = 0;
          for (let i = 0; i < t.m.length; i++) if (world.season - (born[i] as number) <= 5) young++;
          let old = 0;
          const b = t.b.cols;
          for (let j = 0; j < t.b.length; j++) {
            if (b.state[j] !== BudState.shortShoot) continue;
            if (world.season - (born[b.metamer[j] as number] as number) > 5) old++;
          }
          return old / (old + young);
        }),
      );
    expect(oldWoodShare(true)).toBeGreaterThan(0.25);
    expect(oldWoodShare(false)).toBe(0);
  });

  it("R4 off: no bud bank to release, though gaps still refill by ordinary growth", () => {
    // The spec predicts slower refilling. Here the R4-off baseline lets any bud with v ≥ 1 grow,
    // so gaps fill as fast; what R4 adds is a bank of dormant buds that light releases (and the
    // epicormic flush, release.test.ts). Measured after a felling: about 120 dormant buds a tree
    // and 850 releases in 10 seasons, against 25 and none.
    const afterFelling = (enabled: boolean) =>
      SEEDS.map((seed) => {
        const p = presetParams("skyStand", seed);
        const world = grown("skyStand", seed, 30, { r4: { ...p.r4, enabled } });
        world.removeTree(5);
        let released = 0;
        for (let s = 0; s < 10; s++) {
          world.step();
          for (const t of world.trees) released += t.released;
        }
        const live = world.trees.filter((t) => t.alive);
        return { released, dormant: mean(live.map((t) => treeMetrics(t).dormantBuds)) };
      });
    const on = afterFelling(true);
    const off = afterFelling(false);
    expect(off.every((r) => r.released === 0)).toBe(true);
    expect(on.every((r) => r.released > 100)).toBe(true);
    expect(mean(on.map((r) => r.dormant))).toBeGreaterThan(2 * mean(off.map((r) => r.dormant)));
  });

  it("pooled light instead of directional shade: sizes even out and nothing is suppressed", () => {
    // Size-symmetric competition (Weiner 1990): every leaf gets the same light, so tree mass varies
    // far less and no seedling starves. Measured: CV 0.03–0.11 against 0.26–0.33; 60 of 60 alive
    // against about 21. (The directional stand is not clearly bimodal either, so bimodality itself
    // is not tested; STATUS known issues.)
    const stand = (model: "slab" | "pooled") =>
      [1, 2, 3].map((seed) => {
        const p = presetParams("thinning", seed);
        const world = grown("thinning", seed, 40, { c2: { ...p.c2, model } });
        const mass = world.trees.filter((t) => t.alive).map((t) => treeMetrics(t).woodVolume);
        const m = mean(mass);
        const sd = Math.sqrt(mean(mass.map((x) => (x - m) ** 2)));
        return { cv: sd / m, alive: mass.length };
      });
    const sky = stand("slab");
    const pooled = stand("pooled");
    expect(mean(pooled.map((r) => r.cv))).toBeLessThan(0.5 * mean(sky.map((r) => r.cv)));
    expect(pooled.every((r) => r.alive === 60)).toBe(true);
    expect(sky.every((r) => r.alive < 40)).toBe(true);
  });
});
