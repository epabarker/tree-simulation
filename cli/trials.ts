/**
 * Species trials (M27): the standard settings a species is measured in, shared by the calibration
 * tests (tests/evidence/flora.test.ts) and the fitting evaluator (cli/fit-eval.ts), so they see
 * the same worlds. They are M19's and M25's (docs/experiments/2026-10-28-m25-species.md): the
 * woodland's growth rules without recruitment or storms (`oakOpen`), and
 *
 * - lone: one tree on 160 × 160, open-grown, measured at seasons 30 and 60;
 * - stand: ten trees 21 cells apart on 230 × 160, interior trees 2–7 measured at season 60 (and,
 *   when asked, again at season 100: how much height they gain late, against yield tables);
 * - shade: a seedling under a roof one cell thick across a 40-cell ring, alive at season 30;
 * - release: the stand with its middle tree felled at season 40 (M10's test): the epicormic
 *   shoots on its two neighbours and how far their crowns lean into the gap over 10 seasons.
 *
 * A candidate is a set of dotted-path assignments to the species' patch ("r2.levels.1.setPoint"),
 * applied over its whole effective params, so a fit never has to restate a table it leaves alone.
 */

import { readFileSync } from "node:fs";
import {
  clone,
  mergeParams,
  type Params,
  type SpeciesPatch,
  speciesParams,
} from "../src/core/params.ts";
import { presetParams } from "../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld, type TreeView as Tree } from "../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
/** A trial's world: the Rust core. */
export const newWorld = (params: Params): RustWorld => RustWorld.create(params);

export const STAND_ROOTS = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209];
/** Roof densities of the shade house, ≈ 61% to 2% of the open sky under the K = 7 sweep. */
export const ROOFS = [1, 2, 2.6, 3.3, 4, 4.8, 5.6, 6.5];

/** The woodland's growth rules (oakOpen's: no recruitment, no storms) with `patch` on top. */
export function trialBase(seed: number, patch: Partial<Params>): Params {
  return mergeParams(presetParams("oakOpen", seed), patch);
}

export function loneParams(species: string, seed: number): Params {
  return trialBase(seed, {
    world: { width: 160, height: 160, walls: [] },
    trees: [{ x: 80, species }],
  });
}

export function standParams(species: string, seed: number): Params {
  return trialBase(seed, {
    world: { width: 230, height: 160, walls: [] },
    trees: STAND_ROOTS.map((x) => ({ x, species })),
  });
}

export function shadeParams(species: string, seed: number, roof: number): Params {
  return trialBase(seed, {
    world: {
      width: 40,
      height: 60,
      walls: [{ x: 0, y: 40, width: 40, height: 1, shade: roof }],
      sides: "periodic",
    },
    trees: [{ x: 20, species }],
  });
}

/** Sets a dotted path ("r2.levels.1.setPoint") in plain JSON data, making objects on the way. */
export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let node: Record<string, unknown> = target;
  for (let k = 0; k < keys.length - 1; k++) {
    const key = keys[k] as string;
    if (node[key] === null || typeof node[key] !== "object") node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1] as string] = value;
}

/** Reads a dotted path; undefined where it leads nowhere. */
export function getPath(source: unknown, path: string): unknown {
  let node = source;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/**
 * The species' patch with `assign` applied over its effective params: each assigned path's group
 * is first filled in from what the species grows by (the world's values where the species sets
 * none), so an assignment into `r2.levels` keeps the table's other rows and fields.
 */
export function amendSpecies(
  params: Params,
  species: string,
  assign: Record<string, unknown>,
): SpeciesPatch {
  const entry = clone(params.species?.[species] ?? {}) as Record<string, unknown>;
  const effective = speciesParams(params, species) as unknown as Record<string, unknown>;
  const filled = new Set<string>();
  for (const [path, value] of Object.entries(assign)) {
    const group = path.split(".")[0] as string;
    if (!filled.has(group)) entry[group] = clone(effective[group]);
    filled.add(group);
    setPath(entry, path, value);
  }
  return entry as SpeciesPatch;
}

/** Params with species `species` replaced by its amended patch. */
export function withAssign(
  params: Params,
  species: string,
  assign: Record<string, unknown>,
): Params {
  if (Object.keys(assign).length === 0) return params;
  return {
    ...params,
    species: { ...params.species, [species]: amendSpecies(params, species, assign) },
  };
}

export interface LoneTraits {
  alive: boolean;
  height30: number;
  height60: number;
  spread: number;
  slenderness: number;
  branchAngle: number;
  widestAt: number;
  profileCentre: number;
  crownFullness: number;
  forkHeight: number;
  leaderDominance: number;
  branchAngle2: number;
  limbDroop: number;
  junctionDelta: number;
  ldSlope: number;
  leafStemSlope: number;
}

export function runLone(
  species: string,
  seed: number,
  assign: Record<string, unknown> = {},
): LoneTraits {
  const world = newWorld(withAssign(loneParams(species, seed), species, assign));
  world.run(30);
  const tree = world.trees[0] as Tree;
  const height30 = world.metricsOf(tree).height;
  world.run(30);
  const m = world.metricsOf(tree);
  const f = world.formOf(tree);
  return {
    alive: tree.alive,
    height30,
    height60: m.height,
    spread: m.height > 0 ? m.crownWidth / m.height : 0,
    slenderness: m.slenderness,
    branchAngle: m.branchAngle,
    widestAt: f.widestAt,
    profileCentre: f.profileCentre,
    crownFullness: f.crownFullness,
    forkHeight: f.forkHeight,
    leaderDominance: f.leaderDominance,
    branchAngle2: f.branchAngle2,
    limbDroop: f.limbDroop,
    junctionDelta: f.junctionDelta,
    ldSlope: f.ldSlope,
    leafStemSlope: f.leafStemSlope,
  };
}

export interface StandTraits {
  /** Share of the interior trees alive at season 60. */
  alive: number;
  height: number;
  slenderness: number;
  crownRatio: number;
  /** Light on the floor under the interior, a fraction of open sky. */
  floor: number;
  widestAt: number;
  /** Mean interior height at season 100, when the stand is run on (`late`); else absent. */
  height100?: number;
}

const mean = (xs: number[]): number =>
  xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : Number.NaN;

export function runStand(
  species: string,
  seed: number,
  assign: Record<string, unknown> = {},
  late = false,
): StandTraits {
  const world = newWorld(withAssign(standParams(species, seed), species, assign));
  world.run(60);
  const interior = world.trees.slice(2, -2);
  const live = interior.filter((t) => t.alive);
  const ms = live.map((t) => world.metricsOf(t));
  const traits: StandTraits = {
    alive: live.length / interior.length,
    height: mean(ms.map((m) => m.height)),
    slenderness: mean(ms.map((m) => m.slenderness)),
    crownRatio: mean(ms.map((m) => m.crownRatio)),
    floor: world.groundLight(50, 180),
    widestAt: mean(live.map((t) => world.formOf(t).widestAt)),
  };
  if (late) {
    world.run(40);
    const still = interior.filter((t) => t.alive);
    traits.height100 = mean(still.map((t) => world.metricsOf(t).height));
  }
  return traits;
}

/** Whether the seedling lives to season 30 under the roof, and the light it gets there. */
export function runShade(
  species: string,
  seed: number,
  roof: number,
  assign: Record<string, unknown> = {},
): { alive: boolean; light: number } {
  const world = newWorld(withAssign(shadeParams(species, seed, roof), species, assign));
  world.step();
  const light = world.groundLight(0, 6);
  world.run(29);
  return { alive: (world.trees[0] as Tree).alive, light };
}

/** Axes started in seasons [from, to] on trunk wood at least 10 seasons old: epicormic shoots (M10). */
export function epicormic(tree: Tree, from: number, to: number): number {
  const c = tree.m.cols;
  let k = 0;
  for (let i = 0; i < tree.m.length; i++) {
    const p = c.parent[i];
    if (p < 0 || c.axisNode[i] !== 0 || c.order[p] !== 0) continue;
    if (c.birthSeason[i] < from || c.birthSeason[i] > to) continue;
    if (c.birthSeason[i] - c.birthSeason[p] >= 10) k += 1;
  }
  return k;
}

const FELL = 40;
const AFTER = 10;

/**
 * The stand's middle tree (5) felled at season 40: epicormic shoots on trees 4 and 6 over the next
 * 10 seasons, and their crowns' mean shift toward the gap, cells.
 */
export function runRelease(
  species: string,
  seed: number,
  assign: Record<string, unknown> = {},
): { epicormic: number; lean: number } {
  const world = newWorld(withAssign(standParams(species, seed), species, assign));
  world.run(FELL);
  const [left, right] = [world.trees[4] as Tree, world.trees[6] as Tree];
  const before = [world.metricsOf(left).centroidOffset, world.metricsOf(right).centroidOffset];
  world.removeTree(5);
  world.run(AFTER);
  const shift =
    world.metricsOf(left).centroidOffset -
    (before[0] as number) -
    (world.metricsOf(right).centroidOffset - (before[1] as number));
  return {
    epicormic: [left, right].reduce((n, t) => n + epicormic(t, FELL, FELL + AFTER - 1), 0),
    lean: shift / 2,
  };
}
