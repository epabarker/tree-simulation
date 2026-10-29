/**
 * I1: every shipped opening forest (the site's public/garden/<version>/first/*.bin.gz, made by the
 * TypeScript core) loads in the Rust core, saves back byte for byte, and grows on 20 seasons to the
 * TypeScript core's hash (parity build, dead trees discarded as the worker does).
 *
 *   node docs/experiments/code/2026-10-29-i1/first-paint.ts ../edbarker-dev/public/garden/0.14.0/first
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { loadWorld } from "../../../../src/core/checkpoint.ts";
import { hashWorld } from "../../../../src/core/hash.ts";
import { loadWorldsSync, RustWorld, wasmUrl } from "../../../../src/wasm/world.ts";

loadWorldsSync("parity", readFileSync(wasmUrl.parity));
const dir = process.argv[2] ?? "../edbarker-dev/public/garden/0.14.0/first";
for (const f of readdirSync(dir).filter((f) => f.endsWith(".bin.gz")).sort()) {
  const bytes = new Uint8Array(gunzipSync(readFileSync(join(dir, f))));
  const rust = RustWorld.load(bytes, "parity");
  const same = Buffer.from(rust.save()).equals(Buffer.from(bytes));
  const ts = loadWorld(bytes);
  for (let s = 0; s < 20; s++) {
    ts.step();
    ts.discardDead();
  }
  rust.step(20, true);
  console.log(f.padEnd(16), `bytes ${same ? "same" : "DIFFER"}`, `20 seasons on: ${rust.hash() === hashWorld(ts) ? "same hash" : "DIFFERENT"}`, rust.hash());
  rust.dispose();
}
