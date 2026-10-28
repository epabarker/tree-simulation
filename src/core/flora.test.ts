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
    // Every stand lifts its crown well clear of the ground (pure stands: about half the stem).
    for (const s of [birch, oak, beech]) expect(s.crownRatio).toBeLessThan(0.65);
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
      beech.push(late.beech);
    }
    // In some runs oak, not beech, takes a storm gap; across runs beech gains the canopy.
    // Storms keep some gaps for birch and oak, so beech holds about half the canopy, not all.
    expect(mean(beech)).toBeGreaterThan(0.45);
    expect(mean(birch[1])).toBeLessThan(0.75 * mean(birch[0]));
  });

  it("breaks an open oak into big limbs through acrotony (§R2.4, 5 seeds)", () => {
    // First-order limbs at least half as thick as the stem where they leave it.
    const bigLimbs = (kappa: number) =>
      [1, 2, 3, 4, 5].reduce((sum, seed) => {
        const base = presetParams("oakOpen", seed);
        const oak = base.species?.oak as NonNullable<Params["species"]>[string];
        const world = new World(
          mergeParams(base, {
            species: { ...base.species, oak: { ...oak, r2: { ...oak.r2, kappa } } },
          }),
        );
        world.run(80);
        const t = world.trees[0] as NonNullable<(typeof world.trees)[0]>;
        const c = t.m.cols;
        let n = 0;
        for (let i = 1; i < t.m.length; i++) {
          const p = c.parent[i] as number;
          if (c.order[i] === 1 && c.order[p] === 0 && c.radius[i] > 0.5 * c.radius[p]) n++;
        }
        return sum + n;
      }, 0);
    // Measured: 30 big limbs with κ = 3 against 24 without acrotony.
    expect(bigLimbs(3)).toBeGreaterThan(bigLimbs(0));
  });

  it("throws slender stand trees in storms far more often than a squat open oak", () => {
    const thrownShare = (preset: "oakOpen" | "oakWood") => {
      let thrown = 0;
      let trees = 0;
      for (const seed of [1, 2, 3, 4, 5]) {
        const world = new World(
          mergeParams(presetParams(preset, seed), {
            o2: { stormP: 0.3, stormLoad: 1.5 },
            o4: { enabled: false },
          }),
        );
        world.run(80);
        for (const t of world.trees) {
          trees++;
          if (!t.alive && t.broken === t.m.length) thrown++;
        }
      }
      return thrown / trees;
    };
    // Measured: 1 lone oak in 5 against 21 of 50 stand oaks.
    expect(thrownShare("oakWood")).toBeGreaterThan(2 * thrownShare("oakOpen"));
  });
});

describe("the M25 species", () => {
  it("orders shade tolerance pine, willow < rowan < maple < holly, hornbeam", () => {
    // ≈ 13% of the sky: rowan waits, the pioneers starve (Pinus and Salix score lowest).
    expect(shadeHouse("rowan", 3.3).alive).toBe(3);
    expect(shadeHouse("willow", 3.3).alive).toBe(0);
    expect(shadeHouse("pine", 3.3).alive).toBe(0);
    // ≈ 5%: field maple, mid-tolerant, lives; rowan does not.
    expect(shadeHouse("maple", 4.8).alive).toBe(3);
    expect(shadeHouse("rowan", 4.8).alive).toBe(0);
    // ≈ 3%: holly and hornbeam live with beech; maple does not.
    expect(shadeHouse("holly", 5.6).alive).toBe(3);
    expect(shadeHouse("hornbeam", 5.6).alive).toBe(3);
    expect(shadeHouse("maple", 5.6).alive).toBe(0);
  });

  it("casts deep shade under hornbeam and holly, light shade under pine and willow", () => {
    const pine = stand("pine");
    const willow = stand("willow");
    const hornbeam = stand("hornbeam");
    const holly = stand("holly");
    for (const s of [hornbeam, holly]) expect(s.ground).toBeLessThan(0.05);
    for (const s of [pine, willow]) expect(s.ground).toBeGreaterThan(0.1);
    // Holly keeps its shaded lower limbs; Scots pine sheds them for a high crown.
    expect(holly.crownRatio).toBeGreaterThan(0.65);
    expect(pine.crownRatio).toBeLessThan(0.4);
  });

  it("grows a broad willow, a round maple, a conical holly, all smaller than beech", () => {
    const beech = lone("beech");
    const height = (sp: FloraName) => {
      const world = grown(1, { trees: [{ x: 80, species: sp }] });
      world.run(60);
      return treeMetrics(world.trees[0] as NonNullable<(typeof world.trees)[0]>, world).height;
    };
    expect(lone("willow").spread).toBeGreaterThan(1.5);
    const maple = lone("maple").spread;
    expect(maple).toBeGreaterThan(0.8);
    expect(maple).toBeLessThan(1.4);
    expect(lone("holly").spread).toBeLessThan(0.7);
    expect(lone("rowan").branchAngle).toBeLessThan(beech.branchAngle - 10);
    const tall = height("beech");
    for (const sp of ["holly", "rowan", "willow", "maple"] as const)
      expect(height(sp)).toBeLessThan(0.8 * tall);
  });

  it("lets the mixed wood's pioneers give way to beech, with holly and hornbeam beneath", () => {
    const canopy = (world: World) =>
      world.trees.filter((t) => t.alive && treeMetrics(t, world).height >= 30);
    const of = (trees: World["trees"], sp: string[]) =>
      trees.filter((t) => sp.includes(t.species ?? "")).length;
    let early = 0;
    let late = 0;
    let beech = 0;
    let shadeBearers = 0;
    for (const seed of SEEDS) {
      const world = new World(presetParams("mixedWood", seed));
      world.run(50);
      early += of(canopy(world), ["birch", "willow"]);
      world.run(300);
      const trees = canopy(world);
      late += of(trees, ["birch", "willow"]);
      beech += of(trees, ["beech"]);
      shadeBearers += of(
        world.trees.filter((t) => t.alive),
        ["holly", "hornbeam"],
      );
    }
    // Measured (10 seeds, with seed rain): birch and willow 2.8 canopy trees a run at season 50,
    // 0.1 at 350; beech 3.1 at 350, the most of any species; holly and hornbeam 6.8 live trees.
    expect(late).toBeLessThan(0.4 * early);
    expect(beech).toBeGreaterThanOrEqual(SEEDS.length);
    expect(shadeBearers).toBeGreaterThanOrEqual(2 * SEEDS.length);
  });

  it("brings goat willow back to a clearing only through seed rain (ADR 0018)", () => {
    // An old mixed wood, a 60-cell clearing felled at season 300, then 40 seasons. Measured
    // (6 seeds): no willow in any clearing without rain, 1–2 in every one with it.
    const willows = (rain: boolean) =>
      SEEDS.map((seed) => {
        const params = presetParams("mixedWood", seed);
        if (!rain)
          for (const sp of Object.values(params.species ?? {}))
            if (sp.o4) sp.o4 = { ...sp.o4, rain: 0 };
        const world = new World(params);
        world.run(300);
        for (const t of world.trees)
          if (t.alive && t.rootX >= 60 && t.rootX < 120) world.removeTree(t.id);
        world.run(40);
        return world.trees.filter(
          (t) => t.alive && t.rootX >= 55 && t.rootX < 125 && t.species === "willow",
        ).length;
      });
    for (const n of willows(false)) expect(n).toBe(0);
    for (const n of willows(true)) expect(n).toBeGreaterThanOrEqual(1);
  });
});
