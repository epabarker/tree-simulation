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
 *   node cli/oak-crown.ts --patch runs/oak-round2/d14a11.json      another oak patch (round two)
 *   node cli/oak-crown.ts --patch p.json --seeds 1,6,10 --no-head --species oak --snapshots 100
 *
 * --patch takes a file { "species": { "oak": <a species patch> } } (only the oak may be patched:
 * birch's identity is the check); its arm is named after the file, <out>/<name>/. Without it the
 * arm is the built-in d12a13, in <out>/patch/ (round one's directory). A run whose record and
 * options match a finished run in place is reused, not rerun. --snapshots keeps metamers.csv and
 * buds.csv at those seasons (for round two's outline measures).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Params, patchSpecies, type SpeciesPatch } from "../src/core/params.ts";
import { loneTreeParams } from "../src/core/presets.ts";
import {
  armName,
  compareHashes,
  FLANK_FROM,
  FLANK_MIN,
  FORM_SEASONS,
  parseSeeds,
  ROUND,
  SEASONS,
  type SeedScore,
  scoreSeed,
  tally,
  W90_BAND,
} from "./oak-crown-score.ts";
import { arg } from "./shared.ts";

const RUN = fileURLToPath(new URL("run.ts", import.meta.url));
/** The page's `d12a13`: the oak's species patch, and nothing else. */
export const D12A13: Record<string, SpeciesPatch> = {
  oak: { r2: { dLambda: 0.12, aC: 13.5 } } as unknown as SpeciesPatch,
};

const jobs = Math.min(6, Math.max(1, Number(arg("-j", "6"))));
const seeds = parseSeeds(arg("--seeds", "1-20"));
const out = arg("--out", "runs/oak-crown");
const patchFile = process.argv.includes("--patch") ? arg("--patch", "") : undefined;
const PATCH: Record<string, SpeciesPatch> = patchFile
  ? JSON.parse(readFileSync(patchFile, "utf8")).species
  : D12A13;
if (Object.keys(PATCH).some((name) => name !== "oak"))
  throw new Error("the patch may change only the oak: birch's identity is the check");
const ARM = armName(patchFile);
const withHead = !process.argv.includes("--no-head");
const species = arg("--species", "oak,birch").split(",");
const snapshots = arg("--snapshots", "");

const params = (sp: string, seed: number, arm: string): Params => {
  let p = loneTreeParams(sp, seed);
  if (arm !== "head") for (const [name, s] of Object.entries(PATCH)) p = patchSpecies(p, name, s);
  return p;
};

function runOne(sp: string, seed: number, arm: string): Promise<string> {
  const dir = join(out, arm, `${sp}-s${seed}`);
  mkdirSync(dir, { recursive: true });
  const record = join(dir, "record.json");
  // A replay record carries the whole params as they are (as cli/probe.ts runs them).
  const text = JSON.stringify({ params: params(sp, seed, arm), events: [], seasons: SEASONS });
  const options = join(dir, "options.txt");
  const has = (f: string) => existsSync(join(dir, f));
  // A finished run of the same record and options is reused.
  if (
    has("hash.txt") &&
    has("metrics.csv") &&
    has("record.json") &&
    readFileSync(record, "utf8") === text &&
    (has("options.txt") ? readFileSync(options, "utf8") : "") === snapshots &&
    (!snapshots || has("metamers.csv"))
  )
    return Promise.resolve(dir);
  rmSync(join(dir, "hash.txt"), { force: true });
  writeFileSync(record, text);
  const args = [RUN, "--replay", record, "--seasons", `${SEASONS}`, "--quiet", "--out", dir];
  if (snapshots) args.push("--snapshots", snapshots);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`${arm} ${sp} s${seed}: exit ${code}`));
      // Keep the metrics and the hash; drop the geometry (generated output) unless asked.
      const drop = ["ground.csv", "form.csv", ...(snapshots ? [] : ["metamers.csv", "buds.csv"])];
      for (const f of drop) rmSync(join(dir, f), { force: true });
      if (snapshots) writeFileSync(options, snapshots);
      else rmSync(options, { force: true });
      resolve(dir);
    });
  });
}

const pct = (x: number) => (Number.isFinite(x) ? (100 * x).toFixed(1) : "NaN");
const f2 = (x: number | undefined) => (x !== undefined && Number.isFinite(x) ? x.toFixed(2) : "—");
const f1 = (x: number | undefined) => (x !== undefined && Number.isFinite(x) ? x.toFixed(1) : "—");

function report(arm: string, scores: SeedScore[], lines: string[]) {
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
  mkdirSync(join(out, ARM), { recursive: true });
  writeFileSync(join(out, ARM, "patch.json"), `${JSON.stringify({ species: PATCH }, null, 1)}\n`);
  const arms = withHead ? ["head", ARM] : [ARM];
  const queue = arms.flatMap((arm) =>
    species.flatMap((sp) => seeds.map((seed) => [sp, seed, arm] as const)),
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
  const dir = (arm: string, sp: string, seed: number) => join(out, arm, `${sp}-s${seed}`);
  const lines: string[] = [];
  const scores: Record<string, SeedScore[]> = {};
  for (const arm of species.includes("oak") ? arms : []) {
    scores[arm] = seeds.map((seed) =>
      scoreSeed(readFileSync(join(dir(arm, "oak", seed), "metrics.csv"), "utf8"), seed),
    );
    report(arm, scores[arm], lines);
  }
  const hash = (arm: string) =>
    new Map(
      seeds.map((seed) => {
        const p = join(dir(arm, "birch", seed), "hash.txt");
        return [seed, existsSync(p) ? readFileSync(p, "utf8").trim() : "missing"] as const;
      }),
    );
  const birch =
    withHead && species.includes("birch") ? compareHashes(hash("head"), hash(ARM)) : undefined;
  if (birch)
    lines.push(
      `${birch.differing.length ? "FAIL" : "PASS"} birch under the oak's patch (${ARM}): hash identical on ${birch.identical} of ${seeds.length}` +
        (birch.differing.length ? `; differs on seeds ${birch.differing.join(", ")}` : ""),
    );
  const text = `${lines.join("\n")}\n`;
  // Round one's report keeps its name; another patch's report sits beside it under its own.
  const name = ARM === "patch" ? "" : `-${ARM}`;
  writeFileSync(join(out, `report${name}.txt`), text);
  writeFileSync(
    join(out, `summary${name}.json`),
    `${JSON.stringify({ scores, birch }, null, 1)}\n`,
  );
  process.stdout.write(text);
  const t = scores[ARM] ? tally(scores[ARM]) : undefined;
  if ((t && !t.pass) || birch?.differing.length) process.exitCode = 1;
}

await main();
