/**
 * C5. Self-pruning (spec §C5; Palubicki et al. §4.4 after Takenaka 1994).
 *
 * A lateral branch (the subtree rooted at the first metamer of a lateral axis) whose light per
 * metamer Q_b / n_b is below T, once it is at least g seasons old, is a liability and is shed.
 * Its whole subtree and its buds are removed, and its base radius is recorded as a scar at the
 * parent's node (r_scar^n), so pipe-model girth below it never shrinks (C6).
 *
 * Runs after GROW (§6 ordering rule 3), on the Q_sum and n_b of this season's basipetal pass;
 * only rows that existed during that pass can be shed roots, and shoots grown this season on a
 * shed branch go with it. Removal compacts both tables in order and remaps stored indices.
 *
 * Params: c5.T, c5.g; c6.n and c6.r0 for the scar.
 */

import type { Params } from "../params.ts";
import { ensureUint8 } from "../soa.ts";
import { BudState, Slot, type Tree } from "../tree.ts";

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
  const { T, g } = params.c5;
  const n = params.c6.n;
  tree.scratchU = ensureUint8(tree.scratchU, Math.max(nm, tree.b.length));
  const dead = tree.scratchU;
  dead.fill(0, 0, nm);

  let any = false;
  for (let i = 0; i < evaluated; i++) {
    if (c.slot[i] === Slot.main || c.parent[i] < 0) continue;
    if (season - c.birthSeason[i] < g) continue;
    if (c.nSum[i] > 0 && c.qSum[i] / c.nSum[i] < T) {
      dead[i] = 1;
      any = true;
    }
  }
  if (!any) return 0;

  // Forward pass: a metamer dies with its parent (parents come first). Scars go to the node
  // the shed branch hung from; nested shed roots inside a shed branch leave no scar.
  let removed = 0;
  for (let i = 0; i < nm; i++) {
    const p = c.parent[i];
    if (p >= 0 && dead[p]) {
      dead[i] = 1;
    } else if (dead[i] && p >= 0) {
      c.scarSumN[p] += c.radius[i] ** n;
    }
    if (dead[i]) removed += 1;
  }

  // Buds on dead metamers go too; consumed buds are compacted later by commitBuds.
  const b = tree.b.cols;
  for (let j = 0; j < tree.b.length; j++) {
    if (dead[b.metamer[j]]) b.state[j] = BudState.gone;
  }

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
  return removed;
}
