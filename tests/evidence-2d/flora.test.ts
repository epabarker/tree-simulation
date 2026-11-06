import { describe, expect, it } from "vitest";
import { loneParams, shadeParams, standParams } from "../../cli/trials.ts";
import { type FloraName, HAND_FLORA } from "../../src/core/flora.ts";
import { mergeParams, type Params } from "../../src/core/params.ts";
import { presetParams } from "../../src/core/presets.ts";
import { groundLight, treeMetrics, World } from "../world.ts";

const SEEDS = [1, 2, 3];
const SIX = [1, 2, 3, 4, 5, 6];
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
    const world = new World(shadeParams(species, seed, roof));
    world.step();
    light += groundLight(world, 0, 6) / SEEDS.length;
    world.run(29);
    if (world.trees[0]?.alive) alive++;
    world.dispose();
  }
  return { alive, light };
}

function stand(species: FloraName) {
  const ms = [];
  const floor = [];
  for (const seed of SEEDS) {
    const world = new World(standParams(species, seed));
    world.run(60);
    for (const t of world.trees.slice(2, -2)) if (t.alive) ms.push(treeMetrics(t, world));
    floor.push(groundLight(world, 50, 180));
    world.dispose();
  }
  return {
    slenderness: mean(ms.map((m) => m.slenderness)),
    crownRatio: mean(ms.map((m) => m.crownRatio)),
    ground: mean(floor),
  };
}

function lone(species: FloraName) {
  const ms = SEEDS.map((seed) => {
    const world = new World(loneParams(species, seed));
    world.run(60);
    const m = treeMetrics(world.trees[0] as NonNullable<(typeof world.trees)[0]>, world);
    world.dispose();
    return m;
  });
  return {
    spread: mean(ms.map((m) => m.crownWidth / m.height)),
    slenderness: mean(ms.map((m) => m.slenderness)),
    branchAngle: mean(ms.map((m) => m.branchAngle)),
  };
}

describe("calibrated species (M19)", () => {
  it("orders shade tolerance birch < oak < beech in a shade house", () => {
    // ≈ 13% of the sky: oak waits, birch starves. Saplings' minimum light: birch 21%, sessile oak
    // 11.4%, beech 3.4% (Hagemeier & Leuschner 2019; fitted since M27, ADR 0020 addendum).
    const thirteen = { birch: shadeHouse("birch", 3.3), oak: shadeHouse("oak", 3.3) };
    expect(thirteen.oak.light).toBeGreaterThan(0.1);
    expect(thirteen.oak.light).toBeLessThan(0.15);
    expect(thirteen.birch.alive).toBe(0);
    expect(thirteen.oak.alive).toBe(3);
    // ≈ 3%: only beech, tolerant, lives.
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
    expect(oak.branchAngle).toBeGreaterThan(birch.branchAngle);
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
      world.dispose();
    }
    // In some runs oak, not beech, takes a storm gap; across runs beech gains the canopy.
    // Storms keep some gaps for birch and oak, so beech holds about half the canopy, not all.
    expect(mean(beech)).toBeGreaterThan(0.45);
    expect(mean(birch[1])).toBeLessThan(0.75 * mean(birch[0]));
  });

  it("breaks an open oak into big limbs through acrotony (§R2.4, 5 seeds)", () => {
    // First-order limbs at least half as thick as the stem where they leave it.
    // A test of the mechanism on the hand-tuned oak (M19), whose limbs it was measured on.
    const bigLimbs = (kappa: number) =>
      [1, 2, 3, 4, 5].reduce((sum, seed) => {
        const base = presetParams("oakOpen", seed);
        const oak = HAND_FLORA.oak as NonNullable<Params["species"]>[string];
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
        world.dispose();
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
        world.dispose();
      }
      return thrown / trees;
    };
    // Measured: the fitted oak (M27b), 1 lone oak in 5 against 19 of 50 stand oaks; the hand-tuned
    // one, 1 in 5 against 21 of 50.
    expect(thrownShare("oakWood")).toBeGreaterThan(1.5 * thrownShare("oakOpen"));
  });
});

describe("the M25 species", () => {
  it("orders shade tolerance pine < willow < rowan < maple < holly, hornbeam", () => {
    // Niinemets & Valladares 2006: pine 1.67, willow 2.16, rowan 2.73, maple 3.18, holly 3.86,
    // hornbeam 3.97. At ≈ 13% of the sky willow and rowan wait; pine starves.
    expect(shadeHouse("rowan", 3.3).alive).toBe(3);
    expect(shadeHouse("willow", 3.3).alive).toBe(3);
    expect(shadeHouse("pine", 3.3).alive).toBe(0);
    // ≈ 8%: rowan and field maple still live; willow, a pioneer, does not.
    expect(shadeHouse("rowan", 4).alive).toBe(3);
    expect(shadeHouse("maple", 4).alive).toBe(3);
    expect(shadeHouse("willow", 4).alive).toBe(0);
    // ≈ 5%: neither rowan nor maple.
    expect(shadeHouse("rowan", 4.8).alive).toBe(0);
    expect(shadeHouse("maple", 4.8).alive).toBe(0);
    // ≈ 3%: holly and hornbeam live with beech.
    expect(shadeHouse("holly", 5.6).alive).toBe(3);
    expect(shadeHouse("hornbeam", 5.6).alive).toBe(3);
    // ≈ 2%: only holly, set to live under the fitted beech's 1.3–1.5% floor (M27b; it would vanish
    // from the mixed wood otherwise), a little out of the score order with hornbeam.
    expect(shadeHouse("holly", 6.5).alive).toBe(3);
    expect(shadeHouse("hornbeam", 6.5).alive).toBe(0);
  });

  it("casts deep shade under hornbeam and holly, light shade under pine and willow", () => {
    const pine = stand("pine");
    const willow = stand("willow");
    const hornbeam = stand("hornbeam");
    const holly = stand("holly");
    for (const s of [hornbeam, holly]) expect(s.ground).toBeLessThan(0.05);
    for (const s of [pine, willow]) expect(s.ground).toBeGreaterThan(0.08);
    for (const s of [pine, willow]) expect(s.ground).toBeGreaterThan(3 * holly.ground);
    // Holly keeps its shaded lower limbs; Scots pine sheds them for a higher crown.
    expect(holly.crownRatio).toBeGreaterThan(0.65);
    expect(pine.crownRatio).toBeLessThan(holly.crownRatio - 0.25);
  });

  it("grows a broad willow, a round maple, a conical holly, all smaller than beech", () => {
    const beech = lone("beech");
    const height = (sp: FloraName) => {
      const world = grown(1, { trees: [{ x: 80, species: sp }] });
      world.run(60);
      const h = treeMetrics(world.trees[0] as NonNullable<(typeof world.trees)[0]>, world).height;
      world.dispose();
      return h;
    };
    expect(lone("willow").spread).toBeGreaterThan(1.2);
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
    // Totals over six seeds: single runs vary widely (one grows no beech, another keeps its
    // pioneers in storm gaps). Measured: birch and willow 19 canopy trees at season 50, 6 at 400;
    // beech 13 and hornbeam 9 at 400.
    const canopy = (world: World) =>
      world.trees.filter((t) => t.alive && treeMetrics(t, world).height >= 30);
    const of = (trees: World["trees"], sp: string[]) =>
      trees.filter((t) => sp.includes(t.species ?? "")).length;
    let early = 0;
    let late = 0;
    let beech = 0;
    let hornbeam = 0;
    let shadeBearers = 0;
    for (const seed of SIX) {
      const world = new World(presetParams("mixedWood", seed));
      world.run(50);
      early += of(canopy(world), ["birch", "willow"]);
      world.run(350);
      const trees = canopy(world);
      late += of(trees, ["birch", "willow"]);
      beech += of(trees, ["beech"]);
      hornbeam += of(trees, ["hornbeam"]);
      shadeBearers += of(
        world.trees.filter((t) => t.alive),
        ["holly", "hornbeam"],
      );
      world.dispose();
    }
    expect(late).toBeLessThan(0.5 * early);
    expect(beech).toBeGreaterThan(hornbeam);
    expect(shadeBearers).toBeGreaterThanOrEqual(2 * SIX.length);
  });

  it("brings goat willow back to a clearing only through seed rain (ADR 0018)", () => {
    // An old mixed wood, a 60-cell clearing felled at season 300, then 40 seasons. Measured
    // (six seeds): 9 willows in all with rain, in 4 of the 6 clearings; none without.
    const willows = (rain: boolean) =>
      SIX.reduce((sum, seed) => {
        const params = presetParams("mixedWood", seed);
        if (!rain)
          for (const sp of Object.values(params.species ?? {}))
            if (sp.o4) sp.o4 = { ...sp.o4, rain: 0 };
        const world = new World(params);
        world.run(300);
        for (const t of world.trees)
          if (t.alive && t.rootX >= 60 && t.rootX < 120) world.removeTree(t.id);
        world.run(40);
        const n = world.trees.filter(
          (t) => t.alive && t.rootX >= 55 && t.rootX < 125 && t.species === "willow",
        ).length;
        world.dispose();
        return sum + n;
      }, 0);
    expect(willows(false)).toBe(0);
    expect(willows(true)).toBeGreaterThanOrEqual(4);
  });
});
