/**
 * The per-season update loop of spec §6, phase by phase.
 *
 * Ordering rules from §6: (1) every tree reads the same start-of-season light field, so tree
 * order cannot bias results; (2) girth before mechanics; (3) shedding after growth, so grace
 * periods hold; (4) deaths last. "Staging" is implemented by appending new metamers and buds
 * at the end of their tables while each loop runs only over the rows that existed when its
 * phase began; consumed buds are compacted away at the end of the tree's pass.
 */

import type { LightSample } from "./light/light-model.ts";
import { DEG } from "./params.ts";
import { type DirectionFn, growShoot, shootSize } from "./principles/c1-buds.ts";
import { allocate, gatherLight, isLiveBud } from "./principles/c3-allocation.ts";
import { shootDirection } from "./principles/c4-direction.ts";
import { crownTopLight, shedBranches } from "./principles/c5-shedding.ts";
import { updateGirth } from "./principles/c6-girth.ts";
import { abrade, EMPTY, tagOwner } from "./principles/o2-shyness.ts";
import { standDynamics } from "./principles/o4-stand.ts";
import { clearObstacles } from "./principles/obstacles.ts";
import { carbonBalance, starvedToDeath } from "./principles/r1-carbon.ts";
import { directionParams } from "./principles/r2-physiological-age.ts";
import { updateMechanics } from "./principles/r3-mechanics.ts";
import { aborts, growthThreshold, lightReleases, releasedShift } from "./principles/r4-dormancy.ts";
import { elongation, setPointScale, shadeOf } from "./principles/r5-shade.ts";
import { depositArea, restingState } from "./principles/r6-short-shoots.ts";
import { normal, Purpose, uniform } from "./rng.ts";
import { BudState, type Tree } from "./tree.ts";
import type { World } from "./world.ts";

const sample: LightSample = { q: 0, vx: 0, vy: 0 };
const shoot = { length: 0 };

/** Phases reported to a `PhaseMark` timer, in the order they end within a season. */
export const PHASES = [
  "light",
  "sample",
  "allocate",
  "grow",
  "shed",
  "girth",
  "mechanics",
  "commit",
  "deaths",
] as const;
export type Phase = (typeof PHASES)[number];
/**
 * Called as each phase ends (per tree in Phase 2), for `npm run bench`. The core never reads a
 * clock itself (it imports no DOM or Node API), so the caller times the gaps between calls.
 */
export type PhaseMark = (phase: Phase) => void;
const noMark: PhaseMark = () => {};

export function runSeason(world: World, mark: PhaseMark = noMark): void {
  const { params, light, season } = world;
  const live: Tree[] = [];
  for (const tree of world.trees) if (tree.alive) live.push(tree);
  // A storm season (M16, §O2 wind events): one draw per season, keyed so it replays.
  const stormP = params.o2.stormP ?? 0;
  const storm = stormP > 0 && uniform(params.seed, Purpose.wind, 0, 0, season) < stormP;
  world.storm = storm;

  // Phase 1: environment from the start-of-season snapshot (C2). Obstacles first (ADR 0015): a
  // branch the page's layout now covers is shed before it deposits foliage or shade.
  if (params.world.obstacles?.length) {
    for (const tree of live) {
      tree.shedCount = clearObstacles(tree, world.paramsOf(tree));
    }
    for (let i = live.length - 1; i >= 0; i--) if (!(live[i] as Tree).alive) live.splice(i, 1);
  }
  light.clear();
  const abrasion = params.o2.enabled;
  if (abrasion) world.owner.fill(EMPTY);
  if (params.c2.enabled) {
    for (const wall of params.world.walls) light.addWall(wall);
    for (const tree of live) depositBuds(world, tree);
  }
  light.compute(season);
  mark("light");

  // Phase 2: per-tree passes, reading the environment only. Each tree grows by its own species'
  // params (ADR 0016); without species that is the world's params object itself.
  for (const tree of live) {
    const params = world.paramsOf(tree);
    const carbonShedding = params.r1.enabled && params.r1.shed === "carbon";
    tree.ensureScratch();
    tree.shedCount = 0;
    tree.released = 0;
    tree.epicormic = 0;
    tree.aborted = 0;
    tree.broken = 0;
    sampleBuds(world, tree); // C2: Q and V at every bud
    if (params.r5.enabled) sampleNodes(world, tree); // R5: shade at every node
    if ((params.c5.enabled || carbonShedding) && params.c5.Trel > 0) {
      tree.qTop = crownTopLight(tree, params.c5.topQuantile); // C5 relative threshold
    }
    mark("sample");
    gatherLight(tree, params.r6); // C3 basipetal: Q_sum, n_b (short shoots by leaf area, R6)
    if (params.r1.enabled) carbonBalance(tree, params); // R1 CARBON: v_base = net production
    allocate(tree, params); // C3 acropetal: v at every bud
    mark("allocate");
    const evaluated = tree.m.length; // rows that took part in this season's passes
    growBuds(world, tree, season); // C1 bud fate, GROW (C4 direction)
    mark("grow");
    if (params.c5.enabled || carbonShedding) {
      tree.shedCount = shedBranches(tree, params, season, evaluated); // C5, or R1 by carbon
    }
    mark("shed");
    if (params.r3.enabled) {
      tree.ensureScratch(); // growth may have outgrown the scratch arrays
      tree.prevRadius.set(tree.m.cols.radius.subarray(0, tree.m.length)); // R3: Δr/r for posture
    }
    if (params.c6.enabled) updateGirth(tree, params); // C6, after shedding so scars count
    mark("girth");
    if (params.r3.enabled) updateMechanics(tree, params, storm, season); // R3 MECHANICS: girth first (§6 rule 2)
    // Obstacles again (ADR 0015): a limb that sagged into one this season is shed now, so no season
    // ends with wood inside the page's content.
    if (params.world.obstacles?.length) {
      tree.shedCount += clearObstacles(tree, params, params.r3.enabled ? [tree.stress] : []);
    }
    mark("mechanics");
    commitBuds(tree);
    tree.age += 1;
    mark("commit");
  }

  // Phase 3: deaths last (§6), so a dead tree's shade is gone next season; then O4 recruitment.
  const { width: W, height: H } = params.world;
  const periodic = params.world.sides === "periodic";
  for (const tree of live) {
    const own = world.paramsOf(tree);
    tree.abraded = abrasion ? abrade(tree, world.owner, W, H, periodic, own, season) : 0; // O2
  }
  for (const tree of live) if (starvedToDeath(tree, world.paramsOf(tree).r1)) tree.alive = false;
  for (const tree of live) tree.seeds = 0;
  if (params.o4.enabled) world.recruits = standDynamics(world); // O4: background deaths, seeds
  mark("deaths");
}

function depositBuds(world: World, tree: Tree): void {
  const b = tree.b.cols;
  const { r6 } = world.paramsOf(tree); // its species' leaf areas (ADR 0016)
  for (let i = 0; i < tree.b.length; i++) {
    if (!isLiveBud(b.state[i])) continue;
    const area = depositArea(b.state[i], r6); // R6: leaf area by shoot type
    if (area === 0) continue;
    const m = b.metamer[i];
    world.light.deposit(tree.tipX(m), tree.tipY(m), area);
    if (world.params.o2.enabled) tagFoliage(world, tree, tree.tipX(m), tree.tipY(m)); // O2 owners
  }
}

/** R5: shade s = 1 − Q/C at every metamer's upper node, from the start-of-season field. */
function sampleNodes(world: World, tree: Tree): void {
  const C = world.params.c2.C;
  const c = tree.m.cols;
  for (let i = 0; i < tree.m.length; i++) {
    world.light.sample(tree.tipX(i), tree.tipY(i), c.angle[i], sample);
    tree.nodeShade[i] = shadeOf(sample.q, C);
  }
}

/** O2: tags the cell at (x, y) as holding foliage of `tree`. */
function tagFoliage(world: World, tree: Tree, x: number, y: number): void {
  const { width: W, height: H } = world.params.world;
  let col = Math.floor(x);
  const row = Math.floor(y);
  if (world.params.world.sides === "periodic") col = ((col % W) + W) % W;
  if (col < 0 || col >= W || row < 0 || row >= H) return;
  tagOwner(world.owner, W, col, row, tree.id);
}

function sampleBuds(world: World, tree: Tree): void {
  const b = tree.b.cols;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < tree.b.length; i++) {
    if (!isLiveBud(b.state[i])) continue;
    const m = b.metamer[i];
    world.light.sample(tree.tipX(m), tree.tipY(m), b.angle[i], sample);
    b.q[i] = sample.q;
    b.vx[i] = sample.vx;
    b.vy[i] = sample.vy;
    sum += sample.q;
    count += 1;
  }
  tree.meanBudQ = count > 0 ? sum / count : 0;
}

/**
 * Bud fate and growth: a bud whose resource reaches its threshold grows a shoot (1 without R4;
 * v_cont for active buds and v_break for dormant ones with R4, or one metamer from the reserve
 * when a dormant bud's light passes Q_rel); any other live bud
 * rests, as a leafy short shoot if R6 is on and it is lit enough, else as a dormant bud, which
 * aborts once older than L_dorm (R4). With R5, a bud's shade lengthens its internodes and makes its
 * shoot more upright.
 */
export function growBuds(world: World, tree: Tree, season: number): void {
  const params = world.paramsOf(tree);
  const { c4, r4, r5 } = params;
  const C = params.c2.C;
  const sigma = c4.sigma * DEG;
  const c4Of = directionParams(params); // R2: A_set and η by the shoot's pa
  // Set per shoot below: the shoot's pa and its R5 set-point factor.
  let pa = 0;
  let upright = 1;
  const direct: DirectionFn = c4.enabled
    ? (prev, bud, id) => {
        const noise = sigma * normal(params.seed, Purpose.directionNoise, tree.id, id, season);
        const bc = tree.b.cols;
        const base = c4Of(pa);
        const dir = upright === 1 ? base : { ...base, setPoint: base.setPoint * upright };
        return shootDirection(prev, bc.vx[bud], bc.vy[bud], noise, dir);
      }
    : (prev) => prev;
  const b = tree.b.cols;
  const count = tree.b.length;
  for (let i = 0; i < count; i++) {
    if (!isLiveBud(b.state[i])) continue;
    const shade = r5.enabled ? shadeOf(b.q[i], C) : 0;
    const state = b.state[i];
    const threshold = growthThreshold(state, b.age[i], shade, params);
    let n = b.v[i] >= threshold ? shootSize(b.v[i], params, shoot) : 0;
    if (n === 0 && state === BudState.dormant && lightReleases(b.q[i], b.age[i], params)) {
      // R4 light trigger: the first metamer is paid from the reserve (free without R1).
      const cost = 1;
      if (!params.r1.enabled || tree.reserve >= cost) {
        if (params.r1.enabled) tree.reserve -= cost;
        n = 1;
        shoot.length = params.c1.internodeLength;
      }
    }
    if (n > 0) {
      const m = tree.m.cols;
      const host = b.metamer[i];
      const released = state === BudState.dormant;
      if (released) {
        tree.released += 1;
        // Epicormic: released from trunk wood at least 10 seasons old.
        if (m.order[host] === 0 && season - m.birthSeason[host] >= 10) tree.epicormic += 1;
      }
      // A released dormant bud reiterates: its shoot takes a younger physiological age (R4).
      const reiterates = released && r4.enabled;
      const shift = reiterates ? releasedShift(b.order[i], m.paShift[host], r4) : m.paShift[host];
      pa = b.order[i] - shift;
      upright = setPointScale(shade, r5);
      const length = shoot.length * elongation(shade, r5);
      growShoot(tree, i, n, length, params, season, direct, reiterates ? shift : -1);
    } else {
      b.state[i] = restingState(b.q[i], params.r6);
      b.age[i] += 1;
      if (aborts(b.state[i], b.age[i], r4)) {
        b.state[i] = BudState.gone; // aborted: removed with the consumed buds
        tree.aborted += 1;
      }
    }
  }
}

/** Removes consumed buds (state gone) from the bud table, keeping order. */
function commitBuds(tree: Tree): void {
  const nb = tree.b.length;
  const keep = tree.scratchU.length >= nb ? tree.scratchU : new Uint8Array(nb);
  const state = tree.b.cols.state;
  for (let i = 0; i < nb; i++) keep[i] = state[i] === BudState.gone ? 0 : 1;
  tree.b.compact(keep);
}
