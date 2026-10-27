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
import { carbonBalance, starvedToDeath } from "./principles/r1-carbon.ts";
import { directionParams } from "./principles/r2-physiological-age.ts";
import { updateMechanics } from "./principles/r3-mechanics.ts";
import { depositArea, restingState } from "./principles/r6-short-shoots.ts";
import { normal, Purpose } from "./rng.ts";
import { BudState, type Tree } from "./tree.ts";
import type { World } from "./world.ts";

const sample: LightSample = { q: 0, vx: 0, vy: 0 };
const shoot = { length: 0 };

export function runSeason(world: World): void {
  const { params, light, season } = world;
  const live = world.trees.filter((t) => t.alive);
  const carbonShedding = params.r1.enabled && params.r1.shed === "carbon";

  // Phase 1: environment from the start-of-season snapshot (C2).
  light.clear();
  if (params.c2.enabled) {
    for (const wall of params.world.walls) light.addWall(wall);
    for (const tree of live) depositBuds(world, tree);
  }
  light.compute(season);

  // Phase 2: per-tree passes, reading the environment only.
  for (const tree of live) {
    tree.ensureScratch();
    tree.shedCount = 0;
    sampleBuds(world, tree); // C2: Q and V at every bud
    if ((params.c5.enabled || carbonShedding) && params.c5.Trel > 0) {
      tree.qTop = crownTopLight(tree, params.c5.topQuantile); // C5 relative threshold
    }
    gatherLight(tree, params.r6); // C3 basipetal: Q_sum, n_b (short shoots by leaf area, R6)
    if (params.r1.enabled) carbonBalance(tree, params); // R1 CARBON: v_base = net production
    allocate(tree, params); // C3 acropetal: v at every bud
    const evaluated = tree.m.length; // rows that took part in this season's passes
    growBuds(world, tree, season); // C1 bud fate, GROW (C4 direction)
    if (params.c5.enabled || carbonShedding) {
      tree.shedCount = shedBranches(tree, params, season, evaluated); // C5, or R1 by carbon
    }
    if (params.r3.enabled) {
      tree.ensureScratch(); // growth may have outgrown the scratch arrays
      tree.prevRadius.set(tree.m.cols.radius.subarray(0, tree.m.length)); // R3: Δr/r for posture
    }
    if (params.c6.enabled) updateGirth(tree, params); // C6, after shedding so scars count
    if (params.r3.enabled) updateMechanics(tree, params); // R3 MECHANICS: girth first (§6 rule 2)
    commitBuds(tree);
    tree.age += 1;
  }

  // Phase 3: deaths last (§6), so a dead tree's shade is gone next season. O2 and O4 come later.
  for (const tree of live) if (starvedToDeath(tree, params.r1)) tree.alive = false;
}

function depositBuds(world: World, tree: Tree): void {
  const b = tree.b.cols;
  const { r6 } = world.params;
  for (let i = 0; i < tree.b.length; i++) {
    if (!isLiveBud(b.state[i])) continue;
    const area = depositArea(b.state[i], r6); // R6: leaf area by shoot type
    if (area === 0) continue;
    const m = b.metamer[i];
    world.light.deposit(tree.tipX(m), tree.tipY(m), area);
  }
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
 * Bud fate and growth: a bud with n ≥ 1 grows a shoot; any other live bud rests, as a leafy short
 * shoot if R6 is on and it is lit enough, else as a dormant bud.
 */
function growBuds(world: World, tree: Tree, season: number): void {
  const { params } = world;
  const { c4 } = params;
  const sigma = c4.sigma * DEG;
  const c4Of = directionParams(params); // R2: A_set and η by the shoot's pa
  const direct: DirectionFn = c4.enabled
    ? (prev, bud, id) => {
        const noise = sigma * normal(params.seed, Purpose.directionNoise, tree.id, id, season);
        const bc = tree.b.cols;
        return shootDirection(prev, bc.vx[bud], bc.vy[bud], noise, c4Of(bc.order[bud]));
      }
    : (prev) => prev;
  const b = tree.b.cols;
  const count = tree.b.length;
  for (let i = 0; i < count; i++) {
    if (!isLiveBud(b.state[i])) continue;
    const n = shootSize(b.v[i], params, shoot);
    if (n > 0) {
      growShoot(tree, i, n, shoot.length, params, season, direct);
    } else {
      b.state[i] = restingState(b.q[i], params.r6);
      b.age[i] += 1;
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
