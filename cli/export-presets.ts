/**
 * Writes rust/presets.json: every preset and retired fixture (ADR 0019) resolved to its full
 * params, and the default params, so the native CLI and the Rust tests run exactly the runs the
 * page and the TypeScript CLI run (I1, ADR 0024). Generated, committed, and held to the
 * TypeScript presets by tests/presets-json.test.ts.
 *
 *   node cli/export-presets.ts
 */
import { writeFileSync } from "node:fs";
import { fixtureParams, fixtures } from "../src/core/fixtures.ts";
import { defaultParams } from "../src/core/params.ts";
import { defaultPreset, type PresetName, presetParams, presets } from "../src/core/presets.ts";

export function presetsJson(): string {
  const table = (names: string[], params: (name: string) => unknown) =>
    Object.fromEntries(names.map((name) => [name, params(name)]));
  const out = {
    defaultPreset,
    defaultParams,
    presets: table(Object.keys(presets), (n) => presetParams(n as PresetName)),
    fixtures: table(Object.keys(fixtures), (n) => fixtureParams(n as keyof typeof fixtures)),
  };
  return `${JSON.stringify(out, null, 1)}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(new URL("../rust/presets.json", import.meta.url), presetsJson());
}
