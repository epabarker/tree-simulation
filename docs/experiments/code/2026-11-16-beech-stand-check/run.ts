/**
 * #134's beech stand check (docs/experiments/2026-11-16-beech-stand-check.md): six arms on the
 * garden (`forestParams`) at widths 160 and 66, seeds 1–20, to season 300, natively, metamers at
 * 100, 200 and 300; at 160 cells also `--light` (ground.csv, for the floor light).
 *
 * Arms: head; s3d (the stubs probe's: o4.stubs, stubLight 0.15, stubDeath 3, stubDemote 0.075);
 * B1 (beech `r2.levels.0.lambda` 0.6708 and `r1.Lh` 75, the λ₀ confirmation's pick); B2 (λ₀ 0.6708
 * alone); B1s3d and B2s3d (each with s3d's stubs). Beech's change goes through `withAssign`, as the
 * lone confirmation set it, on beech's own species patch.
 *
 * Reuse: head and s3d at 66 cells are linked from the stub-churn probe's runs (made at 7557066,
 * whose rust/ is this build's) with `--reuse <dir>`; the 160-cell head and s3d runs are re-run
 * here with `--light`, and their hashes are compared with the stubs probe's by `--check <dir>`.
 *
 *   node docs/experiments/code/2026-11-16-beech-stand-check/run.ts -j 10 \
 *     --reuse <stub-churn-probe dir> --check <seedling-stubs-probe dir>
 *
 * Writes runs/134-beech-stand/<arm>/w<width>-s<seed>/ (generated, never committed). Resumable.
 */
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { forestParams } from "../../../../src/core/presets.ts";
import type { Params } from "../../../../src/core/params.ts";
import { arg, type Patch, patched, pool, sim } from "../../../../cli/shared.ts";
import { withAssign } from "../../../../cli/trials.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const S3D: Patch = {
  params: {
    o4: { stubs: true, stubLight: 0.15, stubDeath: 3, stubDemote: 0.075 },
  } as Patch["params"],
};
const B1 = { "r2.levels.0.lambda": 0.6708, "r1.Lh": 75 };
const B2 = { "r2.levels.0.lambda": 0.6708 };
export const ARMS: Record<string, { patch: Patch; beech: Record<string, unknown> }> = {
  head: { patch: {}, beech: {} },
  s3d: { patch: S3D, beech: {} },
  B1: { patch: {}, beech: B1 },
  B2: { patch: {}, beech: B2 },
  B1s3d: { patch: S3D, beech: B1 },
  B2s3d: { patch: S3D, beech: B2 },
};
export const paramsOf = (arm: string, width: number, seed: number): Params => {
  const a = ARMS[arm] as (typeof ARMS)[string];
  return withAssign(patched(forestParams(width, seed), a.patch), "beech", a.beech);
};

const WIDTHS = [160, 66];
const SEASONS = 300;
const SNAPSHOTS = "100,200";
const jobs = Math.min(10, Math.max(1, Number(arg("-j", "10"))));
const names = arg("--arms", Object.keys(ARMS).join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = join(ROOT, arg("--out", "runs/134-beech-stand"));
const reuse = arg("--reuse", "");
const check = arg("--check", "");

type Job = { arm: string; width: number; seed: number };
const runDir = ({ arm, width, seed }: Job) => join(out, arm, `w${width}-s${seed}`);
const reused = (j: Job) => reuse !== "" && j.width === 66 && (j.arm === "head" || j.arm === "s3d");

// Print beech's effective λ₀ and L_h per arm (a check that the assign reached the garden's beech).
for (const arm of names) {
  const p = paramsOf(arm, 160, 1);
  const b = p.species?.beech as unknown as {
    r2?: { levels?: { lambda: number }[] };
    r1?: { Lh?: number };
  };
  console.log(
    `${arm}: beech λ₀ ${b?.r2?.levels?.[0]?.lambda ?? "(world)"}, Lh ${b?.r1?.Lh ?? "(world)"}, o4.stubs ${p.o4?.stubs ?? false}`,
  );
}

// Build once before the pool.
await sim(forestParams(66, 1), 1, join(out, "build"));

const all: Job[] = WIDTHS.flatMap((width) =>
  seeds.flatMap((seed) => names.map((arm) => ({ arm, width, seed }))),
);
for (const j of all.filter(reused)) {
  const from = join(reuse, j.arm, `w${j.width}-s${j.seed}`);
  if (!existsSync(runDir(j))) {
    mkdirSync(join(out, j.arm), { recursive: true });
    symlinkSync(from, runDir(j));
  }
}
const t0 = performance.now();
await pool(
  all.filter((j) => !reused(j)),
  jobs,
  async (j) => {
    if (existsSync(join(runDir(j), "hash.txt"))) return;
    const extra = ["--snapshots", SNAPSHOTS, ...(j.width === 160 ? ["--light"] : [])];
    await sim(paramsOf(j.arm, j.width, j.seed), SEASONS, runDir(j), extra);
  },
);
console.log(`runs wall ${((performance.now() - t0) / 60_000).toFixed(1)} min on ${jobs}`);

// The reuse check: this build's head and s3d at 160 against the stubs probe's hashes.
if (check) {
  const rows: string[] = [];
  let same = 0;
  let n = 0;
  for (const j of all.filter((j) => j.width === 160 && (j.arm === "head" || j.arm === "s3d"))) {
    const theirs = join(check, j.arm, `w${j.width}-s${j.seed}`, "hash.txt");
    if (!existsSync(theirs)) continue;
    const a = readFileSync(join(runDir(j), "hash.txt"), "utf8").trim();
    const b = readFileSync(theirs, "utf8").trim();
    n++;
    if (a === b) same++;
    rows.push(`${j.arm} w${j.width} s${j.seed}: ${a} ${a === b ? "=" : "≠"} ${b}`);
  }
  rows.push(`hashes equal: ${same} of ${n}`);
  writeFileSync(join(out, "reuse-check.txt"), `${rows.join("\n")}\n`);
  console.log(rows.at(-1));
}
