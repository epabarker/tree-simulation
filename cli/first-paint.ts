/**
 * Grown forests for the garden's first paint (M21; `mountGarden({ first })`): the home woodland
 * (`forestParams`) at a few world widths and seeds, grown for SEASONS seasons as the page's worker
 * grows it (dead trees discarded every season), each saved as a gzipped checkpoint, plus a
 * manifest the host page can pass straight to `first`.
 *
 *   node cli/first-paint.ts [out]     (default dist-garden/first; `npm run build:garden` runs it)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { saveWorld } from "../src/core/checkpoint.ts";
import { forestParams } from "../src/core/presets.ts";
import { World } from "../src/core/world.ts";

/** World widths a plate may want: a portrait phone, a landscape phone or tablet, two desktops. */
const WIDTHS = [100, 160, 220, 300];
/** One forest a day, in turn (a returning visitor sees another). */
const SEEDS = [11, 23, 37];
/** Old enough for a closed birch canopy with oak and beech coming up through it. */
const SEASONS = 60;
/** Each checkpoint must stay within this (M21 budget), gzipped. */
const BUDGET_KB = 300;

const out = process.argv[2] ?? join("dist-garden", "first");
mkdirSync(out, { recursive: true });
let total = 0;
for (const width of WIDTHS) {
  for (const seed of SEEDS) {
    const world = new World(forestParams(width, seed));
    for (let s = 0; s < SEASONS; s++) {
      world.step();
      world.discardDead();
    }
    const bytes = gzipSync(saveWorld(world), { level: 9 });
    const kb = bytes.length / 1024;
    total += kb;
    if (kb > BUDGET_KB)
      throw new Error(`${width}-${seed}: ${kb.toFixed(0)} kB is over ${BUDGET_KB} kB`);
    writeFileSync(join(out, `${width}-${seed}.bin.gz`), bytes);
    console.log(`first/${width}-${seed}.bin.gz`.padEnd(40), `${kb.toFixed(1).padStart(6)} kB`);
  }
}
writeFileSync(
  join(out, "manifest.json"),
  `${JSON.stringify({ widths: WIDTHS, seeds: SEEDS, season: SEASONS })}\n`,
);
console.log(`${WIDTHS.length * SEEDS.length} grown forests, ${total.toFixed(0)} kB`);
