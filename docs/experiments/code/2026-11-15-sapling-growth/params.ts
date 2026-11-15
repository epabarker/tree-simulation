/**
 * #138: the garden's params (HEAD's `forestParams`, 160 cells) for the read-only sapling probe
 * (`rust/core/examples/sapling_probe.rs`), seeds 1–3. Writes runs/sapling-138/ (generated).
 *
 *   node docs/experiments/code/2026-11-15-sapling-growth/params.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { forestParams } from "../../../../src/core/presets.ts";

const out = join(fileURLToPath(new URL("../../../../", import.meta.url)), "runs/sapling-138");
mkdirSync(out, { recursive: true });
for (const seed of [1, 2, 3]) {
  const p = forestParams(160, seed);
  writeFileSync(join(out, `garden160-s${seed}.json`), JSON.stringify(p));
  if (seed === 1) {
    const sp = p.species as Record<string, Record<string, Record<string, unknown>>>;
    for (const name of ["hornbeam", "beech", "birch", "oak"]) {
      const s = sp[name] ?? {};
      console.log(name, JSON.stringify({ r1: s.r1, r4: s.r4, c3: s.c3, c1: s.c1, r6: s.r6 }));
    }
    console.log("world", JSON.stringify({ r1: p.r1, r4: p.r4, c3: p.c3, r5: p.r5 }));
  }
}
