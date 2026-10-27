import { describe, expect, it } from "vitest";
import { addPuff, advanceWind, CALM, createWind, GALE, windAt } from "./wind.ts";

describe("wind on the page (M16)", () => {
  it("blows a gentle breeze whose gusts travel with it", () => {
    const w = createWind();
    const at = (x: number, t: number) => windAt(w, x, 50, t);
    for (let t = 0; t < 20; t += 0.7) expect(at(30, t)).toBeGreaterThan(0);
    expect(Math.max(...[0, 1, 2, 3, 4].map((t) => at(30, t)))).toBeLessThan(CALM * 1.1);
    // The gusts travel 14 cells a second: one second on and 14 cells downwind, the wind has
    // changed by the same factor (the swell) wherever you look.
    const ratio = (x: number) => at(x + 14, 4) / at(x, 3);
    expect(ratio(5)).toBeCloseTo(ratio(23), 9);
    expect(ratio(5)).toBeCloseTo(ratio(61), 9);
  });

  it("eases into a gale and back", () => {
    const w = createWind();
    w.target = GALE;
    for (let t = 0; t <= 6; t += 0.05) advanceWind(w, t);
    expect(w.level).toBeGreaterThan(0.9 * GALE);
    w.target = CALM;
    for (let t = 6; t <= 14; t += 0.05) advanceWind(w, t);
    expect(w.level).toBeLessThan(1.1 * CALM);
  });

  it("pushes trees near the pointer the way it moves, and the push dies away", () => {
    const w = createWind();
    const calm = windAt(w, 40, 30, 1);
    addPuff(w, 40, 30, -2, 1); // the pointer swept left
    expect(windAt(w, 40, 30, 1)).toBeLessThan(calm - 1.5);
    expect(windAt(w, 120, 30, 1)).toBeCloseTo(windAt(createWind(), 120, 30, 1), 6); // far away: nothing
    expect(windAt(w, 40, 30, 8)).toBeCloseTo(windAt(createWind(), 40, 30, 8), 2); // later: gone
    advanceWind(w, 10);
    expect(w.puffs).toHaveLength(0);
  });
});
