/**
 * The garden schedule's tuning rounds (#121; docs/experiments/2026-11-10-garden-schedule.md).
 * EXPLORATORY: seeds 1–3 only.
 *
 * Each round is a params patch over `forestParams(width, seed)` (merged as the feature probe merges
 * it, cli/probe.ts), run natively to season 300 at widths 160 and 66, seeds 1–3, with no
 * snapshots (the probe draws the chosen round's sheet). Every number is a column of the core's
 * own stand.csv, stand-species.csv or metrics.csv.
 *
 *   node docs/experiments/code/2026-11-10-garden-schedule/sweep.ts <round>=<patch.json|-> ... [--jobs N]
 *
 * Several rounds share one pool of up to N simulators (default 12).
 *
 * Writes runs/garden-schedule/<round>/{w<width>-s<seed>/, summary.json} and prints the round's
 * table. Generated, never committed.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeParams, type ParamsPatch, patchSpecies, type SpeciesPatch } from "../../../../src/core/params.ts";
import { forestParams } from "../../../../src/core/presets.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const argv = process.argv.slice(2);
const k = argv.indexOf("--jobs");
const JOBS = k >= 0 ? Number(argv[k + 1]) : 12;
// `depth` (the suppression probe, B): the slab's depth period in cells, the cap scaled with it so
// the guard stays per hectare (the planting is per hectare in the core already).
type Patch = { params?: ParamsPatch; species?: Record<string, SpeciesPatch>; depth?: number };
// rounds.json: { "<round>": <patch>, ... }
const rounds = JSON.parse(readFileSync(argv[0] as string, "utf8")) as Record<string, Patch>;
const SEEDS = [1, 2, 3];
const WIDTHS = [160, 66];
const LAST = 300;
const dirOf = (round: string) => join(ROOT, "runs", "garden-schedule", round);
for (const [round, patch] of Object.entries(rounds)) {
  mkdirSync(dirOf(round), { recursive: true });
  writeFileSync(join(dirOf(round), "patch.json"), JSON.stringify(patch, null, 1));
}

type Job = { round: string; width: number; seed: number };
const jobs: Job[] = Object.keys(rounds).flatMap((round) =>
  WIDTHS.flatMap((width) => SEEDS.map((seed) => ({ round, width, seed }))),
);
const runOne = ({ round, width, seed }: Job) => {
  const patch = rounds[round] as Patch;
  const out = join(dirOf(round), `w${width}-s${seed}`);
  if (existsSync(join(out, "stand.csv"))) return Promise.resolve();
  mkdirSync(out, { recursive: true });
  let p = forestParams(width, seed);
  if (patch.depth) {
    const scale = patch.depth / (p.world.depth ?? 64);
    p = mergeParams(p, {
      world: { ...p.world, depth: patch.depth },
      o4: { ...p.o4, maxTrees: Math.round(p.o4.maxTrees * scale) },
    });
  }
  if (patch.params) p = mergeParams(p, patch.params);
  for (const [name, sp] of Object.entries(patch.species ?? {})) p = patchSpecies(p, name, sp);
  const record = join(out, "record.json");
  writeFileSync(record, JSON.stringify({ params: p, events: [], seasons: LAST }));
  const args = [join(ROOT, "cli", "run.ts"), "--replay", record, "--seasons", String(LAST)];
  args.push("--quiet", "--out", out);
  // The occupancy probe (2026-11-11) reads canopy crowns' metamer tips at 100/200/300 (crowns.py);
  // set SWEEP_SNAPSHOTS="" for the earlier rounds' season-300 only output.
  const snaps = process.env.SWEEP_SNAPSHOTS ?? "100,200";
  if (snaps) args.push("--snapshots", snaps);
  const t0 = performance.now();
  return new Promise<void>((ok, bad) => {
    const c = spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
    c.on("exit", (code) => {
      writeFileSync(join(out, "wall.txt"), `${(performance.now() - t0) / 1000}\n`);
      code === 0 ? ok() : bad(new Error(`${out}: exit ${code}`));
    });
  });
};
let next = 0;
const worker = async () => {
  while (next < jobs.length) await runOne(jobs[next++] as Job);
};
await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, worker));

const csv = (path: string) => {
  const [head, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  const h = (head as string).split(",");
  return lines.map((l) => {
    const v = l.split(",");
    return Object.fromEntries(h.map((k, i) => [k, v[i] as string]));
  });
};

const AT = [100, 200, 300];
const summarise = (round: string) => (job: { width: number; seed: number }) => {
  const { width, seed } = job;
  const out = join(dirOf(round), `w${width}-s${seed}`);
  const recorded = JSON.parse(readFileSync(join(out, "record.json"), "utf8")).params;
  const cap = recorded.o4.maxTrees;
  const depth = recorded.world.depth ?? 64;
  const stand = csv(join(out, "stand.csv"));
  const spp = csv(join(out, "stand-species.csv"));
  const metrics = csv(join(out, "metrics.csv"));
  const ha = (width * depth * 0.25 * 0.25) / 10_000;
  const wall = existsSync(join(out, "wall.txt"))
    ? Number(readFileSync(join(out, "wall.txt"), "utf8"))
    : Number.NaN;
  const hornbeam = AT.map((s) => {
    const x = spp.find((r) => Number(r.season) === s && r.species === "hornbeam");
    return x ? Math.round(100 * Number(x.share)) / 100 : 0;
  });
  const row = (s: number) => stand.find((r) => Number(r.season) === s);
  const at = AT.map((s) => {
    const r = row(s);
    const drawn = Number(r?.drawn ?? 0);
    const canopy = Number(r?.canopy ?? 0);
    const shares = spp.filter((x) => Number(x.season) === s);
    const top = shares.reduce(
      (a, x) => (Number(x.share) > a.share ? { sp: x.species as string, share: Number(x.share) } : a),
      { sp: "-", share: 0 },
    );
    return {
      season: s,
      live: Number(r?.live ?? 0),
      drawn,
      perHa: Math.round(drawn / ha),
      canopyShare: drawn ? Math.round((100 * canopy) / drawn) / 100 : 0,
      topSpecies: `${top.sp} ${Math.round(100 * top.share)}%`,
      topShare: top.share,
    };
  });
  const after50 = stand.filter((r) => Number(r.season) > 50);
  const minCanopy = Math.min(...after50.map((r) => Number(r.canopy)));
  const capSeasons = stand.filter((r) => Number(r.capReached) > 0).length;
  const maxLive = Math.max(...stand.map((r) => Number(r.live)));
  const bank = stand.filter((r) => Number(r.season) >= 100).map((r) => Number(r.live) - Number(r.drawn));
  // Per species: seeds made (metrics.csv `seeds`, per tree-season), trees born after season 0.
  // The planting's trees are the first n (o4.planting); a rain seedling can appear by season 1.
  const n = Math.round(400 * ha);
  const planted = new Set(Array.from({ length: n }, (_, i) => String(i)));
  const bySpecies: Record<string, { seeds: number; recruits: Set<string>; drawnRecruits: Set<string> }> = {};
  for (const r of metrics) {
    const sp = (bySpecies[r.species as string] ??= { seeds: 0, recruits: new Set(), drawnRecruits: new Set() });
    sp.seeds += Number(r.seeds) || 0;
    if (!planted.has(r.tree as string)) {
      sp.recruits.add(r.tree as string);
      if (r.alive === "1" && Number(r.height) >= 5.2) sp.drawnRecruits.add(r.tree as string);
    }
  }
  const species = Object.fromEntries(
    Object.entries(bySpecies).map(([k, v]) => [
      k,
      { seeds: Math.round(v.seeds), recruits: v.recruits.size, recruitsDrawn: v.drawnRecruits.size },
    ]),
  );
  const pass =
    at.every((a) => a.perHa >= 200 && a.perHa <= 400 && a.canopyShare >= 0.6 && a.topShare <= 0.7) &&
    minCanopy >= 1 &&
    capSeasons === 0;
  return {
    width,
    seed,
    at,
    minCanopy,
    capSeasons,
    maxLive,
    cap,
    bankMean: Math.round((10 * bank.reduce((a, b) => a + b, 0)) / Math.max(1, bank.length)) / 10,
    bankMax: Math.max(...bank),
    planted: planted.size,
    species,
    depth,
    hornbeam,
    wallSeconds: Math.round(wall * 10) / 10,
    pass,
  };
};

for (const [round, patch] of Object.entries(rounds)) {
  const summary = WIDTHS.flatMap((width) => SEEDS.map((seed) => ({ width, seed }))).map(
    summarise(round),
  );
  writeFileSync(
    join(dirOf(round), "summary.json"),
    JSON.stringify({ round, patch, status: "exploratory", summary }, null, 1),
  );
  console.log(`\nround ${round} (exploratory, seeds 1–3): ${JSON.stringify(patch)}`);
  console.log(
    "w   s | drawn 100/200/300 (/ha)        | canopy share   | top species           | minCan capSeasons maxLive/cap bank | pass",
  );
  for (const r of summary) {
    const d = r.at.map((a) => `${a.drawn}(${a.perHa})`).join(" ");
    const c = r.at.map((a) => a.canopyShare.toFixed(2)).join(" ");
    const t = r.at.map((a) => a.topSpecies).join(", ");
    console.log(
      `${r.width} ${r.seed} | ${d} | ${c} | ${t} | ${r.minCanopy} ${r.capSeasons} ${r.maxLive}/${r.cap} ${r.bankMean} | hb ${r.hornbeam.join("/")} | ${r.wallSeconds}s | ${r.pass ? "PASS" : "fail"}`,
    );
  }
}
