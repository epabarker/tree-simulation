/**
 * C3. Basipetal light summation and acropetal Borchert–Honda allocation (spec §C3).
 *
 * Basipetal (reverse loop): each bud's Q enters its node through its slot; each metamer's
 * subtree total Q_sum flows into its parent's node through the metamer's slot.
 * Acropetal (forward loop): v_base = α·Q_base enters the root; at each node v splits between
 * the main slot and the lateral slots (§C3.4); a slot holding a bud delivers its share to the
 * bud, a slot holding a metamer passes it on.
 *
 * Params: c3.mode, c3.lambda (λ), c3.alpha (α).
 */

import type { Params } from "../params.ts";
import { BudState, type Tree } from "../tree.ts";

/** True for buds that still take part in growth (not consumed, aborted or terminated). */
export function isLiveBud(state: number): boolean {
  return state === BudState.active || state === BudState.dormant;
}

/**
 * Basipetal pass: fills qSlot (light entering each node per slot), qSum (Q_sum of each
 * metamer's subtree, including buds) and nSum (metamer count n_b of each subtree).
 */
export function gatherLight(tree: Tree): void {
  const nm = tree.m.length;
  const nb = tree.b.length;
  const { qSlot } = tree;
  qSlot.fill(0, 0, 3 * nm);
  const b = tree.b.cols;
  for (let i = 0; i < nb; i++) {
    if (!isLiveBud(b.state[i])) continue;
    qSlot[3 * b.metamer[i] + b.slot[i]] += b.q[i];
  }
  const { parent, slot, qSum, nSum } = tree.m.cols;
  nSum.fill(0, 0, nm);
  for (let i = nm - 1; i >= 0; i--) {
    const q = qSlot[3 * i] + qSlot[3 * i + 1] + qSlot[3 * i + 2];
    qSum[i] = q;
    nSum[i] += 1;
    const p = parent[i];
    if (p >= 0) {
      qSlot[3 * p + slot[i]] += q;
      nSum[p] += nSum[i];
    }
  }
  tree.qBase = nm > 0 ? qSum[0] : 0;
}

/** Acropetal pass: sets each live bud's resource v according to c3.mode. */
export function allocate(tree: Tree, params: Params): void {
  const b = tree.b.cols;
  const nb = tree.b.length;
  switch (params.c3.mode) {
    case "none": {
      // Milestone scaffold (M0–M1): every bud that sees any light grows one metamer.
      for (let i = 0; i < nb; i++) b.v[i] = b.q[i] > 0 ? 1 : 0;
      tree.vBase = 0;
      return;
    }
    case "bh":
    case "equal":
      throw new Error(`C3 mode '${params.c3.mode}' is implemented at milestone M2`);
  }
}
