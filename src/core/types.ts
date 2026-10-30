/**
 * The types and constants the page, the tools and the Rust core share (I1, ADR 0024): the
 * tables' schemas and bud states (rust/core/src/tree.rs mirrors them), the renderer's snapshot,
 * the per-tree metrics and the event log. The simulation itself is the Rust core (rust/core).
 */

import type { Obstacle, Params, ParamsPatch, Wall } from "./params.ts";

type F32 = Float32Array<ArrayBuffer>;
type I32 = Int32Array<ArrayBuffer>;
type U8 = Uint8Array<ArrayBuffer>;

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
  /** Slot at the parent's upper node: 0 the main one, 1 to 7 laterals in phyllotactic order. */
  slot: Uint8Array,
  /** birthId of the first metamer of this metamer's axis. */
  axis: Int32Array,
  /** Position along the axis (0 = first metamer of the axis). Drives the phyllotaxis. */
  axisNode: Int32Array,
  /** Branching order (0 = trunk). */
  order: Uint8Array,
  baseX: Float64Array,
  baseY: Float64Array,
  /** Depth of the base in the slab, cells from the front face (I2). */
  baseZ: Float64Array,
  /** Heading H, a unit vector (y up): the metamer runs from its base along H for its length. */
  hx: Float64Array,
  hy: Float64Array,
  hz: Float64Array,
  /** The frame's reference L ⟂ H, carried by parallel transport; laterals' azimuths start at it. */
  lx: Float64Array,
  ly: Float64Array,
  lz: Float64Array,
  /** A lateral's azimuth round its parent's heading from the parent's L, radians (0 on the main slot). */
  azimuth: Float64Array,
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
   * into the parent's pipe sum, so the pipe radius is `radius − stressWood`.
   */
  stressWood: Float64Array,
  /**
   * Bending moment vector at the base after last season's mechanics pass (R3): the load increment
   * M − M_prev sets this season's sag (Alméras & Fournier 2009).
   */
  mx: Float64Array,
  my: Float64Array,
  mz: Float64Array,
  /**
   * Reiteration (R4): how many levels younger this axis's physiological age is than its order says;
   * pa = min(order − paShift, levels − 1). Inherited by the whole subtree.
   */
  paShift: Uint8Array,
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
  /** Default growth direction H (unit) and its frame's reference L: a lateral's is β from its metamer's. */
  hx: Float64Array,
  hy: Float64Array,
  hz: Float64Array,
  lx: Float64Array,
  ly: Float64Array,
  lz: Float64Array,
  /** A lateral's azimuth round its metamer's heading (where R4's bank puts a bud back). */
  azimuth: Float64Array,
  /** Light exposure Q and optimal direction V from the light model (C2). */
  q: Float64Array,
  vx: Float64Array,
  vy: Float64Array,
  vz: Float64Array,
  /** Resource v delivered this season (C3). */
  v: Float64Array,
} as const;

export interface Snapshot {
  season: number;
  width: number;
  height: number;
  /** The slab's depth D in cells (I2): z0 runs over [0, D), the viewer at z = 0. */
  depth: number;
  /** The world's sides wrap (a ring, M11): a view of the whole world can draw crowns across the seam. */
  periodic: boolean;
  /** The season just run was a storm (M16): the page shows a gale. */
  storm: boolean;
  metamerCount: number;
  /** Row of the parent metamer in this snapshot, -1 for a root. */
  parent: I32;
  /** Base position: used for roots; other rows start at their parent's tip. */
  x0: F32;
  y0: F32;
  /** The segment as drawn in the picture's plane (projected along z): direction and length. */
  angle: F32;
  length: F32;
  radius: F32;
  /** Depth of the base, cells from the front face (I2): draw far (large z) first. */
  z0: F32;
  /** The 3D heading H (unit): its in-plane part foreshortens the shoot's leaves (I3). */
  dirX: F32;
  dirY: F32;
  dirZ: F32;
  tree: I32;
  birthId: I32;
  order: U8;
  /** Light per metamer of the subtree, Q_sum / n_b (colour by light). */
  light: F32;
  /** Resource arriving at the metamer's base this season (colour by v). */
  resource: F32;
  /** Seasons since the metamer formed (colour by age). */
  age: F32;
  /** Bending stress at the base over σ_target (R3; 0 when R3 is off). */
  stress: F32;
  prevIndex: I32;
  /** Rows far to near (z0 descending, row ascending on ties): the order the page draws in (I3). */
  zOrder: I32;
  budCount: number;
  /** Row of the metamer whose upper node holds the bud. */
  budMetamer: I32;
  budState: U8;
  budQ: F32;
  /** Shadow per cell (row-major, row 0 at the ground), or null when C2 is off or not asked for. */
  shadow: F32 | null;
  walls: Wall[];
  /** Obstacles (ADR 0015), for the lab to outline. */
  obstacles: Obstacle[];
  /** Species labels (ADR 0016): common and Latin names and leaf style; trees name theirs in metrics. */
  species: Record<string, { common?: string; latin?: string; leaf?: string }>;
  /** Leonardo exponent Δ at every junction of every live tree (C6 on and asked for), for the histogram. */
  junctions: F32;
  metrics: TreeMetrics[];
  /** Milliseconds the worker spent on the season(s) behind this snapshot. */
  seasonMs: number;
  /** Milliseconds the worker spent building this snapshot (set by the worker; 0 here). */
  snapshotMs: number;
}

/**
 * Optional parts of a snapshot, both for the lab: the junction exponents (Δ histogram chart) and
 * the light field (shade overlay). The home page asks for neither.
 */
export interface SnapshotOptions {
  junctions: boolean;
  field: boolean;
}

export const FULL_SNAPSHOT: SnapshotOptions = { junctions: true, field: true };

export interface TreeMetrics {
  tree: number;
  alive: boolean;
  /** Root position along the ground (O4 recruits land anywhere). */
  rootX: number;
  age: number;
  metamers: number;
  buds: number;
  dormantBuds: number;
  /** Live buds resting as leafy short shoots (R6). */
  shortShoots: number;
  /** Highest tip above the ground. */
  height: number;
  /** Extent of all tips in x (the picture's plane). */
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
  /** Wood volume Σ π r² l over all metamers: the tree's mass for self-thinning (O4, §10). */
  woodVolume: number;
  /** Height over trunk base diameter (slenderness, §10; stand-grown trees ≈ 60–80). */
  slenderness: number;
  /** Metamers shed this season (C5). */
  shed: number;
  /**
   * Mean light on the ground under the crown, as a fraction of open sky (Q/C in the bottom row
   * of cells across the crown's width and depth), from this season's start-of-season field (M6e; a closed
   * stand's floor gets ≈ 2–10%, §10). NaN without a world.
   */
  groundLight: number;
  /** R1 (ADR 0010): production P, sapwood maintenance M, reserve, lifetime reproduction, and
   * seasons in a row with an empty reserve. Zero with R1 off. */
  production: number;
  maintenance: number;
  reserve: number;
  reproduction: number;
  starved: number;
  /** This season: dormant buds that grew a shoot, dormant buds aborted (R4), metamers lost to breakage (R3). */
  /** O2: buds lost to abrasion; O4: seeds made this season. */
  abraded: number;
  seeds: number;
  /** Sown by a visitor on the page (World.plantTree, D3). */
  sown: boolean;
  /** Its species (ADR 0016), "" for the world's own params. */
  species: string;
  /** Crown length over height, (height − bole)/height: the share of the stem in live crown (M19). */
  crownRatio: number;
  /**
   * Mean angle from vertical, degrees, of the first-order branches where they leave the trunk
   * (their first metamer): steep in birch, wide in oak, near flat in a fir's tiers (M19, §10).
   */
  branchAngle: number;
  released: number;
  /** Of those, released from trunk wood at least 10 seasons old: epicormic shoots. */
  epicormic: number;
  aborted: number;
  broken: number;
  /** Root position in depth (I2). */
  rootZ: number;
  /** Extent of all tips in z: the crown's depth (I2). */
  crownDepth: number;
  /** Mean tip z minus root z: positive means the crown leans back, away from the viewer. */
  centroidOffsetZ: number;
  /**
   * The crown's base by leaf area: the height below which 5% of the live buds' leaf area lies
   * (C1 round 3). One low twig sets `boleHeight` but not this.
   */
  leafBase: number;
  /** (height − leafBase)/height: the crown ratio by leaf area. */
  leafCrownRatio: number;
}

export const METRIC_COLUMNS: readonly (keyof TreeMetrics)[] = [
  "tree",
  "alive",
  "species",
  "rootX",
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
  "woodVolume",
  "slenderness",
  "shed",
  "groundLight",
  "production",
  "maintenance",
  "reserve",
  "reproduction",
  "starved",
  "abraded",
  "seeds",
  "crownRatio",
  "branchAngle",
  "released",
  "epicormic",
  "aborted",
  "broken",
  "rootZ",
  "crownDepth",
  "centroidOffsetZ",
  "leafBase",
  "leafCrownRatio",
];

/** A change applied at the start of `season` (before that season runs). */
export type RunEvent =
  | { season: number; type: "params"; patch: ParamsPatch }
  | { season: number; type: "removeTree"; tree: number }
  | { season: number; type: "plantTree"; x: number; species?: string };

/** Everything needed to reproduce a run: initial params plus the event log. */
export interface RunRecord {
  params: Params;
  events: RunEvent[];
  seasons: number;
}
