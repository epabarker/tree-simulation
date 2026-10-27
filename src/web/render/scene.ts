/**
 * What every renderer shares: the tween between two snapshots, the camera and its fitting,
 * picking, and the per-frame choices of colour and leaf layout. Renderers (Canvas 2D, WebGL2)
 * only turn this into pixels.
 *
 * Each frame rebuilds positions from angles and lengths in one parent-before-child loop,
 * interpolating between the previous and current snapshots, so growth and bending animate rather
 * than jump. Leaves are drawn at young nodes only: a view of the foliage, not part of the light
 * model, where buds cast the shade.
 */

import type { Snapshot } from "../../core/snapshot.ts";
import { CATEGORICAL, SEQUENTIAL } from "./colors.ts";
import { RAMP_STEPS, type Theme } from "./theme.ts";

export type ColorMode = "natural" | "order" | "light" | "resource" | "age" | "tree";

export interface ViewOptions {
  colorMode: ColorMode;
  showLeaves: boolean;
  /** Metamers up to this many seasons old carry a leaf. */
  leafAge: number;
  showBuds: boolean;
  showShadow: boolean;
  showGhosts: boolean;
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
 * is applied at draw time, so these arrays do not change when only the camera moves.
 */
export interface Leaves {
  count: number;
  x: Float32Array;
  y: Float32Array;
  ux: Float32Array;
  uy: Float32Array;
  size: Float32Array;
  color: Uint8Array;
}

/** Ground sits this many CSS pixels above the bottom edge when the view is fitted. */
const GROUND_MARGIN = 18;
/** Room kept free above the crowns for the title and hint, CSS pixels. */
const HEADER_MARGIN = 52;
/** Time constant of the camera's easing toward its fitted target, ms. */
const CAMERA_EASE_MS = 380;
/** Leaf length in world units (one unit = one internode), and width over length. */
export const LEAF_LENGTH = 1.1;
export const LEAF_ASPECT = 0.41;
/** Leaves never draw shorter than this on screen, so zoomed-out crowns still read as foliage. */
export const LEAF_MIN_PX = 5;

/** Length of a full-size leaf in world units at `scale` CSS pixels per world unit. */
export function leafLength(scale: number): number {
  return Math.max(LEAF_LENGTH, LEAF_MIN_PX / scale);
}
/** Angle between a leaf and its shoot. */
const LEAF_SPREAD = 0.95;

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
  private colors = new Uint16Array(0);
  private leafList: Leaves = {
    count: 0,
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
    if (this.next) {
      this.computeGeometry(1);
      this.prevGeom = this.geom;
    }
    this.prev = this.next;
    this.next = s;
    this.geom = emptyGeometry(s.metamerCount);
    this.ghosts = new Uint8Array(this.prev ? this.prev.metamerCount : 0).fill(1);
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
    const spanX = Math.max(minSpan, (maxX - minX) * 1.15 + 2 * LEAF_LENGTH);
    const spanY = Math.max(minSpan, maxY * 1.12 + LEAF_LENGTH);
    const fitH = this.height - GROUND_MARGIN - HEADER_MARGIN;
    const first = this.target === null;
    this.target = { cx: (minX + maxX) / 2, scale: Math.min(this.width / spanX, fitH / spanY) };
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

  screenToWorld(px: number, py: number): [number, number] {
    return [
      (px - this.width / 2) / this.camera.scale + this.camera.cx,
      (this.height / 2 - py) / this.camera.scale + this.camera.cy,
    ];
  }

  /** The tree whose nearest branch passes within `maxPx` screen pixels of a world point, or null. */
  pickTree(wx: number, wy: number, maxPx = 14): number | null {
    const s = this.next;
    if (!s) return null;
    const g = this.geom;
    let best = (maxPx / this.camera.scale) ** 2;
    let tree: number | null = null;
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
    return tree;
  }

  /** Positions at tween time t ∈ [0, 1]: lengths, angles and radii interpolate; new rows grow from zero. */
  computeGeometry(t: number): void {
    const s = this.next;
    if (!s) return;
    const g = this.geom;
    const prev = this.prev;
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
      g.tipX[j] = bx + len * Math.cos(ang);
      g.tipY[j] = by + len * Math.sin(ang);
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

  /** The palette a colour mode draws with. */
  palette(mode: ColorMode, theme: Theme): string[] {
    if (mode === "natural") return theme.bark;
    if (mode === "light" || mode === "resource" || mode === "age") return SEQUENTIAL;
    return CATEGORICAL;
  }

  /** Palette index of every metamer for a colour mode and a palette of `steps` colours. */
  colorIndices(mode: ColorMode, steps: number): Uint16Array {
    const s = this.next;
    if (!s) return this.colors;
    const n = s.metamerCount;
    if (this.colors.length < n) this.colors = new Uint16Array(n * 2);
    let field: Float32Array | null = null;
    if (mode === "light") field = s.light;
    else if (mode === "resource") field = s.resource;
    else if (mode === "age" || mode === "natural") field = s.age;
    if (field) {
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
   * One leaf at the tip of every metamer up to `leafAge` seasons old, on alternating sides,
   * coloured from shade to sun (RAMP_STEPS indices) by the light its subtree gathers. Leaves unfold
   * as their metamer grows in and shrink away during the season in which they pass `leafAge`.
   */
  leaves(leafAge: number, t: number): Leaves {
    const s = this.next;
    const out = this.leafList;
    out.count = 0;
    if (!s) return out;
    const n = s.metamerCount;
    if (out.x.length < n) {
      const cap = n * 2;
      out.x = new Float32Array(cap);
      out.y = new Float32Array(cap);
      out.ux = new Float32Array(cap);
      out.uy = new Float32Array(cap);
      out.size = new Float32Array(cap);
      out.color = new Uint8Array(cap);
    }
    const g = this.geom;
    let maxLight = 0;
    for (let j = 0; j < n; j++) {
      if (s.age[j] <= leafAge + 1 && s.light[j] > maxLight) maxLight = s.light[j];
    }
    let k = 0;
    for (let j = 0; j < n; j++) {
      if (s.age[j] > leafAge + 1) continue;
      const size = g.grown[j] * (s.age[j] > leafAge ? 1 - t : 1);
      if (size <= 0.02) continue;
      const side = s.birthId[j] & 1 ? 1 : -1;
      const ang = Math.atan2(g.tipY[j] - g.baseY[j], g.tipX[j] - g.baseX[j]) + side * LEAF_SPREAD;
      const u = maxLight > 0 ? Math.sqrt(s.light[j] / maxLight) : 0;
      const c = Math.floor(u * (RAMP_STEPS - 1)) + jitter(s.tree[j], s.birthId[j]);
      out.x[k] = g.tipX[j];
      out.y[k] = g.tipY[j];
      out.ux[k] = Math.cos(ang);
      out.uy[k] = Math.sin(ang);
      out.size[k] = size;
      out.color[k] = Math.max(0, Math.min(RAMP_STEPS - 1, c));
      k++;
    }
    out.count = k;
    return out;
  }
}
