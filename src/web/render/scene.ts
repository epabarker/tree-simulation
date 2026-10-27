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
 * Pseudo-depth (ADR 0008, page only): with `depth` on, the planar tree is drawn as if it were a
 * 3D crown seen from the side. Each first-order limb gets a stable azimuth φ about the trunk and
 * is foreshortened by the projected-spiral rule of spec §C1.4 (its spread from the trunk shrinks
 * by |sin φ|), and each leafy metamer draws a small cluster of leaves around its shoot, split into a
 * back layer (drawn behind the wood, darker: the far side of the crown's shell) and a front layer.
 * With `depth` off (the x-ray view) the page draws exactly the simulated geometry.
 */

import type { Snapshot } from "../../core/snapshot.ts";
import { BudState } from "../../core/tree.ts";
import { CATEGORICAL, SEQUENTIAL } from "./colors.ts";
import { LEAF_STYLES, type LeafStyle, type LeafStyleName } from "./leaf-styles.ts";
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
  /** Pseudo-depth: foreshortened laterals and two-layer leaf clusters (off = x-ray view). */
  depth: boolean;
  /** Metamers up to this many seasons old carry a leaf. */
  leafAge: number;
  /** How foliage is drawn (leaf-styles.ts); species presets pick one. */
  leafStyle: LeafStyleName;
  showBuds: boolean;
  showShadow: boolean;
  showGhosts: boolean;
  /** Leave out the back layer of leaves: the last step of adaptive quality (M15). */
  lite?: boolean;
  /** Outline obstacles (ADR 0015): the lab shows them; a host page's content covers them. */
  showObstacles?: boolean;
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
 * is applied at draw time, so these arrays do not change when only the camera moves. The first
 * `back` leaves are the back layer, drawn before the branches; the rest are drawn after them.
 */
export interface Leaves {
  count: number;
  back: number;
  x: Float32Array;
  y: Float32Array;
  ux: Float32Array;
  uy: Float32Array;
  size: Float32Array;
  color: Uint8Array;
  /** How far each leaf has turned to autumn colour, 0 → 1 (M17). */
  turn: Float32Array;
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
export const LEAF_MIN_PX = 5;

/** Length of a full-size leaf of `length` world units at `scale` CSS pixels per world unit. */
export function leafLength(scale: number, length: number = LEAF_LENGTH): number {
  return Math.max(length, LEAF_MIN_PX / scale);
}
/** Leaves per cluster in the pseudo-depth view for the default (broadleaf) style. */
export const CLUSTER_LEAVES = LEAF_STYLES.broadleaf.cluster;
/**
 * Least foreshortening of a limb's spread. A fully random azimuth (squeeze |sin φ|) narrows crowns
 * by a third and breaks a stand's closed canopy into separate crowns, which misreads a stand whose
 * crowns touch, so the squeeze runs from MIN_SPREAD (limb facing the viewer) to 1 (in the plane).
 */
const MIN_SPREAD = 0.55;
/** Fraction of the light ramp kept by back-layer leaves (the shaded far side of the crown). */
const BACK_SHADE = 0.55;
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

/** A stable value in [0, 1) per (tree, birthId, salt): the page's pseudo-depth, never the model's. */
function hash01(tree: number, birthId: number, salt: number): number {
  let h = Math.imul(birthId ^ (tree << 20) ^ (salt << 27), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
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
  /** Pseudo-depth on (natural view) or off (x-ray); renderers copy `ViewOptions.depth` here. */
  depth = false;
  /** Foliage style; renderers copy `LEAF_STYLES[ViewOptions.leafStyle]` here. */
  leafStyle: LeafStyle = LEAF_STYLES.broadleaf;
  /**
   * What `fit` frames. "trees": the trees and the ground beneath them (the lab). "world": the
   * world's whole width, easing out only once crowns outgrow half its height (the home page); on
   * a ring the crowns are then drawn across the seam as well.
   */
  frame: "trees" | "world" | "tree" = "trees";
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
  /**
   * Per metamer, the 2×2 map from simulated to drawn direction (row-major a b / c d) and the
   * depth of its axis in [−1, 1]. Identity and 0 everywhere when `depth` is off.
   */
  private proj = new Float32Array(0);
  private axisZ = new Float32Array(0);
  /** The snapshot the projections were computed for: they change once a season, not per frame. */
  private projFor: Snapshot | null = null;
  private colors = new Uint16Array(0);
  private colorsFor = { s: null as Snapshot | null, mode: "", steps: 0 };
  /**
   * Which leaves this snapshot carries, and everything about them that does not move during a
   * tween (M15): the metamer each sits on, its direction as a fixed rotation (a, b) of that
   * shoot's direction, a size scale and a colour. Rosettes keep a constant size; shoot leaves
   * grow in and fade with their metamer. Back-layer leaves come first, up to `back`.
   */
  private layout = {
    for: null as Snapshot | null,
    leafAge: -1,
    depth: false,
    style: null as LeafStyle | null,
    count: 0,
    back: 0,
    metamer: new Int32Array(0),
    a: new Float32Array(0),
    b: new Float32Array(0),
    scale: new Float32Array(0),
    color: new Uint8Array(0),
    rosette: new Uint8Array(0),
  };
  private leafList: Leaves = {
    count: 0,
    back: 0,
    x: new Float32Array(0),
    y: new Float32Array(0),
    ux: new Float32Array(0),
    uy: new Float32Array(0),
    size: new Float32Array(0),
    color: new Uint8Array(0),
    turn: new Float32Array(0),
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
      spanY = Math.max(0.5 * s.height, maxY * 1.05 + LEAF_LENGTH);
    }
    const fitH = Math.max(1, this.height - GROUND_MARGIN - this.headroom);
    const first = this.target === null;
    this.target = { cx, scale: Math.min(this.width / spanX, fitH / spanY) };
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
   * World-x offsets at which to draw the trees: on a ring in the "world" frame, one copy either
   * side as well, so crowns that grew across the seam show at both edges.
   */
  wrapOffsets(): number[] {
    const s = this.next;
    return s?.periodic && this.frame === "world" ? [-s.width, 0, s.width] : [0];
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
    if (this.depth) this.projectAll(s);
    const proj = this.proj;
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
      let dx = len * Math.cos(ang);
      let dy = len * Math.sin(ang);
      if (this.depth) {
        const k = 4 * j;
        const ex = proj[k] * dx + proj[k + 1] * dy;
        dy = proj[k + 2] * dx + proj[k + 3] * dy;
        dx = ex;
      }
      g.tipX[j] = bx + dx;
      g.tipY[j] = by + dy;
      g.radius[j] = r;
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

  /** Every metamer's projection for snapshot `s`, once per snapshot (parents come first). */
  private projectAll(s: Snapshot): void {
    if (this.projFor === s) return;
    if (this.proj.length < 4 * s.metamerCount) {
      this.proj = new Float32Array(8 * s.metamerCount);
      this.axisZ = new Float32Array(2 * s.metamerCount);
    }
    for (let j = 0; j < s.metamerCount; j++) this.project(s, j, s.parent[j]);
    this.projFor = s;
  }

  /**
   * Sets metamer j's projection. Each first-order limb, with its whole subtree, is turned out of
   * the plane about the trunk by a stable azimuth φ: seen from the side, the component of its
   * geometry perpendicular to the trunk shrinks to MIN_SPREAD + (1 − MIN_SPREAD)·|sin φ| (spec §C1.4
   * β_eff = atan(tan β·|sin φ|)) and its depth is cos φ. Everything else inherits its parent's
   * projection, so the squeeze is applied once per limb, never compounded; higher-order axes only
   * get their own depth (half their parent's, half their own azimuth) for the leaf layers.
   */
  private project(s: Snapshot, j: number, p: number): void {
    const proj = this.proj;
    const k = 4 * j;
    if (p >= 0 && s.order[j] > s.order[p] && s.order[p] > 0) {
      proj.copyWithin(k, 4 * p, 4 * p + 4);
      const own = Math.cos(2 * Math.PI * hash01(s.tree[j], s.birthId[j], 1));
      this.axisZ[j] = 0.5 * this.axisZ[p] + 0.5 * own;
      return;
    }
    if (p < 0 || s.order[j] === s.order[p]) {
      if (p < 0) {
        proj[k] = 1;
        proj[k + 1] = 0;
        proj[k + 2] = 0;
        proj[k + 3] = 1;
        this.axisZ[j] = 0;
      } else {
        proj.copyWithin(k, 4 * p, 4 * p + 4);
        this.axisZ[j] = this.axisZ[p];
      }
      return;
    }
    const phi = 2 * Math.PI * hash01(s.tree[j], s.birthId[j], 1);
    const squeeze = MIN_SPREAD + (1 - MIN_SPREAD) * Math.abs(Math.sin(phi));
    // Unit parent direction u; S = u uᵀ + squeeze · (I − u uᵀ).
    const pa = s.angle[p];
    const ux = Math.cos(pa);
    const uy = Math.sin(pa);
    const f = 1 - squeeze;
    const s00 = 1 - f * uy * uy;
    const s01 = f * ux * uy;
    const s11 = 1 - f * ux * ux;
    const q = 4 * p;
    const [a, b, c, d] = [proj[q], proj[q + 1], proj[q + 2], proj[q + 3]];
    proj[k] = a * s00 + b * s01;
    proj[k + 1] = a * s01 + b * s11;
    proj[k + 2] = c * s00 + d * s01;
    proj[k + 3] = c * s01 + d * s11;
    this.axisZ[j] = Math.cos(phi);
  }

  /** The palette a colour mode draws with. */
  palette(mode: ColorMode, theme: Theme): string[] {
    if (mode === "natural") return theme.bark;
    if (mode === "light" || mode === "resource" || mode === "age" || mode === "stress") {
      return SEQUENTIAL;
    }
    return CATEGORICAL;
  }

  /** Palette index of every metamer for a colour mode and a palette of `steps` colours. */
  colorIndices(mode: ColorMode, steps: number): Uint16Array {
    const s = this.next;
    if (!s) return this.colors;
    const cached = this.colorsFor;
    if (cached.s === s && cached.mode === mode && cached.steps === steps) return this.colors;
    this.colorsFor = { s, mode, steps };
    const n = s.metamerCount;
    if (this.colors.length < n) this.colors = new Uint16Array(n * 2);
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
   * Leaves at the tip of every metamer up to `leafAge` seasons old, coloured from shade to sun
   * (RAMP_STEPS indices) by the light its subtree gathers. Leaves unfold as their metamer grows in
   * and shrink away during the season in which they pass `leafAge`. Short shoots (R6) on older wood
   * carry a rosette, coloured by their own light, so drawn foliage matches simulated foliage. In
   * the x-ray view a young metamer carries one leaf on alternating sides (two, one each side, for
   * styles with `xray` 2) and a rosette two; with `depth` on each carries the style's `cluster`
   * leaves spaced around the shoot, each foreshortened by
   * its out-of-plane angle, and those whose depth falls behind the plane go first, darkened, as
   * the back layer. The layout is worked out once per snapshot (`layoutLeaves`); a frame only
   * places each leaf on its shoot and sizes it.
   */
  leaves(leafAge: number, t: number): Leaves {
    const s = this.next;
    const out = this.leafList;
    out.count = 0;
    out.back = 0;
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
    }
    const tau = this.tau;
    const phenology = this.seasons && this.leafStyle.deciduous;
    if (this.seasons && tau < this.lastTau) this.fallen.count = 0; // a new year: last year's litter is gone
    const g = this.geom;
    let k = 0;
    for (let i = 0; i < L.count; i++) {
      if (i === L.back) out.back = k;
      const j = L.metamer[i];
      if (this.solo >= 0 && s.tree[j] !== this.solo) continue;
      let size = ROSETTE_SIZE;
      if (!L.rosette[i]) size = g.grown[j] * (s.age[j] > leafAge ? 1 - t : 1);
      let turn = 0;
      let fallAt = 2;
      let h = 0;
      if (phenology) {
        // Each leaf's own year: it flushes early in spring; it turns in autumn, shaded leaves
        // first; it falls soon after. h spreads the leaves of a crown over a few weeks.
        h = ((Math.imul(i + 1, 0x9e3779b1) >>> 0) % 1000) / 1000;
        const light = (L.color[i] as number) / (RAMP_STEPS - 1);
        const flushAt = 0.01 + 0.1 * h;
        const turnAt = 0.52 + 0.1 * light + 0.04 * h;
        fallAt = turnAt + 0.06 + 0.06 * h; // by 0.78: every leaf is down before winter (0.85)
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
      out.x[k] = g.tipX[j];
      out.y[k] = g.tipY[j];
      out.ux[k] = a * dx - b * dy;
      out.uy[k] = a * dy + b * dx;
      out.size[k] = size * L.scale[i];
      out.color[k] = L.color[i];
      out.turn[k] = turn;
      k++;
    }
    if (L.back >= L.count) out.back = k;
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
      k++;
    }
    return k;
  }

  /** The leaf layout of snapshot `s` (see `layout`), rebuilt only when what it depends on changes. */
  private layoutLeaves(s: Snapshot, leafAge: number): Scene["layout"] {
    const L = this.layout;
    const style = this.leafStyle;
    if (L.for === s && L.leafAge === leafAge && L.depth === this.depth && L.style === style) {
      return L;
    }
    if (this.depth) this.projectAll(s);
    const n = s.metamerCount;
    const per = this.depth ? style.cluster : 2;
    const cap = (n + s.budCount) * per;
    if (L.metamer.length < cap) {
      L.metamer = new Int32Array(2 * cap);
      L.a = new Float32Array(2 * cap);
      L.b = new Float32Array(2 * cap);
      L.scale = new Float32Array(2 * cap);
      L.color = new Uint8Array(2 * cap);
      L.rosette = new Uint8Array(2 * cap);
    }
    let maxLight = 0;
    for (let j = 0; j < n; j++) {
      if (s.age[j] <= leafAge + 1 && s.light[j] > maxLight) maxLight = s.light[j];
    }
    const shade = (light: number, tree: number, id: number) =>
      Math.floor((maxLight > 0 ? Math.sqrt(Math.min(1, light / maxLight)) : 0) * (RAMP_STEPS - 1)) +
      jitter(tree, id);
    let k = 0;
    const push = (
      j: number,
      a: number,
      b: number,
      scale: number,
      color: number,
      rosette: number,
    ) => {
      L.metamer[k] = j;
      L.a[k] = a;
      L.b[k] = b;
      L.scale[k] = scale;
      L.color[k] = Math.max(0, Math.min(RAMP_STEPS - 1, color));
      L.rosette[k] = rosette;
      k++;
    };
    // One x-ray leaf turned `side` · spread from its shoot.
    const xray = (j: number, side: number, c: number, rosette: number) =>
      push(j, Math.cos(style.spread), side * Math.sin(style.spread), 1, c, rosette);
    // The leaves of a pseudo-depth cluster at metamer j that belong to layer `pass`.
    const cluster = (j: number, id: number, pass: number, c: number, rosette: number) => {
      const along = Math.cos(style.spread);
      const across = Math.sin(style.spread);
      const turn = hash01(s.tree[j], id, 2);
      for (let i = 0; i < style.cluster; i++) {
        const psi = 2 * Math.PI * (turn + i / style.cluster);
        const z = 0.6 * this.axisZ[j] + 0.4 * Math.sin(psi);
        if ((z < 0 ? 0 : 1) !== pass) continue;
        // Leaf direction in 3D is along·d + across·(n cos ψ + z-axis sin ψ); its drawn in-plane
        // part is (along, w) in the shoot's frame, foreshortened to length hypot(along, w).
        const w = across * Math.cos(psi);
        const len = Math.hypot(along, w);
        push(j, along / len, w / len, len, pass === 0 ? Math.floor(c * BACK_SHADE) : c, rosette);
      }
    };
    // Pass 0 lays out the back layer, pass 1 the front (the x-ray view has only a front layer).
    L.back = 0;
    for (let pass = this.depth ? 0 : 1; pass < 2; pass++) {
      for (let j = 0; j < n; j++) {
        if (s.age[j] > leafAge + 1) continue;
        const c = shade(s.light[j], s.tree[j], s.birthId[j]);
        if (!this.depth) {
          const side = s.birthId[j] & 1 ? 1 : -1;
          xray(j, side, c, 0);
          if (style.xray === 2) xray(j, -side, c, 0);
        } else {
          cluster(j, s.birthId[j], pass, c, 0);
        }
      }
      // Short-shoot rosettes on wood older than the leafy shoots (R6).
      for (let i = 0; i < s.budCount; i++) {
        if (s.budState[i] !== BudState.shortShoot) continue;
        const j = s.budMetamer[i];
        if (s.age[j] <= leafAge + 1) continue;
        const id = s.birthId[j] ^ 0x5bd1;
        const c = shade(s.budQ[i], s.tree[j], id);
        if (!this.depth) {
          xray(j, 1, c, 1);
          xray(j, -1, c, 1);
        } else {
          cluster(j, id, pass, c, 1);
        }
      }
      if (pass === 0) L.back = k;
    }
    if (!this.depth) L.back = 0;
    L.count = k;
    L.for = s;
    L.leafAge = leafAge;
    L.depth = this.depth;
    L.style = style;
    return L;
  }
}
