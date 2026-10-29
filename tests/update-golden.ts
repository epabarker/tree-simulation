/**
 * Regenerates tests/golden.json from the WASM build; the native build is held to the same file.
 * Only after an intended behaviour change; note it in the devlog.
 */

import { writeFileSync } from "node:fs";
import { caseKey, GOLDEN_CASES, GOLDEN_FILE, runCase } from "./golden-cases.ts";

const golden: Record<string, string> = {};
for (const c of GOLDEN_CASES) golden[caseKey(c)] = runCase(c);
writeFileSync(GOLDEN_FILE, `${JSON.stringify(golden, null, 2)}\n`);
console.log(golden);
