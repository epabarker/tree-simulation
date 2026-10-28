import { describe, expect, it } from "vitest";
import { type FixtureName, fixtureParams } from "../fixtures.ts";
import { treeMetrics } from "../metrics.ts";
import { defaultParams, mergeParams, type PaLevel, type Params } from "../params.ts";
import { PRE_R1 } from "../presets.ts";
import { BudState, Slot, type Tree } from "../tree.ts";
import { loneParams, withAssign } from "../trials.ts";
import { World } from "../world.ts";
import { juvenileCap, shootSize } from "./c1-buds.ts";
import { directionParams, lambdaAt, lateralCount, terminates } from "./r2-physiological-age.ts";

/** These checks are the M7 evidence, so they run the retired presets (fixtures.ts) as they were before R1 and R3. */
const presetParams = (name: FixtureName, seed?: number) =>
  mergeParams(fixtureParams(name, seed), PRE_R1);

const row = (r: Partial<PaLevel>): PaLevel => ({
  lambda: 0.5,
  setPoint: 0,
  eta: 0.15,
  branchAngle: 45,
  generator: "distichous",
  tierEvery: 0,
  pTerm: 0,
  ...r,
});
const withR2 = (levels: PaLevel[], extra: Partial<Params["r2"]> = {}): Params =>
  mergeParams(defaultParams, { r2: { enabled: true, levels, ...extra } });

describe("R2 physiological age (§R2, ADR 0009)", () => {
  it("places lateral buds by the axis's generator", () => {
    const r2 = withR2([
      row({ generator: "whorled" }),
      row({ generator: "whorled", tierEvery: 3 }),
      row({ generator: "opposite" }),
      row({ generator: "none" }),
    ]).r2;
    expect(lateralCount(0, 4, false, r2)).toBe(0); // whorled: only where a growth unit starts
    expect(lateralCount(0, 4, true, r2)).toBe(2);
    expect([0, 1, 2, 3, 4, 5].map((k) => lateralCount(1, k, false, r2))).toEqual([
      0, 0, 2, 0, 0, 2,
    ]);
    expect(lateralCount(2, 0, false, r2)).toBe(2);
    expect(lateralCount(3, 0, true, r2)).toBe(0);
    expect(lateralCount(7, 0, true, r2)).toBe(0); // pa is capped at the last row
    expect(lateralCount(0, 0, true, defaultParams.r2)).toBe(1); // off: distichous baseline
  });

  it("reads λ by pa and lowers it linearly after age a_c (ontogeny)", () => {
    const p = withR2([row({ lambda: 0.56 }), row({ lambda: 0.52 })], {
      aC: 10,
      dLambda: 0.06,
      ramp: 20,
    });
    expect(lambdaAt(0, 5, p)).toBe(0.56);
    expect(lambdaAt(3, 10, p)).toBe(0.52);
    expect(lambdaAt(0, 20, p)).toBeCloseTo(0.53, 12);
    expect(lambdaAt(0, 100, p)).toBeCloseTo(0.5, 12);
    expect(lambdaAt(0, 100, defaultParams)).toBe(defaultParams.c3.lambda);
  });

  it("terminates shoots with probability p_term, deterministically", () => {
    const p = withR2([row({ pTerm: 0 }), row({ pTerm: 1 }), row({ pTerm: 0.5 })]);
    const ids = Array.from({ length: 2000 }, (_, i) => i);
    expect(ids.some((id) => terminates(0, 0, id, 3, p))).toBe(false);
    expect(ids.every((id) => terminates(1, 0, id, 3, p))).toBe(true);
    const half = ids.filter((id) => terminates(2, 0, id, 3, p)).length / ids.length;
    expect(half).toBeGreaterThan(0.45);
    expect(half).toBeLessThan(0.55);
    expect(ids.map((id) => terminates(2, 0, id, 3, p))).toEqual(
      ids.map((id) => terminates(2, 0, id, 3, p)),
    );
  });

  it("gives each pa its own A_set and η", () => {
    const p = withR2([row({ setPoint: 0, eta: 0.4 }), row({ setPoint: 85, eta: 2 })]);
    const of = directionParams(p);
    expect(of(0).setPoint).toBe(0);
    expect(of(1)).toMatchObject({ setPoint: 85, eta: 2, xi: p.c4.xi });
    expect(of(4).setPoint).toBe(85);
    expect(directionParams(defaultParams)(3)).toBe(defaultParams.c4);
  });

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
  it("raises the shoot cap from 1 metamer to the full cap as the tree grows to h_j", () => {
    const p = withR2([row({})], { hJ: 20 });
    const max = p.c1.maxMetamersPerShoot;
    expect(juvenileCap(0, p)).toBe(1);
    expect(juvenileCap(10, p)).toBeCloseTo(1 + (max - 1) / 2, 12);
    expect(juvenileCap(20, p)).toBe(max);
    expect(juvenileCap(80, p)).toBe(max);
    // Off: h_j 0 or absent, or R2 off.
    expect(juvenileCap(0, withR2([row({})]))).toBe(max);
    expect(juvenileCap(0, mergeParams(p, { r2: { enabled: false } }))).toBe(max);
  });

  it("caps a shoot's resource: a fractional cap gives one longer metamer", () => {
    const out = { length: 0 };
    expect(shootSize(10, defaultParams, out, 1.5)).toBe(1);
    expect(out.length).toBeCloseTo(1.5 * defaultParams.c1.internodeLength, 12);
  });

  it("slows a young tree's height growth, most while it is small", () => {
    const heights = (assign: Record<string, unknown>) => {
      const w = new World(withAssign(loneParams("oak", 1), "oak", assign));
      const t = w.trees[0] as Tree;
      w.run(10);
      const h10 = treeMetrics(t, w).height;
      w.run(50);
      return [h10, treeMetrics(t, w).height] as const;
    };
    const [full10, full60] = heights({});
    const [young10, young60] = heights({ "r2.hJ": 60 });
    // At 10 seasons the juvenile oak is less than half as tall; by 60 it is within a fifth.
    expect(young10).toBeLessThan(0.5 * full10);
    expect(young60).toBeGreaterThan(0.8 * full60);
  });
});
