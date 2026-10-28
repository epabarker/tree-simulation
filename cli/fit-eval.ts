/**
 * Species-fitting evaluator (M27, ADR 0020): a long-lived process that runs candidates in the
 * standard trials (src/core/trials.ts) and answers with their traits. One JSON object a line on
 * stdin, one a line on stdout, in order. The Python driver (analysis/treesim/fit.py) keeps one per
 * core, so no process starts and no CSV is written per candidate.
 *
 *   {"id": 1, "species": "birch", "assign": {"c3.alpha": 4.2}, "seeds": [1, 2],
 *    "trials": ["lone", "stand", "shade"], "roofs": [2.6, 4]}
 *     → {"id": 1, "lone": [traits per seed], "stand": [...], "shade": {"2.6": [alive per seed]},
 *        "light": {"2.6": light}, "ms": 812}      ("release" adds the felled-gap trial, M10)
 *   {"id": 2, "describe": "birch", "paths": ["c3.alpha", "r2.levels.1.setPoint"]}
 *     → {"id": 2, "values": {"c3.alpha": 4, ...}}        (what the species grows by now)
 *   {"id": 3, "amend": "birch", "assign": {...}}
 *     → {"id": 3, "patch": {...}}                         (its whole patch, for a results file)
 *
 * A failed request answers {"id", "error"}. NaN traits are written as null.
 */

import { createInterface } from "node:readline";
import {
  amendSpecies,
  getPath,
  loneParams,
  ROOFS,
  runLone,
  runRelease,
  runShade,
  runStand,
} from "../src/core/trials.ts";
import { speciesParams } from "../src/core/world.ts";

interface Request {
  id: number;
  species?: string;
  assign?: Record<string, unknown>;
  seeds?: number[];
  trials?: ("lone" | "stand" | "shade" | "release")[];
  roofs?: number[];
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
  const seeds = req.seeds ?? [1];
  const trials = req.trials ?? ["lone", "stand", "shade"];
  const t0 = performance.now();
  const out: Record<string, unknown> = { id: req.id };
  if (trials.includes("lone")) out.lone = seeds.map((s) => runLone(species, s, assign));
  if (trials.includes("stand")) out.stand = seeds.map((s) => runStand(species, s, assign));
  if (trials.includes("release")) out.release = seeds.map((s) => runRelease(species, s, assign));
  if (trials.includes("shade")) {
    const shade: Record<string, boolean[]> = {};
    const light: Record<string, number> = {};
    for (const roof of req.roofs ?? ROOFS) {
      const runs = seeds.map((s) => runShade(species, s, roof, assign));
      shade[String(roof)] = runs.map((r) => r.alive);
      light[String(roof)] = runs.reduce((sum, r) => sum + r.light, 0) / runs.length;
    }
    out.shade = shade;
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
