/** The Rust core's production build (the page's) in Node, for the page-side tests and benches. */
import { readFileSync } from "node:fs";
import type { Params } from "../src/core/params.ts";
import { productionWasm } from "../src/wasm/production.ts";
import { loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

loadWorldsSync("production", readFileSync(productionWasm));

export const productionWorld = (params: Params): RustWorld =>
  RustWorld.create(params, "production");
