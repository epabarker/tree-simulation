import { describe, expect, it } from "vitest";
import { hashWorld } from "./hash.ts";
import { mergeParams, type Params } from "./params.ts";
import { presetParams } from "./presets.ts";
import type { Tree } from "./tree.ts";
import { World } from "./world.ts";

const height = (t: Tree): number => {
  let h = 0;
  for (let i = 0; i < t.m.length; i++) h = Math.max(h, t.tipY(i));
  return h;
};

/** skyStand with trees alternating between two species. */
function mixed(seed: number, a: Params["species"]): Params {
  const base = presetParams("skyStand", seed);
  return mergeParams(base, {
    species: a,
    trees: base.trees.map((t, i) => ({ ...t, species: i % 2 === 0 ? "leader" : "spreading" })),
  });
}

describe("species per tree (ADR 0016)", () => {
  it("gives a tree without a species the world's own params, so nothing changes", () => {
    const base = presetParams("skyStand", 1);
    const plain = new World(base);
    // A species table that no tree uses, and every tree of a species that changes nothing.
    const tabled = new World(mergeParams(base, { species: { birch: { c3: { lambda: 0.6 } } } }));
    const same = new World(
      mergeParams(base, {
        species: { same: {} },
        trees: base.trees.map((t) => ({ ...t, species: "same" })),
      }),
    );
    expect(tabled.paramsOf(tabled.trees[0] as Tree)).toBe(tabled.params);
    for (const w of [plain, tabled, same]) w.run(25);
    expect(hashWorld(tabled)).toBe(hashWorld(plain));
    expect(hashWorld(same)).toBe(hashWorld(plain));
  });

  it("grows each tree by its own species in a shared stand (5 seeds)", () => {
    // Borchert–Honda λ is the most important parameter (§9): high λ gives a leader, low λ spreads.
    let leaderTaller = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const world = new World(
        mixed(seed, { leader: { c3: { lambda: 0.58 } }, spreading: { c3: { lambda: 0.46 } } }),
      );
      world.run(35);
      const mean = (sp: string) => {
        const ts = world.trees.filter((t) => t.species === sp && t.alive);
        return ts.reduce((s, t) => s + height(t), 0) / ts.length;
      };
      if (mean("leader") > 1.15 * mean("spreading")) leaderTaller++;
    }
    expect(leaderTaller).toBeGreaterThanOrEqual(4);
  });

  it("resolves a species once, and again after a params event", () => {
    const world = new World(mixed(1, { leader: { c3: { lambda: 0.58 } }, spreading: {} }));
    const tree = world.trees[0] as Tree;
    const first = world.paramsOf(tree);
    expect(first.c3.lambda).toBe(0.58);
    expect(world.paramsOf(tree)).toBe(first);
    world.setParams({ species: { leader: { c3: { lambda: 0.52 } }, spreading: {} } });
    world.step();
    expect(world.paramsOf(tree).c3.lambda).toBe(0.52);
  });

  it("passes a species to recruits and to a visitor's seedling", () => {
    const base = presetParams("forest", 1);
    const world = new World(
      mergeParams(base, {
        species: { a: {}, b: {} },
        trees: base.trees.map((t, i) => ({ ...t, species: i < 5 ? "a" : "b" })),
      }),
    );
    world.run(120);
    const recruits = world.trees.slice(base.trees.length);
    expect(recruits.length).toBeGreaterThan(3);
    for (const t of recruits) expect(["a", "b"]).toContain(t.species);
    const near = world.trees.find((t) => t.alive && t.species === "b") as Tree;
    world.plantTree(near.rootX + 1.5);
    world.step();
    const sown = world.trees.find((t) => t.sown) as Tree;
    expect(sown.species).toBe("b");
  });
});
