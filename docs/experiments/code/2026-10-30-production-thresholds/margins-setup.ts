// Logs every numeric comparison in the evidence tests: site (file:line), actual, threshold.
import { appendFileSync } from "node:fs";
import { chai, expect } from "vitest";

const out = process.env.MARGINS_OUT as string;
const site = (): string => {
  const stack = new Error().stack ?? "";
  const m = stack.split("\n").find((l) => l.includes("/tests/evidence/") && l.includes(".test.ts"));
  const r = m?.match(/tests\/evidence\/([\w.-]+\.test\.ts):(\d+)/);
  return r ? `${r[1]}:${r[2]}` : "?";
};
for (const name of [
  "toBeGreaterThan",
  "toBeGreaterThanOrEqual",
  "toBeLessThan",
  "toBeLessThanOrEqual",
  "toBeCloseTo",
]) {
  chai.Assertion.overwriteMethod(name, (original: (...a: unknown[]) => unknown) =>
    function (this: object, expected: unknown, digits?: unknown) {
      const actual = chai.util.flag(this, "object");
      const negate = chai.util.flag(this, "negate") ?? false;
      if (typeof actual === "number" && typeof expected === "number") {
        appendFileSync(
          out,
          `${JSON.stringify({ test: expect.getState().currentTestName, site: site(), op: name, negate, actual, expected, digits })}\n`,
        );
      }
      // biome-ignore lint/style/noArguments: pass through
      return original.apply(this, arguments as unknown as unknown[]);
    },
  );
}
