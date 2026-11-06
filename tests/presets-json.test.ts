/** rust/presets.json (cli/export-presets.ts) is the TypeScript presets, resolved: regenerate it. */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { presetsJson } from "../cli/export-presets.ts";

it("rust/presets.json is up to date (node cli/export-presets.ts)", () => {
  const committed = readFileSync(new URL("../rust/presets.json", import.meta.url), "utf8");
  expect(committed === presetsJson()).toBe(true);
});
