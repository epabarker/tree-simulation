/**
 * Level 1's evaluator (reference-fidelity phase 3, the beech pilot; analysis/treesim/fit_level1.py). cli/fit-eval.ts's
 * line protocol and reply, so `fit.seed_traits` reads it unchanged, with the stand grown once for both levels: Level 0's
 * traits at 60, 100 and 150 (runStand's, the same calls), and Level 1's size match and skeletons on the way.
 *
 *   {"id": 1, "species": "beech", "assign": {...}, "seeds": [s], "trials": ["lone", "stand150", "shade"],
 *    "level1": {"scratch": "/dev/shm/level1-pilot", "key": "g0-c3-s1234", "dumpSeasons": [50, 60, 70, 80, 90, 100]}}
 *     → fit-eval's reply, and "level1": [{"allometry": [{season, trees: [{tree, alive, dbh, height}]}],
 *                                          "dumps": {"70": "<scratch>/<key>-70.json", …}}] (one per seed)
 *
 * The stand advances ten seasons at a time; analysis/tests/test_level1_eval.py checks that its reply equals
 * cli/fit-eval.ts's (so stepping equals runStand's `world.run(60)`, `run(40)`, `run(50)`), and that its dump at 150
 * equals cli/dump-trees.ts --gate-c's stand trees byte for byte. `dump` is gate_c_sim.ts's, which is dump-trees.ts's,
 * line for line. Only "lone", "stand150" and "shade" are served; describe and amend go to cli/fit-eval.ts. Out of any
 * build.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import type { RustWorld, TreeView } from "../../src/wasm/world.ts";
import { allometry } from "../../cli/allometry.ts";
import {
  newWorld,
  ROOFS,
  runLone,
  runShade,
  STAND_MEASURED,
  STAND_WIDTH,
  standParams,
  type StandTraits,
  withAssign,
} from "../../cli/trials.ts";

const METAMER = [
  "parent",
  "slot",
  "order",
  "axis",
  "baseX",
  "baseY",
  "baseZ",
  "hx",
  "hy",
  "hz",
  "length",
  "radius",
  "stressWood",
] as const;
const BUD = ["metamer", "state"] as const;
/** The seasons the size match reads (phase1-tolerances.json `rules.size_match`, up to the stand's 150). */
const MATCH_SEASONS = Array.from({ length: 11 }, (_, k) => 50 + 10 * k);
const STEP = 10;

const plain = (xs: ArrayLike<number>): (number | null)[] =>
  Array.from(xs, (x) => (Number.isFinite(x) ? x : null));

// cli/dump-trees.ts's dump, unchanged.
function dump(world: RustWorld, tree: TreeView, trial: string, seed: number, season: number) {
  const m = tree.m.cols;
  const b = tree.b.cols;
  const p = world.paramsOf(tree);
  const { profile, ...values } = world.formOf(tree);
  return {
    species: tree.species,
    seed,
    trial,
    season,
    index: tree.index,
    alive: tree.alive,
    r6: { enabled: p.r6.enabled, leafArea: p.r6.leafArea },
    m: Object.fromEntries(METAMER.map((k) => [k, plain(m[k])])),
    b: Object.fromEntries(BUD.map((k) => [k, plain(b[k])])),
    form: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, plain([v])[0]])),
    profile: plain(profile),
  };
}

const mean = (xs: number[]): number =>
  xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : Number.NaN;

interface Level1Request {
  scratch: string;
  key: string;
  dumpSeasons: number[];
}

/** runStand(species, seed, assign, 150), stepped by STEP, with Level 1's allometry and dumps on the way. */
function runStand150(
  species: string,
  seed: number,
  assign: Record<string, unknown>,
  level1: Level1Request | undefined,
): { traits: StandTraits; level1?: unknown } {
  const world = newWorld(withAssign(standParams(species, seed), species, assign));
  const measured: StandTraits["allometry"] = [];
  const measure = (season: number): void => {
    for (const k of STAND_MEASURED) {
      const t = world.trees[k] as TreeView;
      if (t.alive) measured.push({ season, tree: k, ...allometry(t.m.cols, t.b.cols) });
    }
  };
  const sizes: unknown[] = [];
  const dumps: Record<string, string> = {};
  let at = 0;
  const advance = (to: number): void => {
    while (at < to) {
      const next = Math.min(to, at + STEP);
      world.run(next - at);
      at = next;
      if (!level1) continue;
      if (MATCH_SEASONS.includes(at)) {
        sizes.push({
          season: at,
          trees: STAND_MEASURED.map((k) => {
            const t = world.trees[k] as TreeView;
            return t.alive
              ? { tree: k, alive: true, ...allometry(t.m.cols, t.b.cols) }
              : { tree: k, alive: false };
          }),
        });
      }
      if (level1.dumpSeasons.includes(at)) {
        const path = `${level1.scratch}/${level1.key}-${at}.json`;
        const trees = STAND_MEASURED.map((k) =>
          dump(world, world.trees[k] as TreeView, "stand", seed, at),
        );
        writeFileSync(path, JSON.stringify({ trees }));
        dumps[String(at)] = path;
      }
    }
  };
  advance(60);
  measure(60);
  const interior = STAND_MEASURED.map((k) => world.trees[k] as TreeView);
  const live = interior.filter((t) => t.alive);
  const ms = live.map((t) => world.metricsOf(t));
  const traits: StandTraits = {
    alive: live.length / interior.length,
    height: mean(ms.map((m) => m.height)),
    slenderness: mean(ms.map((m) => m.slenderness)),
    crownRatio: mean(ms.map((m) => m.limbCrownRatio)),
    leafCrownRatio: mean(ms.map((m) => m.leafCrownRatio)),
    boleCrownRatio: mean(ms.map((m) => m.crownRatio)),
    floor: world.groundLight(0, STAND_WIDTH),
    lai: world.lai(0, STAND_WIDTH),
    widestAt: mean(live.map((t) => world.formOf(t).widestAt)),
  };
  advance(100);
  const still = interior.filter((t) => t.alive);
  traits.height100 = mean(still.map((t) => world.metricsOf(t).height));
  traits.crownRatio100 = mean(still.map((t) => world.metricsOf(t).limbCrownRatio));
  traits.alive100 = still.length / interior.length;
  traits.lai100 = world.lai(0, STAND_WIDTH);
  measure(100);
  advance(150);
  measure(150);
  traits.allometry = measured;
  world.dispose();
  return { traits, level1: level1 ? { allometry: sizes, dumps } : undefined };
}

interface Request {
  id: number;
  species: string;
  assign?: Record<string, unknown>;
  seeds?: number[];
  trials?: string[];
  level1?: Level1Request;
}

function handle(req: Request): Record<string, unknown> {
  const { species } = req;
  if (!species) throw new Error("level1_eval serves candidate requests only (describe, amend: cli/fit-eval.ts)");
  const assign = req.assign ?? {};
  const seeds = req.seeds ?? [1];
  const trials = req.trials ?? ["lone", "stand150", "shade"];
  const unknown = trials.filter((t) => !["lone", "stand150", "shade"].includes(t));
  if (unknown.length > 0) throw new Error(`level1_eval does not serve ${unknown.join(", ")}`);
  if (req.level1) mkdirSync(req.level1.scratch, { recursive: true });
  const t0 = performance.now();
  const out: Record<string, unknown> = { id: req.id };
  // Keys in fit-eval's order: lone, stand, shade, survived, light, ms.
  if (trials.includes("lone")) out.lone = seeds.map((s) => runLone(species, s, assign, 60));
  if (trials.includes("stand150")) {
    const runs = seeds.map((s) =>
      runStand150(species, s, assign, req.level1 && { ...req.level1, key: `${req.level1.key}-s${s}` }),
    );
    out.stand = runs.map((r) => r.traits);
    if (req.level1) out.level1 = runs.map((r) => r.level1);
  }
  if (trials.includes("shade")) {
    const shade: Record<string, boolean[]> = {};
    const survived: Record<string, number[]> = {};
    const light: Record<string, number> = {};
    for (const roof of ROOFS) {
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
  // JSON has no NaN: a trait that could not be measured (no limbs, say) is null (fit-eval's replacer).
  process.stdout.write(
    `${JSON.stringify(reply, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v))}\n`,
  );
});
