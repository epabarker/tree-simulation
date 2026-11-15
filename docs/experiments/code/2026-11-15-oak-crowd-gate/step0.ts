/**
 * ADR 0069, step 0: the params for the read-only crowd probe (`rust/core/examples/crowd_probe.rs`).
 *
 * For each width × seed × arm (HEAD's oak, and #124's `d16a13`) it writes the garden's params
 * (`forestParams`, the guard's worlds) with the oak's `r2.relayCrowd` set to K, so the core
 * computes the tree's mean neighbour shade for oaks. The oak has no relay, so nothing reads it:
 * `--check` runs one garden with and without it through treesim and compares the hashes.
 *
 *   node docs/experiments/code/2026-11-15-oak-crowd-gate/step0.ts            params + jobs.txt
 *   node docs/experiments/code/2026-11-15-oak-crowd-gate/step0.ts --check    the inertness check
 *   node docs/experiments/code/2026-11-15-oak-crowd-gate/step0.ts --pilot    the pilot: a third arm,
 *        `d16a13` + `r2.dLambdaCrowd` K (the rule under test), 300 seasons, runs/…/pilot/
 *
 * Writes runs/oak-crowd-gate/step0/ (generated, never committed).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SpeciesPatch } from "../../../../src/core/params.ts";
import { forestParams } from "../../../../src/core/presets.ts";
import { patched, sim } from "../../../../cli/shared.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const pilot = process.argv.includes("--pilot");
const out = join(ROOT, "runs/oak-crowd-gate", pilot ? "pilot" : "step0");
export const K = 10;
export const SEASONS = pilot ? 300 : 150;
export const WIDTHS = [160, 66];
export const SEEDS = [1, 2, 3];
const D16A13: SpeciesPatch = { r2: { dLambda: 0.16, aC: 13.5 } };
const CROWD: SpeciesPatch = { r2: { relayCrowd: K } };
const GATE: SpeciesPatch = { r2: { dLambdaCrowd: K } };
export const ARMS: Record<string, SpeciesPatch[]> = {
  head: [CROWD],
  d16a13: [D16A13, CROWD],
  ...(pilot ? { gate: [D16A13, GATE] } : {}),
};

const build = (width: number, seed: number, patches: SpeciesPatch[]) => {
  let p = forestParams(width, seed);
  for (const oak of patches) p = patched(p, { species: { oak } });
  return p;
};
const planted = (width: number, seed: number) => {
  const p = forestParams(width, seed);
  const ha = (width * (p.world.depth ?? 64) * 0.0625) / 10_000;
  return Math.round((p.o4.planting?.density ?? 0) * ha);
};

mkdirSync(out, { recursive: true });
if (process.argv.includes("--check")) {
  // The probe's params must grow the garden the guard grows: same hash with and without CROWD.
  for (const [arm, patches] of Object.entries(ARMS)) {
    const hashes: string[] = [];
    for (const [tag, ps] of [
      ["plain", patches.filter((x) => x !== CROWD)],
      ["crowd", patches],
    ] as const) {
      const dir = join(out, "check", `${arm}-${tag}`);
      await sim(build(66, 1, ps), 60, dir);
      hashes.push(readFileSync(join(dir, "hash.txt"), "utf8").trim());
    }
    console.log(`${arm}: ${hashes[0]} ${hashes[1]} ${hashes[0] === hashes[1] ? "identical" : "DIFFERENT"}`);
  }
} else {
  const jobs: string[] = [];
  for (const width of WIDTHS)
    for (const seed of SEEDS)
      for (const [arm, patches] of Object.entries(ARMS)) {
        const name = `${arm}-w${width}-s${seed}`;
        writeFileSync(join(out, `${name}.json`), JSON.stringify(build(width, seed, patches)));
        jobs.push(`${name} ${SEASONS} ${planted(width, seed)} oak ${K}`);
      }
  writeFileSync(join(out, "jobs.txt"), `${jobs.join("\n")}\n`);
  console.log(`${jobs.length} jobs in ${out}/jobs.txt`);
}
