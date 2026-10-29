/**
 * Regenerates tests/golden.json (the parity build's; the TypeScript core's until I1, archived at
 * the tag golden-2d-ts) and tests/golden-production.json (the production build's), from the WASM
 * builds; the native ones are held to the same files. Only after an intended behaviour change;
 * note it in the devlog.
 */

import { writeFileSync } from "node:fs";
import type { Build } from "../src/wasm/world.ts";
import { caseKey, GOLDEN_CASES, GOLDEN_FILES, runCase } from "./golden-cases.ts";

for (const build of ["parity", "production"] as Build[]) {
  const golden: Record<string, string> = {};
  for (const c of GOLDEN_CASES) golden[caseKey(c)] = runCase(c, build);
  writeFileSync(GOLDEN_FILES[build], `${JSON.stringify(golden, null, 2)}\n`);
  console.log(build, golden);
}
