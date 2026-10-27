import { describe, expect, it } from "vitest";
import { hashWorld } from "./hash.ts";
import { treeMetrics } from "./metrics.ts";
import { presetParams } from "./presets.ts";
import { SnapshotBuilder } from "./snapshot.ts";
import { Slot, type Tree } from "./tree.ts";
import { World } from "./world.ts";

function checkInvariants(tree: Tree): void {
  const c = tree.m.cols;
  for (let i = 0; i < tree.m.length; i++) {
    // Parent before child (spec §5): the passes are plain forward and reverse loops.
    expect(c.parent[i]).toBeLessThan(i);
    // birthIds ascend in array order (append-only, order-keeping compaction).
    if (i > 0) expect(c.birthId[i]).toBeGreaterThan(c.birthId[i - 1]);
    // Each metamer starts at its parent's tip.
    const p = c.parent[i];
    if (p >= 0) {
      expect(c.baseX[i]).toBeCloseTo(tree.tipX(p), 9);
      expect(c.baseY[i]).toBeCloseTo(tree.tipY(p), 9);
    }
  }
  const b = tree.b.cols;
  for (let i = 0; i < tree.b.length; i++) {
    expect(b.metamer[i]).toBeGreaterThanOrEqual(0);
    expect(b.metamer[i]).toBeLessThan(tree.m.length);
  }
}

describe("M0: metamer graph, distichous buds, all buds grow", () => {
  it("keeps the structural invariants every season", () => {
    const world = new World(presetParams("explosion"));
    for (let s = 0; s < 9; s++) {
      world.step();
      for (const tree of world.trees) checkInvariants(tree);
    }
  });

  it("explodes exponentially when every bud grows (Borchert–Slade)", () => {
    const world = new World(presetParams("explosion"));
    let prev = (world.trees[0] as Tree).m.length;
    for (let s = 0; s < 10; s++) {
      world.step();
      const n = (world.trees[0] as Tree).m.length;
      expect(n / prev).toBeGreaterThan(1.5);
      prev = n;
    }
  });

  it("alternates lateral sides along each axis (distichous, §C1)", () => {
    const world = new World(presetParams("explosion"));
    for (let s = 0; s < 6; s++) world.step();
    const tree = world.trees[0] as Tree;
    const c = tree.m.cols;
    // Side of the lateral at each node of each axis, by axis and node position.
    const sides = new Map<number, Map<number, number>>();
    for (let i = 0; i < tree.m.length; i++) {
      if (c.slot[i] === Slot.main) continue;
      const p = c.parent[i];
      const byNode = sides.get(c.axis[p]) ?? new Map<number, number>();
      byNode.set(c.axisNode[p], c.slot[i]);
      sides.set(c.axis[p], byNode);
    }
    let checked = 0;
    for (const byNode of sides.values()) {
      for (const [node, slot] of byNode) {
        const next = byNode.get(node + 1);
        if (next === undefined) continue;
        expect(next).not.toBe(slot);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("is deterministic and replays exactly from its record", () => {
    const a = new World(presetParams("explosion", 7));
    a.run(8);
    const b = new World(presetParams("explosion", 7));
    b.run(8);
    expect(hashWorld(a)).toBe(hashWorld(b));

    const c = new World(presetParams("explosion", 7));
    c.run(3);
    c.setParams({ c1: { branchAngle: 30 } });
    c.run(5);
    const record = c.record();
    const replay = new World(record.params);
    replay.run(record.seasons, record.events);
    expect(hashWorld(replay)).toBe(hashWorld(c));
    expect(hashWorld(c)).not.toBe(hashWorld(a));
  });

  it("reports metrics consistent with the structure", () => {
    const world = new World(presetParams("explosion"));
    world.run(5);
    const m = treeMetrics(world.trees[0] as Tree);
    expect(m.metamers).toBe((world.trees[0] as Tree).m.length);
    expect(m.height).toBeCloseTo(6, 9); // one metamer per season on the leader, plus the seedling
  });
});

describe("discarding dead trees (the page's memory, M14)", () => {
  it("frees dead trees' rows without changing any live tree, and never replants them", () => {
    for (const preset of ["thinning", "forest"] as const) {
      const kept = new World(presetParams(preset));
      const freed = new World(presetParams(preset));
      let discarded = 0;
      for (let s = 0; s < 120; s++) {
        kept.step();
        freed.step();
        discarded += freed.discardDead();
      }
      expect(discarded).toBeGreaterThan(5); // trees did die and were freed
      for (const t of freed.trees) if (!t.alive) expect(t.m.length + t.b.length).toBe(0);
      const lean = { junctions: false, field: false };
      const a = new SnapshotBuilder().build(kept, 0, lean);
      const b = new SnapshotBuilder().build(freed, 0, lean);
      expect(b.metamerCount).toBe(a.metamerCount);
      for (const key of ["tree", "birthId", "x0", "y0", "angle", "length", "radius"] as const) {
        expect(Array.from(b[key])).toEqual(Array.from(a[key]));
      }
      expect(b.metrics).toEqual(a.metrics);
    }
  });
});

describe("M1: the shadow triangle regulates density", () => {
  it("grows far less than unchecked growth, and stops being exponential", () => {
    const seasons = 14;
    const free = new World(presetParams("explosion"));
    free.run(seasons);
    const shaded = new World(presetParams("shadow"));
    const counts: number[] = [];
    for (let s = 0; s < 30; s++) {
      shaded.step();
      counts.push((shaded.trees[0] as Tree).m.length);
    }
    const at = (season: number) => counts[season - 1] as number;
    expect(at(seasons)).toBeLessThan((free.trees[0] as Tree).m.length / 10);
    // Late growth ratio well below M0's ≈ 2 per season.
    expect(at(30) / at(29)).toBeLessThan(1.2);
    expect(at(30)).toBeGreaterThan(at(15));
  });

  it("leaves most interior buds dormant", () => {
    const world = new World(presetParams("shadow"));
    world.run(25);
    const m = treeMetrics(world.trees[0] as Tree);
    expect(m.dormantBuds / m.buds).toBeGreaterThan(0.5);
  });
});
