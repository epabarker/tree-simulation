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
  frame: "trees" | "world" = "trees";
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
    for (let j = 0; j < s.metamerCount; j++) {
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
    if (out.x.length < L.count) {
      const cap = L.count * 2;
      out.x = new Float32Array(cap);
      out.y = new Float32Array(cap);
      out.ux = new Float32Array(cap);
      out.uy = new Float32Array(cap);
      out.size = new Float32Array(cap);
      out.color = new Uint8Array(cap);
    }
    const g = this.geom;
    let k = 0;
    for (let i = 0; i < L.count; i++) {
      if (i === L.back) out.back = k;
      const j = L.metamer[i];
      let size = ROSETTE_SIZE;
      if (!L.rosette[i]) {
        size = g.grown[j] * (s.age[j] > leafAge ? 1 - t : 1);
        if (size <= 0.02) continue;
      }
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
      const a = L.a[i];
      const b = L.b[i];
      out.x[k] = g.tipX[j];
      out.y[k] = g.tipY[j];
      out.ux[k] = a * dx - b * dy;
      out.uy[k] = a * dy + b * dx;
      out.size[k] = size * L.scale[i];
      out.color[k] = L.color[i];
      k++;
    }
    if (L.back >= L.count) out.back = k;
    out.count = k;
    return out;
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
