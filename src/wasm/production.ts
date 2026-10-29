/** Registers the Rust core's production build (src/wasm/pkg/: Rust's libm, WASM SIMD). */
import * as pkg from "./pkg/core.js";
import { registerBuild } from "./world.ts";

registerBuild("production", pkg);

/** The module's bytes beside this file (Node: `readFileSync(productionWasm)`). */
export const productionWasm = new URL("./pkg/core_bg.wasm", import.meta.url);
