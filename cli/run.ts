/**
 * Headless runner: the Rust core natively (I1, ADR 0024; rust/cli). This launcher builds the
 * binary when its sources are newer and runs it with the same arguments and stdin, so scripts
 * that call `node cli/run.ts` (analysis/treesim/sweep.py) run unchanged.
 *
 *   npm run sim -- --preset explosion --seed 3 --seasons 12 --out runs/m0
 *   npm run sim -- --params my.json --snapshots 25,50 --out runs/x   (patch over the preset)
 *   npm run sim -- --replay tree-run.json --out runs/replay          (page's "Export run")
 *   echo '{"c3":{"lambda":0.56}}' | npm run sim -- --params - --out runs/y
 *   npm run sim -- --preset oakOpen --species-patch '{"oak":{"r3":{"posture":false}}}'   (M26)
 *   npm run sim -- --preset succession --checkpoint-at 60 --seasons 60 --out runs/c   (M21)
 *
 * It is the page's core, so an "Export run" replays exactly.
 * Writes to --out: run.json, metrics.csv (one row per tree per season), metamers.csv (geometry at
 * --snapshots seasons and the last), form.csv (crown form at the same seasons), hash.txt, with
 * --light light.csv, with --checkpoint-at N checkpoint-N.bin.gz. --species-patch amends species in
 * place, {name: patch}; a `species` entry in --params replaces the species' whole patch.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rust = fileURLToPath(new URL("../rust", import.meta.url));
const args = process.argv.slice(2);
const targetDir = join(rust, "target", "native");
const binary = join(targetDir, "release", "treesim");

/** The newest modification time under the sources the binary is built from. */
function newest(dir: string): number {
  let t = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return t;
}

const sources = Math.max(
  newest(join(rust, "core", "src")),
  newest(join(rust, "cli", "src")),
  statSync(join(rust, "presets.json")).mtimeMs,
  statSync(join(rust, "Cargo.lock")).mtimeMs,
);
let built = 0;
try {
  built = statSync(binary).mtimeMs;
} catch {}
if (built < sources) {
  execFileSync(
    "cargo",
    ["build", "--release", "--quiet", "--locked", "-p", "treesim", "--target-dir", targetDir],
    { cwd: rust, stdio: "inherit" },
  );
}
const run = spawnSync(binary, args, { stdio: "inherit" });
process.exit(run.status ?? 1);
