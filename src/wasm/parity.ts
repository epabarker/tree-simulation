/** Registers the Rust core's parity build (src/wasm/pkg-parity/: V8's Math, the TS goldens'). */
import * as pkg from "./pkg-parity/core.js";
import { type Pkg, registerBuild } from "./world.ts";

registerBuild("parity", pkg as unknown as Pkg);

/** The module's bytes beside this file (Node: `readFileSync(parityWasm)`). */
export const parityWasm = new URL("./pkg-parity/core_bg.wasm", import.meta.url);
