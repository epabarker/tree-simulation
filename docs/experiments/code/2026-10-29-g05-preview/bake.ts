/**
 * Grown home woods for the G0.5 preview: forestParams(width, seed) grown as the garden's worker
 * grows them (dead trees discarded each season), saved as gzipped checkpoints at each season.
 *
 *   node docs/experiments/code/2026-10-29-g05-preview/bake.ts <outDir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { saveWorld } from "../../../../src/core/checkpoint.ts";
import { forestParams } from "../../../../src/core/presets.ts";
import { World } from "../../../../src/core/world.ts";

/** The garden's portrait-phone ring (first-paint's narrowest) and the 520-cell panorama. */
export const WIDTHS = [66, 520];
export const SEEDS = [9, 10, 12];
export const SEASONS = [60, 100];

const out = process.argv[2] ?? "runs/preview-3d-public/stands";
mkdirSync(out, { recursive: true });
for (const width of WIDTHS) {
  for (const seed of SEEDS) {
    const world = new World(forestParams(width, seed));
    for (let s = 1; s <= Math.max(...SEASONS); s++) {
      world.step();
      world.discardDead();
      if (!SEASONS.includes(s)) continue;
      const bytes = gzipSync(saveWorld(world), { level: 9 });
      writeFileSync(join(out, `${width}-${seed}-${s}.bin.gz`), bytes);
      const m = world.trees.filter((t) => t.alive).reduce((n, t) => n + t.m.length, 0);
      console.log(`${width}-${seed}-${s}`.padEnd(14), `${(bytes.length / 1024).toFixed(0)} kB`, `${m} metamers`);
    }
  }
}
writeFileSync(join(out, "manifest.json"), `${JSON.stringify({ widths: WIDTHS, seeds: SEEDS, seasons: SEASONS })}\n`);
