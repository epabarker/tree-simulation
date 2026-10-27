import { describe, expect, it } from "vitest";
import { defaultParams, mergeParams, type Params } from "../params.ts";
import { BudState, Slot, Tree } from "../tree.ts";
import { addBud, addMetamer } from "./c1-buds.ts";
import { junctionExponents, updateGirth } from "./c6-girth.ts";
import { postureTurn, updateMechanics, wrapAngle } from "./r3-mechanics.ts";

const params = (r3: Partial<Params["r3"]> = {}): Params =>
  mergeParams(defaultParams, {
    c6: { enabled: true },
    r3: { enabled: true, posture: false, girthGain: 0, ...r3 },
  });

/** A horizontal limb of `n` metamers pointing right from x = 10, radius r, one leafy tip bud. */
function limb(n: number, r: number): Tree {
  const tree = new Tree(0, 10);
  let parent = -1;
  for (let k = 0; k < n; k++) {
    parent = addMetamer(tree, parent, Slot.main, 0, 1, r, 0);
  }
  addBud(tree, parent, Slot.main, 0, 0);
  tree.ensureScratch();
  for (let i = 0; i < n; i++) tree.prevRadius[i] = r;
  return tree;
}

const I = (r: number) => (Math.PI * r ** 4) / 4;

describe("R3 mechanics (§R3, ADR 0011)", () => {
  it("bends each metamer by −φ·M/(E·πr⁴/4)·l, with M = S − W·x_base, and carries children along", () => {
    const p = params({ sag: "creep", phi: 0.5, E: 1e4, leafMass: 0.01 });
    const r = 0.1;
    const tree = limb(2, r);
    updateMechanics(tree, p);
    const c = tree.m.cols;
    const wood = Math.PI * r * r; // one metamer, l = 1
    const M1 = wood * 0.5 + 0.01 * 1; // second metamer about its own base (x = 11)
    const M0 = wood * 0.5 + wood * 1.5 + 0.01 * 2; // first metamer about the root
    expect(c.moment[1]).toBeCloseTo(M1, 12);
    expect(c.moment[0]).toBeCloseTo(M0, 12);
    const turn0 = (-0.5 * M0) / (1e4 * I(r));
    const turn1 = (-0.5 * M1) / (1e4 * I(r));
    expect(c.angle[0]).toBeCloseTo(turn0, 12); // clockwise: the limb droops
    expect(c.angle[1]).toBeCloseTo(turn0 + turn1, 12);
    expect(c.baseX[1]).toBeCloseTo(10 + Math.cos(turn0), 12);
    expect(c.baseY[1]).toBeCloseTo(Math.sin(turn0), 12);
    expect(tree.b.cols.angle[0]).toBeCloseTo(turn0 + turn1, 12); // buds turn with their metamer
  });

  it("sets only the load increment by default: an unchanged load does not bend again", () => {
    const run = (sag: Params["r3"]["sag"]) => {
      const p = params({ sag, E: 1e4, leafMass: 0.01 });
      const tree = limb(3, 0.1);
      updateMechanics(tree, p);
      const first = tree.m.cols.angle[0] as number;
      updateMechanics(tree, p);
      return [first, (tree.m.cols.angle[0] as number) - first];
    };
    const [firstInc, secondInc] = run("increment");
    expect(firstInc).toBeLessThan(0);
    // The limb turned, so its lever shrank a little: the second increment is tiny and upward.
    expect(Math.abs(secondInc as number)).toBeLessThan(0.05 * Math.abs(firstInc as number));
    const [firstCreep, secondCreep] = run("creep");
    expect(secondCreep).toBeLessThan(0.8 * (firstCreep as number)); // creep keeps bending
  });

  it("springs a limb back up when its load drops (a shed sub-branch)", () => {
    const p = params({ E: 1e4, leafMass: 0.05 });
    const tree = limb(3, 0.1);
    updateMechanics(tree, p);
    const before = tree.m.cols.angle[0] as number;
    tree.b.cols.state[0] = BudState.gone; // the leaves go
    updateMechanics(tree, p);
    expect(tree.m.cols.angle[0]).toBeGreaterThan(before);
  });

  it("turns toward the posture set-point, −β_g·sin(A − A_set) − γ·kink, within ±c·Δr/r", () => {
    const r3 = { ...defaultParams.r3, betaG: 0.1, gamma: 0.2, c: 1 };
    // Leaning 0.3 rad left of vertical, set-point vertical: turns clockwise.
    expect(postureTurn(Math.PI / 2 + 0.3, 0, 0, 1, r3)).toBeCloseTo(-0.1 * Math.sin(0.3), 12);
    // Leaning right: counter-clockwise. A plagiotropic set-point is taken on the side it heads.
    expect(postureTurn(Math.PI / 2 - 0.3, 0, 0, 1, r3)).toBeGreaterThan(0);
    expect(postureTurn(0.2, (80 * Math.PI) / 180, 0, 1, r3)).toBeLessThan(0);
    expect(postureTurn(Math.PI - 0.2, (80 * Math.PI) / 180, 0, 1, r3)).toBeGreaterThan(0);
    // Proprioception straightens a kink.
    expect(postureTurn(Math.PI / 2, 0, 0.1, 1, r3)).toBeCloseTo(-0.02, 12);
    // No new girth, no reaction wood; little new girth, a small turn.
    expect(postureTurn(Math.PI / 2 + 1, 0, 0, 0, r3)).toBeCloseTo(0, 12);
    expect(postureTurn(Math.PI / 2 + 1, 0, 0, 0.01, r3)).toBeCloseTo(-0.01, 12);
  });

  it("rights a leaning stem only as fast as it thickens", () => {
    const p = params({ posture: true, E: 1e12, betaG: 0.2, c: 1 });
    const lean = (grown: number) => {
      const tree = limb(1, 0.1);
      tree.m.cols.angle[0] = Math.PI / 2 + 0.5;
      tree.prevRadius[0] = 0.1 / (1 + grown);
      updateMechanics(tree, p);
      return Math.PI / 2 + 0.5 - (tree.m.cols.angle[0] as number);
    };
    expect(lean(0)).toBeCloseTo(0, 6);
    expect(lean(0.01)).toBeCloseTo(0.01 / 1.01, 6); // clamped at c·Δr/r
    expect(lean(1)).toBeCloseTo(0.2 * Math.sin(0.5), 6); // the full gravitropic turn
  });

  it("adds stress wood up to σ_target, kept out of the parent's pipe sum (Δ > n there)", () => {
    // The limb's base stress is ≈ 3·10⁴, the trunk's ≈ 1.1·10⁴: only the limb exceeds σ_target.
    const p = params({ E: 1e12, sigmaTarget: 2e4, girthGain: 1, leafMass: 1 });
    const tree = new Tree(0, 10);
    const trunk = addMetamer(tree, -1, Slot.main, Math.PI / 2, 1, 0.05, 0);
    const top = addMetamer(tree, trunk, Slot.main, Math.PI / 2, 1, 0.05, 0);
    const side = addMetamer(tree, trunk, Slot.right, 0, 3, 0.05, 0); // heavy, wide limb
    addBud(tree, top, Slot.main, Math.PI / 2, 0);
    addBud(tree, side, Slot.main, 0, 1);
    tree.ensureScratch();
    updateGirth(tree, p);
    tree.prevRadius.set(tree.m.cols.radius.subarray(0, 3));
    expect(junctionExponents(tree)[0]).toBeCloseTo(2, 6);
    updateMechanics(tree, p);
    const c = tree.m.cols;
    expect(c.stressWood[side]).toBeGreaterThan(0);
    expect(tree.stress[side]).toBeLessThanOrEqual(1 + 1e-9); // never past σ_target
    const r = c.radius[side] as number;
    expect((4 * Math.abs(c.moment[side] as number)) / (Math.PI * r ** 3)).toBeCloseTo(2e4, 6);
    expect(c.stressWood[trunk]).toBe(0);
    updateGirth(tree, p);
    expect(c.radius[trunk]).toBeCloseTo(Math.sqrt(0.05 ** 2 * 2), 12); // pipes only
    expect(junctionExponents(tree)[0]).toBeGreaterThan(2.1);
  });

  it("wraps angles into (−π, π]", () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(wrapAngle(-Math.PI / 2 - 2 * Math.PI)).toBeCloseTo(-Math.PI / 2, 12);
  });
});
