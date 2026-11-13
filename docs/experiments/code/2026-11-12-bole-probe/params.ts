// Dumps the #126 bare-bole probe's params. Exploratory, seeds 1–3 (the garden and the patched
// lone trees); HEAD's lone trees on seeds 1–20 for the guard's noise floor.
// Conditions: HEAD, and beech + hornbeam with c5.Trel × c5.kRel (holly keeps 0.021 and kRel 1;
// every other species its fitted values). No rounded-crown patch.
// Worlds: the 0062/0063 garden (forestParams(160): periodic x and z, 400 saplings/ha, twoPart
// mortality) and the lone open-grown stage (loneTreeParams: the 60 m box, ADR 0062).
// Usage: node params.ts <outdir>
import { mkdirSync, writeFileSync } from "node:fs";

const R = new URL("../../../../src", import.meta.url).href;
const { forestParams, loneTreeParams } = await import(`${R}/core/presets.ts`);
const { patchSpecies } = await import(`${R}/core/params.ts`);
const out = process.argv[2] as string;
mkdirSync(out, { recursive: true });

type Cell = { Trel: number; kRel: number } | null;
export const CONDITIONS: Record<string, Cell> = {
  head: null,
  t010k3: { Trel: 0.1, kRel: 3 },
  t025k3: { Trel: 0.25, kRel: 3 },
  t040k3: { Trel: 0.4, kRel: 3 },
  t010k6: { Trel: 0.1, kRel: 6 },
  t025k6: { Trel: 0.25, kRel: 6 },
  t040k6: { Trel: 0.4, kRel: 6 },
};

// biome-ignore lint/suspicious/noExplicitAny: throwaway
const patch = (p: any, c: Cell) =>
  c ? patchSpecies(patchSpecies(p, "beech", { c5: c }), "hornbeam", { c5: c }) : p;

for (const [name, c] of Object.entries(CONDITIONS)) {
  for (const seed of [1, 2, 3]) {
    const p = patch(forestParams(160, seed), c);
    writeFileSync(`${out}/garden-${name}-s${seed}.json`, JSON.stringify(p));
  }
  const seeds = name === "head" ? Array.from({ length: 20 }, (_, k) => k + 1) : [1, 2, 3];
  for (const seed of seeds) {
    for (const sp of ["beech", "hornbeam"]) {
      const p = patch(loneTreeParams(sp, seed), c);
      writeFileSync(`${out}/lone-${sp}-${name}-s${seed}.json`, JSON.stringify(p));
    }
  }
}
