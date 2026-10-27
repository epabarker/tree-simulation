/**
 * R6. Short shoots (spec §R6, ADR 0006; Millan et al. 2022, Kull et al. 2002).
 *
 * A bud too weak to extend this season (n = 0) but lit at Q ≥ Q_ss becomes a short shoot: it
 * adds leaves without wood. Below Q_ss it is a leafless dormant bud. A short shoot that later
 * receives v ≥ 1 grows a long shoot like any live bud (the long/short switch). With R6 on, the
 * model's foliage follows shoot type: an active bud holds one unit of leaf area, a short shoot
 * a_ss, a dormant bud none (it casts no shade). In the basipetal light sum a short shoot's Q is
 * weighted by a_ss, while active and dormant buds count once: a dormant bud's Q stays the
 * allocation signal that can release it, a simplification until R1 separates production from
 * demand. Short shoots are shed with their branch by C5.
 *
 * Params: r6.enabled, r6.qMin (Q_ss), r6.leafArea (a_ss).
 */

import type { Params } from "../params.ts";
import { BudState } from "../tree.ts";

/** Leaf area a live bud deposits into the light field (C2). One unit for every bud when R6 is off. */
export function depositArea(state: number, r6: Params["r6"]): number {
  if (!r6.enabled) return 1;
  if (state === BudState.shortShoot) return r6.leafArea;
  return state === BudState.active ? 1 : 0;
}

/** Weight of a live bud's Q in the basipetal sum (C3): a_ss for short shoots, 1 otherwise. */
export function lightWeight(state: number, r6: Params["r6"]): number {
  return r6.enabled && state === BudState.shortShoot ? r6.leafArea : 1;
}

/** Fate of a live bud that grows no shoot this season. */
export function restingState(q: number, r6: Params["r6"]): BudState {
  return r6.enabled && q >= r6.qMin ? BudState.shortShoot : BudState.dormant;
}
