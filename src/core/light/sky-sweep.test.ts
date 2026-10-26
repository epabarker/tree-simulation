import { describe, expect, it } from "vitest";
import { defaultParams } from "../params.ts";
import type { LightSample } from "./light-model.ts";
import { SkySweep } from "./sky-sweep.ts";

const base = { ...defaultParams.c2, enabled: true, model: "sky" as const, C: 1, kExt: 0.5 };
const out: LightSample = { q: 0, vx: 0, vy: 0 };
const UP = Math.PI / 2;

function sky(width: number, height: number, overrides: Partial<typeof base> = {}): SkySweep {
  return new SkySweep(width, height, { ...base, ...overrides });
}

describe("C2 sky sweep (§C2.4, M6)", () => {
  it("gives full light C and an upward V under an empty symmetric sky", () => {
    const g = sky(12, 10);
    g.clear();
    g.compute();
    for (const [x, y] of [
      [0.5, 0.5],
      [6.5, 4.5],
      [11.5, 9.5],
    ] as const) {
      g.sample(x, y, UP, out);
      expect(out.q).toBeCloseTo(1, 12);
      expect(out.vx).toBeCloseTo(0, 12);
      expect(out.vy).toBeCloseTo(1, 12);
    }
  });

  it("attenuates exactly by Beer–Lambert along a vertical ray", () => {
    const g = sky(11, 10, { K: 1 }); // zenith only
    g.clear();
    g.deposit(5.5, 8.5);
    g.deposit(5.5, 8.5);
    g.deposit(5.5, 7.5);
    g.compute();
    g.sample(5.5, 6.5, UP, out);
    expect(out.q).toBeCloseTo(Math.exp(-0.5 * 3), 12);
    g.sample(4.5, 6.5, UP, out); // the next column is unshaded
    expect(out.q).toBeCloseTo(1, 12);
  });

  it("does not let a cell's own foliage shade the buds in it", () => {
    const g = sky(11, 10, { K: 1 });
    g.clear();
    for (let i = 0; i < 4; i++) g.deposit(5.5, 5.5);
    g.compute();
    g.sample(5.5, 5.5, UP, out);
    expect(out.q).toBeCloseTo(1, 12);
    g.sample(5.5, 4.5, UP, out); // the cell below is shaded by all four
    expect(out.q).toBeCloseTo(Math.exp(-0.5 * 4), 12);
  });

  it("attenuates shallow rays exactly through a full-height column", () => {
    const g = sky(20, 12, { K: 2, minElevation: 20 }); // two shallow rays, 20° and 160°
    g.clear();
    for (let row = 0; row < 12; row++) for (let i = 0; i < 3; i++) g.deposit(12.5, row + 0.5);
    g.compute();
    g.sample(11.5, 5.5, UP, out); // just left of the column
    const step = 1 / Math.cos(20 * (Math.PI / 180));
    // Light from the right crosses the column (3 units of leaf area); light from the left is open.
    expect(out.q).toBeCloseTo(0.5 * Math.exp(-0.5 * 3 * step) + 0.5, 12);
    expect(out.vx).toBeLessThan(0); // brighter sky to the left
  });

  it("turns V away from foliage to one side, toward the gap (side light)", () => {
    const g = sky(30, 20);
    g.clear();
    for (let row = 4; row < 20; row++)
      for (let col = 4; col < 12; col++) g.deposit(col + 0.5, row + 0.5);
    g.compute();
    g.sample(14.5, 3.5, UP, out); // right of and below a dense block
    expect(out.q).toBeLessThan(1);
    expect(out.vx).toBeGreaterThan(0.1);
  });

  it("lets sky light in through the sides of the world, but nothing grows outside it", () => {
    const g = sky(20, 20);
    g.clear();
    for (let row = 0; row < 20; row++)
      for (let col = 2; col < 20; col++) g.deposit(col + 0.5, row + 0.5);
    g.compute();
    g.sample(0.5, 2.5, UP, out); // at the left edge, everything to the right is foliage
    expect(out.q).toBeGreaterThan(0.1);
    expect(out.vx).toBeLessThan(0); // light comes in from beyond the left side
    g.sample(-0.5, 2.5, UP, out);
    expect(out.q).toBe(0);
    g.sample(5, 20.5, UP, out);
    expect(out.q).toBe(0);
  });

  it("brightens the side the sky is tilted toward (oblique sun, §C2.6)", () => {
    const g = sky(12, 10, { skyTilt: 0.6 });
    g.clear();
    g.compute();
    g.sample(6.5, 4.5, UP, out);
    expect(out.q).toBeCloseTo(1, 12); // weights still sum to C
    expect(out.vx).toBeGreaterThan(0.1);
  });
});
