/**
 * C6. Pipe-model girth with memory (spec §C6; Palubicki et al. §4.5; Shinozaki et al. 1964).
 *
 * Tips have radius r0. Basipetally, r_parent^n = Σ r_child^n + Σ r_scar^n, and a radius never
 * decreases (r ← max(r, r_prev)), so trunks keep their girth after shedding. Stems are round in
 * the thin-slab convention (§2), so n ≈ 2 conserves cross-sectional area and Leonardo-type
 * exponents stay comparable with 3D data (Eloy 2011: 1.8–2.3).
 *
 * R3's stress-driven girth (ADR 0011) adds local wood, `stressWood`, on top: the pipe radius
 * r − stressWood is what enters the parent's sum and what memory keeps, so reinforced junctions
 * get Leonardo exponents above n (Minamino & Tateno 2014).
 *
 * Params: c6.n, c6.r0.
 */

import type { Params } from "../params.ts";
import { ensureFloat64, ensureUint8 } from "../soa.ts";
import type { Tree } from "../tree.ts";

export function updateGirth(tree: Tree, params: Params): void {
  const nm = tree.m.length;
  const { n, r0 } = params.c6;
  const tipN = r0 ** n;
  tree.scratchF = ensureFloat64(tree.scratchF, nm);
  tree.scratchU = ensureUint8(tree.scratchU, nm);
  const childSum = tree.scratchF;
  const hasChild = tree.scratchU;
  childSum.fill(0, 0, nm);
  hasChild.fill(0, 0, nm);
  const { parent, radius, scarSumN, stressWood } = tree.m.cols;
  for (let i = nm - 1; i >= 0; i--) {
    const base = hasChild[i] ? childSum[i] : tipN;
    const r = (base + scarSumN[i]) ** (1 / n) + stressWood[i];
    if (r > radius[i]) radius[i] = r;
    const p = parent[i];
    if (p >= 0) {
      childSum[p] += (radius[i] - stressWood[i]) ** n;
      hasChild[p] = 1;
    }
  }
}

/**
 * Leonardo exponent Δ at every junction with two or more child metamers: the Δ solving
 * r_parent^Δ = Σ r_child^Δ (§10 validation target: 1.8–2.3). Junctions where a child is as thick
 * as its parent have no solution and are skipped.
 */
export function junctionExponents(tree: Tree): number[] {
  const nm = tree.m.length;
  const { parent, radius } = tree.m.cols;
  const children: number[][] = [];
  for (let i = 1; i < nm; i++) {
    const p = parent[i];
    if (p < 0) continue;
    const list = children[p] ?? [];
    list.push(i);
    children[p] = list;
  }
  const out: number[] = [];
  for (let p = 0; p < nm; p++) {
    const kids = children[p];
    if (!kids || kids.length < 2) continue;
    const rp = radius[p];
    const ratios = kids.map((k) => radius[k] / rp);
    if (ratios.some((x) => x >= 1 || x <= 0)) continue;
    // f(Δ) = Σ ratio^Δ − 1 falls monotonically in Δ; bisect on [0.5, 8].
    let lo = 0.5;
    let hi = 8;
    const f = (d: number) => ratios.reduce((s, x) => s + x ** d, 0) - 1;
    if (f(lo) < 0 || f(hi) > 0) continue;
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2;
      if (f(mid) > 0) lo = mid;
      else hi = mid;
    }
    out.push((lo + hi) / 2);
  }
  return out;
}
