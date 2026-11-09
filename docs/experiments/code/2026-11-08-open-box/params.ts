// Dumps the probe's params: each exemplar alone in an open-grown box (ADR 0062): beechOpen's
// world with τ = 1 on both z faces, open x sides, and a square W = D box (cells), the tree at its
// centre. Seeds 1–3. Usage: node params.ts <outdir> [side cells, default 240 = 60 m] [species,…] [height cells]
import { mkdirSync, writeFileSync } from "node:fs";
const R = new URL("../../../../src", import.meta.url).href;
const { presetParams } = await import(`${R}/core/presets.ts`);
const { mergeParams } = await import(`${R}/core/params.ts`);
const out = process.argv[2];
const side = Number(process.argv[3] ?? 240);
const species = (process.argv[4] ?? "oak,maple,birch,beech,hornbeam,holly").split(",");
const height = process.argv[5] ? Number(process.argv[5]) : undefined;
mkdirSync(out, { recursive: true });
for (const seed of [1, 2, 3]) {
  for (const sp of species) {
    const p = mergeParams(presetParams("beechOpen", seed), {
      world: { width: side, depth: side, faces: [1, 1], sidesZ: "open", ...(height ? { height } : {}) },
      trees: [{ x: side / 2, z: side / 2, species: sp }],
    });
    if (p.world.sides !== undefined && p.world.sides !== "open") throw new Error(`x sides ${p.world.sides}`);
    writeFileSync(`${out}/open-${sp}-s${seed}.json`, JSON.stringify(p));
  }
}
