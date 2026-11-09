// Dumps the garden's params at HEAD (forestParams, GARDEN_PLANTING) for the desktop width (160 cells)
// and the phone's (66), seeds 1–3: the configuration the probe measures, unchanged.
//   node docs/experiments/code/2026-11-08-garden-demography/params.ts runs/garden-demography
import { mkdirSync, writeFileSync } from "node:fs";
const R = new URL("../../../../src", import.meta.url).href;
const { forestParams } = await import(`${R}/core/presets.ts`);
const out = process.argv[2];
mkdirSync(out, { recursive: true });
for (const width of [160, 66])
  for (const seed of [1, 2, 3])
    writeFileSync(`${out}/w${width}-s${seed}.json`, JSON.stringify(forestParams(width, seed)));
