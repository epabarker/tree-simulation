// The control: the same exemplars in the half-walled box #78 and #79 measured (beechOpen's
// 240 × 64 cells, τ 0.2 faces, open x sides, root at x 120), seeds 1–3.
import { mkdirSync, writeFileSync } from "node:fs";
const R = new URL("../../../../src", import.meta.url).href;
const { presetParams } = await import(`${R}/core/presets.ts`);
const { mergeParams } = await import(`${R}/core/params.ts`);
const out = process.argv[2];
mkdirSync(out, { recursive: true });
for (const seed of [1, 2, 3])
  for (const sp of ["oak", "maple", "birch", "beech", "hornbeam", "holly"])
    writeFileSync(`${out}/wall-${sp}-s${seed}.json`,
      JSON.stringify(mergeParams(presetParams("beechOpen", seed), { trees: [{ x: 120, species: sp }] })));
