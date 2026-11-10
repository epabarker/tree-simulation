/**
 * The open-grown lone-tree stage's evidence check (ADR 0062, spec §C2, ticket #115): each exemplar
 * species alone in `loneTreeParams`' square 60 m box, seeds 1–20, to season 100, natively (release,
 * `cli/run.ts` builds it when stale). Too slow for `npm run check` (about an hour on 6 simulators):
 * it runs as the named regressions do, by hand or in CI.
 *
 * The two checks, fixed before the first run:
 * - **The box holds the crown:** `budsOutside` is 0 in every season of every run. A hard check: any
 *   run with a bud past a bound fails it, and is reported with its seed and seasons. It is never
 *   hidden by enlarging the box or clipping the crown (ADR 0062).
 * - **The crown is round in plan:** at season 100, min(crownWidth, crownDepth) ÷ max(…) ≥ 0.75
 *   (the extents of all tips in x and in z), in ≥ 18 of seeds 1–20 per species.
 *
 * The counts the build reached (AGENTS.md's seeds rule), at e5cef16 (#115; docs/devlog.md, 2026-11-10):
 *   box held:  oak 19, maple 20, birch 16, beech 18, hornbeam 20, holly 20 of 20 (bar: 20 of 20)
 *              fails: oak s15, birch s3 (the 50 m top), s5, s13, s18, beech s11, s15 (the sides)
 *   round:     oak 15, maple 19, birch 20, beech 20, hornbeam 20, holly 19 of 20 (bar: 18)
 *              below 0.75: oak s1, s5, s6, s15, s17; maple s18; holly s15
 *   So the check is red at that commit: reported, not hidden (ADR 0062).
 *
 *   node cli/open-grown.ts                 all six exemplars, seeds 1–20, 6 simulators
 *   node cli/open-grown.ts -j 3 --species birch --seeds 1-20 --out runs/open-grown
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loneTreeParams } from "../src/core/presets.ts";

const RUN = fileURLToPath(new URL("run.ts", import.meta.url));
export const EXEMPLARS = ["oak", "maple", "birch", "beech", "hornbeam", "holly"];
export const SEASONS = 100;
/** The roundness bar: min ÷ max of the crown's width and depth at season 100. */
export const ROUND = 0.75;
/** Seeds of 20 that must be round, per species. */
export const ROUND_OF_20 = 18;

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const jobs = Math.min(6, Math.max(1, Number(arg("-j", "6"))));
const species = arg("--species", EXEMPLARS.join(",")).split(",");
const [s0, s1] = arg("--seeds", "1-20").split("-").map(Number) as [number, number];
const seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, k) => s0 + k);
const out = arg("--out", "runs/open-grown");

interface Result {
  species: string;
  seed: number;
  alive: boolean;
  /** Seasons with any bud outside the box, and the most in one season. */
  outsideSeasons: number[];
  outsideMax: number;
  height: number;
  width: number;
  depth: number;
  round: number;
}

function read(dir: string, sp: string, seed: number): Result {
  const [head, ...lines] = readFileSync(join(dir, "metrics.csv"), "utf8").trim().split("\n");
  const cols = (head as string).split(",");
  const col = (name: string) => cols.indexOf(name);
  const [season, tree, alive, outside, h, w, d] = [
    "season",
    "tree",
    "alive",
    "budsOutside",
    "height",
    "crownWidth",
    "crownDepth",
  ].map(col) as number[];
  const outsideSeasons: number[] = [];
  let outsideMax = 0;
  let last: string[] | undefined;
  for (const line of lines) {
    const v = line.split(",");
    if (Number(v[tree as number]) !== 0) continue;
    const n = Number(v[outside as number]);
    if (n > 0) outsideSeasons.push(Number(v[season as number]));
    outsideMax = Math.max(outsideMax, n);
    last = v;
  }
  if (!last) throw new Error(`${sp} s${seed}: no rows`);
  const width = Number(last[w as number]);
  const depth = Number(last[d as number]);
  return {
    species: sp,
    seed,
    alive: last[alive as number] === "1" && Number(last[season as number]) === SEASONS,
    outsideSeasons,
    outsideMax,
    height: Number(last[h as number]),
    width,
    depth,
    round: Math.max(width, depth) > 0 ? Math.min(width, depth) / Math.max(width, depth) : 0,
  };
}

function runOne(sp: string, seed: number): Promise<Result> {
  const dir = join(out, `${sp}-s${seed}`);
  mkdirSync(dir, { recursive: true });
  const params = join(dir, "params.json");
  writeFileSync(params, JSON.stringify(loneTreeParams(sp, seed)));
  const args = [RUN, "--preset", "oakOpen", "--params", params, "--seasons", `${SEASONS}`];
  return new Promise((resolve, reject) => {
    const child = spawn("node", [...args, "--quiet", "--out", join(dir, "run")], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`${sp} s${seed}: exit ${code}`));
      const r = read(join(dir, "run"), sp, seed);
      // Keep the metrics, drop the geometry (generated output, ADR: runs/ is never committed).
      rmSync(join(dir, "run", "metamers.csv"), { force: true });
      resolve(r);
    });
  });
}

async function main() {
  // One run first, so the binary is built once and six launchers do not race cargo.
  const queue = species.flatMap((sp) => seeds.map((seed) => [sp, seed] as const));
  const results: Result[] = [];
  const report = (r: Result) => {
    results.push(r);
    console.log(
      `${r.species} s${r.seed}: H ${r.height.toFixed(0)}, W ${r.width.toFixed(0)}, D ${r.depth.toFixed(0)}, round ${r.round.toFixed(2)}, outside ${r.outsideMax}${r.outsideSeasons.length ? ` in ${r.outsideSeasons.length} seasons` : ""}`,
    );
  };
  const first = queue.shift();
  if (first) report(await runOne(...first));
  await Promise.all(
    Array.from({ length: jobs }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) report(await runOne(...next));
    }),
  );
  writeFileSync(join(out, "summary.json"), `${JSON.stringify(results, null, 1)}\n`);
  let failed = false;
  for (const sp of species) {
    const rs = results.filter((r) => r.species === sp).sort((a, b) => a.seed - b.seed);
    const held = rs.filter((r) => r.outsideMax === 0);
    const round = rs.filter((r) => r.round >= ROUND);
    const bar = Math.ceil((ROUND_OF_20 * rs.length) / 20);
    const ok = held.length === rs.length && round.length >= bar;
    failed ||= !ok;
    const ratios = rs.map((r) => r.round);
    console.log(
      `${ok ? "PASS" : "FAIL"} ${sp}: box held ${held.length} of ${rs.length}; round (≥ ${ROUND}) ${round.length} of ${rs.length} (bar ${bar}); min/max ${Math.min(...ratios).toFixed(2)}–${Math.max(...ratios).toFixed(2)}; dead ${rs.filter((r) => !r.alive).length}`,
    );
    for (const r of rs.filter((x) => x.outsideMax > 0))
      console.log(
        `  ${sp} seed ${r.seed}: up to ${r.outsideMax} buds outside, seasons ${r.outsideSeasons[0]}–${r.outsideSeasons.at(-1)} (${r.outsideSeasons.length}), H ${r.height.toFixed(0)} at ${SEASONS}`,
      );
    for (const r of rs.filter((x) => x.round < ROUND))
      console.log(
        `  ${sp} seed ${r.seed}: not round, W ${r.width.toFixed(0)} D ${r.depth.toFixed(0)}`,
      );
  }
  if (failed) process.exitCode = 1;
}

await main();
