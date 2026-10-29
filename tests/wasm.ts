/** Loads the Rust core for the tests (ADR 0024, G2). `npm run check` builds it first. */
import { readFileSync } from "node:fs";
import { coreWasmUrl, loadCoreSync } from "../src/wasm/core.ts";

export function loadRustCore(): void {
  loadCoreSync(readFileSync(coreWasmUrl));
}
