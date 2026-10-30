/**
 * The 3D core's structure (I2, ADR 0025), held every season: parent before child, ids ascending,
 * each metamer starting at its parent's tip, frames orthonormal, laterals in their phyllotactic
 * slots; determinism, replay, and freeing dead trees. These hold for any calibration; the
 * calibrated milestone claims are tests/evidence-2d's, for C1–C8 to re-derive in 3D.
 */
import { describe, expect, it } from "vitest";
import { presetParams } from "../src/core/presets.ts";
import { hashWorld, type Tree, World } from "./world.ts";

function checkInvariants(tree: Tree): void {
  const c = tree.m.cols;
  for (let i = 0; i < tree.m.length; i++) {
    expect(c.parent[i]).toBeLessThan(i);
    if (i > 0) expect(c.birthId[i]).toBeGreaterThan(c.birthId[i - 1] as number);
    const p = c.parent[i] as number;
    if (p >= 0) {
      expect(c.baseX[i]).toBeCloseTo(tree.tipX(p), 9);
      expect(c.baseY[i]).toBeCloseTo(tree.tipY(p), 9);
      expect(c.baseZ[i]).toBeCloseTo(tree.tipZ(p), 9);
    }
    const [hx, hy, hz] = [c.hx[i] as number, c.hy[i] as number, c.hz[i] as number];
    const [lx, ly, lz] = [c.lx[i] as number, c.ly[i] as number, c.lz[i] as number];
    expect(Math.hypot(hx, hy, hz)).toBeCloseTo(1, 9);
    expect(Math.hypot(lx, ly, lz)).toBeCloseTo(1, 9);
    expect(Math.abs(hx * lx + hy * ly + hz * lz)).toBeLessThan(1e-9);
    expect(c.slot[i]).toBeLessThan(8);
  }
  const b = tree.b.cols;
  for (let i = 0; i < tree.b.length; i++) {
    expect(b.metamer[i]).toBeGreaterThanOrEqual(0);
    expect(b.metamer[i]).toBeLessThan(tree.m.length);
  }
}

describe("the 3D core's structure (I2)", () => {
  it("keeps the invariants every season, in a stand with every principle", () => {
    const world = new World(presetParams("skyStand"));
    for (let s = 0; s < 12; s++) {
      world.step();
      for (const tree of world.trees) if (tree.alive) checkInvariants(tree);
    }
  });

  it("grows in depth: crowns spread in z as well as x", () => {
    const world = new World(presetParams("skyTree"));
    world.run(20);
    const m = world.metricsOf(world.trees[0] as Tree);
    expect(m.crownDepth).toBeGreaterThan(0.5 * m.crownWidth);
  });

  it("explodes exponentially when every bud grows, at one metamer a season on the leader", () => {
    const world = new World(presetParams("explosion"));
    let prev = (world.trees[0] as Tree).m.length;
    for (let s = 0; s < 8; s++) {
      world.step();
      const n = (world.trees[0] as Tree).m.length;
      expect(n / prev).toBeGreaterThan(1.5);
      prev = n;
    }
    expect(world.metricsOf(world.trees[0] as Tree).height).toBeCloseTo(9, 9);
  });

  it("is deterministic and replays exactly from its record", () => {
    const a = new World(presetParams("skyStand", 7));
    a.run(6);
    const b = new World(presetParams("skyStand", 7));
    b.run(6);
    expect(hashWorld(a)).toBe(hashWorld(b));
    const c = new World(presetParams("skyStand", 7));
    c.run(3);
    c.setParams({ c1: { branchAngle: 30 } });
    c.removeTree(2);
    c.plantTree(100.5, undefined, 20);
    c.run(3);
    const record = c.record();
    const replay = new World(record.params);
    replay.run(record.seasons, record.events);
    expect(hashWorld(replay)).toBe(hashWorld(c));
    expect(hashWorld(c)).not.toBe(hashWorld(a));
  });

  it("lists the snapshot's rows far to near (zOrder, I3): a permutation, z0 descending", () => {
    const world = new World(presetParams("skyStand", 3));
    world.run(10);
    const s = world.snapshot(0, { junctions: false, field: false });
    const n = s.metamerCount;
    expect(n).toBeGreaterThan(100);
    expect(s.zOrder).toHaveLength(n);
    const seen = new Uint8Array(n);
    for (let k = 0; k < n; k++) seen[s.zOrder[k] as number]++;
    expect(seen.every((c) => c === 1)).toBe(true);
    for (let k = 1; k < n; k++) {
      const [a, b] = [s.zOrder[k - 1] as number, s.zOrder[k] as number];
      const [za, zb] = [s.z0[a] as number, s.z0[b] as number];
      expect(za > zb || (za === zb && a < b)).toBe(true);
    }
  });

  it("frees dead trees' rows without changing any live tree", () => {
    const kept = new World(presetParams("skyStand"));
    const freed = new World(presetParams("skyStand"));
    for (const w of [kept, freed]) {
      w.run(6);
      w.removeTree(1);
      w.removeTree(4);
      w.run(4);
    }
    expect(freed.discardDead()).toBe(2);
    for (const t of freed.trees) if (!t.alive) expect(t.m.length + t.b.length).toBe(0);
    kept.run(3);
    freed.run(3);
    const lean = { junctions: false, field: false };
    const a = kept.snapshot(0, lean);
    const b = freed.snapshot(0, lean);
    for (const key of ["tree", "birthId", "x0", "y0", "z0", "radius"] as const) {
      expect(Array.from(b[key])).toEqual(Array.from(a[key]));
    }
  });
});
