/**
 * Frees the dead trees of each baked checkpoint (as the garden's worker does every season) and
 * re-saves it gzipped, for the preview: the CLI keeps dead trees, the page has no use for them.
 *   node docs/experiments/code/2026-10-30-i2/trim.ts runs/i2-bake runs/i2-preview-public/stands
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const [from, to] = [process.argv[2] ?? "runs/i2-bake", process.argv[3] ?? "runs/i2-preview-public/stands"];
mkdirSync(to, { recursive: true });
for (const f of readdirSync(from).filter((n) => n.endsWith(".bin.gz"))) {
  const w = RustWorld.load(new Uint8Array(gunzipSync(readFileSync(join(from, f)))));
  w.discardDead();
  const out = gzipSync(w.save(), { level: 9 });
  writeFileSync(join(to, f), out);
  const live = w.trees.filter((t) => t.alive);
  console.log(`${f}: ${live.length} trees, ${live.reduce((n, t) => n + t.m.length, 0)} metamers, ${(out.length / 1e6).toFixed(1)} MB`);
  w.dispose();
}
