import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { caseKey, GOLDEN_CASES, runCase } from "./golden-cases.ts";

const golden = JSON.parse(
  readFileSync(new URL("./golden.json", import.meta.url), "utf8"),
) as Record<string, string>;

describe("golden runs (change only intentionally: npm run golden:update + devlog entry)", () => {
  for (const c of GOLDEN_CASES) {
    it(caseKey(c), () => {
      expect(runCase(c)).toBe(golden[caseKey(c)]);
    });
  }
});
