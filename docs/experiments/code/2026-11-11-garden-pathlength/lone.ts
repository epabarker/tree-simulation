/**
 * The path-length probe's lone open-grown runs (#121; docs/experiments/2026-11-11-garden-pathlength-probe.md).
 * EXPLORATORY: seeds 1–3 only.
 *
 * Each round is a params patch over `loneTreeParams(species, seed)` (the open-grown 60 m box, ADR
 * 0062), merged as the garden sweep merges it, run natively to season 100 with metamer snapshots
 * every 10 seasons (dbh.py reads the DBH and the crown from them).
 *
 *   node docs/experiments/code/2026-11-11-garden-pathlength/lone.ts rounds.json [--jobs N] [--species a,b]
 *
 * rounds.json: { "<round>": { "params": {...}, "species": { "<name>": {...} } }, ... }
 * Writes runs/pathlength/lone/<round>/<species>-s<seed>/. Generated, never committed.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeParams, type ParamsPatch, patchSpecies, type SpeciesPatch } from "../../../../src/core/params.ts";
import { loneTreeParams } from "../../../../src/core/presets.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const argv = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] as string) : fallback;
};
const JOBS = Math.min(6, Number(opt("--jobs", "3")));
const SPECIES = opt("--species", "oak,maple,birch,beech,hornbeam,holly").split(",");
const SEEDS = opt("--seeds", "1,2,3").split(",").map(Number);
const LAST = 100;
const SNAPSHOTS = "10,20,30,40,50,60,70,80,90";
type Patch = { params?: ParamsPatch; species?: Record<string, SpeciesPatch> };
const rounds = JSON.parse(readFileSync(argv[0] as string, "utf8")) as Record<string, Patch>;

type Job = { round: string; species: string; seed: number };
const jobs: Job[] = Object.keys(rounds).flatMap((round) =>
  SPECIES.flatMap((species) => SEEDS.map((seed) => ({ round, species, seed }))),
);
const runOne = ({ round, species, seed }: Job) => {
  const patch = rounds[round] as Patch;
  const out = join(ROOT, "runs", "pathlength", "lone", round, `${species}-s${seed}`);
  if (existsSync(join(out, "hash.txt"))) return Promise.resolve();
  mkdirSync(out, { recursive: true });
  let p = loneTreeParams(species, seed);
  if (patch.params) p = mergeParams(p, patch.params);
  for (const [name, sp] of Object.entries(patch.species ?? {})) p = patchSpecies(p, name, sp);
  const record = join(out, "record.json");
  writeFileSync(record, JSON.stringify({ params: p, events: [], seasons: LAST }));
  const args = [join(ROOT, "cli", "run.ts"), "--replay", record, "--seasons", String(LAST)];
  args.push("--snapshots", SNAPSHOTS, "--quiet", "--out", out);
  return new Promise<void>((ok, bad) => {
    const c = spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
    c.on("exit", (code) => (code === 0 ? ok() : bad(new Error(`${out}: exit ${code}`))));
  });
};
let next = 0;
const worker = async () => {
  while (next < jobs.length) await runOne(jobs[next++] as Job);
};
await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, worker));
console.log(`${jobs.length} lone runs under runs/pathlength/lone/`);
