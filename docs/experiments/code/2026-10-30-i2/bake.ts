/**
 * I2's preview stands: the garden's planting (forestParams) at a phone's and a laptop's plate width,
 * seed 10, grown in 3D at D = 64 in each look (wood interior, edge, hedgerow) for 40 seasons (the
 * intro's end) and 100, and the `forest` preset (the review's projections' stand) at season 40 in
 * each look, saved as checkpoints for the preview page (`preview/`). Natively, with the lanes
 * threaded (the same bits, I2).
 *
 *   node docs/experiments/code/2026-10-30-i2/bake.ts runs/i2-bake [rust/target/threads/release/treesim]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { forestParams, presetParams } from "../../../../src/core/presets.ts";

const out = process.argv[2] ?? "runs/i2-bake";
const bin = process.argv[3] ?? "rust/target/threads/release/treesim";
export const LOOKS = { interior: [0.2, 0.2], edge: [1, 0.2], hedgerow: [1, 1] } as const;
export const WIDTHS = [66, 160];
export const SEED = 10;
export const SEASONS = [40, 100];
mkdirSync(out, { recursive: true });
// Each planting twice: as the model grows it (O4 on: recruits fill the ground up to maxTrees), and
// the planting alone (O4 off), so V can see the planted crowns without the seedlings.
for (const recruits of [true, false]) for (const width of WIDTHS) {
  for (const [look, faces] of Object.entries(LOOKS)) {
    const p = forestParams(width, SEED);
    p.world = { ...p.world, depth: 64, faces: [faces[0], faces[1]] };
    const tag = recruits ? `${width}-${look}` : `${width}-planted-${look}`;
    if (!recruits) {
      p.o4 = { ...p.o4, enabled: false };
      for (const sp of Object.values(p.species ?? {})) if (sp.o4) sp.o4 = { ...sp.o4, enabled: false };
    }
    const file = join(out, `params-${tag}.json`);
    writeFileSync(file, JSON.stringify(p));
    for (const seasons of SEASONS) {
      const dir = join(out, `run-${tag}-${seasons}`);
      const t0 = performance.now();
      execFileSync(bin, [
        "--preset", "mixedWood", "--params", file, "--seasons", String(seasons),
        "--checkpoint-at", String(seasons), "--out", dir, "--quiet",
      ]);
      renameSync(join(dir, `checkpoint-${seasons}.bin.gz`), join(out, `${tag}-${seasons}.bin.gz`));
      console.log(`${tag}-${seasons}: ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    }
  }
}
for (const [look, faces] of Object.entries(LOOKS)) {
  const p = presetParams("forest", 1);
  p.world = { ...p.world, depth: 64, faces: [faces[0], faces[1]] };
  const file = join(out, `params-forest-${look}.json`);
  writeFileSync(file, JSON.stringify(p));
  const dir = join(out, `run-forest-${look}-40`);
  execFileSync(bin, ["--preset", "forest", "--params", file, "--seasons", "40", "--checkpoint-at", "40", "--out", dir, "--quiet"]);
  renameSync(join(dir, "checkpoint-40.bin.gz"), join(out, `forest-${look}-40.bin.gz`));
  console.log(`forest-${look}-40`);
}
