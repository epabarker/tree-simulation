/**
 * Species trials (M27): the standard settings a species is measured in, shared by the calibration
 * tests (tests/evidence/flora.test.ts) and the fitting evaluator (cli/fit-eval.ts), so they see
 * the same worlds. They are M19's and M25's (docs/experiments/2026-10-28-m25-species.md): the
 * woodland's growth rules without recruitment or storms (`oakOpen`), and
 *
 * - lone: one tree on 160 wide, open-grown, measured at seasons 30 and 60;
 * - stand: a closed stand, three rows of four 21 cells apart on an 84-cell periodic ring between
 *   opaque faces (τ 0), as the 20-seed evidence read H/D 70 (ADR 0027); the middle row's four
 *   trees measured at season 60 (and, when asked, again at 100: how much height they gain late,
 *   against yield tables). The one-row stand between τ 0.2 faces it replaces was a hedgerow, lit
 *   from the faces and the empty depth: it grew edge trees, squat with late growth unchecked (the
 *   species note of 2026-10-30, the beech pilot);
 * - shade: a seedling under a roof one cell thick across a 40-cell ring: the seasons it lives, up
 *   to 30 (a continuous margin for the fit; the plan of 2026-10-30, §2.2);
 * - wood: the species' own wood planted per area at τ 0, its floor at seasons 100 and 150 (the
 *   hold-out's floor: a one-row stand cannot measure one, the species plan §0.3);
 * - release: the one-row stand (rowParams) with its middle tree felled at season 40 (M10's test,
 *   held out): the epicormic shoots on its two neighbours and how far their crowns lean into the
 *   gap over 10 seasons.
 *
 * The lone tree and the stand take the woods' top (200): in 3D beech reaches 151 cells by season
 * 100, and a crown pinned at the top runs away (the species plan §0.2).
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
import { perArea, presetParams, TOP } from "../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld, type TreeView as Tree } from "../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
/** A trial's world: the Rust core. */
export const newWorld = (params: Params): RustWorld => RustWorld.create(params);

export const STAND_ROOTS = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209];
/**
 * Roof densities of the shade house: on the ground under each, in the 3D slab between opaque faces,
 * 30, 21.7, 15.8, 10.9, 7.1, 4.7, 2.9 and 1.8% of the open sky (the same for every seed and species;
 * docs/experiments/code/2026-10-30-species-3d/roofs.ts).
 */
export const ROOFS = [1, 1.5, 2, 2.6, 3.3, 4, 4.8, 5.6];
/** Seasons a shade-house seedling is followed: alive at 30 is survival (M19). */
export const SHADE_SEASONS = 30;

/** The woodland's growth rules (oakOpen's: no recruitment, no storms) with `patch` on top. */
export function trialBase(seed: number, patch: Partial<Params>): Params {
  return mergeParams(presetParams("oakOpen", seed), patch);
}

export function loneParams(species: string, seed: number): Params {
  return trialBase(seed, {
    world: { width: 160, height: TOP, walls: [] },
    trees: [{ x: 80, species }],
  });
}

/** The one-row stand of M19–M27 (ten trees between τ 0.2 faces): now the release trial's. */
export function rowParams(species: string, seed: number): Params {
  return trialBase(seed, {
    world: { width: 230, height: TOP, walls: [] },
    trees: STAND_ROOTS.map((x) => ({ x, species })),
  });
}

/** The closed stand's ring, cells: four trees a row at the woods' spacing, 21. */
export const STAND_WIDTH = 84;
/** One row's x; perArea repeats it in three rows across the slab's depth (64), staggered. */
export const STAND_ROW = [10.5, 31.5, 52.5, 73.5];
/** The middle row's trees (perArea's rows are in order): the stand's measured trees. */
export const STAND_MEASURED = [4, 5, 6, 7];

export function standParams(species: string, seed: number): Params {
  return trialBase(seed, {
    world: { width: STAND_WIDTH, height: TOP, walls: [], sides: "periodic", faces: [0, 0] },
    trees: perArea(STAND_ROW, STAND_WIDTH, () => ({ species })),
  });
}

/**
 * The species' own wood: `beechWood`'s planting per area (the woodland's rules, recruitment and
 * storms on) with every tree of `species`, between opaque faces (τ 0), where form's 20-seed floor
 * was read (ADR 0027).
 */
export function woodParams(species: string, seed: number): Params {
  const base = presetParams("beechWood", seed);
  return mergeParams(base, {
    world: { faces: [0, 0] },
    trees: base.trees.map((t) => ({ ...t, species })),
  });
}

export function shadeParams(species: string, seed: number, roof: number): Params {
  return trialBase(seed, {
    world: {
      width: 40,
      height: 60,
      walls: [{ x: 0, y: 40, width: 40, height: 1, shade: roof }],
      sides: "periodic",
      // Opaque faces: at the woods' τ 0.2 the sky beyond the faces lights the floor at ≈ 8% under
      // any roof, so the house could not reach the 2% tolerant seedlings live at.
      faces: [0, 0],
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
  const alive = tree.alive;
  world.dispose();
  return {
    alive,
    height30,
    height60: m.height,
    // The crown read in x and z (form.rs's profile reads both the same way): the larger extent,
    // which the slab's depth does not cap.
    spread: m.height > 0 ? Math.max(m.crownWidth, m.crownDepth) / m.height : 0,
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
  /** Share of the middle row's trees alive at season 60. */
  alive: number;
  height: number;
  slenderness: number;
  /**
   * The leafy crown's share of the height (metrics' leafCrownRatio): the branch measure reads
   * 0.99 whatever the crown does in 3D (form step 2), so the fit's target reads this one.
   */
  crownRatio: number;
  /** The branch measure (metrics' crownRatio), for the record. */
  boleCrownRatio: number;
  /** Light on the stand's floor, a fraction of open sky (reported, not fitted). */
  floor: number;
  widestAt: number;
  /** The middle row's mean height at season 100, when the stand is run on to 100; else absent. */
  height100?: number;
  /** Share of the middle row's trees alive at season 100, when run on; else absent. */
  alive100?: number;
}

const mean = (xs: number[]): number =>
  xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : Number.NaN;

export function runStand(
  species: string,
  seed: number,
  assign: Record<string, unknown> = {},
  seasons: 60 | 100 = 60,
): StandTraits {
  const world = newWorld(withAssign(standParams(species, seed), species, assign));
  world.run(60);
  const interior = STAND_MEASURED.map((k) => world.trees[k] as Tree);
  const live = interior.filter((t) => t.alive);
  const ms = live.map((t) => world.metricsOf(t));
  const traits: StandTraits = {
    alive: live.length / interior.length,
    height: mean(ms.map((m) => m.height)),
    slenderness: mean(ms.map((m) => m.slenderness)),
    crownRatio: mean(ms.map((m) => m.leafCrownRatio)),
    boleCrownRatio: mean(ms.map((m) => m.crownRatio)),
    floor: world.groundLight(0, STAND_WIDTH),
    widestAt: mean(live.map((t) => world.formOf(t).widestAt)),
  };
  if (seasons === 100) {
    world.run(40);
    const still = interior.filter((t) => t.alive);
    traits.height100 = mean(still.map((t) => world.metricsOf(t).height));
    traits.alive100 = still.length / interior.length;
  }
  world.dispose();
  return traits;
}

/**
 * The seedling under the roof: whether it lives to season 30, the seasons it lived (30 if it did),
 * and the light on the ground in its first season. Seasons lived is the shade residual's
 * continuous margin (the species plan §2.2): alive at 30 is a step in the parameters.
 */
export function runShade(
  species: string,
  seed: number,
  roof: number,
  assign: Record<string, unknown> = {},
): { alive: boolean; seasons: number; light: number } {
  const world = newWorld(withAssign(shadeParams(species, seed, roof), species, assign));
  world.step();
  const light = world.groundLight(0, 6);
  const tree = (): Tree => world.trees[0] as Tree;
  let seasons = 1;
  while (seasons < SHADE_SEASONS && tree().alive) {
    world.step();
    seasons += 1;
  }
  const alive = tree().alive;
  world.dispose();
  return { alive, seasons: alive ? SHADE_SEASONS : seasons - 1, light };
}

/** The floor of the species' own wood (woodParams) at seasons 100 and 150, a fraction of open sky. */
export function runWood(
  species: string,
  seed: number,
  assign: Record<string, unknown> = {},
): { floor100: number; floor150: number } {
  const params = withAssign(woodParams(species, seed), species, assign);
  const world = newWorld(params);
  world.run(100);
  const floor100 = world.groundLight(0, params.world.width);
  world.run(50);
  const floor150 = world.groundLight(0, params.world.width);
  world.dispose();
  return { floor100, floor150 };
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
  const world = newWorld(withAssign(rowParams(species, seed), species, assign));
  world.run(FELL);
  const [left, right] = [world.trees[4] as Tree, world.trees[6] as Tree];
  const before = [world.metricsOf(left).centroidOffset, world.metricsOf(right).centroidOffset];
  world.removeTree(5);
  world.run(AFTER);
  const shift =
    world.metricsOf(left).centroidOffset -
    (before[0] as number) -
    (world.metricsOf(right).centroidOffset - (before[1] as number));
  const shoots = [left, right].reduce((n, t) => n + epicormic(t, FELL, FELL + AFTER - 1), 0);
  world.dispose();
  return { epicormic: shoots, lean: shift / 2 };
}
