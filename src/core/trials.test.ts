import { describe, expect, it } from "vitest";
import { FLORA } from "./flora.ts";
import { hashWorld } from "./hash.ts";
import { amendSpecies, getPath, loneParams, runLone, setPath, withAssign } from "./trials.ts";
import { speciesParams, World } from "./world.ts";

describe("species trials and amended patches (M27)", () => {
  it("sets and reads dotted paths, array indices included", () => {
    const o: Record<string, unknown> = { r2: { levels: [{ a: 1 }, { a: 2 }] } };
    setPath(o, "r2.levels.1.a", 5);
    setPath(o, "c3.alpha", 4);
    expect(getPath(o, "r2.levels.1.a")).toBe(5);
    expect(getPath(o, "r2.levels.0.a")).toBe(1);
    expect(getPath(o, "c3.alpha")).toBe(4);
    expect(getPath(o, "c9.nothing.here")).toBeUndefined();
  });

  it("amends one field of a species and keeps everything else it grows by", () => {
    const params = loneParams("birch", 1);
    const amended = amendSpecies(params, "birch", {
      "r2.levels.1.setPoint": 50,
      "r2.aC": 12,
      "r3.c": 0.2,
    });
    const before = speciesParams(params, "birch");
    const after = speciesParams(
      { ...params, species: { ...params.species, birch: amended } },
      "birch",
    );
    expect(after.r2.levels[1]?.setPoint).toBe(50);
    expect(after.r2.aC).toBe(12);
    expect(after.r3.c).toBe(0.2);
    // Untouched: the other rows and fields, other groups, the labels.
    expect(after.r2.levels[0]).toEqual(before.r2.levels[0]);
    expect(after.r2.levels[1]?.lambda).toBe(before.r2.levels[1]?.lambda);
    expect(after.r2.dLambda).toBe(before.r2.dLambda);
    expect(after.r3.leafMass).toBe(FLORA.birch.r3.leafMass);
    expect(after.r6).toEqual(before.r6);
    expect(amended.common).toBe("Silver birch");
  });

  it("changes nothing with no assignments, or with the species' own values", () => {
    const params = loneParams("beech", 2);
    expect(withAssign(params, "beech", {})).toBe(params);
    const same = withAssign(params, "beech", { "r6.qMin": FLORA.beech.r6.qMin });
    const a = new World(params);
    const b = new World(same);
    a.run(15);
    b.run(15);
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it("measures a lone tree at seasons 30 and 60", () => {
    const t = runLone("birch", 1);
    expect(t.alive).toBe(true);
    expect(t.height60).toBeGreaterThan(t.height30);
    expect(t.spread).toBeGreaterThan(0);
    expect(t.forkHeight).toBeGreaterThan(0);
  });
});
