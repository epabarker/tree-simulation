/**
 * The oak's rounded-crown evidence (ticket #124, spec #111; docs/features/rounded-crown.md): the
 * lone open-grown oak (`loneTreeParams`, the square 60 m box) at HEAD and with the page's `d12a13`
 * species patch (the oak's ontogenetic fall of λ, `r2.dLambda` 0.12 from `r2.aC` 13.5), seeds
 * 1–20, to season 100, natively (cli/run.ts builds treesim when stale); and birch under the same
 * patch file against birch at HEAD, whose hashes must be identical, since the patch is the oak's
 * alone. Too slow for `npm run check` (80 runs, about an hour on 6 simulators): run by hand.
 *
 * The bars, fixed before the first evidence run (2026-11-10), are in cli/oak-crown-score.ts'
 * header: the upper-flank share of new metamers ≥ 5% (mean over seasons 60–100), w90 at 100 in
 * the divided-crown band 0.38–0.85, each on ≥ 15 of seeds 1–20 scaled to the held seeds; a seed
 * with any bud outside the box is named and excluded (ADR 0062's amendment); birch identical on
 * every seed. The dome is judged by eye on a season-100 contact sheet (cli/probe.ts), not here.
 *
 *   node cli/oak-crown.ts                      seeds 1–20, 6 simulators, runs/oak-crown
 *   node cli/oak-crown.ts -j 3 --seeds 1-5 --out runs/oak-crown-try
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Params, patchSpecies, type SpeciesPatch } from "../src/core/params.ts";
import { loneTreeParams } from "../src/core/presets.ts";
import {
  compareHashes,
  FLANK_FROM,
  FLANK_MIN,
  FORM_SEASONS,
  ROUND,
  SEASONS,
  type SeedScore,
  scoreSeed,
  tally,
  W90_BAND,
} from "./oak-crown-score.ts";

const RUN = fileURLToPath(new URL("run.ts", import.meta.url));
/** The page's `d12a13`: the oak's species patch, and nothing else. */
export const D12A13: Record<string, SpeciesPatch> = {
  oak: { r2: { dLambda: 0.12, aC: 13.5 } } as unknown as SpeciesPatch,
};

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const jobs = Math.min(6, Math.max(1, Number(arg("-j", "6"))));
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = arg("--out", "runs/oak-crown");

type Arm = "head" | "patch";
const params = (sp: string, seed: number, arm: Arm): Params => {
  let p = loneTreeParams(sp, seed);
  if (arm === "patch") for (const [name, s] of Object.entries(D12A13)) p = patchSpecies(p, name, s);
  return p;
};

function runOne(sp: string, seed: number, arm: Arm): Promise<string> {
  const dir = join(out, arm, `${sp}-s${seed}`);
  mkdirSync(dir, { recursive: true });
  const record = join(dir, "record.json");
  // A replay record carries the whole params as they are (as cli/probe.ts runs them).
  writeFileSync(
    record,
    JSON.stringify({ params: params(sp, seed, arm), events: [], seasons: SEASONS }),
  );
  const args = [RUN, "--replay", record, "--seasons", `${SEASONS}`, "--quiet", "--out", dir];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`${arm} ${sp} s${seed}: exit ${code}`));
      // Keep the metrics and the hash; drop the geometry (generated output).
      for (const f of ["metamers.csv", "buds.csv", "ground.csv", "form.csv"])
        rmSync(join(dir, f), { force: true });
      resolve(dir);
    });
  });
}

const pct = (x: number) => (Number.isFinite(x) ? (100 * x).toFixed(1) : "NaN");
const f2 = (x: number | undefined) => (x !== undefined && Number.isFinite(x) ? x.toFixed(2) : "—");
const f1 = (x: number | undefined) => (x !== undefined && Number.isFinite(x) ? x.toFixed(1) : "—");

function report(arm: Arm, scores: SeedScore[], lines: string[]) {
  const t = tally(scores);
  lines.push(
    `${t.pass ? "PASS" : "FAIL"} oak ${arm}: held ${t.held} of ${t.runs}; bar ${t.bar} (⌈0.75 × held⌉, ≥ 15 held); ` +
      `flank ≥ ${FLANK_MIN * 100}% (mean ${FLANK_FROM}–${SEASONS}) ${t.flank}; w90 ${W90_BAND.join("–")} ${t.w90}; both ${t.both}; ` +
      `round ≥ ${ROUND} at ${SEASONS} (reported) ${scores.filter((s) => s.held && (s.at[SEASONS]?.round ?? 0) >= ROUND).length}`,
  );
  for (const s of scores.filter((x) => !x.held))
    lines.push(
      `  excluded: seed ${s.seed}, up to ${s.outsideMax} buds outside in ${s.outsideSeasons.length} seasons (${s.outsideSeasons[0]}–${s.outsideSeasons.at(-1)})`,
    );
  for (const s of scores.filter((x) => !x.alive))
    lines.push(`  dead before ${SEASONS}: seed ${s.seed}`);
  lines.push(
    `  seed  flank%  w90   round100  ${FORM_SEASONS.map((k) => `H${k} reach${k} W/H${k}`).join("  ")}`,
  );
  for (const s of scores)
    lines.push(
      `  ${String(s.seed).padStart(4)}${s.held ? " " : "x"} ${pct(s.flank).padStart(5)}${s.flankPass ? " " : "-"} ${f2(s.w90)}${s.w90Pass ? " " : "-"}  ${f2(s.at[SEASONS]?.round)}     ` +
        FORM_SEASONS.map(
          (k) => `${f1(s.at[k]?.height)} ${f1(s.at[k]?.reach)} ${f2(s.at[k]?.wh)}`,
        ).join("   "),
    );
}

async function main() {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "patch.json"), `${JSON.stringify({ species: D12A13 }, null, 1)}\n`);
  const queue = (["head", "patch"] as const).flatMap((arm) =>
    ["oak", "birch"].flatMap((sp) => seeds.map((seed) => [sp, seed, arm] as const)),
  );
  // One run first, so the binary is built once and six launchers do not race cargo.
  const first = queue.shift();
  if (first) await runOne(...first);
  await Promise.all(
    Array.from({ length: jobs }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        await runOne(...next);
        process.stderr.write(`oak-crown: ${next[2]} ${next[0]} s${next[1]}\n`);
      }
    }),
  );
  const dir = (arm: Arm, sp: string, seed: number) => join(out, arm, `${sp}-s${seed}`);
  const lines: string[] = [];
  const scores: Record<Arm, SeedScore[]> = { head: [], patch: [] };
  for (const arm of ["head", "patch"] as const) {
    scores[arm] = seeds.map((seed) =>
      scoreSeed(readFileSync(join(dir(arm, "oak", seed), "metrics.csv"), "utf8"), seed),
    );
    report(arm, scores[arm], lines);
  }
  const hash = (arm: Arm) =>
    new Map(
      seeds.map((seed) => {
        const p = join(dir(arm, "birch", seed), "hash.txt");
        return [seed, existsSync(p) ? readFileSync(p, "utf8").trim() : "missing"] as const;
      }),
    );
  const birch = compareHashes(hash("head"), hash("patch"));
  lines.push(
    `${birch.differing.length ? "FAIL" : "PASS"} birch under the oak's patch: hash identical on ${birch.identical} of ${seeds.length}` +
      (birch.differing.length ? `; differs on seeds ${birch.differing.join(", ")}` : ""),
  );
  const text = `${lines.join("\n")}\n`;
  writeFileSync(join(out, "report.txt"), text);
  writeFileSync(join(out, "summary.json"), `${JSON.stringify({ scores, birch }, null, 1)}\n`);
  process.stdout.write(text);
  const t = tally(scores.patch);
  if (!t.pass || birch.differing.length) process.exitCode = 1;
}

await main();
