/**
 * R2 evidence (M7, ADR 0022) on the Rust core. The table lookups (generators, λ by age, p_term,
 * A_set and η, the juvenile cap) are tested in rust/core/src/principles/r2.rs and c1.rs.
 */
import { describe, expect, it } from "vitest";
import { loneParams, withAssign } from "../../cli/trials.ts";
import { type FixtureName, fixtureParams } from "../../src/core/fixtures.ts";
import { mergeParams } from "../../src/core/params.ts";
import { PRE_R1 } from "../../src/core/presets.ts";
import { BudState, Slot } from "../../src/core/types.ts";
import { type Tree, treeMetrics, World } from "../world.ts";

/** These checks are the M7 evidence, so they run the retired presets (fixtures.ts) as they were before R1 and R3. */
const presetParams = (name: FixtureName, seed?: number) =>
  mergeParams(fixtureParams(name, seed), PRE_R1);

describe("R2 physiological age (§R2, ADR 0009)", () => {
  /** Lateral slots (buds or child metamers) used at each trunk node, and its main child. */
  function trunkNodes(tree: Tree) {
    const c = tree.m.cols;
    const nodes = new Map<number, { laterals: number; mainChild: number }>();
    for (let i = 0; i < tree.m.length; i++) {
      if (c.order[i] === 0) nodes.set(i, { laterals: 0, mainChild: -1 });
    }
    const touch = (m: number, slot: number, child: number) => {
      const node = nodes.get(m);
      if (!node) return;
      if (slot === Slot.main) node.mainChild = child;
      else node.laterals += 1;
    };
    for (let i = 0; i < tree.m.length; i++) if (c.parent[i] >= 0) touch(c.parent[i], c.slot[i], i);
    const b = tree.b.cols;
    for (let i = 0; i < tree.b.length; i++) touch(b.metamer[i], b.slot[i], -1);
    return nodes;
  }

  it("grows whorls at the start of each growth unit on a Massart trunk", () => {
    const world = new World(mergeParams(presetParams("conifer", 1), { c5: { enabled: false } }));
    world.run(12);
    const tree = world.trees[0] as Tree;
    const c = tree.m.cols;
    let tiers = 0;
    for (const [m, node] of trunkNodes(tree)) {
      // A tier sits where the next metamer up is from a later season (or at the top).
      // The seedling's metamer is its own growth unit: planted, then grown on in season 0.
      const unitEnd =
        m === 0 || node.mainChild < 0 || c.birthSeason[node.mainChild] !== c.birthSeason[m];
      expect(node.laterals).toBe(unitEnd ? 2 : 0);
      if (unitEnd) tiers += 1;
    }
    expect(tiers).toBeGreaterThanOrEqual(10); // about one tier a season
  });

  it("builds sympodial modules: no branch axis outlives its season (Aubréville)", () => {
    const world = new World(presetParams("tropical", 1));
    world.run(25);
    const tree = world.trees[0] as Tree;
    const c = tree.m.cols;
    for (let i = 0; i < tree.m.length; i++) {
      const p = c.parent[i];
      if (p >= 0 && c.order[p] >= 1 && c.slot[i] === Slot.main) {
        expect(c.birthSeason[i]).toBe(c.birthSeason[p]); // a module never continues next season
      }
    }
    const b = tree.b.cols;
    let ended = 0;
    for (let i = 0; i < tree.b.length; i++) if (b.state[i] === BudState.terminated) ended += 1;
    expect(ended).toBeGreaterThan(20);
  });
});

describe("R2 juvenile phase (§R2.4, ADR 0022)", () => {
  it("slows a young tree's height growth, most while it is small", () => {
    const heights = (assign: Record<string, unknown>) => {
      const w = new World(withAssign(loneParams("oak", 1), "oak", assign));
      const t = w.trees[0] as Tree;
      w.run(10);
      const h10 = treeMetrics(t, w).height;
      w.run(50);
      return [h10, treeMetrics(t, w).height] as const;
    };
    const [full10, full60] = heights({ "r2.hJ": 0 });
    const [young10, young60] = heights({ "r2.hJ": 60 });
    // At 10 seasons the juvenile oak is less than half as tall; by 60 it is within a fifth.
    expect(young10).toBeLessThan(0.5 * full10);
    expect(young60).toBeGreaterThan(0.8 * full60);
  });
});
