/**
 * G2 (ADR 0024): every golden run again with the sky sweep in the Rust core. The hashes must be
 * the TypeScript core's, bit for bit; nothing here may be updated to make them pass.
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { presetParams } from "../src/core/presets.ts";
import { World } from "../src/core/world.ts";
import { useRustSkySweep } from "../src/wasm/core.ts";
import { WasmSkySweep } from "../src/wasm/sky-sweep.ts";
import { caseKey, GOLDEN_CASES, runCase } from "./golden-cases.ts";
import { loadRustCore } from "./wasm.ts";

const golden = JSON.parse(
  readFileSync(new URL("./golden.json", import.meta.url), "utf8"),
) as Record<string, string>;

describe("golden runs with the Rust sky sweep (G2: bit-identical to TypeScript)", () => {
  beforeAll(() => {
    loadRustCore();
    useRustSkySweep();
  });
  afterAll(() => useRustSkySweep(false));
  it("sweeps in Rust", () => {
    expect(new World(presetParams("skyStand", 1)).light).toBeInstanceOf(WasmSkySweep);
  });
  for (const c of GOLDEN_CASES) {
    it(caseKey(c), () => {
      expect(runCase(c)).toBe(golden[caseKey(c)]);
    });
  }
});
