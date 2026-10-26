/** Regenerates tests/golden.json. Only after an intended behaviour change; note it in the devlog. */

import { writeFileSync } from "node:fs";
import { caseKey, GOLDEN_CASES, runCase } from "./golden-cases.ts";

const golden: Record<string, string> = {};
for (const c of GOLDEN_CASES) golden[caseKey(c)] = runCase(c);
writeFileSync(new URL("./golden.json", import.meta.url), `${JSON.stringify(golden, null, 2)}\n`);
console.log(golden);
