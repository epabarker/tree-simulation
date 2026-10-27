/**
 * Per-tree, per-season measurements (spec §8 diagnostics, §10 validation targets).
 * One row per tree per season in the CLI's metrics.csv.
 */

import type { LightSample } from "./light/light-model.ts";
import { isLiveBud } from "./principles/c3-allocation.ts";
import { BudState, type Tree } from "./tree.ts";
import type { World } from "./world.ts";

export interface TreeMetrics {
  tree: number;
  alive: boolean;
  age: number;
  metamers: number;
  buds: number;
  dormantBuds: number;
  /** Live buds resting as leafy short shoots (R6). */
  shortShoots: number;
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
  /**
   * Mean light on the ground under the crown, as a fraction of open sky (Q/C in the bottom row
   * of cells across the crown's width), from this season's start-of-season field (M6e; a closed
   * stand's floor gets ≈ 2–10%, §10). NaN without a world.
   */
  groundLight: number;
}

export const METRIC_COLUMNS: readonly (keyof TreeMetrics)[] = [
  "tree",
  "alive",
  "age",
  "metamers",
  "buds",
  "dormantBuds",
  "shortShoots",
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
  "groundLight",
];

const ground: LightSample = { q: 0, vx: 0, vy: 0 };

/** Mean Q/C over the bottom row of cells whose columns lie in [x0, x1] (clipped to the world). */
export function groundLight(world: World, x0: number, x1: number): number {
  const { light } = world;
  const C = world.params.c2.C;
  const lo = Math.max(0, Math.floor(x0));
  const hi = Math.min(light.width - 1, Math.floor(x1));
  if (hi < lo || C <= 0) return Number.NaN;
  let sum = 0;
  for (let col = lo; col <= hi; col++) {
    light.sample(col + 0.5, 0.5, Math.PI / 2, ground);
    sum += ground.q;
  }
  return sum / ((hi - lo + 1) * C);
}

export function treeMetrics(tree: Tree, world?: World): TreeMetrics {
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
  let shortShoots = 0;
  const b = tree.b.cols;
  for (let i = 0; i < tree.b.length; i++) {
    if (!isLiveBud(b.state[i])) continue;
    buds += 1;
    if (b.state[i] === BudState.dormant) dormant += 1;
    else if (b.state[i] === BudState.shortShoot) shortShoots += 1;
  }
  return {
    tree: tree.id,
    alive: tree.alive,
    age: tree.age,
    metamers: nm,
    buds,
    dormantBuds: dormant,
    shortShoots,
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
    groundLight: world && nm > 0 ? groundLight(world, minX, maxX) : Number.NaN,
  };
}
