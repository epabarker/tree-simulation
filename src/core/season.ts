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
import { normal, Purpose } from "./rng.ts";
import { BudState, type Tree } from "./tree.ts";
import type { World } from "./world.ts";

const sample: LightSample = { q: 0, vx: 0, vy: 0 };
const shoot = { length: 0 };

export function runSeason(world: World): void {
  const { params, light, season } = world;
  const live = world.trees.filter((t) => t.alive);

  // Phase 1: environment from the start-of-season snapshot (C2).
  light.clear();
  if (params.c2.enabled) {
    for (const wall of params.world.walls) light.addWall(wall);
    for (const tree of live) depositBuds(world, tree);
  }

  // Phase 2: per-tree passes, reading the environment only.
  for (const tree of live) {
    tree.ensureScratch();
    tree.shedCount = 0;
    sampleBuds(world, tree); // C2: Q and V at every bud
    gatherLight(tree); // C3 basipetal: Q_sum, n_b
    allocate(tree, params); // C3 acropetal: v at every bud
    growBuds(world, tree, season); // C1 bud fate, GROW (C4 direction)
    commitBuds(tree);
    tree.age += 1;
  }

  // Phase 3: multi-tree and population processes (O2, O4) arrive in later milestones.
}

function depositBuds(world: World, tree: Tree): void {
  const b = tree.b.cols;
  for (let i = 0; i < tree.b.length; i++) {
    if (!isLiveBud(b.state[i])) continue;
    const m = b.metamer[i];
    world.light.deposit(tree.tipX(m), tree.tipY(m));
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

/** Bud fate and growth: a bud with n ≥ 1 grows a shoot, any other live bud stays dormant. */
function growBuds(world: World, tree: Tree, season: number): void {
  const { params } = world;
  const { c4 } = params;
  const sigma = c4.sigma * DEG;
  const direct: DirectionFn = c4.enabled
    ? (prev, bud, id) => {
        const noise = sigma * normal(params.seed, Purpose.directionNoise, tree.id, id, season);
        return shootDirection(prev, tree.b.cols.vx[bud], tree.b.cols.vy[bud], noise, c4);
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
      b.state[i] = BudState.dormant;
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
