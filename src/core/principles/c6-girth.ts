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
 * as its parent have no solution and are skipped, as are roots outside [0.5, 8]. Appends to `out`.
 *
 * f(Δ) = Σ x_i^Δ − 1, with x_i = r_child/r_parent in (0, 1), falls and is convex in Δ, so Newton's
 * method started left of the root climbs to it without overshooting: a few exps per junction
 * where bisection needed 60 rounds of pow (M13; this runs for every snapshot the lab charts).
 */
export function junctionExponents(tree: Tree, out: number[] = []): number[] {
  const nm = tree.m.length;
  const { parent, radius } = tree.m.cols;
  // Children of p, chained first[p] → next[child] → …, so no list is allocated per node.
  const first = new Int32Array(nm).fill(-1);
  const next = new Int32Array(nm);
  for (let i = nm - 1; i >= 1; i--) {
    const p = parent[i];
    if (p < 0) continue;
    next[i] = first[p];
    first[p] = i;
  }
  const logs: number[] = [];
  for (let p = 0; p < nm; p++) {
    if (first[p] < 0 || next[first[p]] < 0) continue; // fewer than two children
    const rp = radius[p];
    logs.length = 0;
    let solvable = true;
    for (let k = first[p]; k >= 0; k = next[k]) {
      const x = radius[k] / rp;
      if (x >= 1 || x <= 0) solvable = false;
      logs.push(Math.log(x));
    }
    if (!solvable) continue;
    const f = (d: number): number => {
      let sum = -1;
      for (const l of logs) sum += Math.exp(d * l);
      return sum;
    };
    if (f(0.5) < 0 || f(8) > 0) continue;
    let d = 0.5;
    for (let it = 0; it < 100; it++) {
      let fd = -1;
      let slope = 0;
      for (const l of logs) {
        const e = Math.exp(d * l);
        fd += e;
        slope += e * l;
      }
      const step = fd / slope;
      if (!(step < 0) || step > -1e-13) break; // converged (f ≈ 0) or no progress left
      d -= step;
    }
    out.push(d);
  }
  return out;
}
