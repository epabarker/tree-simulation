// Dumps the probe's params: lone oak, maple and birch in beechOpen's field (240 × 64), seeds 1–2,
// and the same trees with no shedding at all (ADR 0031's diagnostic 1: C5 off, R1 not carbon).
import { mkdirSync, writeFileSync } from "node:fs";
const R = new URL("../../../../src", import.meta.url).href;
const { presetParams } = await import(`${R}/core/presets.ts`);
const { mergeParams } = await import(`${R}/core/params.ts`);
const out = process.argv[2];
mkdirSync(out, { recursive: true });
for (const seed of [1, 2]) {
  for (const sp of ["oak", "maple", "birch"]) {
    const p = mergeParams(presetParams("beechOpen", seed), { trees: [{ x: 120, species: sp }] });
    writeFileSync(`${out}/lone-${sp}-s${seed}.json`, JSON.stringify(p));
    // No shedding: every species' own overrides must lose C5 and carbon shedding too.
    const off = structuredClone(p);
    const strip = (q: Record<string, any>) => {
      q.c5 = { ...(q.c5 ?? {}), enabled: false };
      q.r1 = { ...(q.r1 ?? {}), shed: "none" };
    };
    strip(off);
    for (const s of Object.values(off.species ?? {})) strip(s as Record<string, any>);
    writeFileSync(`${out}/noshed-${sp}-s${seed}.json`, JSON.stringify(off));
  }
}
