/**
 * One tree's state (spec §5): a metamer table and a bud table, both structure-of-arrays.
 *
 * Topology without child pointers: every metamer records its `parent` and the `slot` it
 * occupies at the parent's upper node (0 = continuation of the parent's axis, 1 = left
 * lateral, 2 = right lateral). A bud sits at its metamer's upper node in one of the same
 * slots. In 2D a node has at most two sides, so three slots cover every phyllotaxis in §C1.
 * A slot holds a bud or a child metamer, never both: when a bud grows it is consumed and the
 * new metamer takes its slot.
 */

import { ensureFloat64, ensureUint8, Table } from "./soa.ts";

export const Slot = { main: 0, left: 1, right: 2 } as const;
export type Slot = (typeof Slot)[keyof typeof Slot];

/** Bud fates (spec §C1). 0 marks a consumed or removed bud awaiting compaction. */
/** Values are stored in tables and snapshots: append new states, never renumber. */
export const BudState = {
  gone: 0,
  active: 1,
  dormant: 2,
  terminated: 3,
  aborted: 4,
  /** A leafy short shoot (R6): no extension this season, but leaves. */
  shortShoot: 5,
} as const;
export type BudState = (typeof BudState)[keyof typeof BudState];

export const METAMER_SCHEMA = {
  /** Stable id, unique within the tree, ascending in array order. Keys RNG draws and tweening. */
  birthId: Int32Array,
  /** Index of the parent metamer, -1 for the root. Always less than the row's own index. */
  parent: Int32Array,
  /** Slot at the parent's upper node (Slot). */
  slot: Uint8Array,
  /** birthId of the first metamer of this metamer's axis. */
  axis: Int32Array,
  /** Position along the axis (0 = first metamer of the axis). Drives the side sequence. */
  axisNode: Int32Array,
  /** Branching order (0 = trunk). */
  order: Uint8Array,
  baseX: Float64Array,
  baseY: Float64Array,
  /** Absolute direction, radians (0 = +x, π/2 = up). */
  angle: Float64Array,
  length: Float64Array,
  radius: Float64Array,
  /** Σ r^n of branches shed from this metamer's upper node (C6 scars). */
  scarSumN: Float64Array,
  birthSeason: Int32Array,
  // Per-season values written by the passes and kept with the row, so they survive compaction
  // and can be drawn (spec §5 "scratch per pass").
  /** Light gathered by the subtree above and including this metamer: Q_sum (C3, C5). */
  qSum: Float64Array,
  /** Metamer count of that subtree: n_b (C5). */
  nSum: Int32Array,
  /** Resource arriving at the metamer's base this season (C3). */
  vIn: Float64Array,
  /**
   * Radius added by stress-driven girth (R3, ADR 0011): local reinforcement that does not carry on
   * into the parent's pipe sum, so the pipe radius is `radius − stressWood`. Hashed only when
   * non-zero (hash.ts), so runs without R3 keep their golden hashes.
   */
  stressWood: Float64Array,
  /**
   * Bending moment at the base after last season's mechanics pass (R3): the load increment
   * M − M_prev sets this season's sag (Alméras & Fournier 2009). Hashed only when non-zero.
   */
  moment: Float64Array,
} as const;

export const BUD_SCHEMA = {
  /** Stable id, unique within the tree. Keys RNG draws. */
  birthId: Int32Array,
  /** Index of the metamer whose upper node holds the bud. */
  metamer: Int32Array,
  slot: Uint8Array,
  state: Uint8Array,
  /** Seasons since the bud was formed. */
  age: Int32Array,
  /** Order of the shoot this bud would produce. */
  order: Uint8Array,
  /** Default growth direction, radians: the parent's direction, rotated by β for laterals. */
  angle: Float64Array,
  /** Light exposure Q and optimal direction V from the light model (C2). */
  q: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  /** Resource v delivered this season (C3). */
  v: Float64Array,
} as const;

export class Tree {
  readonly id: number;
  readonly rootX: number;
  alive = true;
  /** Seasons since planting. */
  age = 0;
  nextMetamerId = 0;
  nextBudId = 0;

  readonly m = new Table(METAMER_SCHEMA, 256);
  readonly b = new Table(BUD_SCHEMA, 256);

  // Per-season scratch, indexed like the metamer table. Never compacted; resized on demand.
  /** Light flowing into each node from each slot (3 per metamer). */
  qSlot = new Float64Array(0);
  /** Resource leaving each node through each slot (3 per metamer). */
  vSlot = new Float64Array(0);
  /** Pass-local scratch (C6 child Σ r^n, C5 shed marks). */
  scratchF = new Float64Array(0);
  scratchU = new Uint8Array(0);

  /** Light and resource at the base this season (C3), for metrics. */
  qBase = 0;
  vBase = 0;
  /** Metamers shed this season (C5). */
  shedCount = 0;
  /** Mean Q over the buds sampled this season (C2). */
  meanBudQ = 0;
  /** The `c5.topQuantile` quantile of live-bud Q this season: light at the crown top (C5, ADR 0007). */
  qTop = 0;

  // R1 carbon balance (ADR 0010): this season's totals, and state carried between seasons.
  /** Production P and sapwood maintenance M this season. */
  production = 0;
  maintenance = 0;
  /** Carbon reserve; seasons in a row it has been empty; reproduction summed over the tree's life. */
  reserve = 0;
  starved = 0;
  reproduction = 0;
  /** Per metamer (scratch, by this season's row index): P_b and M_b of the subtree (R1 shedding). */
  pSum = new Float64Array(0);
  mSum = new Float64Array(0);
  /** Path length from the base to each metamer's tip (R1, L_path). */
  pathLen = new Float64Array(0);

  // R3 mechanics (ADR 0011), per metamer by this season's row index.
  /** Radius before this season's girth pass: Δr/r limits posture control. */
  prevRadius = new Float64Array(0);
  /** Weight W carried by each metamer's base and its first moment S (Σ weight·x). */
  loadW = new Float64Array(0);
  loadS = new Float64Array(0);
  /** Bending stress at each metamer's base over σ_target (for the stress colour). */
  stress = new Float64Array(0);

  constructor(id: number, rootX: number) {
    this.id = id;
    this.rootX = rootX;
  }

  ensureScratch(): void {
    const n = this.m.capacity;
    this.qSlot = ensureFloat64(this.qSlot, 3 * n);
    this.vSlot = ensureFloat64(this.vSlot, 3 * n);
    this.scratchF = ensureFloat64(this.scratchF, n);
    this.scratchU = ensureUint8(this.scratchU, Math.max(n, this.b.capacity));
    this.pSum = ensureFloat64(this.pSum, n);
    this.mSum = ensureFloat64(this.mSum, n);
    this.pathLen = ensureFloat64(this.pathLen, n);
    this.prevRadius = ensureFloat64(this.prevRadius, n);
    this.loadW = ensureFloat64(this.loadW, n);
    this.loadS = ensureFloat64(this.loadS, n);
    this.stress = ensureFloat64(this.stress, n);
  }

  tipX(i: number): number {
    const c = this.m.cols;
    return c.baseX[i] + c.length[i] * Math.cos(c.angle[i]);
  }

  tipY(i: number): number {
    const c = this.m.cols;
    return c.baseY[i] + c.length[i] * Math.sin(c.angle[i]);
  }
}
