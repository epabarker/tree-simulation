/**
 * R4. Dormancy, release and reiteration (spec §R4, ADR 0012; Barthélémy & Caraglio 2007; Mason et
 * al. 2014; Cao et al. 2023; Nahas et al. 2024; Meier et al. 2012).
 *
 * Bud outgrowth has two stages: release, then sustained growth (Cao et al. 2023), so the rule is
 * hysteretic. An active bud (or a short shoot, R6) keeps growing while its BH resource v ≥ v_cont.
 * A dormant bud is released either by the sugar signal, v ≥ v_break·(1 + δ·age)·(1 + δ_b·s) (δ_b
 * and the shade s from R5: low R:FR suppresses outgrowth, Schneider et al. 2019), or by the light
 * trigger, Q ≥ Q_rel·(1 + δ·age): older buds are harder to wake. A light-released bud grows one metamer paid from the tree's reserve
 * (R1; free without R1); BH feeds it from then on. A dormant bud older than L_dorm aborts. A
 * released bud reiterates: its shoot takes the physiological age of an axis `juvenile` levels
 * younger (`paShift`, inherited by the subtree). Bud bank: a branch shed by C5/R1 or broken by R3
 * leaves a dormant bud in its slot, as branch-base accessory buds do (Meier et al. 2012), so bare
 * boles keep buds that light can release after a neighbour falls: epicormic shoots.
 * The optional stochastic break is not built.
 *
 * Params: r4.enabled, r4.vBreak (v_break), r4.qRel (Q_rel), r4.vCont (v_cont), r4.delta (δ),
 * r4.lDorm (L_dorm), r4.juvenile, r4.bank; r5.dB (δ_b).
 */

import type { Params } from "../params.ts";
import { BudState } from "../tree.ts";

/**
 * The BH resource a live bud in `state`, dormant for `age` seasons and at shade `shade`, needs to
 * grow this season. Without R4 it is 1, the one-metamer threshold of C3 (ADR 0004).
 */
export function growthThreshold(state: number, age: number, shade: number, params: Params): number {
  const { r4 } = params;
  if (!r4.enabled) return 1;
  if (state !== BudState.dormant) return r4.vCont;
  const suppressed = params.r5.enabled ? 1 + params.r5.dB * shade : 1;
  return r4.vBreak * (1 + r4.delta * age) * suppressed;
}

/**
 * True when a dormant bud's own light releases it (R4 light trigger): Q ≥ Q_rel·(1 + δ·age). The
 * trigger is itself the light (R:FR) signal, so R5's δ_b does not scale it again.
 */
export function lightReleases(q: number, age: number, params: Params): boolean {
  const { r4 } = params;
  return r4.enabled && q >= r4.qRel * (1 + r4.delta * age);
}

/** True when a resting dormant bud of `age` seasons aborts. */
export function aborts(state: number, age: number, r4: Params["r4"]): boolean {
  return r4.enabled && state === BudState.dormant && age > r4.lDorm;
}

/** paShift of a shoot of order `order` released from a dormant bud on an axis with `shift`. */
export function releasedShift(order: number, shift: number, r4: Params["r4"]): number {
  return Math.min(order, shift + r4.juvenile);
}
