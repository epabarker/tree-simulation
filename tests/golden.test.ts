import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Build } from "../src/wasm/world.ts";
import { caseKey, GOLDEN_CASES, GOLDEN_FILES, runCase } from "./golden-cases.ts";

/**
 * Both builds in WASM; rust/core/tests/golden.rs and golden_production.rs hold the native builds
 * to the same files. The parity build's are the TypeScript core's (I1, ADR 0024).
 */
for (const build of ["parity", "production"] as Build[]) {
  const golden = JSON.parse(readFileSync(GOLDEN_FILES[build], "utf8")) as Record<string, string>;
  describe(`golden runs, ${build} build (change only intentionally: npm run golden:update + devlog entry)`, () => {
    for (const c of GOLDEN_CASES)
      it(caseKey(c), () => expect(runCase(c, build)).toBe(golden[caseKey(c)]));
  });
}
