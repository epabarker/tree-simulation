/**
 * R1. Carbon balance with the cost of size (spec §R1, ADR 0010; Ryan et al. 1995, 2006; Koch et al.
 * 2004; Mencuccini et al. 2005; Becker et al. 2000; Weber et al. 2018).
 *
 * The resource a tree distributes is what its foliage produces minus what its living tissue
 * costs. Production P = α·Σ a·Q·exp(−L_path/L_h) over live buds, where a is the bud's leaf area
 * as the light model sees it (R6: a dormant bud has none) and L_path the path length from the base
 * to its node: hydraulic resistance makes distant foliage less productive. Maintenance
 * M = m_w·Σ π r_live²·l + m_f·Σ a: live sapwood, where r_live is the pipe-model radius of the pipes
 * that still serve foliage (Shinozaki et al. 1964; stem respiration follows sapwood volume, Ryan
 * 1990), so pipes kept by C6's memory and scars are heartwood and cost nothing; and foliage with
 * its fine roots, which sets a compensation light Q_c = m_f/α. With N = P − M > 0 a share s_r goes
 * to the reserve and, once the tree is taller than the maturity height (size, never age), a share
 * f_rep to reproduction (O4 will turn it into seeds); the rest is v_base for C3. With N ≤ 0 nothing
 * grows and the deficit is drawn from the reserve, which holds at most `store` seasons of
 * maintenance (stores are kept, not hoarded). A tree whose reserve has been empty for k_starve
 * seasons dies at the end of the season (§6 "deaths last"). The two plateau causes, path length
 * (L_h > 0) and reproduction (f_rep > 0), switch independently. P_b and M_b per branch feed the
 * `carbon` shedding mode in C5: a lateral is shed when it cannot pay for itself or is dim
 * relative to the crown top.
 *
 * Params: r1.enabled, r1.mw (m_w), r1.mf (m_f), r1.Lh (L_h), r1.sr (s_r), r1.fRep (f_rep),
 * r1.maturity, r1.kStarve (k_starve), r1.reserve0, r1.store, r1.shed; c3.alpha (α); c6.n, c6.r0;
 * r6 leaf areas.
 */

import type { Params } from "../params.ts";
import type { Tree } from "../tree.ts";
import { isLiveBud } from "./c3-allocation.ts";
import { depositArea } from "./r6-short-shoots.ts";

/**
 * The CARBON step of §6, after the basipetal light pass: fills pathLen, pSum and mSum, sets the
 * tree's production, maintenance, reserve, reproduction and starvation count, and its v_base.
 */
export function carbonBalance(tree: Tree, params: Params): void {
  const { r1 } = params;
  const nm = tree.m.length;
  const c = tree.m.cols;
  const { pathLen, pSum, mSum } = tree;

  // Acropetal: path length from the base to each metamer's tip, and the tree's height.
  let height = 0;
  for (let i = 0; i < nm; i++) {
    const p = c.parent[i];
    pathLen[i] = (p >= 0 ? pathLen[p] : 0) + c.length[i];
    const y = tree.tipY(i);
    if (y > height) height = y;
  }

  // Production of the foliage at each node.
  pSum.fill(0, 0, nm);
  mSum.fill(0, 0, nm);
  const alpha = params.c3.alpha;
  const b = tree.b.cols;
  for (let j = 0; j < tree.b.length; j++) {
    if (!isLiveBud(b.state[j])) continue;
    const m = b.metamer[j];
    const discount = r1.Lh > 0 ? Math.exp(-pathLen[m] / r1.Lh) : 1;
    // Only foliage produces and respires: the leaf area the light model sees (R6: active 1,
    // short shoot a_ss, dormant 0; every bud 1 without R6).
    const leaf = depositArea(b.state[j], params.r6);
    pSum[m] += alpha * leaf * b.q[j] * discount;
    mSum[m] += r1.mf * leaf;
  }

  // Basipetal: live pipes (Σ r^n of the tips above, no scars, no memory), their sapwood cost,
  // and subtree sums of production and maintenance.
  const { n, r0 } = params.c6;
  const tipN = r0 ** n;
  const pipes = tree.scratchF;
  const hasChild = tree.scratchU;
  pipes.fill(0, 0, nm);
  hasChild.fill(0, 0, nm);
  for (let i = nm - 1; i >= 0; i--) {
    const s = hasChild[i] ? pipes[i] : tipN;
    const rLive = s ** (1 / n);
    mSum[i] += r1.mw * Math.PI * rLive * rLive * c.length[i];
    const p = c.parent[i];
    if (p >= 0) {
      pipes[p] += s;
      hasChild[p] = 1;
      pSum[p] += pSum[i];
      mSum[p] += mSum[i];
    }
  }

  const P = nm > 0 ? pSum[0] : 0;
  const M = nm > 0 ? mSum[0] : 0;
  tree.production = P;
  tree.maintenance = M;
  // The seed's store carries the first season; after that the reserve holds at most `store`
  // seasons of maintenance, so a tree that can no longer pay its way starves (Weber et al. 2018).
  const cap = tree.age === 0 ? Math.max(r1.reserve0, r1.store * M) : r1.store * M;
  if (tree.age === 0) tree.reserve = r1.reserve0;
  else tree.reserve = Math.min(tree.reserve, cap);
  const N = P - M;
  if (N > 0) {
    const toReserve = r1.sr * N;
    const toSeeds = r1.fRep > 0 && height >= r1.maturity ? r1.fRep * N : 0;
    tree.reserve = Math.min(tree.reserve + toReserve, cap);
    tree.reproduction += toSeeds;
    tree.vBase = N - toReserve - toSeeds;
    tree.starved = 0;
  } else {
    tree.vBase = 0;
    tree.reserve += N;
    if (tree.reserve <= 0) {
      tree.reserve = 0;
      tree.starved += 1;
    } else {
      tree.starved = 0;
    }
  }
}

/** True when R1 kills the tree this season: its reserve has been empty for k_starve seasons. */
export function starvedToDeath(tree: Tree, r1: Params["r1"]): boolean {
  return r1.enabled && tree.starved >= r1.kStarve;
}
