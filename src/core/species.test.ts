import { describe, expect, it } from "vitest";
import { type TreeMetrics, treeMetrics } from "./metrics.ts";
import { mergeParams, type ParamsPatch } from "./params.ts";
import { presetParams as currentPreset, M6_LIGHT, PRE_R1, type PresetName } from "./presets.ts";
import type { Tree } from "./tree.ts";
import { World } from "./world.ts";

/** These checks are the M6–M7 evidence, so they run the presets as they were before R1 and R3, under the M6 light sweep. */
const presetParams = (name: PresetName, seed?: number) =>
  mergeParams(mergeParams(currentPreset(name, seed), PRE_R1), M6_LIGHT);

// M7 visible test (§7, ADR 0009): the three species presets against their §9 silhouettes.
const SEEDS = [1, 2, 3, 4, 5];
const SEASONS = 50;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

function grow(preset: PresetName, seed: number, patch: ParamsPatch = {}): World {
  const world = new World(mergeParams(presetParams(preset, seed), patch));
  world.run(SEASONS);
  return world;
}

/** Median angle of first-order metamers from vertical, degrees (0 up, 90 horizontal). */
function branchAngle(tree: Tree): number {
  const c = tree.m.cols;
  const angles: number[] = [];
  for (let i = 0; i < tree.m.length; i++) {
    if (c.order[i] !== 1) continue;
    angles.push((Math.atan2(Math.abs(Math.cos(c.angle[i])), Math.sin(c.angle[i])) * 180) / Math.PI);
  }
  return median(angles);
}

/** Widest tip half-width in the lower third of the crown over that in the upper third. */
function lowerOverUpper(tree: Tree): number {
  let height = 0;
  for (let i = 0; i < tree.m.length; i++) height = Math.max(height, tree.tipY(i));
  let lower = 0;
  let upper = 0;
  for (let i = 0; i < tree.m.length; i++) {
    const dx = Math.abs(tree.tipX(i) - tree.rootX);
    const h = tree.tipY(i) / height;
    if (h < 1 / 3) lower = Math.max(lower, dx);
    else if (h > 2 / 3) upper = Math.max(upper, dx);
  }
  return lower / upper;
}

const open = (preset: PresetName, patch: ParamsPatch = {}) =>
  SEEDS.map((seed) => grow(preset, seed, patch).trees[0] as Tree);
const conifers = open("conifer");
const birches = open("birch");
const tropicals = open("tropical");
const interior = (preset: PresetName): TreeMetrics[] =>
  SEEDS.flatMap((seed) =>
    grow(preset, seed)
      .trees.slice(1, -1)
      .map((t) => treeMetrics(t)),
  );

describe("M7: species from R2 tables (§9, ADR 0009; 5 seeds, 50 seasons)", () => {
  it("grows the conifer as a cone of near-horizontal tiers (Massart)", () => {
    for (const tree of conifers) {
      expect(branchAngle(tree)).toBeGreaterThan(65);
      expect(lowerOverUpper(tree)).toBeGreaterThan(1.2);
    }
  });

  it("grows conifer stands as narrow spires on clear boles with realistic H/D", () => {
    const stand = interior("coniferStand");
    expect(median(stand.map((m) => m.boleHeight / m.height))).toBeGreaterThan(0.4);
    expect(median(stand.map((m) => m.crownWidth / m.height))).toBeLessThan(0.25);
    const hd = median(stand.map((m) => m.slenderness));
    expect(hd).toBeGreaterThan(60);
    expect(hd).toBeLessThan(100);
  });

  it("grows the birch with steep fine branches and broadens it with age (ontogeny)", () => {
    for (const [i, birch] of birches.entries()) {
      expect(branchAngle(birch)).toBeLessThan(branchAngle(conifers[i] as Tree) - 30);
    }
    const ratio = (trees: Tree[]) =>
      median(trees.map((t) => treeMetrics(t)).map((m) => m.crownWidth / m.height));
    expect(ratio(birches)).toBeGreaterThan(1.2 * ratio(open("birch", { r2: { dLambda: 0 } })));
  });

  it("lifts the crown of a light-demanding birch stand faster than a shade-tolerant one", () => {
    const birch = interior("birchStand");
    const conifer = interior("coniferStand");
    const lift = (ms: TreeMetrics[]) => median(ms.map((m) => m.boleHeight / m.height));
    expect(lift(birch)).toBeGreaterThan(lift(conifer));
  });

  it("grows the tropical tree as a pagoda of flat tiers, widest at the base (Aubréville)", () => {
    for (const tree of tropicals) {
      expect(branchAngle(tree)).toBeGreaterThan(60);
      expect(lowerOverUpper(tree)).toBeGreaterThan(1);
    }
  });
});
