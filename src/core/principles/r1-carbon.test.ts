import { describe, expect, it } from "vitest";
import { defaultParams, mergeParams, type Params, type ParamsPatch } from "../params.ts";
import { Tree } from "../tree.ts";
import { plantSeedling } from "./c1-buds.ts";
import { gatherLight } from "./c3-allocation.ts";
import { carbonBalance, starvedToDeath } from "./r1-carbon.ts";

const params = (r1: Partial<Params["r1"]> = {}, extra: ParamsPatch = {}): Params =>
  mergeParams(mergeParams(defaultParams, { r1: { enabled: true, ...r1 } }), extra);

/** A seedling (one metamer, a terminal and an axillary bud) with every bud at light q. */
function seedling(p: Params, q: number): Tree {
  const tree = new Tree(0, 10);
  plantSeedling(tree, p, 0);
  tree.ensureScratch();
  for (let i = 0; i < tree.b.length; i++) tree.b.cols.q[i] = q;
  gatherLight(tree, p.r6);
  return tree;
}

describe("R1 carbon balance (§R1, ADR 0010)", () => {
  it("produces α·Σ leaf·Q·exp(−L_path/L_h) and pays live sapwood plus foliage", () => {
    const p = params({ mw: 2, mf: 0.05, Lh: 10 });
    const tree = seedling(p, 0.5);
    carbonBalance(tree, p);
    const L = tree.m.cols.length[0] as number;
    const buds = tree.b.length;
    expect(tree.production).toBeCloseTo(p.c3.alpha * buds * 0.5 * Math.exp(-L / 10), 12);
    const sapwood = 2 * Math.PI * p.c6.r0 ** 2 * L;
    expect(tree.maintenance).toBeCloseTo(sapwood + 0.05 * buds, 12);
  });

  it("charges only the pipes that serve foliage: heartwood (scars, kept radius) costs nothing", () => {
    const p = params({ mw: 2, mf: 0 });
    const a = seedling(p, 0.5);
    carbonBalance(a, p);
    const b = seedling(p, 0.5);
    b.m.cols.scarSumN[0] = 1; // a big shed branch's pipes
    b.m.cols.radius[0] = 1; // C6 memory
    carbonBalance(b, p);
    expect(b.maintenance).toBe(a.maintenance);
  });

  it("splits a surplus into reserve, reproduction (once mature, by height) and v_base", () => {
    const young = params({ mw: 0, mf: 0, sr: 0.2, fRep: 0.5, maturity: 100, store: 1e9 });
    const tree = seedling(young, 1);
    tree.age = 1;
    carbonBalance(tree, young);
    const N = tree.production;
    expect(tree.vBase).toBeCloseTo(0.8 * N, 12);
    expect(tree.reproduction).toBe(0);
    const mature = params({ mw: 0, mf: 0, sr: 0.2, fRep: 0.5, maturity: 0.5, store: 1e9 });
    const old = seedling(mature, 1);
    old.age = 1;
    carbonBalance(old, mature);
    expect(old.reproduction).toBeCloseTo(0.5 * N, 12);
    expect(old.vBase).toBeCloseTo(0.3 * N, 12);
  });

  it("draws a deficit from the reserve, then starves the tree after k_starve empty seasons", () => {
    const p = params({ mw: 0, mf: 1, kStarve: 3, reserve0: 2, store: 100 });
    const tree = seedling(p, 0); // dark: P = 0, M = m_f per bud
    carbonBalance(tree, p); // age 0: the seed's store covers the first season
    expect(tree.vBase).toBe(0);
    expect(tree.reserve).toBe(2 - tree.maintenance);
    for (let s = 1; s <= 10 && !starvedToDeath(tree, p.r1); s++) {
      tree.age = s;
      carbonBalance(tree, p);
    }
    expect(tree.reserve).toBe(0);
    expect(tree.starved).toBe(3);
    expect(starvedToDeath(tree, p.r1)).toBe(true);
    expect(starvedToDeath(tree, { ...p.r1, enabled: false })).toBe(false);
  });

  it("keeps at most `store` seasons of maintenance in reserve", () => {
    const p = params({ mw: 0, mf: 0.1, sr: 1, store: 2 });
    const tree = seedling(p, 1);
    for (let s = 0; s < 20; s++) {
      tree.age = s;
      carbonBalance(tree, p);
    }
    expect(tree.reserve).toBeCloseTo(2 * tree.maintenance, 12);
  });

  it("counts only leaf area: a dormant, leafless bud neither produces nor respires (with R6)", () => {
    const p = params({ mw: 0, mf: 0.1 }, { r6: { enabled: true, qMin: 0.5, leafArea: 2 } });
    const tree = seedling(p, 0.3);
    for (let i = 0; i < tree.b.length; i++) tree.b.cols.state[i] = 2; // dormant
    carbonBalance(tree, p);
    expect(tree.production).toBe(0);
    expect(tree.maintenance).toBeCloseTo(p.r1.mw, 12);
  });
});
