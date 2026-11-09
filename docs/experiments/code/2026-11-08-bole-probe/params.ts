// Dumps the bole probe's params (wayfinder "Does a re-anchored, accumulating T_rel clear beech and
// hornbeam in a closed stand while holly stays clothed?"). Exploratory, seeds 1–3.
// Conditions: HEAD, and beech + hornbeam with c5.Trel × c5.kRel (holly keeps 0.021, kRel 1).
// Worlds: HEAD's garden (forestParams(160), ADVISORY: ≈ 2,000 stems/ha, τ faces), and the lone
// open-grown 60 m box (ADR 0062) for the guard. No turgor patch.
// Usage: node params.ts <outdir>
import { mkdirSync, writeFileSync } from "node:fs";
const R = new URL("../../../../src", import.meta.url).href;
const { presetParams, forestParams } = await import(`${R}/core/presets.ts`);
const { mergeParams } = await import(`${R}/core/params.ts`);
const { withAssign } = await import(new URL("../../../../cli/trials.ts", import.meta.url).href);
const out = process.argv[2] as string;
mkdirSync(out, { recursive: true });
export const CONDITIONS: Record<string, Record<string, number> | null> = {
  head: null,
  "t010k3": { "c5.Trel": 0.1, "c5.kRel": 3 },
  "t025k3": { "c5.Trel": 0.25, "c5.kRel": 3 },
  "t040k3": { "c5.Trel": 0.4, "c5.kRel": 3 },
  "t025k1": { "c5.Trel": 0.25, "c5.kRel": 1 },
  "t025k5": { "c5.Trel": 0.25, "c5.kRel": 5 },
};
// biome-ignore lint/suspicious/noExplicitAny: throwaway
const patch = (p: any, a: Record<string, number> | null) =>
  a ? withAssign(withAssign(p, "beech", a), "hornbeam", a) : p;
const box = 240;
for (const seed of [1, 2, 3]) {
  for (const [name, a] of Object.entries(CONDITIONS)) {
    writeFileSync(`${out}/garden-${name}-s${seed}.json`, JSON.stringify(patch(forestParams(160, seed), a)));
    for (const sp of ["beech", "hornbeam"]) {
      const p = mergeParams(presetParams("beechOpen", seed), {
        world: { width: box, depth: box, faces: [1, 1], sidesZ: "open", height: 200 },
        trees: [{ x: box / 2, z: box / 2, species: sp }],
      });
      writeFileSync(`${out}/lone-${sp}-${name}-s${seed}.json`, JSON.stringify(patch(p, a)));
    }
  }
}
