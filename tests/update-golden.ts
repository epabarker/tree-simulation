/**
 * Regenerates tests/golden.json (the TypeScript core's, which the Rust core's parity build
 * reproduces) and tests/golden-production.json (the Rust core's production build, I1 stage 2).
 * Only after an intended behaviour change; note it in the devlog.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { caseKey, GOLDEN_CASES, runCase } from "./golden-cases.ts";

const golden: Record<string, string> = {};
for (const c of GOLDEN_CASES) golden[caseKey(c)] = runCase(c);
writeFileSync(new URL("./golden.json", import.meta.url), `${JSON.stringify(golden, null, 2)}\n`);
console.log(golden);
execFileSync(
  "cargo",
  ["test", "--release", "-q", "--locked", "-p", "tree-core", "--test", "golden_production"],
  {
    cwd: new URL("../rust", import.meta.url),
    env: { ...process.env, UPDATE_GOLDEN: "1" },
    stdio: "inherit",
  },
);
console.log("tests/golden-production.json rewritten");
