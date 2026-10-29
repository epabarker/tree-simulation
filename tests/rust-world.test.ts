/**
 * I1 (ADR 0024): the whole world in the Rust core (src/wasm/world.ts) held to the TypeScript
 * core's results: every golden (parity build); snapshots and checkpoints against what the
 * TypeScript core produced, recorded in tests/fixtures/ts-core.json at the tag golden-2d-ts
 * (docs/experiments/code/2026-10-29-i1/ts-records.ts); and the production build's own goldens.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { fixtureParams, isFixtureName } from "../src/core/fixtures.ts";
import { presetParams } from "../src/core/presets.ts";
import { FULL_SNAPSHOT } from "../src/core/types.ts";
import { parityWasm } from "../src/wasm/parity.ts";
import { productionWasm } from "../src/wasm/production.ts";
import { type Build, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";
import { fingerprint, sha256 } from "./fingerprint.ts";
import { caseKey, GOLDEN_CASES, type GoldenCase } from "./golden-cases.ts";
import {
  CHECKPOINT_RUNS,
  GARDEN_FIXTURE,
  SNAPSHOT_RUNS,
  snapshotSeasons,
} from "./ts-core-cases.ts";

const json = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;
const golden = json<Record<string, string>>("./golden.json");
const production = json<Record<string, string>>("./golden-production.json");
const ts = json<{
  snapshots: Record<string, Record<string, string>>;
  checkpoints: Record<string, { bytes: string; grown: string }>;
  garden: string;
}>("./fixtures/ts-core.json");

beforeAll(() => {
  loadWorldsSync("parity", readFileSync(parityWasm));
  loadWorldsSync("production", readFileSync(productionWasm));
});

function runCase(c: GoldenCase, build: Build): string {
  const params = isFixtureName(c.preset)
    ? fixtureParams(c.preset, c.seed)
    : presetParams(c.preset, c.seed);
  const world = RustWorld.create(params, build);
  world.run(c.seasons);
  const hash = world.hash();
  world.dispose();
  return hash;
}

describe("goldens: the TypeScript core's, in the Rust world's parity build (I1)", () => {
  for (const c of GOLDEN_CASES)
    it(caseKey(c), () => expect(runCase(c, "parity")).toBe(golden[caseKey(c)]));
});

describe("snapshots: the TypeScript core's, array for array and metric for metric (I1)", () => {
  for (const [name, params, seasons] of SNAPSHOT_RUNS) {
    it(name, () => {
      const world = RustWorld.create(params, "parity");
      const at = new Set(snapshotSeasons(seasons));
      for (let s = 0; s <= seasons; s++) {
        if (s > 0) world.step(1, true);
        if (!at.has(s)) continue;
        expect(fingerprint(world.snapshot(0, FULL_SNAPSHOT)), `season ${s}`).toBe(
          ts.snapshots[name]?.[s],
        );
      }
      world.dispose();
    });
  }
});

describe("checkpoints: the TypeScript core's bytes, written and read (I1)", () => {
  for (const [name, params, seasons] of CHECKPOINT_RUNS) {
    it(`${name}: the same bytes, which load back and grow on as the TypeScript core's did`, () => {
      const world = RustWorld.create(params, "parity");
      world.run(seasons);
      const p = world.params;
      world.setParams({ c3: { ...p.c3, alpha: p.c3.alpha + 0.1 } });
      world.plantTree(17.25);
      const bytes = world.save();
      expect(sha256(bytes)).toBe(ts.checkpoints[name]?.bytes);
      world.dispose();
      const loaded = RustWorld.load(bytes, "parity");
      expect(sha256(loaded.save())).toBe(ts.checkpoints[name]?.bytes);
      loaded.step(10);
      expect(loaded.hash()).toBe(ts.checkpoints[name]?.grown);
      loaded.dispose();
    });
  }

  // garden-v0.14.0's first-paint checkpoint for a 66-cell plate, seed 10, written by the
  // TypeScript core; docs/experiments/code/2026-10-29-i1/first-paint.ts checked all twelve.
  it("garden 0.14.0, 66-10: the shipped bytes load, save back the same, and grow on alike", () => {
    const gz = readFileSync(new URL(`./fixtures/${GARDEN_FIXTURE}`, import.meta.url));
    const bytes = new Uint8Array(gunzipSync(gz));
    const world = RustWorld.load(bytes, "parity");
    expect(Buffer.from(world.save()).equals(Buffer.from(bytes))).toBe(true);
    world.step(10, true);
    expect(world.hash()).toBe(ts.garden);
    world.dispose();
  });
});

describe("production goldens: the WASM build's are the native build's (I1 stage 2)", () => {
  for (const c of GOLDEN_CASES) {
    it(caseKey(c), () => expect(runCase(c, "production")).toBe(production[caseKey(c)]));
  }
});
