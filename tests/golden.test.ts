import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { caseKey, GOLDEN_CASES, GOLDEN_FILE, runCase } from "./golden-cases.ts";

/** In WASM; rust/core/tests/golden.rs holds the native build to the same file. */
const golden = JSON.parse(readFileSync(GOLDEN_FILE, "utf8")) as Record<string, string>;

describe("golden runs (change only intentionally: npm run golden:update + devlog entry)", () => {
  for (const c of GOLDEN_CASES) it(caseKey(c), () => expect(runCase(c)).toBe(golden[caseKey(c)]));
});
