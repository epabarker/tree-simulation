/**
 * What every renderer shares: the tween between two snapshots, the camera and its fitting,
 * picking, and the per-frame choices of colour and leaf layout. Renderers (Canvas 2D, WebGL2)
 * only turn this into pixels.
 *
 * Each frame rebuilds positions from angles and lengths in one parent-before-child loop,
 * interpolating between the previous and current snapshots, so growth and bending animate rather
 * than jump. Leaves are drawn at young nodes only: a view of the foliage, not part of the light
 * model, where buds cast the shade.
 *
 * Depth (I3; ADR 0024's view): the trees grow in a slab and are drawn orthographically along z, far
 * to near. The snapshot lists its rows far to near (`zOrder`); the scene cuts that order into
 * DEPTH_SLICES slices of the slab's depth, for the wood and for the leaves, and a renderer draws
 * slice by slice, wood then leaves, so nearer crowns cover farther ones. ADR 0008's pseudo-depth
 * (squeezed limbs, two-layer leaf clusters) is gone: the geometry carries real depth.
 */

import type { Snapshot } from "../../core/types.ts";
import { BudState } from "../../core/types.ts";
import { BARK_PALETTES, BARK_STEPS, BARK_STYLES, barkStep, fissureOpen } from "./bark-styles.ts";
import { CATEGORICAL, keepContrast, SEQUENTIAL } from "./colors.ts";
import {
  isLeafStyleName,
  LEAF_PALETTES,
  LEAF_SHAPES,
  LEAF_STYLES,
  type LeafStyle,
  type LeafStyleName,
} from "./leaf-styles.ts";
import { RAMP_STEPS, type Theme } from "./theme.ts";
import { type Wind, windAt } from "./wind.ts";

/** Sway per unit of wind of a metamer as thin as the snapshot's tips, radians (M16). */
const SWAY_GAIN = 0.07;
/** Debris (M16): gravity (cells/s²), a toppling tree's fall time (s), the fade on the ground (s). */
const GRAVITY = 40;
const TOPPLE_S = 1.6;
const FADE_S = 1.6;
const MAX_DEBRIS = 6000;
/** Spacing of the grid the wind is sampled on each frame, cells. */
const WIND_CELL = 8;
/**
 * Seasons (M17): at most this many falling or fallen leaves. They fall in year-time, about 60
 * cells (a canopy's height) in a tenth of a year, so they land before winter at any pace.
 */
const FALLEN_MAX = 1500;
const LEAF_FALL_PER_YEAR = 600;

/** Smooth step from 0 at `a` to 1 at `b`. */
function smooth(a: number, b: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/** A falling piece of wood: segments relative to a pivot, rotating and dropping (M16). */
interface Body {
  /** Segment ends and radius, relative to the pivot: x0, y0, x1, y1, r per segment. */
  segs: Float32Array;
  pivotX: number;
  pivotY: number;
  /** A whole tree topples about its base; a branch falls freely. */
  topple: boolean;
  /** Which way it turns (±1) and how fast a falling branch spins (rad/s). */
  dir: number;
  spin: number;
  born: number;
  /** Once on the ground: when, and the drop and turn it came to rest at. */
  landed: number;
  restY: number;
  restAngle: number;
}

/** Segments of the debris at one moment, for the renderers. */
export interface Debris {
  count: number;
  ax: Float32Array;
  ay: Float32Array;
  bx: Float32Array;
  by: Float32Array;
  r: Float32Array;
  alpha: Float32Array;
}

export type ColorMode = "natural" | "order" | "light" | "resource" | "age" | "tree" | "stress";

export interface ViewOptions {
  colorMode: ColorMode;
  showLeaves: boolean;
  /** Metamers up to this many seasons old carry a leaf. */
  leafAge: number;
  /** How foliage is drawn (leaf-styles.ts); species presets pick one. */
  leafStyle: LeafStyleName;
  showBuds: boolean;
  showShadow: boolean;
  showGhosts: boolean;
  /** Outline obstacles (ADR 0015): the lab shows them; a host page's content covers them. */
  showObstacles?: boolean;
  /**
   * I3's two foliage knobs (plan §2.5, step 4): the cards' opacity (LEAF_OPACITY) and the least
   * length a card draws on screen in CSS pixels (LEAF_MIN_PX). Nothing else thins or hides leaves.
   */
  leafOpacity?: number;
  leafMinPx?: number;
  /**
   * Draw no short-shoot rosettes on a trunk (order 0) below its tree's limb crown base (round 2,
   * off by default). R6 never ends a trunk's short shoots, so a closed stand's boles carry leaf
   * that blind namers read as lime's sprouts, where a beech high forest's boles are clean. A
   * drawing choice: the model still counts that leaf in its light.
   */
  clearBole?: boolean;
  /**
   * Draw every stem at this multiple of its pipe-model radius (round 2, 1 by default). ADR 0027's
   * radii give a stand's trunks about half a real stand's girth (bark-styles.ts), so at one scale a
   * 35 m beech draws at H/D ≈ 105 against a real stand's ≈ 73 (Štefančík 2017). A drawing choice,
   * as a drawn leaf stands for a spray: the model's girth and bark ramp are unchanged.
   */
  girth?: number;
  /**
   * The backdrop beyond a closed stand (round 3, off by default): at each height the sky is drawn
   * toward `--interior` by `interiorDepth`, so where the wood is closed across its whole width its
   * dim interior shows between the boles, as from inside a high forest, and a lone tree in a field
   * keeps its sky. Needs the snapshot's field (the lab's has it; the garden asks for it with this).
   */
  interior?: boolean;
  /**
   * Bark by light (round 2, off by default): wood draws at 1 − barkLight × shade of its colour's
   * luminance, the shade the light field gives the cell at the metamer's base (`Scene.woodLight`), so
   * a bole under a closed canopy reads darker than a sunlit limb. WebGL2 only, and only where the
   * snapshot carries the field (the lab's does; the garden asks for none).
   */
  barkLight?: number;
  /**
   * The least ΔL* (CIE) wood keeps below a light sky (round 2's judging; WOOD_CONTRAST by default,
   * 0 for the colours as the tokens give them): a paler bark draws darkened to that floor
   * (`keepContrast`). Only pale wood moves, birch's white: every other bark is already darker.
   */
  woodContrast?: number;
}

export interface Camera {
  /** World point at the centre of the canvas, and CSS pixels per world unit. */
  cx: number;
  cy: number;
  scale: number;
}

export interface Geometry {
  baseX: Float32Array;
  baseY: Float32Array;
  tipX: Float32Array;
  tipY: Float32Array;
  radius: Float32Array;
  /** Radius at the tip: the radius of the thickest child, so stems taper smoothly. */
  tipRadius: Float32Array;
  /** Drawn length over final length: 0 → 1 as a new metamer grows in. */
  grown: Float32Array;
}

/**
 * Leaves to draw this frame: base point, unit direction, size (0 → 1 as a leaf unfolds or falls)
 * and palette index. The drawn length is `leafLength(scale) · size`; the zoom-dependent minimum
 * is applied at draw time, so these arrays do not change when only the camera moves. The crowns'
 * leaves come far to near: depth slice i holds leaves [slices[i], slices[i + 1]); a leaf of size 0
 * is not drawn this frame. Leaves from slices[DEPTH_SLICES] to `count` are falling or fallen, drawn
 * after everything.
 */
export interface Leaves {
  count: number;
  slices: Int32Array;
  x: Float32Array;
  y: Float32Array;
  ux: Float32Array;
  uy: Float32Array;
  size: Float32Array;
  color: Uint8Array;
  /** How far each leaf has turned to autumn colour, 0 → 1 (M17). */
  turn: Float32Array;
  /** Its species' palette, an index into LEAF_PALETTES (M19: each tree is drawn as its species). */
  palette: Uint8Array;
  /** Its species' outline, an index into LEAF_SHAPES, and width over length (M23). */
  shape: Uint8Array;
  aspect: Float32Array;
}

/** Ground sits this many CSS pixels above the bottom edge when the view is fitted. */
const GROUND_MARGIN = 18;
/** Room kept free above the crowns for the lab's title and hint, CSS pixels. */
const HEADER_MARGIN = 52;
/** Time constant of the camera's easing toward its fitted target, ms. */
const CAMERA_EASE_MS = 380;
/** Default (broadleaf) leaf length in world units (one unit = one internode), and width over length. */
export const LEAF_LENGTH = LEAF_STYLES.broadleaf.length;
export const LEAF_ASPECT = LEAF_STYLES.broadleaf.aspect;
/** Leaves never draw shorter than this on screen, so zoomed-out crowns still read as foliage. */
export const LEAF_MIN_PX = 3.5;
/** A leaf card's opacity: overlapping cards build up depth, and a single card lets a little through. */
export const LEAF_OPACITY = 0.92;
/**
 * The least ΔL* (CIE) wood keeps below a light sky's lower, palest tone (`ViewOptions.woodContrast`).
 * Birch's white (L* 91) drew 3 below the sky (L* 95) and vanished in a stand; at 18 it draws a light
 * grey (L* 77), as a white stem against a bright sky looks.
 */
export const WOOD_CONTRAST = 18;

/**
 * The backdrop beyond a closed stand (`ViewOptions.interior`). A row of the world is as closed as
 * the light on its brightest INTERIOR_QUANTILE (the field's Q/C there): fully closed at or below
 * INTERIOR_CLOSED, the top of a closed stand's floor light (2–10% of open sky, spec §10), open from
 * INTERIOR_OPEN, twice that. The quantile, not the mean: where any tenth of the wood is open at a
 * height, the view beyond the slab is open there too, so a lone tree's own shade never counts.
 */
export const INTERIOR_QUANTILE = 0.1;
export const INTERIOR_CLOSED = 0.1;
export const INTERIOR_OPEN = 0.2;

/**
 * How closed each row of the world is, 0 (open) → 1 (a closed wood's interior), row 0 at the
 * ground, from the snapshot's field (`shadow`, 1 − Q/C over the slab's depth, row-major).
 */
export function interiorDepth(field: Float32Array, width: number): Float32Array {
  const height = Math.floor(field.length / width);
  const out = new Float32Array(height);
  const row = new Float32Array(width);
  const at = Math.min(width - 1, Math.floor(INTERIOR_QUANTILE * width));
  for (let y = 0; y < height; y++) {
    row.set(field.subarray(y * width, (y + 1) * width));
    row.sort();
    const light = 1 - Math.min(1, Math.max(0, row[at] as number));
    const u = (INTERIOR_OPEN - light) / (INTERIOR_OPEN - INTERIOR_CLOSED);
    out[y] = Math.min(1, Math.max(0, u));
  }
  return out;
}

/** Length of a full-size leaf of `length` world units at `scale` CSS pixels per world unit. */
export function leafLength(
  scale: number,
  length: number = LEAF_LENGTH,
  minPx: number = LEAF_MIN_PX,
): number {
  return Math.max(length, minPx / scale);
}
/**
 * Slices of the slab's depth the picture is drawn in, far to near (I3). Within a slice wood draws
 * before leaves, so a slice's own leaves sit over its wood; one cell of a 64-cell slab per slice.
 * Canvas 2D draws them CANVAS_SLICE_STEP at a time.
 */
export const DEPTH_SLICES = 64;
export const CANVAS_SLICE_STEP = 8;
/** Size of a short-shoot rosette's leaves relative to a long shoot's (R6). */
const ROSETTE_SIZE = 0.8;

/** `g` if it holds at least `n` rows (its contents are overwritten), else a new, larger one. */
function geometryFor(g: Geometry, n: number): Geometry {
  return g.baseX.length >= n ? g : emptyGeometry(Math.max(n, 2 * g.baseX.length));
}

function emptyGeometry(n: number): Geometry {
  return {
    baseX: new Float32Array(n),
    baseY: new Float32Array(n),
    tipX: new Float32Array(n),
    tipY: new Float32Array(n),
    radius: new Float32Array(n),
    tipRadius: new Float32Array(n),
    grown: new Float32Array(n),
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

/** A small, stable per-metamer variation in {-1, 0, 1}, so neighbouring leaves differ a little. */
function jitter(tree: number, birthId: number): number {
  return ((Math.imul(birthId ^ (tree << 20), 0x9e3779b1) >>> 0) % 3) - 1;
}

/** A stable value in [0, 1) per (tree, birthId, salt): the page's own variation, never the model's. */
function hash01(tree: number, birthId: number, salt: number): number {
  let h = Math.imul(birthId ^ (tree << 20) ^ (salt << 27), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** The depth slice of z in a slab of depth `depth`: 0 at the back face, DEPTH_SLICES − 1 at the front. */
export function depthSlice(z: number, depth: number): number {
  const k = Math.floor((z / depth) * DEPTH_SLICES);
  return DEPTH_SLICES - 1 - Math.min(DEPTH_SLICES - 1, Math.max(0, k));
}

export class Scene {
  readonly camera: Camera = { cx: 0, cy: 0, scale: 1 };
  prev: Snapshot | null = null;
  next: Snapshot | null = null;
  geom: Geometry = emptyGeometry(0);
  prevGeom: Geometry = emptyGeometry(0);
  /** Rows of the previous snapshot that nothing maps to: shed branches, drawn as fading ghosts. */
  ghosts: Uint8Array = new Uint8Array(0);
  /** Canvas size in CSS pixels, and device pixels per CSS pixel. */
  width = 1;
  height = 1;
  dpr = 1;
  /** Foliage style; renderers copy `LEAF_STYLES[ViewOptions.leafStyle]` here. */
  leafStyle: LeafStyle = LEAF_STYLES.broadleaf;
  /** No rosettes on a trunk below its limb crown base; renderers copy `ViewOptions.clearBole`. */
  clearBole = false;
  /** Drawn radius over the model's; renderers copy `ViewOptions.girth`. */
  girth = 1;
  /** The backdrop beyond a closed stand; renderers copy `ViewOptions.interior`. */
  interior = false;
  private interiorFor: Snapshot | null = null;
  private interiorRows: Float32Array | null = null;
  /** How far shade darkens wood (0: not at all); renderers copy `ViewOptions.barkLight`. */
  barkLight = 0;
  /** The least ΔL* wood keeps below a light sky; renderers copy `ViewOptions.woodContrast`. */
  woodContrast = WOOD_CONTRAST;
  private woodLightFor = { s: null as Snapshot | null, k: 0 };
  private woodLightOf = new Float32Array(0);
  /**
   * What `fit` frames. "trees": the trees and the ground beneath them (the lab). "world": the
   * world's whole width, easing out only once crowns outgrow half its height (the home page); on
   * a ring the crowns are then drawn across the seam as well. "height": one scale for every
   * plate of a world this tall, the "world" frame with its tallest crown at the world's top,
   * centred on the world and never fitted to the trees, so a tree's drawn size is its height
   * (round 2's blind test: a fitted plate draws a 25 m oak as large as a 6 m hawthorn).
   */
  frame: "trees" | "world" | "tree" | "height" = "trees";
  /**
   * The least height in cells the "world" frame shows (the garden's half plate, I3); 0: half the
   * world's height. Under the woods' 200-cell top, half the world framed a young garden for 100.
   */
  frameHeight = 0;
  /** The tree the "tree" frame fits: one specimen and the ground beneath it (D3). */
  focusTree = -1;
  /** Draw only this tree, as a botanical plate draws one specimen (-1: every tree). */
  solo = -1;
  /** Wind (M16): set by the garden; null keeps the trees still. `time` is its clock, seconds. */
  wind: Wind | null = null;
  time = 0;
  /** Shed and felled wood falls (M16); off, it fades where it was (the ghosts). */
  physics = false;
  /**
   * Seasons (M17): show the visual year τ ∈ [0, 1), set by the garden. Spring 0–0.25 (deciduous
   * leaves flush), summer to ≈ 0.52, autumn to ≈ 0.85 (they turn, shaded ones first, and fall),
   * winter after (bare). Evergreen foliage stays. Off: always summer.
   */
  seasons = false;
  tau = 0.35;
  private lastTau = 0.35;
  private lastTime = 0;
  /** Leaves falling and lying on the ground (M17), drawn after the crowns. */
  private fallen = {
    count: 0,
    x: new Float32Array(FALLEN_MAX),
    y: new Float32Array(FALLEN_MAX),
    ux: new Float32Array(FALLEN_MAX),
    uy: new Float32Array(FALLEN_MAX),
    size: new Float32Array(FALLEN_MAX),
    color: new Uint8Array(FALLEN_MAX),
    palette: new Uint8Array(FALLEN_MAX),
    shape: new Uint8Array(FALLEN_MAX),
    aspect: new Float32Array(FALLEN_MAX),
    phase: new Float32Array(FALLEN_MAX),
    landed: new Uint8Array(FALLEN_MAX),
  };
  /** Compliance per metamer (once per snapshot) and the sway accumulated down each path. */
  private swayC = new Float32Array(0);
  private swayFor: Snapshot | null = null;
  private swayAcc = new Float32Array(0);
  /** The wind sampled once a frame on a coarse grid, and read bilinearly per metamer. */
  private windGrid = { values: new Float32Array(0), x0: 0, nx: 0, ny: 0, time: Number.NaN };
  private bodies: Body[] = [];
  private debrisOut: Debris = {
    count: 0,
    ax: new Float32Array(0),
    ay: new Float32Array(0),
    bx: new Float32Array(0),
    by: new Float32Array(0),
    r: new Float32Array(0),
    alpha: new Float32Array(0),
  };
  /** CSS pixels kept free above the crowns when fitting. */
  headroom = HEADER_MARGIN;
  private colors = new Uint16Array(0);
  private colorsFor = {
    s: null as Snapshot | null,
    mode: "",
    steps: 0,
    style: null as LeafStyle | null,
  };
  /**
   * Which leaves this snapshot carries, and everything about them that does not move during a
   * tween (M15): the metamer each sits on, its direction as a fixed rotation (a, b) of that
   * shoot's direction, a size scale and a colour. Rosettes keep a constant size; shoot leaves
   * grow in and fade with their metamer. The layout is in row order (its reads of the snapshot run
   * in order); `at` is each leaf's place in the frame's far-to-near list, by one counting sort on
   * its depth slice, and `slices` where each slice starts there (I3).
   */
  private layout = {
    for: null as Snapshot | null,
    leafAge: -1,
    style: null as LeafStyle | null,
    clearBole: false,
    count: 0,
    slice: new Uint8Array(0),
    at: new Int32Array(0),
    slices: new Int32Array(DEPTH_SLICES + 1),
    metamer: new Int32Array(0),
    a: new Float32Array(0),
    b: new Float32Array(0),
    scale: new Float32Array(0),
    color: new Uint8Array(0),
    rosette: new Uint8Array(0),
    /** The style each leaf is drawn in (an index into `styles`), and whether it stays on in winter. */
    kind: new Uint8Array(0),
    keep: new Uint8Array(0),
    /**
     * Clumping (LeafClump): the metamer whose tip the card is drawn toward, the share of the way it
     * goes, and the share of its own metamer it sits back from the tip.
     */
    end: new Int32Array(0),
    pull: new Float32Array(0),
    back: new Float32Array(0),
    styles: [] as LeafStyle[],
  };
  private leafList: Leaves = {
    count: 0,
    slices: new Int32Array(DEPTH_SLICES + 1),
    x: new Float32Array(0),
    y: new Float32Array(0),
    ux: new Float32Array(0),
    uy: new Float32Array(0),
    size: new Float32Array(0),
    color: new Uint8Array(0),
    turn: new Float32Array(0),
    palette: new Uint8Array(0),
    shape: new Uint8Array(0),
    aspect: new Float32Array(0),
  };
  /** Where the fitted view wants the camera; the ground line stays pinned while it eases. */
  private target: { cx: number; scale: number } | null = null;

  /** Makes `s` the tween target; the current target becomes the tween origin. */
  setSnapshot(s: Snapshot): void {
    // Two geometries take turns: the outgoing target becomes the tween origin, and the old
    // origin's arrays are reused for the new target (every row is rewritten).
    let spare = this.geom;
    if (this.next) {
      this.computeGeometry(1);
      spare = this.prevGeom;
      this.prevGeom = this.geom;
    }
    this.prev = this.next;
    this.next = s;
    this.geom = geometryFor(spare, s.metamerCount);
    const m = this.prev ? this.prev.metamerCount : 0;
    if (this.ghosts.length < m) this.ghosts = new Uint8Array(2 * m);
    this.ghosts.fill(1, 0, m);
    for (let j = 0; j < s.metamerCount; j++) {
      const p = s.prevIndex[j];
      if (p >= 0) this.ghosts[p] = 0;
    }
    if (this.physics && this.prev) this.dropDebris(this.prev, m);
  }

  /** True while something moves without a tween: wind, or wood still falling. */
  animating(): boolean {
    return this.wind !== null || this.bodies.length > 0 || this.seasons;
  }

  /**
   * Turns the wood that vanished between two snapshots into falling bodies: each connected piece
   * of ghost rows is one body. A piece with a trunk base topples about it; any other falls.
   */
  private dropDebris(prev: Snapshot, m: number): void {
    const g = this.prevGeom;
    const group = new Int32Array(m).fill(-1);
    const members: number[][] = [];
    for (let j = 0; j < m; j++) {
      if (!this.ghosts[j]) continue;
      const p = prev.parent[j] as number;
      if (p >= 0 && group[p] >= 0) {
        group[j] = group[p] as number;
        (members[group[j] as number] as number[]).push(j);
      } else {
        group[j] = members.length;
        members.push([j]);
      }
    }
    let total = this.bodies.reduce((n, b) => n + b.segs.length / 5, 0);
    for (const rows of members) {
      const first = rows[0] as number;
      const topple = (prev.parent[first] as number) < 0;
      let px = g.baseX[first] as number;
      let py = g.baseY[first] as number;
      if (!topple) {
        px = 0;
        py = 0;
        for (const j of rows) {
          px += 0.5 * ((g.baseX[j] as number) + (g.tipX[j] as number));
          py += 0.5 * ((g.baseY[j] as number) + (g.tipY[j] as number));
        }
        px /= rows.length;
        py /= rows.length;
      }
      const segs = new Float32Array(5 * rows.length);
      let lean = 0;
      rows.forEach((j, k) => {
        segs[5 * k] = (g.baseX[j] as number) - px;
        segs[5 * k + 1] = (g.baseY[j] as number) - py;
        segs[5 * k + 2] = (g.tipX[j] as number) - px;
        segs[5 * k + 3] = (g.tipY[j] as number) - py;
        segs[5 * k + 4] = g.radius[j] as number;
        lean += segs[5 * k + 2] as number;
      });
      const h = hash01(prev.tree[first] as number, prev.birthId[first] as number, 3);
      const dir = Math.abs(lean) > 1e-3 ? -Math.sign(lean) : h < 0.5 ? 1 : -1;
      this.bodies.push({
        segs,
        pivotX: px,
        pivotY: py,
        topple,
        dir,
        spin: (h - 0.5) * 2.4,
        born: this.time,
        landed: -1,
        restY: 0,
        restAngle: 0,
      });
      total += rows.length;
    }
    // Keep the debris bounded: the oldest pieces go first.
    while (total > MAX_DEBRIS && this.bodies.length > 0) {
      total -= (this.bodies.shift() as Body).segs.length / 5;
    }
  }

  /** The debris at `time`: positions, radii and opacity of every falling segment. */
  debris(): Debris {
    const out = this.debrisOut;
    const t = this.time;
    this.bodies = this.bodies.filter((b) => b.landed < 0 || t - b.landed < FADE_S);
    const n = this.bodies.reduce((k, b) => k + b.segs.length / 5, 0);
    if (out.ax.length < n) {
      const cap = 2 * n;
      out.ax = new Float32Array(cap);
      out.ay = new Float32Array(cap);
      out.bx = new Float32Array(cap);
      out.by = new Float32Array(cap);
      out.r = new Float32Array(cap);
      out.alpha = new Float32Array(cap);
    }
    let k = 0;
    for (const b of this.bodies) {
      const age = t - b.born;
      let angle: number;
      let drop: number;
      if (b.landed >= 0) {
        angle = b.restAngle;
        drop = b.restY;
      } else if (b.topple) {
        // A felled tree tips slowly, then fast: θ grows with the square of time until it lies down.
        const u = Math.min(1, age / TOPPLE_S);
        angle = (b.dir * Math.PI * u * u) / 2;
        drop = 0;
        if (u >= 1) b.landed = t;
      } else {
        angle = b.spin * age;
        drop = 0.5 * GRAVITY * age * age;
      }
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let low = Number.POSITIVE_INFINITY;
      const start = k;
      for (let i = 0; i < b.segs.length; i += 5) {
        const x0 = b.segs[i] as number;
        const y0 = b.segs[i + 1] as number;
        const x1 = b.segs[i + 2] as number;
        const y1 = b.segs[i + 3] as number;
        out.ax[k] = b.pivotX + x0 * cos - y0 * sin;
        out.ay[k] = b.pivotY - drop + x0 * sin + y0 * cos;
        out.bx[k] = b.pivotX + x1 * cos - y1 * sin;
        out.by[k] = b.pivotY - drop + x1 * sin + y1 * cos;
        out.r[k] = b.segs[i + 4] as number;
        low = Math.min(low, out.ay[k] as number, out.by[k] as number);
        k++;
      }
      // A falling branch lands when its lowest point reaches the ground: lift it onto it and stop.
      if (!b.topple && b.landed < 0 && low <= 0) {
        b.landed = t;
        b.restAngle = angle;
        b.restY = drop + low;
        for (let i = start; i < k; i++) {
          out.ay[i] = (out.ay[i] as number) - low;
          out.by[i] = (out.by[i] as number) - low;
        }
      }
      const alpha = b.landed >= 0 ? Math.max(0, 1 - (t - b.landed) / FADE_S) : 1;
      out.alpha.fill(alpha, start, k);
    }
    out.count = k;
    return out;
  }

  /** Drops the tween origin, so the next draw shows the current snapshot without animation. */
  clearHistory(): void {
    this.prev = null;
    this.ghosts = new Uint8Array(0);
  }

  setSize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = dpr;
    if (this.target) this.pinGround();
  }

  /** Screen y (CSS pixels) of the ground line, world y = 0. */
  groundY(): number {
    return this.height / 2 + this.camera.cy * this.camera.scale;
  }

  /**
   * Fits the trees and the ground beneath them in view. With `snap` the camera jumps there;
   * otherwise `animateCamera` eases toward it.
   */
  fit(snap = false): void {
    const s = this.next;
    if (!s) return;
    this.computeGeometry(1);
    const g = this.geom;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = 0;
    const only = this.frame === "tree" ? this.focusTree : -1;
    for (let j = 0; j < s.metamerCount; j++) {
      if (only >= 0 && s.tree[j] !== only) continue;
      minX = Math.min(minX, g.baseX[j], g.tipX[j]);
      maxX = Math.max(maxX, g.baseX[j], g.tipX[j]);
      maxY = Math.max(maxY, g.baseY[j], g.tipY[j]);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      maxX = s.width;
    }
    const minSpan = 16;
    let cx = (minX + maxX) / 2;
    let spanX = Math.max(minSpan, (maxX - minX) * 1.15 + 2 * LEAF_LENGTH);
    let spanY = Math.max(minSpan, maxY * 1.12 + LEAF_LENGTH);
    if (this.frame === "world") {
      cx = s.width / 2;
      spanX = s.width;
      spanY = Math.max(this.frameHeight || 0.5 * s.height, maxY * 1.05 + LEAF_LENGTH);
    } else if (this.frame === "height") {
      cx = s.width / 2;
      spanY = s.height * 1.05 + LEAF_LENGTH;
    } else if (this.frame === "trees" && s.periodic) {
      // A ring has no edge to frame: show one lap, the crowns that cross the seam drawn at both
      // sides (wrapOffsets), as the garden does (M26; the lab drew them past the world's end).
      cx = s.width / 2;
      spanX = s.width;
    }
    const fitH = Math.max(1, this.height - GROUND_MARGIN - this.headroom);
    const first = this.target === null;
    // "height" ignores the width, so a world wider than the plate is cut at its sides.
    const scale = fitH / spanY;
    this.target = {
      cx,
      scale: this.frame === "height" ? scale : Math.min(this.width / spanX, scale),
    };
    if (snap || first) {
      this.camera.cx = this.target.cx;
      this.camera.scale = this.target.scale;
      this.pinGround();
    }
  }

  /** Eases the camera toward the fitted target. Returns true while it is still moving. */
  animateCamera(dtMs: number): boolean {
    const t = this.target;
    if (!t) return false;
    const k = 1 - Math.exp(-dtMs / CAMERA_EASE_MS);
    const cam = this.camera;
    cam.cx += (t.cx - cam.cx) * k;
    cam.scale = Math.exp(Math.log(cam.scale) + (Math.log(t.scale) - Math.log(cam.scale)) * k);
    this.pinGround();
    return (
      Math.abs(t.cx - cam.cx) * cam.scale > 0.3 ||
      Math.abs(t.scale / cam.scale - 1) * this.width > 0.3
    );
  }

  /** Keeps the ground line GROUND_MARGIN pixels above the bottom edge at the current scale. */
  private pinGround(): void {
    this.camera.cy = (this.height / 2 - GROUND_MARGIN) / this.camera.scale;
  }

  /**
   * World-x offsets at which to draw the trees: on a ring framed whole ("world", or the lab's
   * "trees"), one copy either side as well, so crowns that grew across the seam show at both edges.
   */
  wrapOffsets(): number[] {
    const s = this.next;
    return s?.periodic && this.frame !== "tree" ? [-s.width, 0, s.width] : [0];
  }

  /** Canvas pixels of a world point (the inverse of `screenToWorld`). */
  worldToScreen(x: number, y: number): [number, number] {
    return [
      (x - this.camera.cx) * this.camera.scale + this.width / 2,
      this.height / 2 - (y - this.camera.cy) * this.camera.scale,
    ];
  }

  /**
   * Each live tree's crown top and trunk base in canvas pixels, at the last drawn frame, for a
   * host to pin labels to (D3). On a ring the copy nearest the middle of the view is used.
   */
  anchors(): { tree: number; x: number; y: number; baseX: number; baseY: number }[] {
    const s = this.next;
    if (!s) return [];
    const g = this.geom;
    const top = new Map<number, number>();
    const root = new Map<number, number>();
    for (let j = 0; j < s.metamerCount; j++) {
      const t = s.tree[j] as number;
      if (s.parent[j] < 0) root.set(t, j);
      const k = top.get(t);
      if (k === undefined || g.tipY[j] > g.tipY[k]) top.set(t, j);
    }
    const offsets = this.wrapOffsets();
    const out: { tree: number; x: number; y: number; baseX: number; baseY: number }[] = [];
    for (const [tree, j] of top) {
      const r = root.get(tree) ?? j;
      let best = offsets[0] as number;
      for (const o of offsets) {
        const [sx] = this.worldToScreen(g.baseX[r] + o, 0);
        const [bx] = this.worldToScreen(g.baseX[r] + best, 0);
        if (Math.abs(sx - this.width / 2) < Math.abs(bx - this.width / 2)) best = o;
      }
      const [x, y] = this.worldToScreen(g.tipX[j] + best, g.tipY[j]);
      const [baseX, baseY] = this.worldToScreen(g.baseX[r] + best, g.baseY[r]);
      out.push({ tree, x, y, baseX, baseY });
    }
    return out;
  }

  screenToWorld(px: number, py: number): [number, number] {
    return [
      (px - this.width / 2) / this.camera.scale + this.camera.cx,
      (this.height / 2 - py) / this.camera.scale + this.camera.cy,
    ];
  }

  /** The tree whose nearest branch passes within `maxPx` screen pixels of a world point, or null. */
  pickTree(x: number, wy: number, maxPx = 14): number | null {
    const s = this.next;
    if (!s) return null;
    const g = this.geom;
    let best = (maxPx / this.camera.scale) ** 2;
    let tree: number | null = null;
    for (const offset of this.wrapOffsets()) {
      const wx = x - offset;
      for (let j = 0; j < s.metamerCount; j++) {
        if (this.solo >= 0 && s.tree[j] !== this.solo) continue; // only the drawn specimen
        const ax = g.baseX[j];
        const ay = g.baseY[j];
        const dx = g.tipX[j] - ax;
        const dy = g.tipY[j] - ay;
        const len2 = dx * dx + dy * dy;
        const u = len2 > 0 ? Math.max(0, Math.min(1, ((wx - ax) * dx + (wy - ay) * dy) / len2)) : 0;
        const ex = ax + u * dx - wx;
        const ey = ay + u * dy - wy;
        const d2 = Math.max(0, Math.hypot(ex, ey) - g.radius[j]) ** 2;
        if (d2 < best) {
          best = d2;
          tree = s.tree[j];
        }
      }
    }
    return tree;
  }

  /** Positions at tween time t ∈ [0, 1]: lengths, angles and radii interpolate; new rows grow from zero. */
  computeGeometry(t: number): void {
    const s = this.next;
    if (!s) return;
    const g = this.geom;
    const prev = this.prev;
    const wind = this.wind;
    if (wind) {
      this.compliance(s);
      this.sampleWind(s);
    }
    const swayC = this.swayC;
    const swayAcc = this.swayAcc;
    for (let j = 0; j < s.metamerCount; j++) {
      const p = s.parent[j];
      const pi = prev ? s.prevIndex[j] : -1;
      let len: number;
      let ang: number;
      let r: number;
      if (prev && pi >= 0) {
        len = prev.length[pi] + (s.length[j] - prev.length[pi]) * t;
        ang = lerpAngle(prev.angle[pi], s.angle[j], t);
        r = prev.radius[pi] + (s.radius[j] - prev.radius[pi]) * t;
        g.grown[j] = 1;
      } else {
        const f = prev ? t : 1;
        len = s.length[j] * f;
        ang = s.angle[j];
        r = s.radius[j] * f;
        g.grown[j] = f;
      }
      const bx = p >= 0 ? g.tipX[p] : s.x0[j];
      const by = p >= 0 ? g.tipY[p] : s.y0[j];
      g.baseX[j] = bx;
      g.baseY[j] = by;
      if (wind) {
        // Sway (M16): each metamer bends with the wind where it stands, and carries its parent's
        // bend, so a crown moves as a whole while its twigs move most. Wind toward +x turns clockwise.
        const a =
          (p >= 0 ? (swayAcc[p] as number) : 0) + (swayC[j] as number) * this.windHere(bx, by);
        swayAcc[j] = a;
        ang -= a;
      }
      g.tipX[j] = bx + len * Math.cos(ang);
      g.tipY[j] = by + len * Math.sin(ang);
      g.radius[j] = r * this.girth;
    }
    // Taper each metamer toward its thickest child, so the stem flows into whichever branch
    // dominates the junction (in decurrent crowns that is often a lateral, not the continuation).
    const n = s.metamerCount;
    g.tipRadius.fill(0, 0, n);
    for (let j = 0; j < n; j++) {
      const p = s.parent[j];
      if (p >= 0 && g.radius[j] > g.tipRadius[p]) g.tipRadius[p] = g.radius[j];
    }
    for (let j = 0; j < n; j++) {
      g.tipRadius[j] = g.tipRadius[j] > 0 ? Math.min(g.radius[j], g.tipRadius[j]) : g.radius[j];
    }
  }

  /**
   * Samples the wind every WIND_CELL cells over the world (and half a width beyond each side, where
   * crowns can grow on a ring) at this frame's time. The wind varies over tens of cells, so this
   * costs a few thousand evaluations a frame instead of one per metamer.
   */
  private sampleWind(s: Snapshot): void {
    const grid = this.windGrid;
    const wind = this.wind;
    if (!wind || grid.time === this.time) return;
    const x0 = -0.5 * s.width;
    const nx = Math.ceil((2 * s.width) / WIND_CELL) + 2;
    const ny = Math.ceil(s.height / WIND_CELL) + 2;
    if (grid.values.length < nx * ny) grid.values = new Float32Array(nx * ny);
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        grid.values[iy * nx + ix] = windAt(wind, x0 + ix * WIND_CELL, iy * WIND_CELL, this.time);
      }
    }
    grid.x0 = x0;
    grid.nx = nx;
    grid.ny = ny;
    grid.time = this.time;
  }

  /** The sampled wind at (x, y), bilinear between grid points (clamped at the grid's edge). */
  private windHere(x: number, y: number): number {
    const { values, x0, nx, ny } = this.windGrid;
    const fx = Math.min(nx - 1.001, Math.max(0, (x - x0) / WIND_CELL));
    const fy = Math.min(ny - 1.001, Math.max(0, y / WIND_CELL));
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const u = fx - ix;
    const v = fy - iy;
    const k = iy * nx + ix;
    const top = (values[k] as number) * (1 - u) + (values[k + 1] as number) * u;
    const bottom = (values[k + nx] as number) * (1 - u) + (values[k + nx + 1] as number) * u;
    return top * (1 - v) + bottom * v;
  }

  /**
   * How readily each metamer sways, once per snapshot: SWAY_GAIN/(r/r_tip)², so a twig bends and
   * a trunk, whose pipe-model radius sums every tip above it, hardly moves.
   */
  private compliance(s: Snapshot): void {
    if (this.swayFor === s) return;
    const n = s.metamerCount;
    if (this.swayC.length < n) {
      this.swayC = new Float32Array(2 * n);
      this.swayAcc = new Float32Array(2 * n);
    }
    let rTip = Number.POSITIVE_INFINITY;
    for (let j = 0; j < n; j++)
      if ((s.radius[j] as number) > 0) rTip = Math.min(rTip, s.radius[j] as number);
    for (let j = 0; j < n; j++) {
      const ratio = Math.max(1, (s.radius[j] as number) / rTip);
      this.swayC[j] = SWAY_GAIN / (ratio * ratio);
    }
    this.swayFor = s;
  }

  private orderFor: Snapshot | null = null;
  private order: Int32Array<ArrayBufferLike> = new Int32Array(0);
  private woodSliceStarts = new Int32Array(DEPTH_SLICES + 1);

  /**
   * The snapshot's metamers far to near (z0 descending, row ascending on ties; the viewer faces
   * z = 0): the order the wood is drawn in (I3). The core sorts it (`zOrder`); a snapshot without
   * one (a test's, built by hand) is sorted here.
   */
  drawOrder(s: Snapshot): Int32Array<ArrayBufferLike> {
    if (this.orderFor !== s) {
      const n = s.metamerCount;
      let order: Int32Array<ArrayBufferLike>;
      if (s.zOrder && s.zOrder.length === n) {
        order = s.zOrder;
      } else {
        order = Int32Array.from({ length: n }, (_, j) => j);
        const z = s.z0;
        order.sort((a, b) => (z[b] as number) - (z[a] as number) || a - b);
      }
      // Depth slice i holds the wood order[starts[i]] … order[starts[i + 1] − 1].
      const starts = this.woodSliceStarts;
      let k = 0;
      for (let i = 0; i < DEPTH_SLICES; i++) {
        starts[i] = k;
        while (k < n && depthSlice(s.z0[order[k] as number] as number, s.depth) === i) k++;
      }
      starts[DEPTH_SLICES] = n;
      this.order = order;
      this.orderFor = s;
    }
    return this.order;
  }

  /** Where each depth slice's wood starts in `drawOrder(s)`; the last entry is the metamer count. */
  woodSlices(s: Snapshot): Int32Array {
    this.drawOrder(s);
    return this.woodSliceStarts;
  }

  /** The palette a colour mode draws with. */
  palette(mode: ColorMode, theme: Theme): string[] {
    if (mode === "natural") {
      // The view's ramp, then each species' (bark-styles.ts): `colorIndices` points into both.
      // Each kept at least `woodContrast` below the sky's palest tone, where wood stands.
      if (this.naturalFor !== theme || this.naturalContrast !== this.woodContrast) {
        const dL = this.woodContrast;
        this.natural = [...theme.bark, ...BARK_PALETTES.flatMap((p) => theme.barkBy[p])].map((c) =>
          keepContrast(c, theme.skyBottom, dL),
        );
        this.naturalFor = theme;
        this.naturalContrast = dL;
      }
      return this.natural;
    }
    if (mode === "light" || mode === "resource" || mode === "age" || mode === "stress") {
      return SEQUENTIAL;
    }
    return CATEGORICAL;
  }

  private natural: string[] = [];
  private naturalFor: Theme | null = null;
  private naturalContrast = 0;

  /**
   * Each tree's drawing style (M19: each tree is drawn as its species): `styles[kindOf[tree]]`,
   * the style its species names, else the view's (`styles[0]`). Once per snapshot and view style.
   */
  treeStyles(s: Snapshot): { styles: LeafStyle[]; kindOf: Uint8Array } {
    const c = this.stylesFor;
    if (c.s === s && c.style === this.leafStyle) return c;
    const style = this.leafStyle;
    const styles: LeafStyle[] = [style];
    let maxTree = 0;
    for (const m of s.metrics) maxTree = Math.max(maxTree, m.tree);
    const n = s.metamerCount;
    if (n > 0) maxTree = Math.max(maxTree, s.tree[n - 1] as number); // rows come in tree-id order
    const kindOf = new Uint8Array(maxTree + 1);
    for (const m of s.metrics) {
      const name = m.species ? s.species[m.species]?.leaf : undefined;
      const own: LeafStyle = name && isLeafStyleName(name) ? LEAF_STYLES[name] : style;
      let kind = styles.indexOf(own);
      if (kind < 0) kind = styles.push(own) - 1;
      kindOf[m.tree] = kind;
    }
    this.stylesFor = { s, style, styles, kindOf };
    return this.stylesFor;
  }
  private stylesFor = {
    s: null as Snapshot | null,
    style: null as LeafStyle | null,
    styles: [] as LeafStyle[],
    kindOf: new Uint8Array(0),
  };

  /**
   * The bark texture of every metamer in the natural view, four bytes each: fissure depth, birch's
   * marks, pine's plates (0–255, bark-styles.ts), and 0. Filled by `colorIndices("natural")`; zero
   * for trees drawn in the view's own ramp.
   */
  bark = new Uint8Array(0);

  /** Palette index of every metamer for a colour mode and a palette of `steps` colours. */
  colorIndices(mode: ColorMode, steps: number): Uint16Array {
    const s = this.next;
    if (!s) return this.colors;
    const cached = this.colorsFor;
    if (
      cached.s === s &&
      cached.mode === mode &&
      cached.steps === steps &&
      cached.style === this.leafStyle
    )
      return this.colors;
    this.colorsFor = { s, mode, steps, style: this.leafStyle };
    const n = s.metamerCount;
    if (this.colors.length < n) this.colors = new Uint16Array(n * 2);
    if (mode === "natural" && steps === RAMP_STEPS + BARK_PALETTES.length * BARK_STEPS) {
      this.naturalIndices(s);
      return this.colors;
    }
    let field: Float32Array | null = null;
    if (mode === "light") field = s.light;
    else if (mode === "resource") field = s.resource;
    else if (mode === "age" || mode === "natural") field = s.age;
    if (mode === "stress") {
      // Bending stress over σ_target (R3) on a fixed scale: the top colour means "at target".
      for (let j = 0; j < n; j++) {
        this.colors[j] = Math.min(steps - 1, Math.floor(Math.min(1, s.stress[j]) * steps));
      }
    } else if (field) {
      let max = 0;
      for (let j = 0; j < n; j++) if (field[j] > max) max = field[j];
      // Light and resource are heavily skewed (a few bright tips), so colour by √(value / max);
      // bark darkens quickly over the first seasons, so the same curve suits it.
      const gamma = mode === "age" ? 1 : 0.5;
      for (let j = 0; j < n; j++) {
        const u = max > 0 ? (field[j] / max) ** gamma : 0;
        this.colors[j] = Math.min(steps - 1, Math.floor(u * steps));
      }
    } else {
      for (let j = 0; j < n; j++) {
        this.colors[j] = (mode === "tree" ? s.tree[j] + 1 : s.order[j]) % steps;
      }
    }
    return this.colors;
  }

  /**
   * Bark by light (`barkLight` k > 0): each metamer's share of its wood colour's lit luminance,
   * 1 − k·shade, where shade is the snapshot's field (`shadow`: 1 − mean Q/C over the slab's depth,
   * C2) at the cell of the metamer's base. It reads the field, not `light`: for old wood `light` is
   * its subtree's mean (q_sum/n_sum, the crown above), not the shade on the stem itself. Null when
   * off or when the snapshot carries no field.
   */
  woodLight(s: Snapshot): Float32Array | null {
    const k = this.barkLight;
    const field = s.shadow;
    if (!(k > 0) || !field) return null;
    if (this.woodLightFor.s === s && this.woodLightFor.k === k) return this.woodLightOf;
    const n = s.metamerCount;
    if (this.woodLightOf.length < n) this.woodLightOf = new Float32Array(2 * n);
    const w = s.width;
    const h = Math.floor(field.length / w);
    for (let j = 0; j < n; j++) {
      const col = ((Math.floor(s.x0[j] as number) % w) + w) % w;
      const row = Math.min(h - 1, Math.max(0, Math.floor(s.y0[j] as number)));
      const shade = Math.min(1, Math.max(0, field[row * w + col] as number));
      this.woodLightOf[j] = 1 - k * shade;
    }
    this.woodLightFor = { s, k };
    return this.woodLightOf;
  }

  /**
   * Each row's closure for the backdrop (`interiorDepth`), once per snapshot; null when the
   * backdrop is off or the snapshot carries no field.
   */
  interiorOf(s: Snapshot): Float32Array | null {
    if (!this.interior || !s.shadow) return null;
    if (this.interiorFor !== s) {
      this.interiorRows = interiorDepth(s.shadow, s.width);
      this.interiorFor = s;
    }
    return this.interiorRows;
  }

  /**
   * The world-x span the backdrop covers: the visible width on a ring (the wood goes on beyond the
   * picture), the world itself otherwise (its field says nothing beyond its sides).
   */
  interiorSpan(s: Snapshot): [number, number] {
    if (!s.periodic) return [0, s.width];
    const half = this.width / 2 / this.camera.scale + 1;
    return [this.camera.cx - half, this.camera.cx + half];
  }

  /**
   * The natural view's colours (`palette("natural")`): a tree whose style names a bark (bark-styles.ts)
   * takes its species' ramp, twig → bark by the metamer's age and bark → old bark by its girth, and
   * the texture bytes in `bark`; any other tree, the view's ramp by age as a share of the oldest
   * wood's (the M6 picture, unchanged).
   */
  private naturalIndices(s: Snapshot): void {
    const n = s.metamerCount;
    const { styles, kindOf } = this.treeStyles(s);
    const barkOf = styles.map((st) => (st.bark ? BARK_PALETTES.indexOf(st.bark) : -1));
    if (this.bark.length < 4 * n) this.bark = new Uint8Array(8 * n);
    let max = 0;
    for (let j = 0; j < n; j++) if (s.age[j] > max) max = s.age[j];
    // Each tree's height, for barks that age only low on the tree (`oldBelow`, birch's base).
    const heightOf: number[] = [];
    for (const m of s.metrics) heightOf[m.tree] = m.height;
    for (let j = 0; j < n; j++) {
      const p = barkOf[kindOf[s.tree[j] as number] as number] as number;
      const q = 4 * j;
      if (p < 0) {
        const u = max > 0 ? s.age[j] / max : 0;
        this.colors[j] = Math.min(RAMP_STEPS - 1, Math.floor(u * RAMP_STEPS));
        this.bark[q] = 0;
        this.bark[q + 1] = 0;
        this.bark[q + 2] = 0;
        continue;
      }
      const style = BARK_STYLES[BARK_PALETTES[p] as (typeof BARK_PALETTES)[number]];
      const age = s.age[j] as number;
      const r = s.radius[j] as number;
      const H = heightOf[s.tree[j] as number] ?? 0;
      const h = H > 0 ? (s.y0[j] as number) / H : 0;
      this.colors[j] = RAMP_STEPS + p * BARK_STEPS + barkStep(style, age, r, h);
      const mature = age >= style.mature ? 1 : age / style.mature;
      const open = fissureOpen(style, r, h);
      this.bark[q] = Math.round(255 * style.fissure * open);
      this.bark[q + 1] = Math.round(255 * style.marks * mature);
      this.bark[q + 2] = Math.round(255 * style.plates * open);
    }
  }

  /**
   * Leaves at the tip of every metamer up to `leafAge` seasons old, coloured from shade to sun
   * (RAMP_STEPS indices) by the light its subtree gathers. Leaves unfold as their metamer grows in
   * and shrink away during the season in which they pass `leafAge`. Short shoots (R6) on older wood
   * carry a rosette, coloured by their own light, so drawn foliage matches simulated foliage. A
   * young metamer carries one leaf on alternating sides (two, one each side, for styles with
   * `xray` 2) and a rosette two, far to near with their metamers (`Leaves.slices`). The layout is
   * worked out once per snapshot (`layoutLeaves`); a frame only places each leaf on its shoot and
   * sizes it, walking the layout in row order and writing each leaf to its far-to-near place. A
   * leaf not drawn this frame (another tree's on a solo plate, or one shrunk away) keeps its
   * place with size 0, so the slice table holds for the whole snapshot.
   */
  leaves(leafAge: number, t: number): Leaves {
    const s = this.next;
    const out = this.leafList;
    out.count = 0;
    out.slices.fill(0);
    if (!s) return out;
    const L = this.layoutLeaves(s, leafAge);
    if (out.x.length < L.count + FALLEN_MAX) {
      const cap = (L.count + FALLEN_MAX) * 2;
      out.x = new Float32Array(cap);
      out.y = new Float32Array(cap);
      out.ux = new Float32Array(cap);
      out.uy = new Float32Array(cap);
      out.size = new Float32Array(cap);
      out.color = new Uint8Array(cap);
      out.turn = new Float32Array(cap);
      out.palette = new Uint8Array(cap);
      out.shape = new Uint8Array(cap);
      out.aspect = new Float32Array(cap);
    }
    const tau = this.tau;
    const palettes = L.styles.map((st) => LEAF_PALETTES.indexOf(st.palette));
    const shapes = L.styles.map((st) => LEAF_SHAPES.indexOf(st.shape));
    const hangOf = L.styles.map((st) => st.clump?.hang ?? 0);
    const levelOf = L.styles.map((st) => st.clump?.level ?? 0);
    if (this.seasons && tau < this.lastTau) this.fallen.count = 0; // a new year: last year's litter is gone
    const g = this.geom;
    out.slices.set(L.slices);
    for (let i = 0; i < L.count; i++) {
      const k = L.at[i] as number;
      out.size[k] = 0;
      const j = L.metamer[i];
      if (this.solo >= 0 && s.tree[j] !== this.solo) continue;
      let size = ROSETTE_SIZE;
      if (!L.rosette[i]) size = g.grown[j] * (s.age[j] > leafAge ? 1 - t : 1);
      let turn = 0;
      let fallAt = 2;
      let h = 0;
      const kind = L.kind[i] as number;
      const style = L.styles[kind] as LeafStyle;
      if (this.seasons && style.deciduous) {
        // Each leaf's own year: it flushes early in spring; it turns in autumn, shaded leaves
        // first; it falls soon after. h spreads the leaves of a crown over a few weeks, and each
        // species keeps its own calendar (birch flushes and turns first, oak last; M19).
        h = ((Math.imul(i + 1, 0x9e3779b1) >>> 0) % 1000) / 1000;
        const light = (L.color[i] as number) / (RAMP_STEPS - 1);
        const flushAt = 0.01 + (style.flush ?? 0) + 0.1 * h;
        const turnAt = 0.52 + (style.turn ?? 0) + 0.1 * light + 0.04 * h;
        // By 0.82 every leaf is down before winter (0.85), unless a young beech keeps it.
        fallAt = L.keep[i] ? 2 : turnAt + 0.06 + 0.06 * h;
        turn = smooth(turnAt, turnAt + 0.08, tau);
        size *= smooth(flushAt, flushAt + 0.12, tau) * (1 - smooth(fallAt, fallAt + 0.015, tau));
      }
      // A third of the leaves are seen to come loose and drift down; the rest just shrink away.
      if (this.lastTau < fallAt && fallAt <= tau && h < 0.35) this.dropLeaf(i, j, L);
      if (size <= 0.02) continue;
      let dx = g.tipX[j] - g.baseX[j];
      let dy = g.tipY[j] - g.baseY[j];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      } else {
        dx = 1; // atan2(0, 0) = 0: a shoot of no length points along +x
        dy = 0;
      }
      // Where the card sits (LeafClump): back along its metamer, then drawn toward its shoot's tip.
      let px = g.tipX[j] as number;
      let py = g.tipY[j] as number;
      const back = L.back[i] as number;
      if (back > 0) {
        px -= (px - g.baseX[j]) * back;
        py -= (py - g.baseY[j]) * back;
      }
      const e = L.end[i] as number;
      if (e !== j) {
        const pull = L.pull[i] as number;
        px += (g.tipX[e] - px) * pull;
        py += (g.tipY[e] - py) * pull;
      }
      let a = L.a[i] as number;
      let b = L.b[i] as number;
      if (this.wind) {
        // Flutter (M16): each leaf twists a little, more on a shoot the wind is bending hard.
        const f =
          0.18 *
          Math.min(1.5, 0.35 + 5 * Math.abs(this.swayAcc[j] as number)) *
          Math.sin(5.3 * this.time + 2.1 * i);
        const na = a - b * f;
        b += a * f;
        a = na;
      }
      let ux = a * dx - b * dy;
      let uy = a * dy + b * dx;
      // Hanging strings and level sprays (LeafClump): the card turns toward down, or toward level.
      const hang = hangOf[kind] as number;
      const level = levelOf[kind] as number;
      if (hang > 0 || level > 0) {
        ux = (1 - hang - level) * ux + level * (ux < 0 ? -1 : 1);
        uy = (1 - hang - level) * uy - hang;
        const n = Math.sqrt(ux * ux + uy * uy);
        if (n > 1e-6) {
          ux /= n;
          uy /= n;
        } else {
          ux = 0;
          uy = -1;
        }
      }
      out.x[k] = px;
      out.y[k] = py;
      out.ux[k] = ux;
      out.uy[k] = uy;
      out.size[k] = size * L.scale[i];
      out.color[k] = L.color[i];
      out.turn[k] = turn;
      out.palette[k] = palettes[kind] as number;
      out.shape[k] = shapes[kind] as number;
      out.aspect[k] = style.aspect;
    }
    let k = L.count;
    if (this.seasons) k = this.driftLeaves(out, k);
    this.lastTau = tau;
    out.count = k;
    return out;
  }

  /** Leaves falling or lying on the ground, drawn after the crowns' own leaves. */
  get fallenLeaves(): number {
    return this.fallen.count;
  }

  /** A turned leaf comes loose: it joins the falling leaves at its place on the shoot. */
  private dropLeaf(i: number, j: number, L: Scene["layout"]): void {
    const f = this.fallen;
    if (f.count >= FALLEN_MAX) return;
    const g = this.geom;
    const k = f.count++;
    f.x[k] = g.tipX[j] as number;
    f.y[k] = g.tipY[j] as number;
    f.ux[k] = L.a[i] as number;
    f.uy[k] = L.b[i] as number;
    f.size[k] = (L.scale[i] as number) * 0.9;
    f.color[k] = L.color[i] as number;
    const style = L.styles[L.kind[i] as number] as LeafStyle;
    f.palette[k] = LEAF_PALETTES.indexOf(style.palette);
    f.shape[k] = LEAF_SHAPES.indexOf(style.shape);
    f.aspect[k] = style.aspect;
    f.phase[k] = (i * 0.618) % (2 * Math.PI);
    f.landed[k] = 0;
  }

  /**
   * Falling leaves drift down, carried by the wind and see-sawing as they go, and lie on the
   * ground as litter until it shrinks away at the end of winter. Appends them to `out` from k.
   */
  private driftLeaves(out: Leaves, k: number): number {
    const f = this.fallen;
    const dt = Math.min(0.1, Math.max(0, this.time - this.lastTime));
    this.lastTime = this.time;
    const dTau = Math.max(0, this.tau - this.lastTau);
    const fade = 1 - smooth(0.9, 0.99, this.tau);
    for (let i = 0; i < f.count; i++) {
      if (!f.landed[i]) {
        const phase = (f.phase[i] as number) + 2.2 * this.time;
        const push = this.wind ? this.windHere(f.x[i] as number, f.y[i] as number) : 0;
        f.x[i] = (f.x[i] as number) + (4 * push + 1.2 * Math.sin(phase)) * dt;
        f.y[i] = (f.y[i] as number) - LEAF_FALL_PER_YEAR * (0.7 + 0.3 * Math.cos(phase)) * dTau;
        const swing = 0.9 * Math.sin(phase);
        f.ux[i] = Math.cos(swing);
        f.uy[i] = Math.sin(swing);
        if ((f.y[i] as number) <= 0.15) {
          f.y[i] = 0.15;
          f.landed[i] = 1;
          f.uy[i] = 0.15 * Math.sign(f.uy[i] as number);
        }
      }
      out.x[k] = f.x[i] as number;
      out.y[k] = f.y[i] as number;
      out.ux[k] = f.ux[i] as number;
      out.uy[k] = f.uy[i] as number;
      out.size[k] = (f.size[i] as number) * fade;
      out.color[k] = f.color[i] as number;
      out.turn[k] = 1;
      out.palette[k] = f.palette[i] as number;
      out.shape[k] = f.shape[i] as number;
      out.aspect[k] = f.aspect[i] as number;
      k++;
    }
    return k;
  }

  /** The leaf layout of snapshot `s` (see `layout`), rebuilt only when what it depends on changes. */
  private layoutLeaves(s: Snapshot, leafAge: number): Scene["layout"] {
    const L = this.layout;
    const style = this.leafStyle;
    if (L.for === s && L.leafAge === leafAge && L.style === style && L.clearBole === this.clearBole)
      return L;
    const n = s.metamerCount;
    // Each tree is drawn as its species (M19), resolved once per tree into arrays by tree id.
    const { styles, kindOf } = this.treeStyles(s);
    const keepOf = new Uint8Array(kindOf.length);
    // Marcescence by height on the tree (`marcescentBelow`): leaves on wood below this keep on.
    const keepBelow = new Float32Array(kindOf.length);
    for (const m of s.metrics) {
      const own = styles[kindOf[m.tree] as number] as LeafStyle;
      keepOf[m.tree] = own.marcescent !== undefined && m.height < own.marcescent ? 1 : 0;
      keepBelow[m.tree] = (own.marcescentBelow ?? 0) * m.height;
    }
    // Each metamer's continuation (its child of the same order, the axis going on), for `gather`.
    const cont = new Int32Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      const p = s.parent[j] as number;
      if (p >= 0 && cont[p] < 0 && s.order[j] === s.order[p]) cont[p] = j;
    }
    const clumpOf = styles.map((st) => st.clump ?? {});
    // Per kind: the leaf's turn from its shoot, its length relative to the view's style (the
    // renderers draw at the latter), and whether it carries a leaf each side.
    const spreadOf = styles.map((st) => st.spread);
    const along = styles.map((st) => Math.cos(st.spread));
    const across = styles.map((st) => Math.sin(st.spread));
    const lengthOf = styles.map((st) => st.length / style.length);
    const pairOf = styles.map((st) => st.xray === 2);
    const cap = 2 * (n + s.budCount);
    if (L.metamer.length < cap) {
      L.metamer = new Int32Array(2 * cap);
      L.a = new Float32Array(2 * cap);
      L.b = new Float32Array(2 * cap);
      L.scale = new Float32Array(2 * cap);
      L.color = new Uint8Array(2 * cap);
      L.rosette = new Uint8Array(2 * cap);
      L.kind = new Uint8Array(2 * cap);
      L.keep = new Uint8Array(2 * cap);
      L.slice = new Uint8Array(2 * cap);
      L.at = new Int32Array(2 * cap);
      L.end = new Int32Array(2 * cap);
      L.pull = new Float32Array(2 * cap);
      L.back = new Float32Array(2 * cap);
    }
    L.styles = styles;
    let maxLight = 0;
    for (let j = 0; j < n; j++) {
      if (s.age[j] <= leafAge + 1 && s.light[j] > maxLight) maxLight = s.light[j];
    }
    const shade = (light: number, tree: number, id: number) =>
      Math.floor((maxLight > 0 ? Math.sqrt(Math.min(1, light / maxLight)) : 0) * (RAMP_STEPS - 1)) +
      jitter(tree, id);
    let k = 0;
    // One leaf turned `side` · spread from shoot j. Its drawn length is foreshortened by the
    // shoot's share in the picture's plane, √(Hx² + Hy²): the orthographic view of a leaf on a
    // shoot that points at the viewer is short (I3), as the shoot itself is.
    const push = (j: number, side: number, color: number, rosette: number) => {
      const tree = s.tree[j] as number;
      const kind = kindOf[tree] as number;
      const hx = s.dirX[j] as number;
      const hy = s.dirY[j] as number;
      const c = clumpOf[kind] as NonNullable<LeafStyle["clump"]>;
      // The page's own variation per card (never the model's): its fan, its place, its size.
      const id = s.birthId[j] as number;
      const salt = (side > 0 ? 11 : 17) + 5 * rosette;
      L.metamer[k] = j;
      if (c.fan) {
        const angle = side * (spreadOf[kind] as number) + c.fan * (2 * hash01(tree, id, salt) - 1);
        L.a[k] = Math.cos(angle);
        L.b[k] = Math.sin(angle);
      } else {
        L.a[k] = along[kind] as number;
        L.b[k] = side * (across[kind] as number);
      }
      L.color[k] = Math.max(0, Math.min(RAMP_STEPS - 1, color));
      L.rosette[k] = rosette;
      L.kind[k] = kind;
      // A ragged edge, not a line: each card's own height limit varies from 0.5 to 1.5 of it.
      const below = (keepBelow[tree] as number) * (0.5 + hash01(tree, id, salt + 3));
      L.keep[k] = keepOf[tree] || (below > 0 && (s.y0[j] as number) < below) ? 1 : 0;
      const vary = c.vary ? 1 + c.vary * (2 * hash01(tree, id, salt + 1) - 1) : 1;
      L.scale[k] = Math.sqrt(hx * hx + hy * hy) * (lengthOf[kind] as number) * vary;
      // A rosette sits on its short shoot; a shoot's cards spread back and gather toward its tip.
      let end = j;
      if (!rosette && c.gather)
        for (let r = c.reach ?? 2; r > 0 && cont[end] >= 0; r--) end = cont[end];
      L.end[k] = end;
      L.pull[k] = end !== j ? (c.gather ?? 0) : 0;
      L.back[k] = !rosette && c.along ? c.along * hash01(tree, id, salt + 2) : 0;
      L.slice[k] = depthSlice(s.z0[j] as number, s.depth);
      k++;
    };
    for (let j = 0; j < n; j++) {
      if (s.age[j] > leafAge + 1) continue;
      const c = shade(s.light[j], s.tree[j], s.birthId[j]);
      const side = s.birthId[j] & 1 ? 1 : -1;
      push(j, side, c, 0);
      if (pairOf[kindOf[s.tree[j] as number] as number]) push(j, -side, c, 0);
    }
    // Short-shoot rosettes on wood older than the leafy shoots (R6). With `clearBole`, none on a
    // trunk below its tree's limb crown base (a height on the tree, as `marcescentBelow`).
    const boleTop = new Float32Array(kindOf.length);
    if (this.clearBole) for (const m of s.metrics) boleTop[m.tree] = m.limbBase;
    for (let i = 0; i < s.budCount; i++) {
      if (s.budState[i] !== BudState.shortShoot) continue;
      const j = s.budMetamer[i];
      if (s.age[j] <= leafAge + 1) continue;
      if (s.order[j] === 0 && (s.y0[j] as number) < (boleTop[s.tree[j] as number] as number))
        continue;
      const c = shade(s.budQ[i], s.tree[j], s.birthId[j] ^ 0x5bd1);
      push(j, 1, c, 1);
      push(j, -1, c, 1);
    }
    // One counting sort by slice: each leaf's place in the far-to-near list, and the slice table.
    const starts = L.slices;
    starts.fill(0);
    for (let i = 0; i < k; i++) starts[(L.slice[i] as number) + 1]++;
    for (let i = 0; i < DEPTH_SLICES; i++) starts[i + 1] += starts[i] as number;
    const next = starts.slice(0, DEPTH_SLICES);
    for (let i = 0; i < k; i++) L.at[i] = next[L.slice[i] as number]++;
    L.count = k;
    L.for = s;
    L.leafAge = leafAge;
    L.style = style;
    L.clearBole = this.clearBole;
    return L;
  }
}
