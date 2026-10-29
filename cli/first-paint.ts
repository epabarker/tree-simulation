/**
 * Grown forests for the garden's first paint (M21; `mountGarden({ first })`): the home woodland
 * (`forestParams`) at a few world widths and seeds, grown for SEASONS seasons as the page's worker
 * grows it (dead trees discarded every season), each saved as a gzipped checkpoint, plus a
 * manifest the host page can pass straight to `first`.
 *
 * Grown in the Rust core, as the page grows them on. The seeds were chosen by eye on the
 * TypeScript core's forests (M21, M25) and checked again on these (2026-10-30 note).
 *
 *   node cli/first-paint.ts [out]     (default dist-garden/first; `npm run build:garden` runs it)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { forestParams } from "../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));

/**
 * World widths a plate may want (garden.ts `plateWidth`): a portrait phone (≈ 66 cells, three
 * trees), a square-ish or landscape phone, a tablet, and a desktop (the site's plate is at most
 * the page's width, about 220 cells; a wider host gets the nearest).
 */
const WIDTHS = [66, 100, 160, 220];
/**
 * One forest a day, in turn (a returning visitor sees another): chosen by eye from twelve, at 220
 * cells, for rounded crowns and a mix of kinds, broad oaks and maples among birch and willow, with
 * holly and hornbeam coming up beneath (M21 art pass; re-chosen for M25's mixed wood).
 */
const SEEDS = [9, 10, 12];
/**
 * As old as the intro grows a forest (40 seasons): a young closed wood with full crowns. At 60 the
 * stand has self-thinned into tall poles with small crowns, true to a stand but less handsome.
 */
const SEASONS = 40;
/** Each checkpoint must stay within this (M21 budget), gzipped. */
const BUDGET_KB = 300;

const out = process.argv[2] ?? join("dist-garden", "first");
mkdirSync(out, { recursive: true });
/**
 * I2 (ADR 0025): no opening forests while the trees grow in 3D and the 3D renderer is not built.
 * A 3D checkpoint is 1–6 MB (the review's Q7), so first paint's policy is decided at I3. The
 * manifest lists no widths, so the garden grows its forest from seed.
 */
const FIRST_PAINT_3D = false;
if (!FIRST_PAINT_3D) {
  writeFileSync(
    join(out, "manifest.json"),
    `${JSON.stringify({ widths: [], seeds: SEEDS, season: SEASONS })}\n`,
  );
  console.log("no grown forests until I3 (ADR 0025): the garden grows from seed");
  process.exit(0);
}
let total = 0;
for (const width of WIDTHS) {
  for (const seed of SEEDS) {
    const world = RustWorld.create(forestParams(width, seed));
    world.step(SEASONS, true);
    const bytes = gzipSync(world.save(), { level: 9 });
    world.dispose();
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
