/**
 * The lone-tree stage is open-grown (ADR 0062, spec §C2, ticket #115): open sky on all four sides
 * in a square 60 m box (240 cells of 0.25 m), the tree at its centre. The trials' other worlds and
 * the garden's specimen keep the half-walled world they were calibrated and budgeted in.
 */
import { describe, expect, it } from "vitest";
import { rowParams, shadeParams, standParams, trialBase, woodParams } from "../cli/trials.ts";
import { loneTreeParams, presetParams, specimenParams } from "../src/core/presets.ts";

const OPEN_GROWN = { width: 240, depth: 240, height: 200, faces: [1, 1], sidesZ: "open" };
const HALF_WALLED = { width: 160, height: 200, depth: 64, faces: [0.2, 0.2], walls: [] };

describe("the open-grown lone-tree stage (ADR 0062)", () => {
  it.each([
    ["oakOpen", presetParams("oakOpen", 1), "oak"],
    ["beechOpen", presetParams("beechOpen", 1), "beech"],
    ["loneTreeParams", loneTreeParams("birch", 3), "birch"],
  ])("%s is open on all four sides in a square 60 m box, the tree at its centre", (_, p, sp) => {
    expect(p.world).toMatchObject(OPEN_GROWN);
    expect(p.world.walls ?? []).toEqual([]);
    expect(p.world.sides ?? "open").toBe("open");
    expect(p.trees).toEqual([{ x: 120, z: 120, species: sp }]);
  });

  it("leaves the trials' stands, shade house and woods in the worlds they had", () => {
    expect(trialBase(1, {}).world).toEqual(HALF_WALLED);
    expect(rowParams("oak", 1).world).toEqual({ ...HALF_WALLED, width: 230 });
    expect(standParams("beech", 1).world).toMatchObject({ depth: 64, faces: [0, 0] });
    expect(shadeParams("oak", 1, 2).world).toEqual({
      width: 40,
      height: 60,
      depth: 64,
      faces: [0, 0],
      walls: [{ x: 0, y: 40, width: 40, height: 1, shade: 2 }],
      sides: "periodic",
    });
    expect(woodParams("hornbeam", 1).world.depth).toBe(64);
  });

  it("keeps the garden's specimen in the half-walled world its worker's budget was set in", () => {
    expect(specimenParams(9).world).toEqual(HALF_WALLED);
    expect(specimenParams(9).trees).toEqual([{ x: 80, species: "oak" }]);
  });
});
