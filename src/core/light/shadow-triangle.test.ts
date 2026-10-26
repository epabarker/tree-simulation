import { describe, expect, it } from "vitest";
import { defaultParams } from "../params.ts";
import type { LightSample } from "./light-model.ts";
import { ShadowTriangle } from "./shadow-triangle.ts";

const c2 = { ...defaultParams.c2, enabled: true, a: 1, b: 2, qMax: 3, C: 1 };
const out: LightSample = { q: 0, vx: 0, vy: 0 };

describe("C2 shadow triangle (§C2)", () => {
  it("deposits a·b^(−q) in a triangle widening downwards", () => {
    const g = new ShadowTriangle(21, 21, c2);
    g.deposit(10.5, 10.5);
    const at = (col: number, row: number) => g.s[row * 21 + col];
    expect(at(10, 10)).toBe(1); // own cell, q = 0
    expect(at(10, 11)).toBe(0); // nothing above
    for (const col of [9, 10, 11]) expect(at(col, 9)).toBe(0.5);
    expect(at(8, 9)).toBe(0);
    for (const col of [8, 9, 10, 11, 12]) expect(at(col, 8)).toBe(0.25);
    for (let col = 7; col <= 13; col++) expect(at(col, 7)).toBe(0.125);
    expect(at(6, 7)).toBe(0);
    expect(at(10, 6)).toBe(0); // beyond qMax
    let total = 0;
    for (const v of g.s) total += v;
    expect(total).toBeCloseTo(1 + 3 / 2 + 5 / 4 + 7 / 8, 12);
  });

  it("gives Q = max(C − s + a, 0): a bud does not shade itself", () => {
    const g = new ShadowTriangle(21, 21, c2);
    g.deposit(10.5, 10.5);
    g.sample(10.5, 10.5, Math.PI / 2, out);
    expect(out.q).toBe(1); // own deposit cancelled: fully lit
    g.deposit(10.5, 9.5); // a second bud one cell below
    g.sample(10.5, 9.5, Math.PI / 2, out);
    expect(out.q).toBeCloseTo(0.5, 12); // C − (a + a/b) + a
    g.deposit(10.5, 9.5); // a third bud sharing that cell
    g.sample(10.5, 9.5, Math.PI / 2, out);
    expect(out.q).toBe(0); // clamped at zero
  });

  it("points V at the least-shaded cell in the wedge, away from shade", () => {
    const g = new ShadowTriangle(30, 30, { ...c2, perceptionAngle: 90, perceptionDistance: 4 });
    g.addWall({ x: 0, y: 0, width: 15, height: 30, shade: 5 });
    g.sample(15.2, 10.5, Math.PI / 2, out);
    expect(out.vx).toBeGreaterThan(0);
    expect(Math.hypot(out.vx, out.vy)).toBeCloseTo(1, 12);
  });

  it("treats everything outside the world box as opaque", () => {
    const g = new ShadowTriangle(10, 10, c2);
    for (const [x, y] of [
      [-0.5, 5],
      [10.5, 5],
      [5, 10.5],
      [5, -0.5],
    ] as const) {
      g.sample(x, y, Math.PI / 2, out);
      expect(out.q).toBe(0);
    }
  });
});
