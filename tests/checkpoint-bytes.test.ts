/**
 * Checkpoints (M21, I1, I2): bytes saved by the Rust core load back and save the same, and a world
 * loaded from them grows on exactly as the one that saved them. Version 1 (the 2D cores', so garden
 * 0.14.0's shipped forests) still loads, as a planar forest (ADR 0025). (The cross-core records are
 * archived at the tag golden-2d-ts.)
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { mergeParams, type Params } from "../src/core/params.ts";
import { forestParams, type PresetName, presetParams } from "../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

beforeAll(() => loadWorldsSync(readFileSync(coreWasm)));

/** Run, then c3.alpha + 0.1 and a tree planted at 17.25 (events in the queue), then saved. */
const RUNS: [string, Params, number][] = [
  ["mixed wood", forestParams(220, 12), 30],
  ["succession", presetParams("succession" as PresetName), 25],
  [
    "obstacles",
    mergeParams(presetParams("skyTree"), {
      world: {
        ...presetParams("skyTree").world,
        obstacles: [{ x: 70, y: 30, width: 30, height: 8 }],
      },
    }),
    20,
  ],
];

const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

describe("checkpoints round-trip and grow on alike", () => {
  for (const [name, params, seasons] of RUNS) {
    it(name, () => {
      const world = RustWorld.create(params);
      world.run(seasons);
      const p = world.params;
      world.setParams({ c3: { ...p.c3, alpha: p.c3.alpha + 0.1 } });
      world.plantTree(17.25);
      const bytes = world.save();
      const loaded = RustWorld.load(bytes);
      expect(same(loaded.save(), bytes)).toBe(true);
      world.step(10);
      loaded.step(10);
      expect(loaded.hash()).toBe(world.hash());
      world.dispose();
      loaded.dispose();
    });
  }

  // garden-v0.14.0's first-paint checkpoint for a 66-cell plate, seed 10, written by the
  // TypeScript core (version 1, 2D): it loads as a planar forest in a one-cell slab (ADR 0025).
  it("garden 0.14.0's shipped 2D forest (version 1) loads as a planar forest and grows on", () => {
    const gz = readFileSync(new URL("./fixtures/garden-0.14.0-66-10.bin.gz", import.meta.url));
    const bytes = new Uint8Array(gunzipSync(gz));
    const a = RustWorld.load(bytes);
    expect(a.season).toBe(40);
    const trees = a.trees.filter((t) => t.alive);
    expect(trees.length).toBeGreaterThan(0);
    for (const t of trees) {
      for (let i = 0; i < t.m.length; i++) expect(t.m.cols.hz[i]).toBe(0); // in the plane
    }
    // Saved again it is version 2, which loads back to the same bytes.
    const again = a.save();
    expect(same(RustWorld.load(again).save(), again)).toBe(true);
    const b = RustWorld.load(bytes);
    a.step(10, true);
    b.step(10, true);
    expect(a.hash()).toBe(b.hash());
    a.dispose();
    b.dispose();
  });
});
