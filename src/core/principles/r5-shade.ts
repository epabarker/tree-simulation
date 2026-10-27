/**
 * R5. Shade-avoidance elongation (spec §R5, ADR 0012; Franklin 2008; Schneider et al. 2019;
 * Roychoudhry et al. 2017; MacFarlane et al. 2017).
 *
 * Low light, standing in for low R:FR, is s = 1 − Q/C: 0 in open sky, 1 in full shade. A shoot
 * grown from a bud at shade s has internodes l0·(1 + e_s·s); λ at a node at shade s is
 * λ + δλ·s, favouring the main axis; a dormant bud needs v_break·(1 + δ_b·s) to break (with R4;
 * r4-dormancy.ts); and the shoot's set-point is A_set·(1 − δ_A·s), more upright. Node shade is
 * sampled from the start-of-season light field at each metamer's tip. The optional far-red field
 * is not built: s comes from the light model. With `r5.signal: "neighbours"` (M19) s is scaled by
 * `neighbourShare`, the share of the foliage above the node that other trees own, so shade a tree
 * casts on itself does not make it reach (open-grown trees stay squat).
 *
 * Params: r5.enabled, r5.eS (e_s), r5.dLambda (δλ), r5.dB (δ_b), r5.dA (δ_A), r5.signal; c2.C.
 */

import type { Params } from "../params.ts";

/** Shade s = 1 − Q/C, clamped to [0, 1]. */
export function shadeOf(q: number, C: number): number {
  return C > 0 ? Math.min(1, Math.max(0, 1 - q / C)) : 0;
}

/** Internode length factor 1 + e_s·s. */
export function elongation(shade: number, r5: Params["r5"]): number {
  return r5.enabled ? 1 + r5.eS * shade : 1;
}

/** λ at a node at shade s: λ + δλ·s, kept below 1. */
export function shadedLambda(lambda: number, shade: number, r5: Params["r5"]): number {
  return r5.enabled ? Math.min(0.99, lambda + r5.dLambda * shade) : lambda;
}

/** Set-point factor 1 − δ_A·s (never below 0). */
export function setPointScale(shade: number, r5: Params["r5"]): number {
  return r5.enabled ? Math.max(0, 1 - r5.dA * shade) : 1;
}

/** Rows above a node, and columns either side, that `neighbourShare` looks through. */
const SHARE_ROWS = 12;
const SHARE_COLS = 1;

/**
 * The share of the foliage above (x, y) that belongs to trees other than `id`, from the season's
 * owner grid (O2: a tree's id, EMPTY, or SHARED for a cell several trees fill, counted half).
 * 0 when there is no foliage above at all.
 */
export function neighbourShare(
  owner: Int32Array,
  W: number,
  H: number,
  periodic: boolean,
  x: number,
  y: number,
  id: number,
): number {
  const row0 = Math.floor(y) + 1;
  const col0 = Math.floor(x);
  let own = 0;
  let others = 0;
  for (let row = row0; row < Math.min(H, row0 + SHARE_ROWS); row++) {
    for (let dc = -SHARE_COLS; dc <= SHARE_COLS; dc++) {
      let col = col0 + dc;
      if (periodic) col = ((col % W) + W) % W;
      else if (col < 0 || col >= W) continue;
      const o = owner[row * W + col] as number;
      if (o === -1) continue;
      if (o === id) own += 1;
      else if (o === -2) {
        own += 0.5;
        others += 0.5;
      } else others += 1;
    }
  }
  return own + others > 0 ? others / (own + others) : 0;
}
