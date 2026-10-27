/**
 * R2. Physiological age and axis differentiation (spec §R2, ADR 0009; Barthélémy & Caraglio
 * 2007, Hallé et al. 1978).
 *
 * Every axis has a physiological age pa = min(branching order, levels − 1), and a lookup table
 * row per pa says how its axes behave: apical bias λ at their nodes (C3), set-point angle A_set
 * and tropism weight η for their shoots (C4), branch angle β of laterals of that pa (C1), the
 * generator that places their lateral buds (distichous, opposite, whorled tiers or none; §C1.4)
 * and the probability p_term that a shoot's terminal bud ends, which makes growth sympodial:
 * laterals at the distal node take over [RNG: sympodialTermination, keyed by the shoot's last
 * metamer and the season]. Ontogeny: from tree age a_c every λ falls linearly by Δλ over `ramp`
 * seasons, turning an excurrent young tree decurrent (Palubicki et al. 2009).
 *
 * Params: r2.enabled, r2.levels (λ, A_set, η, β, generator, tierEvery, p_term), r2.aC,
 * r2.dLambda, r2.ramp. Off = baseline (c1.branchAngle, c3.lambda, c4.setPoint, c4.eta,
 * distichous, monopodial).
 */

import type { PaLevel, Params } from "../params.ts";
import { Purpose, uniform } from "../rng.ts";

/** The table row for an axis of branching order `order`, or null when R2 is off. */
export function paLevel(order: number, r2: Params["r2"]): PaLevel | null {
  const n = r2.levels.length;
  if (!r2.enabled || n === 0) return null;
  return r2.levels[Math.min(order, n - 1)] as PaLevel;
}

/** λ at a node of an axis of order `order` on a tree of age `treeAge` (§C3.4 with R2). */
export function lambdaAt(order: number, treeAge: number, params: Params): number {
  const level = paLevel(order, params.r2);
  if (!level) return params.c3.lambda;
  const { aC, dLambda, ramp } = params.r2;
  const t = treeAge <= aC ? 0 : Math.min(1, (treeAge - aC) / Math.max(1, ramp));
  return level.lambda - dLambda * t;
}

/** Branch angle β, in degrees, of a new lateral of order `order`. */
export function branchAngleOf(order: number, params: Params): number {
  return paLevel(order, params.r2)?.branchAngle ?? params.c1.branchAngle;
}

/**
 * How many lateral buds the node at the top of metamer `axisNode` of an axis of order `order`
 * forms: 1 (distichous, side from C1's sequence), 2 (both sides) or 0. `lastOfShoot` marks the
 * last metamer a bud grew this season, whose upper node starts the next growth unit.
 */
export function lateralCount(
  order: number,
  axisNode: number,
  lastOfShoot: boolean,
  r2: Params["r2"],
): 0 | 1 | 2 {
  const level = paLevel(order, r2);
  if (!level) return 1;
  switch (level.generator) {
    case "distichous":
      return 1;
    case "opposite":
      return 2;
    case "whorled":
      if (level.tierEvery > 0) return (axisNode + 1) % level.tierEvery === 0 ? 2 : 0;
      return lastOfShoot ? 2 : 0;
    case "none":
      return 0;
  }
}

/** True if the terminal bud ending a shoot at metamer `birthId` terminates (sympodial). */
export function terminates(
  order: number,
  treeId: number,
  birthId: number,
  season: number,
  params: Params,
): boolean {
  const level = paLevel(order, params.r2);
  if (!level || level.pTerm <= 0) return false;
  return uniform(params.seed, Purpose.sympodialTermination, treeId, birthId, season) < level.pTerm;
}

/** C4 params for shoots of order `order`: A_set and η from the pa table (shared objects). */
export function directionParams(params: Params): (order: number) => Params["c4"] {
  const { c4, r2 } = params;
  if (!r2.enabled || r2.levels.length === 0) return () => c4;
  const byPa = r2.levels.map((l) => ({ ...c4, setPoint: l.setPoint, eta: l.eta }));
  return (order) => byPa[Math.min(order, byPa.length - 1)] as Params["c4"];
}
