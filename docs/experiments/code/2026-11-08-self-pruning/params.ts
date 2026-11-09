// Dumps the probe's params: lone beech, hornbeam, holly (beechOpen's field), and the garden.
import { mkdirSync, writeFileSync } from "node:fs";
const R = new URL("../../../../src", import.meta.url).href;
const { presetParams, forestParams } = await import(`${R}/core/presets.ts`);
const { mergeParams } = await import(`${R}/core/params.ts`);
const out = process.argv[2];
mkdirSync(out, { recursive: true });
for (const seed of [1, 2]) {
  for (const sp of ["beech", "hornbeam", "holly"]) {
    const p = mergeParams(presetParams("beechOpen", seed), { trees: [{ x: 120, species: sp }] });
    writeFileSync(`${out}/lone-${sp}-s${seed}.json`, JSON.stringify(p));
  }
  writeFileSync(`${out}/garden-s${seed}.json`, JSON.stringify(forestParams(210, seed)));
}
