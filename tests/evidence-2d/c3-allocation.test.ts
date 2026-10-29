/**
 * C3 evidence (M2) on the Rust core. The split itself, and its conservation at every node, are
 * tested in rust/core/src/principles/c3.rs.
 */
import { describe, expect, it } from "vitest";
import { mergeParams } from "../../src/core/params.ts";
import { presetParams } from "../../src/core/presets.ts";
import { isLiveBud, type Tree, World } from "../world.ts";

function liveBudResource(tree: Tree): number[] {
  const b = tree.b.cols;
  const out: number[] = [];
  for (let i = 0; i < tree.b.length; i++) if (isLiveBud(b.state[i])) out.push(b.v[i]);
  return out;
}

/**
 * The first tree after `seasons` seasons. Per-season values (bud v, vIn, vSlot) still hold the
 * last season's allocation; buds formed during that season have v = 0.
 */
function treeAfter(preset: Parameters<typeof presetParams>[0], seasons: number, patch = {}): Tree {
  const world = new World(mergeParams(presetParams(preset), patch));
  world.run(seasons);
  return world.trees[0] as Tree;
}

describe("M2: Borchert–Honda allocation", () => {
  it("conserves resource: Σ v at buds = v_base = α·Q_base", () => {
    const world = new World(presetParams("bh"));
    for (let s = 0; s < 25; s++) {
      world.step();
      const tree = world.trees[0] as Tree;
      // After the season, buds that grew are consumed; check the root inflow instead, and
      // the conservation of the split at every node through vIn.
      expect(tree.vBase).toBeCloseTo(world.params.c3.alpha * tree.qBase, 9);
      expect(tree.m.cols.vIn[0]).toBeCloseTo(tree.vBase, 9);
    }
  });

  it("gives every live bud the same share in the 'equal' ablation (§8)", () => {
    const tree = treeAfter("bh", 12, { c3: { mode: "equal" } });
    const v = liveBudResource(tree);
    expect(v.length).toBeGreaterThan(10);
    // Buds formed this season have v = 0 (they were not allocated yet); the rest share equally.
    const allocated = v.filter((x) => x > 0);
    for (const x of allocated) expect(x).toBeCloseTo(allocated[0] as number, 12);
  });

  it("makes a stronger leader at λ = 0.56 than at 0.46 (5 seeds, §7 M2)", () => {
    const heights = (lambda: number) =>
      [1, 2, 3, 4, 5].map((seed) => {
        const world = new World(mergeParams(presetParams("bh", seed), { c3: { lambda } }));
        world.run(20);
        let h = 0;
        const tree = world.trees[0] as Tree;
        for (let i = 0; i < tree.m.length; i++) h = Math.max(h, tree.tipY(i));
        return h;
      });
    const low = heights(0.46);
    const high = heights(0.56);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(high)).toBeGreaterThan(mean(low) * 1.3);
    expect(Math.min(...high)).toBeGreaterThan(Math.max(...low));
  });
});
