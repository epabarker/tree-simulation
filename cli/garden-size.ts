/**
 * Size gate for the garden build (ADR 0014): the gzipped JavaScript a host page downloads,
 * garden.js plus its worker and chunks, must stay within budget (ADR 0001: 100 kB for first paint).
 * The Rust core's WASM loads after first paint and has its own gate (ADR 0024, I1): its measured
 * size, 135 kB gzip at I1, plus 25%.
 *
 *   npm run build:garden    (builds dist-garden/, then runs this)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIR = "dist-garden";
const BUDGET_KB = 60;
const WASM_BUDGET_KB = 170;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

let total = 0;
for (const path of files(DIR)
  .filter((p) => p.endsWith(".js"))
  .sort()) {
  const kb = gzipSync(readFileSync(path), { level: 9 }).length / 1024;
  total += kb;
  console.log(`${relative(DIR, path).padEnd(40)} ${kb.toFixed(1).padStart(6)} kB gzip`);
}
console.log(
  `${"total".padEnd(40)} ${total.toFixed(1).padStart(6)} kB gzip (budget ${BUDGET_KB} kB)`,
);
if (total > BUDGET_KB) {
  console.error(`The garden is over budget by ${(total - BUDGET_KB).toFixed(1)} kB.`);
  process.exit(1);
}

let wasm = 0;
for (const path of files(DIR).filter((p) => p.endsWith(".wasm"))) {
  const kb = gzipSync(readFileSync(path), { level: 9 }).length / 1024;
  wasm += kb;
  console.log(
    `${relative(DIR, path).padEnd(40)} ${kb.toFixed(1).padStart(6)} kB gzip (after first paint)`,
  );
}
console.log(
  `${"wasm".padEnd(40)} ${wasm.toFixed(1).padStart(6)} kB gzip (budget ${WASM_BUDGET_KB} kB)`,
);
if (wasm > WASM_BUDGET_KB) {
  console.error(`The garden's WASM is over budget by ${(wasm - WASM_BUDGET_KB).toFixed(1)} kB.`);
  process.exit(1);
}
