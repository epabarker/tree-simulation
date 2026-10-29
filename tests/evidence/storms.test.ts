import { describe, expect, it } from "vitest";
import { fixtureParams } from "../../src/core/fixtures.ts";
import { mergeParams } from "../../src/core/params.ts";
import { presetParams } from "../../src/core/presets.ts";
import type { Tree } from "./rust.ts";
import { World } from "./rust.ts";

const lowestTip = (world: World): number => {
  let low = Number.POSITIVE_INFINITY;
  for (const t of world.trees) {
    if (!t.alive) continue;
    for (let i = 0; i < t.m.length; i++) low = Math.min(low, t.tipY(i));
  }
  return low;
};

describe("ground contact (M16, r3.ground)", () => {
  it("lets weeping limbs sink below the ground without it, and rest on it with it (3 seeds)", () => {
    let sankSomewhere = false;
    for (let seed = 1; seed <= 3; seed++) {
      const base = fixtureParams("weeping", seed);
      const sinking = new World(base);
      const resting = new World(mergeParams(base, { r3: { ...base.r3, ground: true } }));
      for (let s = 0; s < 60; s++) {
        sinking.step();
        resting.step();
        expect(lowestTip(resting)).toBeGreaterThan(-1e-9);
      }
      if (lowestTip(sinking) < -0.5) sankSomewhere = true;
      expect((resting.trees[0] as Tree).alive).toBe(true);
    }
    expect(sankSomewhere).toBe(true); // the rule had something to do
  });
});

describe("storms (M16, o2.stormP)", () => {
  it("break limbs and throw trees only in storm seasons, and never without storms (3 seeds)", () => {
    let storms = 0;
    let brokenInStorms = 0;
    let thrown = 0;
    for (let seed = 1; seed <= 3; seed++) {
      const world = new World(presetParams("forest", seed));
      for (let s = 0; s < 250; s++) {
        const alive = world.trees.filter((t) => t.alive);
        world.step();
        let broken = 0;
        for (const t of alive) {
          if (!t.alive && t.broken > 0) thrown++;
          else broken += t.broken;
        }
        if (world.storm) {
          storms++;
          brokenInStorms += broken;
        } else {
          expect(broken).toBe(0); // calm seasons break nothing: stress wood holds σ ≤ σ_target
        }
      }
    }
    expect(storms).toBeGreaterThan(20); // ≈ 5% of 750 seasons
    expect(brokenInStorms / storms).toBeGreaterThan(30);
    expect(thrown).toBeGreaterThan(2);

    const calm = new World(
      mergeParams(presetParams("forest", 1), { o2: { ...presetParams("forest").o2, stormP: 0 } }),
    );
    for (let s = 0; s < 100; s++) {
      calm.step();
      expect(calm.storm).toBe(false);
      for (const t of calm.trees) expect(t.broken).toBe(0);
    }
  });
});
