/**
 * Per-tree, per-season measurements (spec §8 diagnostics, §10 validation targets).
 * One row per tree per season in the CLI's metrics.csv.
 */

import { isLiveBud } from "./principles/c3-allocation.ts";
import { BudState, type Tree } from "./tree.ts";

export interface TreeMetrics {
  tree: number;
  alive: boolean;
  age: number;
  metamers: number;
  buds: number;
  dormantBuds: number;
  /** Highest tip above the ground. */
  height: number;
  /** Horizontal extent of all tips. */
  crownWidth: number;
  /** Mean tip x minus root x: positive means the crown leans right. */
  centroidOffset: number;
  /** Height of the lowest living first-order branch (the clear bole, §C5). */
  boleHeight: number;
  /** Q_base and v_base this season (C3). */
  qBase: number;
  vBase: number;
  /** Mean Q over the buds sampled this season. */
  meanBudQ: number;
  trunkRadius: number;
  /** Height over trunk base diameter (slenderness, §10; stand-grown trees ≈ 60–80). */
  slenderness: number;
  /** Metamers shed this season (C5). */
  shed: number;
}

export const METRIC_COLUMNS: readonly (keyof TreeMetrics)[] = [
  "tree",
  "alive",
  "age",
  "metamers",
  "buds",
  "dormantBuds",
  "height",
  "crownWidth",
  "centroidOffset",
  "boleHeight",
  "qBase",
  "vBase",
  "meanBudQ",
  "trunkRadius",
  "slenderness",
  "shed",
];

export function treeMetrics(tree: Tree): TreeMetrics {
  const nm = tree.m.length;
  const c = tree.m.cols;
  let height = 0;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let sumX = 0;
  let bole = Number.POSITIVE_INFINITY;
  for (let i = 0; i < nm; i++) {
    const x = tree.tipX(i);
    const y = tree.tipY(i);
    if (y > height) height = y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    sumX += x;
    const p = c.parent[i];
    if (c.order[i] === 1 && p >= 0 && c.order[p] === 0 && c.baseY[i] < bole) bole = c.baseY[i];
  }
  let buds = 0;
  let dormant = 0;
  const b = tree.b.cols;
  for (let i = 0; i < tree.b.length; i++) {
    if (!isLiveBud(b.state[i])) continue;
    buds += 1;
    if (b.state[i] === BudState.dormant) dormant += 1;
  }
  return {
    tree: tree.id,
    alive: tree.alive,
    age: tree.age,
    metamers: nm,
    buds,
    dormantBuds: dormant,
    height,
    crownWidth: nm > 0 ? maxX - minX : 0,
    centroidOffset: nm > 0 ? sumX / nm - tree.rootX : 0,
    boleHeight: Number.isFinite(bole) ? bole : height,
    qBase: tree.qBase,
    vBase: tree.vBase,
    meanBudQ: tree.meanBudQ,
    trunkRadius: nm > 0 ? c.radius[0] : 0,
    slenderness: nm > 0 && c.radius[0] > 0 ? height / (2 * c.radius[0]) : 0,
    shed: tree.shedCount,
  };
}
