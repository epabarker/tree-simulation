/** The Rust core in Node, for the page-side tests and benches. */
import { readFileSync } from "node:fs";
import type { Params } from "../src/core/params.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));

export const productionWorld = (params: Params): RustWorld => RustWorld.create(params);
