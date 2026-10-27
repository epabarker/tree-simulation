import { describe, expect, it } from "vitest";
import type { FloraName } from "./flora.ts";
import { groundLight, treeMetrics } from "./metrics.ts";
import { mergeParams, type Params } from "./params.ts";
import { presetParams } from "./presets.ts";
import { World } from "./world.ts";

const SEEDS = [1, 2, 3];
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

/** The woodland's growth rules without stand dynamics or storms (oakOpen's), for `trees`. */
function grown(seed: number, patch: Partial<Params>): World {
  return new World(mergeParams(presetParams("oakOpen", seed), patch));
}

/** Seedlings that live through 30 seasons under a roof letting through `light` of the sky. */
function shadeHouse(species: FloraName, roof: number): { alive: number; light: number } {
  let alive = 0;
  let light = 0;
  for (const seed of SEEDS) {
    const world = grown(seed, {
      world: {
        width: 40,
        height: 60,
        walls: [{ x: 0, y: 40, width: 40, height: 1, shade: roof }],
        sides: "periodic",
      },
      trees: [{ x: 20, species }],
    });
    world.step();
    light += groundLight(world, 0, 6) / SEEDS.length;
    world.run(29);
    if (world.trees[0]?.alive) alive++;
  }
  return { alive, light };
}

const STAND = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209];

function stand(species: FloraName) {
  const ms = [];
  const floor = [];
  for (const seed of SEEDS) {
    const world = grown(seed, {
      world: { width: 230, height: 130, walls: [] },
      trees: STAND.map((x) => ({ x, species })),
    });
    world.run(60);
    for (const t of world.trees.slice(2, -2)) if (t.alive) ms.push(treeMetrics(t, world));
    floor.push(groundLight(world, 50, 180));
  }
  return {
    slenderness: mean(ms.map((m) => m.slenderness)),
    crownRatio: mean(ms.map((m) => m.crownRatio)),
    ground: mean(floor),
  };
}

function lone(species: FloraName) {
  const ms = SEEDS.map((seed) => {
    const world = grown(seed, { trees: [{ x: 80, species }] });
    world.run(60);
    return treeMetrics(world.trees[0] as NonNullable<(typeof world.trees)[0]>, world);
  });
  return {
    spread: mean(ms.map((m) => m.crownWidth / m.height)),
    slenderness: mean(ms.map((m) => m.slenderness)),
    branchAngle: mean(ms.map((m) => m.branchAngle)),
  };
}

describe("calibrated species (M19)", () => {
  it("orders shade tolerance birch < oak < beech in a shade house", () => {
    // ≈ 8% of the sky: oak and beech wait, birch starves (intolerant species need 10–15%).
    const eight = { birch: shadeHouse("birch", 4), oak: shadeHouse("oak", 4) };
    expect(eight.oak.light).toBeGreaterThan(0.06);
    expect(eight.oak.light).toBeLessThan(0.1);
    expect(eight.birch.alive).toBe(0);
    expect(eight.oak.alive).toBe(3);
    // ≈ 3%: only beech, tolerant, lives (tolerant saplings survive at 1–3%).
    const three = { oak: shadeHouse("oak", 5.6), beech: shadeHouse("beech", 5.6) };
    expect(three.beech.light).toBeLessThan(0.04);
    expect(three.oak.alive).toBe(0);
    expect(three.beech.alive).toBe(3);
  });

  it("grows slender stands whose floors darken from birch to oak to beech", () => {
    const birch = stand("birch");
    const oak = stand("oak");
    const beech = stand("beech");
    for (const s of [birch, oak, beech]) {
      expect(s.slenderness).toBeGreaterThan(60);
      expect(s.slenderness).toBeLessThan(90);
    }
    expect(beech.ground).toBeLessThan(0.05);
    expect(beech.ground).toBeLessThan(oak.ground);
    expect(oak.ground).toBeLessThan(birch.ground);
    // The light-demander lifts its crown; the tolerant beech keeps the deepest crown.
    expect(beech.crownRatio).toBeGreaterThan(birch.crownRatio);
  });

  it("grows an open oak broad and squat, with wider limbs than a birch's", () => {
    const oak = lone("oak");
    const birch = lone("birch");
    expect(oak.spread).toBeGreaterThan(1);
    expect(oak.slenderness).toBeLessThan(55);
    expect(oak.branchAngle).toBeGreaterThan(birch.branchAngle + 10);
  });

  it("replaces birch pioneers with beech over a few centuries (3 seeds)", () => {
    const beech: number[] = [];
    const birch: [number[], number[]] = [[], []];
    for (const seed of SEEDS) {
      const world = new World(presetParams("succession", seed));
      const share = () => {
        const canopy = world.trees.filter((t) => t.alive && treeMetrics(t, world).height >= 30);
        const of = (sp: string) => canopy.filter((t) => t.species === sp).length / canopy.length;
        return { birch: of("birch"), beech: of("beech") };
      };
      world.run(50);
      const early = share();
      world.run(250);
      const late = share();
      birch[0].push(early.birch);
      birch[1].push(late.birch);
      expect(late.beech).toBeGreaterThan(early.beech);
      beech.push(late.beech);
    }
    // Storms keep some gaps for birch and oak, so beech holds about half the canopy, not all.
    expect(mean(beech)).toBeGreaterThan(0.45);
    expect(mean(birch[1])).toBeLessThan(0.75 * mean(birch[0]));
  });
});
