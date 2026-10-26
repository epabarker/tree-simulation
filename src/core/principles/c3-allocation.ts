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

/**
 * Borchert–Honda split at one node (§C3.4): the main axis gets v·λQ_m / (λQ_m + (1 − λ)Q_l),
 * the laterals get the rest. Returns the main share; 0 when the node gathered no light.
 */
export function bhMainShare(v: number, qMain: number, qLateral: number, lambda: number): number {
  const denom = lambda * qMain + (1 - lambda) * qLateral;
  return denom > 0 ? (v * lambda * qMain) / denom : 0;
}

/** Acropetal pass: sets each live bud's resource v (and each metamer's vIn) by c3.mode. */
export function allocate(tree: Tree, params: Params): void {
  const b = tree.b.cols;
  const nb = tree.b.length;
  const { alpha, lambda } = params.c3;
  switch (params.c3.mode) {
    case "none": {
      // Milestone scaffold (M0–M1): every bud that sees any light grows one metamer.
      for (let i = 0; i < nb; i++) b.v[i] = isLiveBud(b.state[i]) && b.q[i] > 0 ? 1 : 0;
      tree.vBase = 0;
      sumResourceBasipetally(tree);
      return;
    }
    case "equal": {
      // §8 ablation (Takenaka 1994): the tree's resource is shared equally among live buds,
      // regardless of where the light was gathered.
      let live = 0;
      for (let i = 0; i < nb; i++) if (isLiveBud(b.state[i])) live += 1;
      tree.vBase = alpha * tree.qBase;
      const share = live > 0 ? tree.vBase / live : 0;
      for (let i = 0; i < nb; i++) b.v[i] = isLiveBud(b.state[i]) ? share : 0;
      sumResourceBasipetally(tree);
      return;
    }
    case "bh": {
      const nm = tree.m.length;
      const { qSlot, vSlot } = tree;
      const { parent, slot, vIn } = tree.m.cols;
      tree.vBase = nm > 0 ? alpha * tree.qBase : 0;
      for (let i = 0; i < nm; i++) {
        const p = parent[i];
        const v = p < 0 ? tree.vBase : vSlot[3 * p + slot[i]];
        vIn[i] = v;
        const qMain = qSlot[3 * i];
        const qLeft = qSlot[3 * i + 1];
        const qRight = qSlot[3 * i + 2];
        const qLat = qLeft + qRight;
        const vMain = bhMainShare(v, qMain, qLat, lambda);
        const vLat = qMain + qLat > 0 ? v - vMain : 0;
        vSlot[3 * i] = vMain;
        vSlot[3 * i + 1] = qLat > 0 ? (vLat * qLeft) / qLat : 0;
        vSlot[3 * i + 2] = qLat > 0 ? (vLat * qRight) / qLat : 0;
      }
      for (let i = 0; i < nb; i++) {
        b.v[i] = isLiveBud(b.state[i]) ? vSlot[3 * b.metamer[i] + b.slot[i]] : 0;
      }
      return;
    }
  }
}

/** vIn for modes without an acropetal flow: the resource of all buds above each metamer. */
function sumResourceBasipetally(tree: Tree): void {
  const nm = tree.m.length;
  const { parent, vIn } = tree.m.cols;
  vIn.fill(0, 0, nm);
  const b = tree.b.cols;
  for (let i = 0; i < tree.b.length; i++) vIn[b.metamer[i]] += b.v[i];
  for (let i = nm - 1; i > 0; i--) vIn[parent[i]] += vIn[i];
}
