/**
 * Species-fitting evaluator (M27, ADR 0020): a long-lived process that runs candidates in the
 * standard trials (src/core/trials.ts) and answers with their traits. One JSON object a line on
 * stdin, one a line on stdout, in order. The Python driver (analysis/treesim/fit.py) keeps one per
 * core, so no process starts and no CSV is written per candidate.
 *
 *   {"id": 1, "species": "birch", "assign": {"c3.alpha": 4.2}, "seeds": [1, 2],
 *    "trials": ["lone", "stand", "shade"], "roofs": [2.6, 4], "standSeasons": 100}
 *     → {"id": 1, "lone": [traits per seed], "stand": [...], "shade": {"2.6": [alive per seed]},
 *        "survived": {"2.6": [seasons per seed]}, "light": {"2.6": light}, "ms": 812}
 *   "release" adds the felled-gap trial (M10), "wood" the species' own wood's floor (the hold-out);
 *   "stand100" is "stand" with standSeasons 100. `seeds` may instead give each trial its own,
 *   {"lone": [1, 2, 3], "stand": [1, 2], "shade": [1, 2, 3]} (the least-squares fit's counts).
 *   {"id": 2, "describe": "birch", "paths": ["c3.alpha", "r2.levels.1.setPoint"]}
 *     → {"id": 2, "values": {"c3.alpha": 4, ...}}        (what the species grows by now)
 *   {"id": 3, "amend": "birch", "assign": {...}}
 *     → {"id": 3, "patch": {...}}                         (its whole patch, for a results file)
 *
 * A failed request answers {"id", "error"}. NaN traits are written as null.
 */

import { createInterface } from "node:readline";
import { speciesParams } from "../src/core/params.ts";
import {
  amendSpecies,
  getPath,
  loneParams,
  ROOFS,
  runLone,
  runRelease,
  runShade,
  runStand,
  runWood,
} from "./trials.ts";

type Trial = "lone" | "stand" | "stand100" | "shade" | "release" | "wood";

interface Request {
  id: number;
  species?: string;
  assign?: Record<string, unknown>;
  seeds?: number[] | Partial<Record<Trial, number[]>>;
  trials?: Trial[];
  roofs?: number[];
  standSeasons?: 60 | 100;
  describe?: string;
  paths?: string[];
  amend?: string;
}

function handle(req: Request): Record<string, unknown> {
  if (req.describe !== undefined) {
    const effective = speciesParams(loneParams(req.describe, 1), req.describe);
    const values: Record<string, unknown> = {};
    for (const path of req.paths ?? []) values[path] = getPath(effective, path) ?? null;
    return { id: req.id, values };
  }
  if (req.amend !== undefined) {
    return {
      id: req.id,
      patch: amendSpecies(loneParams(req.amend, 1), req.amend, req.assign ?? {}),
    };
  }
  const species = req.species;
  if (!species) throw new Error("a request needs species, describe or amend");
  const assign = req.assign ?? {};
  const seedsOf = (trial: Trial): number[] => {
    const seeds = req.seeds ?? [1];
    if (Array.isArray(seeds)) return seeds;
    return seeds[trial] ?? (trial === "stand100" ? seeds.stand : undefined) ?? [];
  };
  const trials = req.trials ?? ["lone", "stand", "shade"];
  const t0 = performance.now();
  const out: Record<string, unknown> = { id: req.id };
  if (trials.includes("lone")) out.lone = seedsOf("lone").map((s) => runLone(species, s, assign));
  // The stand at 60, or run on to season 100: its traits at 60, and height100 (ADR 0021, 0022).
  for (const t of ["stand", "stand100"] as const) {
    if (!trials.includes(t)) continue;
    const seasons = t === "stand100" ? 100 : (req.standSeasons ?? 60);
    out.stand = seedsOf(t).map((s) => runStand(species, s, assign, seasons));
  }
  if (trials.includes("release")) {
    out.release = seedsOf("release").map((s) => runRelease(species, s, assign));
  }
  if (trials.includes("wood")) out.wood = seedsOf("wood").map((s) => runWood(species, s, assign));
  if (trials.includes("shade")) {
    const seeds = seedsOf("shade");
    const shade: Record<string, boolean[]> = {};
    const survived: Record<string, number[]> = {};
    const light: Record<string, number> = {};
    for (const roof of req.roofs ?? ROOFS) {
      const runs = seeds.map((s) => runShade(species, s, roof, assign));
      shade[String(roof)] = runs.map((r) => r.alive);
      survived[String(roof)] = runs.map((r) => r.seasons);
      light[String(roof)] = runs.reduce((sum, r) => sum + r.light, 0) / runs.length;
    }
    out.shade = shade;
    out.survived = survived;
    out.light = light;
  }
  out.ms = Math.round(performance.now() - t0);
  return out;
}

const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
lines.on("line", (line) => {
  if (line.trim() === "") return;
  let id: unknown = null;
  let reply: Record<string, unknown>;
  try {
    const req = JSON.parse(line) as Request;
    id = req.id;
    reply = handle(req);
  } catch (e) {
    reply = { id, error: (e as Error).message };
  }
  // JSON has no NaN: a trait that could not be measured (no limbs, say) is null.
  process.stdout.write(
    `${JSON.stringify(reply, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v))}\n`,
  );
});
