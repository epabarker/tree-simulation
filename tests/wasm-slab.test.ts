/**
 * G3 (ADR 0024): the 3D slab sweep in the production build (no parity, built for WASM SIMD, which
 * LLVM's vectoriser uses) gives the same bits as natively. The constant is rust/core's
 * `the_same_bits_on_every_target`.
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { initSync, slab_fixture_fingerprint, slab_has_simd } from "../src/wasm/pkg/core.js";

const NATIVE = 0xd3060733;

describe("the 3D slab sweep gives the same bits natively and in WASM (G3)", () => {
  beforeAll(() => {
    initSync({ module: readFileSync(new URL("../src/wasm/pkg/core_bg.wasm", import.meta.url)) });
  });
  it("is built for SIMD", () => expect(slab_has_simd()).toBe(true));
  it("WASM", () => expect(slab_fixture_fingerprint()).toBe(NATIVE));
});
