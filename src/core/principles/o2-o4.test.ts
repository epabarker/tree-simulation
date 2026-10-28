import { describe, expect, it } from "vitest";
import { defaultParams, mergeParams, type Params, type ParamsPatch } from "../params.ts";
import { BudState, type Tree } from "../tree.ts";
import { World } from "../world.ts";
import { abrade, EMPTY, SHARED, swayOf, tagOwner } from "./o2-shyness.ts";
import { laplace, standDynamics } from "./o4-stand.ts";

/** A world with light off (every cell fully lit) and O4 on; patch on top. */
function world(patch: ParamsPatch = {}): World {
  const p = mergeParams(defaultParams, {
    world: { width: 100, height: 50, walls: [] },
    trees: [{ x: 50 }],
    o4: { enabled: true, cSeed: 2, d: 10, qEst: 0.5, pEst: 1, m0: 0, maxTrees: 100 },
  });
  return new World(mergeParams(p, patch));
}

describe("O4 stand dynamics (§O4, ADR 0013)", () => {
  it("draws Laplace distances: median 0, mean |x| = d", () => {
    expect(laplace(0.5, 7)).toBeCloseTo(0, 12);
    const n = 20000;
    let sum = 0;
    for (let k = 0; k < n; k++) sum += Math.abs(laplace((k + 0.5) / n, 7));
    expect(sum / n).toBeCloseTo(7, 1);
  });

  it("turns every c_seed of the seed pool into a seed and establishes it on lit ground", () => {
    const w = world();
    const parent = w.trees[0] as Tree;
    parent.seedPool = 7; // three seeds, 1 left over
    const recruits = standDynamics(w);
    expect(parent.seeds).toBe(3);
    expect(parent.seedPool).toBeCloseTo(1, 12);
    expect(recruits).toBeGreaterThan(0);
    expect(w.trees.length).toBe(1 + recruits);
    const seedling = w.trees[1] as Tree;
    expect(seedling.alive).toBe(true);
    expect(seedling.m.length).toBe(1);
    expect(seedling.m.cols.birthSeason[0]).toBe(w.season + 1);
  });

  it("establishes nothing below Q_est, past maxTrees, or within a cell of a live trunk", () => {
    const dark = world({ o4: { qEst: 2 } }); // more than open sky
    (dark.trees[0] as Tree).seedPool = 20;
    expect(standDynamics(dark)).toBe(0);
    const full = world({ o4: { maxTrees: 1 } });
    (full.trees[0] as Tree).seedPool = 20;
    expect(standDynamics(full)).toBe(0);
    const near = world({ o4: { d: 1e-9 } }); // every seed lands on its parent
    (near.trees[0] as Tree).seedPool = 20;
    expect(standDynamics(near)).toBe(0);
  });

  it("wraps seeds round periodic sides and loses them beyond open ones", () => {
    const patch = { trees: [{ x: 99 }], o4: { d: 30 } };
    const ring = world({
      ...patch,
      world: { width: 100, height: 50, walls: [], sides: "periodic" },
    });
    (ring.trees[0] as Tree).seedPool = 200;
    standDynamics(ring);
    const xs = ring.trees.slice(1).map((t) => t.rootX);
    expect(xs.every((x) => x >= 0 && x < 100)).toBe(true);
    expect(xs.some((x) => x < 50)).toBe(true); // some crossed the right edge
    const open = world(patch);
    (open.trees[0] as Tree).seedPool = 200;
    standDynamics(open);
    expect(open.trees.slice(1).every((t) => t.rootX < 100)).toBe(true);
    expect(open.trees.length).toBeLessThan(ring.trees.length);
  });

  it("rains seeds in from beyond the world, per species, at rain per 100 cells (ADR 0018)", () => {
    // A world with no seed pool: only the rain recruits. 100 cells, rain 3 → 3 seeds a season.
    const rained = (rain: number, species?: ParamsPatch["species"]) => {
      const w = world({ species, o4: { enabled: true, rain } as Params["o4"] });
      return { recruits: standDynamics(w), trees: w.trees };
    };
    expect(rained(0).recruits).toBe(0);
    const on = rained(3);
    expect(on.recruits).toBe(3); // every cell lit, p_est 1, the planted trunk at 50 aside
    // Per species: only the species with rain arrives, and it is of that species.
    const mixed = rained(0, { willow: { o4: { rain: 3 } }, oak: {} });
    expect(mixed.recruits).toBe(3);
    for (const t of mixed.trees.slice(1)) expect(t.species).toBe("willow");
    // The same light rule as local seeds: nothing where the ground is below Q_est.
    expect(rained(3, undefined).trees.length).toBe(4);
    const shaded = world({ o4: { enabled: true, rain: 3, qEst: 2 } as Params["o4"] });
    expect(standDynamics(shaded)).toBe(0);
  });

  it("kills trees of background risk at rate m₀", () => {
    const w = world({ o4: { m0: 1 } });
    (w.trees[0] as Tree).age = 1;
    standDynamics(w);
    expect((w.trees[0] as Tree).alive).toBe(false);
  });
});

describe("O2 abrasion and crown shyness (§O2, ADR 0013)", () => {
  const o2: Params["o2"] = { enabled: true, sway: 0.001, maxSway: 3, pAbr: 1 };

  it("tags cells by owner, marking shared ones", () => {
    const owner = new Int32Array(4).fill(EMPTY);
    tagOwner(owner, 2, 0, 0, 5);
    tagOwner(owner, 2, 0, 0, 5);
    tagOwner(owner, 2, 1, 1, 5);
    tagOwner(owner, 2, 1, 1, 6);
    expect(Array.from(owner)).toEqual([5, EMPTY, EMPTY, SHARED]);
  });

  it("sways k·Q·h/r, capped", () => {
    expect(swayOf(0.5, 40, 0.02, o2)).toBeCloseTo(1, 12);
    expect(swayOf(1, 1000, 0.02, o2)).toBe(3);
    expect(swayOf(1, 10, 0, o2)).toBe(0);
  });

  it("kills a leafy bud that sways into another tree's foliage, not into its own", () => {
    const w = world({ c6: { enabled: true }, o2 });
    const tree = w.trees[0] as Tree;
    const b = tree.b.cols;
    for (let j = 0; j < tree.b.length; j++) b.q[j] = 1;
    const W = 100;
    const H = 50;
    const x = Math.floor(tree.tipX(0));
    const row = Math.floor(tree.tipY(0));
    const own = new Int32Array(W * H).fill(EMPTY);
    tagOwner(own, W, x, row, tree.id); // a seedling sways ≈ 0.05 cells: its own cell
    expect(abrade(tree, own, W, H, false, w.params, 0)).toBe(0);
    const other = new Int32Array(W * H).fill(EMPTY);
    tagOwner(other, W, x, row, 7);
    expect(abrade(tree, other, W, H, false, w.params, 0)).toBe(tree.b.length);
    expect(b.state[0]).toBe(BudState.gone);
  });
});
