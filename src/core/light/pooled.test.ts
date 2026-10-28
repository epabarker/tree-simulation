import { describe, expect, it } from "vitest";
import { defaultParams } from "../params.ts";
import type { LightSample } from "./light-model.ts";
import { PooledLight } from "./pooled.ts";

const c2 = { ...defaultParams.c2, enabled: true, model: "pooled" as const, C: 1, kExt: 0.5 };
const out: LightSample = { q: 0, vx: 0, vy: 0 };

describe("C2 pooled light (§8 ablation, M22)", () => {
  it("gives every leaf a homogeneous canopy's mean light, (1 − e^(−kL))/(kL)", () => {
    const light = new PooledLight(10, 20, c2);
    // 40 units of leaf area over 10 columns: L = 4, kL = 2.
    for (let i = 0; i < 40; i++) light.deposit((i % 10) + 0.5, 3 + (i % 7));
    light.compute();
    const expected = (1 - Math.exp(-2)) / 2;
    for (const [x, y] of [
      [0.5, 0.5],
      [5.5, 12.5],
      [9.5, 19.5],
    ] as const) {
      light.sample(x, y, Math.PI / 2, out);
      expect(out.q).toBeCloseTo(expected, 12);
      expect(out.vx).toBe(0);
      expect(out.vy).toBe(1);
    }
  });

  it("gives full light C to an empty world, none outside it, and forgets last season", () => {
    const light = new PooledLight(10, 20, c2);
    light.deposit(5, 5, 50);
    light.compute();
    light.clear();
    light.compute();
    light.sample(5, 5, 0, out);
    expect(out.q).toBe(1);
    light.sample(-1, 5, 0, out);
    expect(out.q).toBe(0);
    light.sample(5, 25, 0, out);
    expect(out.q).toBe(0);
  });
});
