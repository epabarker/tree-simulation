import { describe, expect, it } from "vitest";
import { diffParams, mergeParams, patchSpecies } from "../../core/params.ts";
import { presetParams } from "../../core/presets.ts";
import { decodePatch, encodePatch, paramsFromQuery, writeQuery } from "./share.ts";

describe("shareable lab links (M26)", () => {
  const base = presetParams("mixedWood", 4);

  it("diffParams is the inverse of mergeParams, and empty for equal params", () => {
    expect(diffParams(base, base)).toEqual({});
    let edited = mergeParams(base, { c3: { lambda: 0.53 }, o2: { stormP: 0 }, seed: 9 });
    edited = patchSpecies(edited, "birch", { r6: { qMin: 0.2 }, common: "Birke" });
    edited.world.walls = [{ x: 1, y: 2, width: 3, height: 4, shade: 1 }];
    const patch = diffParams(base, edited);
    expect(Object.keys(patch).sort()).toEqual(["c3", "o2", "seed", "species", "world"]);
    expect(patch.c3).toEqual({ lambda: 0.53 });
    expect(Object.keys(patch.species ?? {})).toEqual(["birch"]);
    expect(mergeParams(base, patch)).toEqual(edited);
  });

  it("round-trips a patch through base64url, non-ASCII text included", () => {
    const patch = { c3: { lambda: 0.51 }, species: { birch: { common: "Bouleau – é" } } };
    const text = encodePatch(patch);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodePatch(text)).toEqual(patch);
  });

  it("writes a link that reads back as the same params, keeping other query keys", () => {
    const edited = mergeParams(base, { c5: { Trel: 0.3 }, seed: 17 });
    const query = writeQuery(new URLSearchParams("renderer=canvas"), "mixedWood", base, edited);
    expect(query.get("renderer")).toBe("canvas");
    expect(query.get("seed")).toBe("17");
    expect(paramsFromQuery(query, base).params).toEqual(edited);
    // Unchanged params leave no `p`.
    expect(writeQuery(query, "mixedWood", base, base).has("p")).toBe(false);
  });

  it("falls back to the preset's params, with a reason, for a broken patch", () => {
    for (const p of ["%%%", encodePatch([1, 2] as never), "bm90IGpzb24"]) {
      const { params, error } = paramsFromQuery(new URLSearchParams({ p }), base);
      expect(params).toEqual(base);
      expect(error).toMatch(/could not be read/);
    }
  });
});
