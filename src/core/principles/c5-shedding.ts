/**
 * C5. Self-pruning (spec §C5; Palubicki et al. §4.4 after Takenaka 1994).
 *
 * A lateral branch (the subtree rooted at the first metamer of a lateral axis) whose light per
 * metamer Q_b / n_b is below T_eff = max(T, T_rel·Q_top), once it is at least g seasons old, is a
 * liability and is shed. Q_top is the tree's own crown-top light (the `topQuantile` quantile of
 * its live-bud Q this season), so a branch is judged against the rest of its tree: correlative
 * inhibition (Sprugel 2002; Kothari et al. 2025; ADR 0007). T_rel = 0 is the baseline rule.
 * Its whole subtree and its buds are removed, and its base radius is recorded as a scar at the
 * parent's node (r_scar^n), so pipe-model girth below it never shrinks (C6).
 *
 * Runs after GROW (§6 ordering rule 3), on the Q_sum and n_b of this season's basipetal pass;
 * only rows that existed during that pass can be shed roots, and shoots grown this season on a
 * shed branch go with it. Removal compacts both tables in order and remaps stored indices.
 *
 * With R1 in `carbon` shedding mode (spec §R1.4) the test is instead P_b < M_b: the branch's
 * production does not cover its sapwood maintenance (r1-carbon.ts); the grace period still holds.
 *
 * Params: c5.T, c5.g, c5.Trel, c5.topQuantile; c6.n and c6.r0 for the scar; r1.shed.
 */

import type { Params } from "../params.ts";
import { ensureFloat64, ensureUint8 } from "../soa.ts";
import { BudState, Slot, type Tree } from "../tree.ts";
import { addBud, budAngle } from "./c1-buds.ts";
import { isLiveBud } from "./c3-allocation.ts";

/**
 * The `quantile` quantile of the tree's live-bud Q this season (nearest rank), stored as
 * tree.qTop. Call after the buds are sampled.
 */
export function crownTopLight(tree: Tree, quantile: number): number {
  const b = tree.b.cols;
  topScratch = ensureFloat64(topScratch, tree.b.length);
  let count = 0;
  for (let i = 0; i < tree.b.length; i++) if (isLiveBud(b.state[i])) topScratch[count++] = b.q[i];
  if (count === 0) return 0;
  const qs = topScratch.subarray(0, count).sort(); // typed arrays sort numerically
  const rank = Math.min(count - 1, Math.max(0, Math.ceil(quantile * count) - 1));
  return qs[rank] as number;
}

let topScratch = new Float64Array(256);

/**
 * Sheds qualifying laterals among the first `evaluated` metamers. Returns the number of
 * metamers removed.
 */
export function shedBranches(
  tree: Tree,
  params: Params,
  season: number,
  evaluated: number,
): number {
  const nm = tree.m.length;
  const c = tree.m.cols;
  const { g } = params.c5;
  const T = Math.max(params.c5.T, params.c5.Trel * tree.qTop);
  const carbon = params.r1.enabled && params.r1.shed === "carbon";
  tree.scratchU = ensureUint8(tree.scratchU, Math.max(nm, tree.b.length));
  const dead = tree.scratchU;
  dead.fill(0, 0, nm);

  let any = false;
  for (let i = 0; i < evaluated; i++) {
    if (c.slot[i] === Slot.main || c.parent[i] < 0) continue;
    if (season - c.birthSeason[i] < g) continue;
    const lightPerMetamer = c.nSum[i] > 0 ? c.qSum[i] / c.nSum[i] : 0;
    const shed = carbon
      ? // R1: the branch cannot pay for its foliage and sapwood (autonomy), or it is dim
        // relative to the tree's own crown top (correlative inhibition, ADR 0007).
        tree.pSum[i] < tree.mSum[i] || lightPerMetamer < params.c5.Trel * tree.qTop
      : c.nSum[i] > 0 && lightPerMetamer < T;
    if (shed) {
      dead[i] = 1;
      any = true;
    }
  }
  if (!any) return 0;
  return removeBranches(tree, dead, params);
}

/**
 * Removes every metamer marked in `dead` (by this season's row index) with its whole subtree and
 * buds, recording each removed branch's base radius as a scar at the node it hung from. Compacts
 * the metamer table in order and remaps stored indices. Shared by C5/R1 shedding and R3 breakage.
 * Per-row scratch arrays in `carry` are compacted alongside. With R4's bud bank, each removed
 * branch leaves a dormant bud in its slot. Returns the number of metamers removed.
 */
export function removeBranches(
  tree: Tree,
  dead: Uint8Array,
  params: Params,
  carry: Float64Array[] = [],
): number {
  const nm = tree.m.length;
  const c = tree.m.cols;
  const { n } = params.c6;
  const bank = params.r4.enabled && params.r4.bank;
  const roots: number[] = [];
  // Forward pass: a metamer dies with its parent (parents come first). Scars go to the node
  // the shed branch hung from; nested shed roots inside a shed branch leave no scar.
  let removed = 0;
  for (let i = 0; i < nm; i++) {
    const p = c.parent[i];
    if (p >= 0 && dead[p]) {
      dead[i] = 1;
    } else if (dead[i] && p >= 0) {
      c.scarSumN[p] += c.radius[i] ** n;
      if (bank) roots.push(i);
    }
    if (dead[i]) removed += 1;
  }

  // Buds on dead metamers go too; consumed buds are compacted later by commitBuds.
  const b = tree.b.cols;
  for (let j = 0; j < tree.b.length; j++) {
    if (dead[b.metamer[j]]) b.state[j] = BudState.gone;
  }

  const bankRows = roots.map((i) => ({ parent: c.parent[i], slot: c.slot[i], order: c.order[i] }));
  const keep = new Uint8Array(nm);
  for (let i = 0; i < nm; i++) keep[i] = dead[i] ? 0 : 1;
  const oldToNew = tree.m.compact(keep);
  const parent = tree.m.cols.parent;
  for (let i = 0; i < tree.m.length; i++) {
    const p = parent[i];
    if (p >= 0) parent[i] = oldToNew[p];
  }
  for (let j = 0; j < tree.b.length; j++) {
    if (b.state[j] !== BudState.gone) b.metamer[j] = oldToNew[b.metamer[j]];
  }
  for (const arr of carry) {
    for (let i = 0; i < nm; i++) if (keep[i]) arr[oldToNew[i] as number] = arr[i] as number;
  }
  // R4 bud bank: a dormant bud in each vacated slot (the table rows are remapped first). The
  // compaction kept the removed roots' column values only in `bankRows`, read before it.
  for (const root of bankRows) {
    const m = oldToNew[root.parent] as number;
    const i = addBud(
      tree,
      m,
      root.slot as Slot,
      budAngle(tree, m, root.slot as Slot, params),
      root.order,
    );
    tree.b.cols.state[i] = BudState.dormant;
  }
  return removed;
}
