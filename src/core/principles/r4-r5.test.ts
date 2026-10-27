import { describe, expect, it } from "vitest";
import {
  defaultParams,
  mergeParams,
  type PaLevel,
  type Params,
  type ParamsPatch,
} from "../params.ts";
import { growBuds } from "../season.ts";
import { BudState, Slot, type Tree } from "../tree.ts";
import { World } from "../world.ts";
import { addBud, addMetamer, formAxillaryBuds } from "./c1-buds.ts";
import { removeBranches } from "./c5-shedding.ts";
import { aborts, growthThreshold, lightReleases, releasedShift } from "./r4-dormancy.ts";
import { elongation, setPointScale, shadedLambda, shadeOf } from "./r5-shade.ts";

const params = (patch: ParamsPatch = {}): Params =>
  mergeParams(mergeParams(defaultParams, { r4: { enabled: true } }), patch);

/** A world holding one seedling; its lateral bud (index 1) is made dormant at light q. */
function seedling(p: Params, q: number): { world: World; tree: Tree } {
  const world = new World(mergeParams(p, { trees: [{ x: 10 }] }));
  const tree = world.trees[0] as Tree;
  tree.ensureScratch();
  const b = tree.b.cols;
  for (let j = 0; j < tree.b.length; j++) b.v[j] = 0;
  b.state[1] = BudState.dormant;
  b.q[1] = q;
  return { world, tree };
}

describe("R4 dormancy, release and reiteration (§R4, ADR 0012)", () => {
  it("needs v_cont to continue but v_break·(1 + δ·age)·(1 + δ_b·s) to break", () => {
    const p = params({ r4: { vBreak: 2, vCont: 1.2, delta: 0.1 } });
    expect(growthThreshold(BudState.active, 5, 0.5, defaultParams)).toBe(1); // R4 off
    expect(growthThreshold(BudState.active, 5, 0.5, p)).toBe(1.2);
    expect(growthThreshold(BudState.shortShoot, 5, 0.5, p)).toBe(1.2);
    expect(growthThreshold(BudState.dormant, 5, 0.5, p)).toBeCloseTo(2 * 1.5, 12);
    const shaded = mergeParams(p, { r5: { enabled: true, dB: 2 } });
    expect(growthThreshold(BudState.dormant, 5, 0.5, shaded)).toBeCloseTo(2 * 1.5 * 2, 12);
  });

  it("releases a dormant bud by its own light, Q ≥ Q_rel·(1 + δ·age)", () => {
    const p = params({ r4: { qRel: 0.1, delta: 0.1 } });
    expect(lightReleases(0.19, 10, p)).toBe(false);
    expect(lightReleases(0.2, 10, p)).toBe(true);
    expect(lightReleases(1, 0, defaultParams)).toBe(false); // R4 off
  });

  it("aborts dormant buds older than L_dorm, and only dormant ones", () => {
    const r4 = { ...params().r4, lDorm: 10 };
    expect(aborts(BudState.dormant, 10, r4)).toBe(false);
    expect(aborts(BudState.dormant, 11, r4)).toBe(true);
    expect(aborts(BudState.shortShoot, 50, r4)).toBe(false);
  });

  it("pays a light-released shoot from the reserve, and reiterates it", () => {
    const p = params({ r1: { enabled: true }, r4: { qRel: 0.1, juvenile: 1 } });
    const { world, tree } = seedling(p, 0.5);
    tree.reserve = 3;
    growBuds(world, tree, 0);
    expect(tree.released).toBe(1);
    expect(tree.reserve).toBe(2);
    const c = tree.m.cols;
    const sprout = tree.m.length - 1;
    expect(c.order[sprout]).toBe(1);
    expect(c.paShift[sprout]).toBe(1); // pa 0: a trunk-like shoot
    expect(releasedShift(1, 0, p.r4)).toBe(1);
    expect(releasedShift(1, 1, p.r4)).toBe(1); // never below pa 0

    const broke = seedling(p, 0.5);
    broke.tree.reserve = 0.5; // cannot pay
    broke.world.params.r4.lDorm = 3;
    broke.tree.b.cols.age[1] = 3; // the terminal bud is new; only this one passes L_dorm
    growBuds(broke.world, broke.tree, 0);
    expect(broke.tree.released).toBe(0);
    expect(broke.tree.aborted).toBe(1); // and, past L_dorm, it aborts

    const off = seedling(mergeParams(p, { r4: { enabled: false } }), 0.5);
    growBuds(off.world, off.tree, 0);
    expect(off.tree.b.cols.state[1]).toBe(BudState.dormant);
  });

  it("looks up R2 rows by order − paShift, so a reiterated shoot behaves like its parent axis", () => {
    const row = (generator: PaLevel["generator"]): PaLevel => ({
      lambda: 0.5,
      setPoint: 0,
      eta: 0.15,
      branchAngle: 45,
      generator,
      tierEvery: 0,
      pTerm: 0,
    });
    const p = mergeParams(params(), {
      r2: { enabled: true, levels: [row("opposite"), row("none")] },
    });
    const { tree } = seedling(p, 0);
    const lateral = addMetamer(tree, 0, Slot.right, 0, 1, 0.02, 1);
    const before = tree.b.length;
    formAxillaryBuds(tree, lateral, p);
    expect(tree.b.length).toBe(before); // pa 1: no laterals
    tree.m.cols.paShift[lateral] = 1;
    formAxillaryBuds(tree, lateral, p);
    expect(tree.b.length).toBe(before + 2); // pa 0: opposite
  });

  it("leaves a dormant bud in the slot of a shed branch (bud bank)", () => {
    const p = params();
    const { tree } = seedling(p, 0);
    const limb = addMetamer(tree, 0, Slot.left, Math.PI / 2 + 0.7, 1, 0.02, 1);
    addBud(tree, limb, Slot.main, Math.PI / 2 + 0.7, 1);
    const dead = new Uint8Array(tree.m.length);
    dead[limb] = 1;
    const budsBefore = tree.b.length;
    removeBranches(tree, dead, p);
    const b = tree.b.cols;
    const banked = tree.b.length - 1;
    expect(tree.b.length).toBe(budsBefore + 1);
    expect(b.state[banked]).toBe(BudState.dormant);
    expect(b.metamer[banked]).toBe(0);
    expect(b.slot[banked]).toBe(Slot.left);
    expect(b.order[banked]).toBe(1);
    expect(b.angle[banked]).toBeCloseTo(Math.PI / 2 + (45 * Math.PI) / 180, 12);
    expect(tree.m.cols.scarSumN[0]).toBeCloseTo(0.02 ** 2, 12);

    const noBank = seedling(mergeParams(p, { r4: { bank: false } }), 0).tree;
    const limb2 = addMetamer(noBank, 0, Slot.left, 1, 1, 0.02, 1);
    const dead2 = new Uint8Array(noBank.m.length);
    dead2[limb2] = 1;
    const n = noBank.b.length;
    removeBranches(noBank, dead2, mergeParams(p, { r4: { bank: false } }));
    expect(noBank.b.length).toBe(n);
  });
});

describe("R5 shade avoidance (§R5, ADR 0012)", () => {
  it("maps shade s = 1 − Q/C to elongation, leader bias and a more upright set-point", () => {
    const r5 = { ...defaultParams.r5, enabled: true, eS: 0.4, dLambda: 0.05, dA: 0.5 };
    expect(shadeOf(0.25, 1)).toBe(0.75);
    expect(shadeOf(2, 1)).toBe(0);
    expect(elongation(0.5, r5)).toBeCloseTo(1.2, 12);
    expect(shadedLambda(0.5, 0.5, r5)).toBeCloseTo(0.525, 12);
    expect(shadedLambda(0.98, 1, r5)).toBe(0.99);
    expect(setPointScale(0.5, r5)).toBeCloseTo(0.75, 12);
    const off = defaultParams.r5;
    expect(elongation(1, off)).toBe(1);
    expect(shadedLambda(0.5, 1, off)).toBe(0.5);
    expect(setPointScale(1, off)).toBe(1);
  });

  it("lengthens a shaded bud's internodes", () => {
    const p = params({ r4: { enabled: false }, r5: { enabled: true, eS: 0.5 } });
    const { world, tree } = seedling(p, 0);
    const b = tree.b.cols;
    b.state[1] = BudState.active;
    b.q[0] = 1; // open sky: s = 0
    b.q[1] = 0.2; // s = 0.8
    b.v[0] = 1;
    b.v[1] = 1;
    growBuds(world, tree, 0);
    const c = tree.m.cols;
    const lengths = [c.length[1], c.length[2]].sort();
    expect(lengths[0]).toBeCloseTo(1, 12);
    expect(lengths[1]).toBeCloseTo(1.4, 12);
  });
});
