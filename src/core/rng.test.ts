import { describe, expect, it } from "vitest";
import { hashKey, normal, Purpose, sign, uniform } from "./rng.ts";

describe("keyed-hash RNG (ADR 0002)", () => {
  it("matches frozen known-answer vectors", () => {
    // Changing these breaks reproducibility of every saved run: only with an ADR.
    expect(hashKey(1, Purpose.sideSequence, 0, 0, 0, 0)).toBe(1382201895);
    expect(hashKey(42, Purpose.directionNoise, 3, 1234, 17, 2)).toBe(3388988208);
    expect(hashKey(0xffffffff, Purpose.mortality, 9, 99999, 500, 7)).toBe(2673640170);
    expect(uniform(7, Purpose.shedding, 1, 2, 3)).toBe(0.27200592774897814);
    expect(normal(7, Purpose.directionNoise, 1, 2, 3)).toBe(0.5882301320315867);
  });

  it("changes when any key component changes", () => {
    const base = hashKey(1, Purpose.directionNoise, 2, 3, 4, 5);
    const variants = [
      hashKey(2, Purpose.directionNoise, 2, 3, 4, 5),
      hashKey(1, Purpose.shedding, 2, 3, 4, 5),
      hashKey(1, Purpose.directionNoise, 3, 3, 4, 5),
      hashKey(1, Purpose.directionNoise, 2, 4, 4, 5),
      hashKey(1, Purpose.directionNoise, 2, 3, 5, 5),
      hashKey(1, Purpose.directionNoise, 2, 3, 4, 6),
    ];
    for (const v of variants) expect(v).not.toBe(base);
  });

  it("gives uniform and normal draws with the right moments", () => {
    const n = 100_000;
    let su = 0;
    let sz = 0;
    let sz2 = 0;
    let heads = 0;
    for (let i = 0; i < n; i++) {
      const u = uniform(5, Purpose.shedding, 0, i, 0);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      su += u;
      const z = normal(5, Purpose.directionNoise, 0, i, 0);
      sz += z;
      sz2 += z * z;
      if (sign(5, Purpose.sideSequence, 0, i, 0) > 0) heads += 1;
    }
    expect(su / n).toBeCloseTo(0.5, 2);
    expect(sz / n).toBeCloseTo(0, 1);
    expect(sz2 / n).toBeCloseTo(1, 1);
    expect(heads / n).toBeCloseTo(0.5, 2);
  });
});
