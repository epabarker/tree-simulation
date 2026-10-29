import { describe, expect, it } from "vitest";
import { type FixtureName, fixtureParams, isFixtureName } from "../../src/core/fixtures.ts";
import { HAND_FLORA } from "../../src/core/flora.ts";
import { mergeParams, type ParamsPatch, patchSpecies } from "../../src/core/params.ts";
import { PRE_R4, type PresetName, presetParams } from "../../src/core/presets.ts";
import type { Tree } from "./rust.ts";
import { isLiveBud, limbShapes, World } from "./rust.ts";

// M9 visible test (§7, ADR 0011): drooping limbs with upturned tips, a weeping form, Troll
// straightening, and Δ > 2 at heavy junctions with stress-driven girth. 5 seeds each.
const SEEDS = [1, 2, 3, 4, 5];
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
/** Elevation of a direction above the horizontal, degrees, whichever side it heads. */
const elevation = (a: number) => (Math.atan2(Math.sin(a), Math.abs(Math.cos(a))) * 180) / Math.PI;
/** Deviation of a direction from vertical, degrees, positive to the right. */
const signedTilt = (a: number) => (Math.atan2(Math.cos(a), Math.sin(a)) * 180) / Math.PI;
/** Deviation of a direction from vertical, degrees, either side. */
const tilt = (a: number) => Math.abs(signedTilt(a));
/** R3 off, and R3 without posture control. */
const PRE_R3 = { r3: { enabled: false } } satisfies ParamsPatch;
const NO_POSTURE = { r3: { posture: false } } satisfies ParamsPatch;

/** These checks are the M9 evidence, so they run the presets as they were before R4 and R5. */
function grow(
  preset: PresetName | FixtureName,
  seed: number,
  seasons: number,
  patch: ParamsPatch = {},
): Tree {
  const base = isFixtureName(preset) ? fixtureParams(preset, seed) : presetParams(preset, seed);
  const world = new World(mergeParams(mergeParams(base, PRE_R4), patch));
  world.run(seasons);
  return world.trees[0] as Tree;
}

/** Leonardo exponent at each junction, split by whether a lateral there carries stress wood. */
function junctions(tree: Tree): { heavy: number[]; other: number[] } {
  const c = tree.m.cols;
  const kids: number[][] = [];
  for (let i = 1; i < tree.m.length; i++) {
    const list = kids[c.parent[i]] ?? [];
    list.push(i);
    kids[c.parent[i]] = list;
  }
  const heavy: number[] = [];
  const other: number[] = [];
  kids.forEach((ks, p) => {
    if (ks.length < 2) return;
    const ratios = ks.map((k) => (c.radius[k] as number) / (c.radius[p] as number));
    if (ratios.some((x) => x >= 1)) return;
    const f = (d: number) => ratios.reduce((s, x) => s + x ** d, 0) - 1;
    let lo = 0.5;
    let hi = 8;
    for (let it = 0; it < 50; it++) {
      const mid = (lo + hi) / 2;
      if (f(mid) > 0) lo = mid;
      else hi = mid;
    }
    const reinforced = ks.some((k) => c.slot[k] !== 0 && c.stressWood[k] > 0.1 * c.radius[k]);
    (reinforced ? heavy : other).push((lo + hi) / 2);
  });
  return { heavy, other };
}

const open = SEEDS.map((seed) => grow("skyTree", seed, 60));

describe("M9: mechanics (§R3, ADR 0011)", () => {
  it("bends old limbs down and turns their tips up (open-grown tree)", () => {
    const shapes = open.flatMap(limbShapes);
    expect(shapes.length).toBeGreaterThan(10);
    expect(median(shapes.map((s) => s.droop))).toBeGreaterThan(10);
    expect(median(shapes.map((s) => s.upturn))).toBeGreaterThan(8);
    const rigid = SEEDS.flatMap((seed) => limbShapes(grow("skyTree", seed, 60, PRE_R3)));
    expect(median(rigid.map((s) => s.droop))).toBeLessThan(3);
  });

  it("keeps trunks upright only with posture control (§8 ablation: sag without posture)", () => {
    // The main stem: from the base, always into the thickest child (pipe model). An open-grown
    // tree may lose its first leader to a lateral that takes over (decurrence, M18), and then
    // the order-0 axis is a side limb while the stem carries on upright.
    const trunkTilt = (tree: Tree) => {
      const c = tree.m.cols;
      const thickest = new Int32Array(tree.m.length).fill(-1);
      for (let i = 1; i < tree.m.length; i++) {
        const p = c.parent[i] as number;
        const best = thickest[p] as number;
        if (p >= 0 && (best < 0 || (c.radius[i] as number) > (c.radius[best] as number)))
          thickest[p] = i;
      }
      const tilts: number[] = [];
      for (let i = 0; i >= 0; i = thickest[i] as number) tilts.push(tilt(c.angle[i] as number));
      return median(tilts);
    };
    const upright = median(open.map(trunkTilt));
    const sagging = median(SEEDS.map((s) => trunkTilt(grow("skyTree", s, 60, NO_POSTURE))));
    expect(upright).toBeLessThan(10);
    // Measured along the main stem (M18): 3.7° with posture control against 16° without.
    expect(sagging).toBeGreaterThan(3 * upright);
  });

  it("weeps: most twigs hang below −30°, against a quarter without R3", () => {
    const hanging = (tree: Tree) => {
      const b = tree.b.cols;
      const c = tree.m.cols;
      let n = 0;
      let down = 0;
      for (let j = 0; j < tree.b.length; j++) {
        const m = b.metamer[j];
        if (!isLiveBud(b.state[j]) || c.order[m] < 1) continue;
        n += 1;
        if (elevation(c.angle[m]) < -30) down += 1;
      }
      return down / n;
    };
    const weeping = SEEDS.map((s) => hanging(grow("weeping", s, 60)));
    const rigid = SEEDS.map((s) => hanging(grow("weeping", s, 60, PRE_R3)));
    expect(Math.min(...weeping)).toBeGreaterThan(0.6);
    expect(Math.max(...rigid)).toBeLessThan(0.35);
  });

  it("straightens a plagiotropic leader into an upright trunk (Troll), and sprawls without posture", () => {
    const oldTrunkTilt = (tree: Tree, season: number) => {
      const c = tree.m.cols;
      const tilts: number[] = [];
      for (let i = 0; i < tree.m.length; i++) {
        if (c.order[i] === 0 && season - c.birthSeason[i] >= 10) tilts.push(tilt(c.angle[i]));
      }
      return median(tilts);
    };
    for (const seed of SEEDS) {
      expect(oldTrunkTilt(grow("troll", seed, 40), 40)).toBeLessThan(10);
      expect(oldTrunkTilt(grow("troll", seed, 40, NO_POSTURE), 40)).toBeGreaterThan(60);
    }
  });

  it("raises the Leonardo exponent above 2 where heavy laterals carry stress wood", () => {
    const all = open.map(junctions);
    const heavy = all.flatMap((j) => j.heavy);
    const other = all.flatMap((j) => j.other);
    expect(heavy.length).toBeGreaterThan(20);
    expect(median(heavy)).toBeGreaterThan(2.03);
    expect(Math.abs(median(other) - 2)).toBeLessThan(0.02);
  });

  it("rights a seedling planted at 40° within a few seasons, overshooting a little (§10, Bastien et al. 2013)", () => {
    // The trunk's chord, root to the top of the trunk axis, and its mid-stem metamer (M26).
    const trunk = (tree: Tree) => {
      const c = tree.m.cols;
      const up = new Int32Array(tree.m.length).fill(-1);
      for (let i = 1; i < tree.m.length; i++) {
        if (c.slot[i] === 0 && c.order[i] === 0) up[c.parent[i]] = i;
      }
      const axis: number[] = [];
      for (let i = 0; i >= 0; i = up[i] as number) axis.push(i);
      const top = axis[axis.length - 1] as number;
      const chord = Math.atan2(tree.tipY(top), tree.tipX(top) - tree.rootX);
      return { chord: tilt(chord), mid: signedTilt(c.angle[axis[axis.length >> 1] as number]) };
    };
    for (const seed of SEEDS) {
      for (const posture of [true, false]) {
        const base = mergeParams(presetParams("oakOpen", seed), {
          world: { width: 160, height: 160, walls: [] },
          trees: [{ x: 80, species: "oak", lean: 40 }],
        });
        // A test of R3 on the hand-tuned oak (M19, M26): the fitted one's juvenile phase keeps a
        // seedling light, so it barely sags even without posture control.
        const hand = mergeParams(base, { species: { ...base.species, oak: HAND_FLORA.oak } });
        const world = new World(patchSpecies(hand, "oak", { r3: { posture } }));
        let overshoot = 0;
        for (let s = 0; s < 20; s++) {
          world.run(1);
          overshoot = Math.min(overshoot, trunk(world.trees[0] as Tree).mid);
        }
        const { chord } = trunk(world.trees[0] as Tree);
        if (posture) {
          expect(chord).toBeLessThan(5);
          expect(overshoot).toBeLessThan(-1); // swings past vertical on the way
        } else expect(chord).toBeGreaterThan(30);
      }
    }
  });
});
