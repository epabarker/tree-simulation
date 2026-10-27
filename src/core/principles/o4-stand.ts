/**
 * O4. Stand dynamics (spec §O4, ADR 0013; Botkin et al. 1972; Pacala et al. 1996; Weiner 1990).
 *
 * Phase 3 of §6, after R1's starvation deaths. A tree dies of background risk with probability m₀
 * a season [RNG: mortality, keyed by tree and season]. A mature tree's reproductive sink (R1's
 * f_rep share of its surplus above the maturity height) fills a seed pool; every c_seed of it is
 * one seed. Each seed lands at the parent's root ± a Laplace distance of scale d [RNG: dispersal,
 * keyed by parent, seed and season], wrapping round periodic sides and lost beyond open ones. It
 * establishes if the start-of-season light on the ground there is at least Q_est of open sky, no
 * live trunk stands within a cell, and a draw passes p_est [RNG: establishment]. Established seeds
 * become seedlings that start growing next season; they keep R1's seed reserve, so a seedling in
 * deep shade starves within a few seasons. The stand is capped at `maxTrees` live trees.
 *
 * Params: o4.enabled, o4.cSeed (c_seed), o4.d, o4.qEst (Q_est), o4.pEst (p_est), o4.m0 (m₀),
 * o4.maxTrees; r1.fRep, r1.maturity (the seed supply); c2.C.
 */

import type { LightSample } from "../light/light-model.ts";
import { Purpose, uniform } from "../rng.ts";
import { Tree } from "../tree.ts";
import type { World } from "../world.ts";
import { plantSeedling } from "./c1-buds.ts";

const ground: LightSample = { q: 0, vx: 0, vy: 0 };

/** True when background mortality kills `tree` this season. */
export function diesOfBackground(world: World, tree: Tree): boolean {
  const { params, season } = world;
  return uniform(params.seed, Purpose.mortality, tree.id, 0, season) < world.paramsOf(tree).o4.m0;
}

/** Laplace(0, d) from a uniform u in [0, 1). */
export function laplace(u: number, d: number): number {
  const v = u - 0.5;
  return -d * Math.sign(v) * Math.log(1 - 2 * Math.abs(v));
}

/**
 * Background deaths, seed production, dispersal and establishment for this season. New
 * seedlings are appended to world.trees and start growing next season. Returns the recruits.
 */
export function standDynamics(world: World): number {
  const { params, season, light } = world;
  const { o4 } = params;
  const W = params.world.width;
  const periodic = params.world.sides === "periodic";
  const C = params.c2.C;
  for (const tree of world.trees) {
    if (tree.alive && tree.age > 0 && diesOfBackground(world, tree)) tree.alive = false;
  }
  const parents = world.trees.filter((t) => t.alive);
  let live = parents.length;
  let recruits = 0;
  for (const parent of parents) {
    // Seeds, dispersal and establishment follow the parent's species (ADR 0016).
    const own = world.paramsOf(parent);
    const { cSeed, d, qEst, pEst } = own.o4;
    const n = Math.floor(parent.seedPool / cSeed);
    parent.seedPool -= n * cSeed;
    parent.seeds = n;
    for (let k = 0; k < n; k++) {
      const u = uniform(params.seed, Purpose.dispersal, parent.id, k, season);
      let x = parent.rootX + laplace(u, d);
      if (periodic) x = ((x % W) + W) % W;
      else if (x < 0 || x >= W) continue;
      if (live >= o4.maxTrees) return recruits;
      light.sample(x, 0.5, Math.PI / 2, ground);
      if (C <= 0 || ground.q / C < qEst) continue;
      if (uniform(params.seed, Purpose.establishment, parent.id, k, season) >= pEst) continue;
      if (world.trees.some((t) => t.alive && Math.abs(t.rootX - x) < 1)) continue;
      const seedling = new Tree(world.trees.length, x);
      seedling.species = parent.species;
      plantSeedling(seedling, own, season + 1);
      world.trees.push(seedling);
      live += 1;
      recruits += 1;
    }
  }
  return recruits;
}
