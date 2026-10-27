/**
 * O2. Wind abrasion and crown shyness (spec §O2, ADR 0013; van der Zee et al. 2021).
 *
 * Exposed, slender shoots sway, and a tip that sways into another tree's foliage is damaged. In
 * the plane, a leafy bud sways horizontally by A = k_sway·Q·h/r cells (Q its light, a proxy for
 * exposure; h its height; r its metamer's radius), at most `maxSway`. If any cell within A of it
 * in its row holds another tree's foliage (owner tags from this season's deposits), the bud dies
 * with probability p_abr [RNG: abrasion, keyed by tree, bud and season]. Crowns then stop short of
 * each other, leaving channels: crown shyness. Runs in Phase 3 (§6 ABRASION), after growth. The
 * wind-load girth bonus of §O2.4 is not built (R3's stress wood already thickens loaded wood).
 *
 * Params: o2.enabled, o2.sway (k_sway), o2.maxSway, o2.pAbr (p_abr).
 */

import type { Params } from "../params.ts";
import { Purpose, uniform } from "../rng.ts";
import { BudState, type Tree } from "../tree.ts";
import { isLiveBud } from "./c3-allocation.ts";

/** Owner tag of a cell holding foliage of more than one tree. */
export const SHARED = -2;
/** Owner tag of a cell without foliage. */
export const EMPTY = -1;

/** Records that tree `id` has foliage in cell (col, row) of an owner grid of width W. */
export function tagOwner(owner: Int32Array, W: number, col: number, row: number, id: number): void {
  const c = row * W + col;
  const o = owner[c] as number;
  owner[c] = o === EMPTY || o === id ? id : SHARED;
}

/** Sway amplitude in cells of a bud at height h, light q, on a metamer of radius r. */
export function swayOf(q: number, h: number, r: number, o2: Params["o2"]): number {
  return r > 0 ? Math.min(o2.maxSway, (o2.sway * q * Math.max(0, h)) / r) : 0;
}

/**
 * Kills leafy buds of `tree` that sway into another tree's foliage. `owner` is the season's owner
 * grid (W × H, row-major, row 0 at the ground). Returns the number of buds lost.
 */
export function abrade(
  tree: Tree,
  owner: Int32Array,
  W: number,
  H: number,
  periodic: boolean,
  params: Params,
  season: number,
): number {
  const { o2 } = params;
  const b = tree.b.cols;
  const c = tree.m.cols;
  let lost = 0;
  for (let j = 0; j < tree.b.length; j++) {
    if (!isLiveBud(b.state[j]) || b.state[j] === BudState.dormant) continue;
    const m = b.metamer[j];
    const x = tree.tipX(m);
    const y = tree.tipY(m);
    const row = Math.floor(y);
    if (row < 0 || row >= H) continue;
    const A = swayOf(b.q[j], y, c.radius[m], o2);
    if (A <= 0) continue;
    let touches = false;
    for (let col = Math.floor(x - A); col <= Math.floor(x + A) && !touches; col++) {
      const k = periodic ? ((col % W) + W) % W : col;
      if (k < 0 || k >= W) continue;
      const o = owner[row * W + k] as number;
      touches = o !== EMPTY && o !== tree.id;
    }
    if (!touches) continue;
    if (uniform(params.seed, Purpose.abrasion, tree.id, b.birthId[j], season) < o2.pAbr) {
      b.state[j] = BudState.gone;
      lost += 1;
    }
  }
  return lost;
}
