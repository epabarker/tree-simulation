/**
 * Prototype renderer (Canvas 2D). Replaced by WebGL2 instancing at M6 (ADR 0001).
 *
 * Each frame rebuilds positions from angles and lengths in one parent-before-child loop,
 * interpolating between the previous and current snapshots, so growth and bending animate
 * rather than jump. Segments are grouped by (colour, width) and each group is stroked as one
 * path, which keeps Canvas 2D usable into the tens of thousands of segments. Leaves are drawn at
 * young nodes only (a view of the foliage, not part of the light model, where buds cast shade).
 */

import type { Snapshot } from "../../core/snapshot.ts";
import { BudState } from "../../core/tree.ts";
import { BUD_ACTIVE, BUD_DORMANT, CATEGORICAL, SEQUENTIAL, shadowRgb } from "./colors.ts";
import { RAMP_STEPS, readTheme, type Theme } from "./theme.ts";

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
  /** World point at the centre of the canvas, and pixels per world unit. */
  cx: number;
  cy: number;
  scale: number;
}

const WIDTH_BUCKETS = 48;
const MAX_DPR = 2;
/** Ground sits this many CSS pixels above the bottom edge when the view is fitted. */
const GROUND_MARGIN = 18;
/** Room kept free above the crowns for the title and hint, CSS pixels. */
const HEADER_MARGIN = 52;
/** Time constant of the camera's easing toward its fitted target, ms. */
const CAMERA_EASE_MS = 380;
/** Leaf length and width in world units (one unit = one internode). */
const LEAF_LENGTH = 1.1;
const LEAF_WIDTH = 0.45;
/** Leaves never draw shorter than this on screen, so zoomed-out crowns still read as foliage. */
const LEAF_MIN_PX = 5;
/** Angle between a leaf and its shoot. */
const LEAF_SPREAD = 0.95;

interface Geometry {
  baseX: Float32Array;
  baseY: Float32Array;
  tipX: Float32Array;
  tipY: Float32Array;
  radius: Float32Array;
  /** Drawn length over final length: 0 → 1 as a new metamer grows in. */
  grown: Float32Array;
}

function emptyGeometry(n: number): Geometry {
  return {
    baseX: new Float32Array(n),
    baseY: new Float32Array(n),
    tipX: new Float32Array(n),
    tipY: new Float32Array(n),
    radius: new Float32Array(n),
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

export class Canvas2DRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly camera: Camera = { cx: 0, cy: 0, scale: 1 };
  private readonly ctx: CanvasRenderingContext2D;
  private prev: Snapshot | null = null;
  private next: Snapshot | null = null;
  private prevGeom: Geometry = emptyGeometry(0);
  private geom: Geometry = emptyGeometry(0);
  private ghosts: Uint8Array = new Uint8Array(0);
  private shadowImage: HTMLCanvasElement | null = null;
  private dpr = 1;
  private keys = new Uint16Array(0);
  private order = new Int32Array(0);
  private colors: string[] = [];
  private theme: Theme;
  /** Where the fitted view wants the camera; the ground line stays pinned while it eases. */
  private target: { cx: number; scale: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.theme = readTheme(canvas);
    this.resize();
  }

  get snapshot(): Snapshot | null {
    return this.next;
  }

  /** Re-reads the colour tokens (after a light/dark switch). */
  refreshTheme(): void {
    this.theme = readTheme(this.canvas);
  }

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
    this.shadowImage = s.shadow ? this.buildShadowImage(s) : null;
  }

  /** Drops the tween origin, so the next draw shows the current snapshot without animation. */
  clearHistory(): void {
    this.prev = null;
    this.ghosts = new Uint8Array(0);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    if (this.target) this.pinGround();
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
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const first = this.target === null;
    const fitH = h - GROUND_MARGIN - HEADER_MARGIN;
    this.target = { cx: (minX + maxX) / 2, scale: Math.min(w / spanX, fitH / spanY) };
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
    const w = this.canvas.width / this.dpr;
    return Math.abs(t.cx - cam.cx) * cam.scale > 0.3 || Math.abs(t.scale / cam.scale - 1) * w > 0.3;
  }

  /** Keeps the ground line GROUND_MARGIN pixels above the bottom edge at the current scale. */
  private pinGround(): void {
    const h = this.canvas.height / this.dpr;
    this.camera.cy = (h / 2 - GROUND_MARGIN) / this.camera.scale;
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
      const r = g.radius[j];
      const d2 = Math.max(0, Math.hypot(ex, ey) - r) ** 2;
      if (d2 < best) {
        best = d2;
        tree = s.tree[j];
      }
    }
    return tree;
  }

  screenToWorld(px: number, py: number): [number, number] {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    return [
      (px - w / 2) / this.camera.scale + this.camera.cx,
      (h / 2 - py) / this.camera.scale + this.camera.cy,
    ];
  }

  draw(t: number, view: ViewOptions): void {
    const { ctx } = this;
    const s = this.next;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const { cx, cy, scale } = this.camera;
    const groundY = h / 2 + cy * scale; // screen y of world y = 0

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawSky(w, h, groundY);
    if (!s) return;

    // World → CSS pixels: x' = (x − cx)·scale + w/2, y' = h/2 − (y − cy)·scale.
    ctx.setTransform(
      scale * this.dpr,
      0,
      0,
      -scale * this.dpr,
      (w / 2 - cx * scale) * this.dpr,
      groundY * this.dpr,
    );

    if (view.showShadow && this.shadowImage) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.75;
      // Image row 0 is the ground row; the world transform already points y up.
      ctx.drawImage(this.shadowImage, 0, 0, s.width, s.height);
      ctx.restore();
    }
    if (s.walls.length > 0) {
      ctx.fillStyle = this.theme.wall;
      for (const wall of s.walls) ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }

    this.computeGeometry(t);
    if (view.showGhosts && this.prev && t < 1) this.drawGhosts(1 - t);
    this.drawSegments(s, view.colorMode);
    if (view.showLeaves) this.drawLeaves(s, view.leafAge, t);
    if (view.showBuds) this.drawBuds(s, view.colorMode === "light");

    // Ground last, in screen space, so stubs of shoots that turned downward stay underground.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawGround(w, h, groundY);
  }

  private drawSky(w: number, h: number, groundY: number): void {
    const { ctx, theme } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, groundY));
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  }

  private drawGround(w: number, h: number, groundY: number): void {
    if (groundY >= h) return;
    const { ctx, theme } = this;
    const ground = ctx.createLinearGradient(0, groundY, 0, h);
    ground.addColorStop(0, theme.ground);
    ground.addColorStop(1, theme.groundDeep);
    ctx.fillStyle = ground;
    ctx.fillRect(0, groundY, w, h - groundY);
  }

  /** Positions at tween time t ∈ [0, 1]: lengths, angles and radii interpolate; new rows grow from zero. */
  private computeGeometry(t: number): void {
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
  }

  private colorKeys(s: Snapshot, mode: ColorMode): void {
    const n = s.metamerCount;
    if (this.keys.length < n) {
      this.keys = new Uint16Array(n * 2);
      this.order = new Int32Array(n * 2);
    }
    let field: Float32Array | null = null;
    if (mode === "light") field = s.light;
    else if (mode === "resource") field = s.resource;
    else if (mode === "age" || mode === "natural") field = s.age;

    let max = 0;
    if (field) for (let j = 0; j < n; j++) if (field[j] > max) max = field[j];
    // Light and resource are heavily skewed (a few bright tips), so colour by √(value / max);
    // bark darkens quickly over the first seasons, so the same curve suits it.
    const gamma = mode === "age" ? 1 : 0.5;
    const palette = mode === "natural" ? this.theme.bark : field ? SEQUENTIAL : CATEGORICAL;
    this.colors = palette;
    const pxPerUnit = this.camera.scale;
    for (let j = 0; j < n; j++) {
      let c: number;
      if (field) {
        const u = max > 0 ? (field[j] / max) ** gamma : 0;
        c = Math.min(palette.length - 1, Math.floor(u * palette.length));
      } else {
        c = (mode === "tree" ? s.tree[j] + 1 : s.order[j]) % palette.length;
      }
      const widthPx = Math.max(0.6, 2 * this.geom.radius[j] * pxPerUnit);
      const wb = Math.min(WIDTH_BUCKETS - 1, Math.max(0, Math.round(Math.log2(widthPx / 0.6) * 4)));
      this.keys[j] = c * WIDTH_BUCKETS + wb;
    }
  }

  private drawSegments(s: Snapshot, mode: ColorMode): void {
    const { ctx } = this;
    const n = s.metamerCount;
    this.colorKeys(s, mode);
    // Counting sort of segments by (colour, width) key.
    const nKeys = this.colors.length * WIDTH_BUCKETS;
    const start = new Int32Array(nKeys + 1);
    for (let j = 0; j < n; j++) start[this.keys[j] + 1]++;
    for (let k = 0; k < nKeys; k++) start[k + 1] += start[k];
    const fill = start.slice(0, nKeys);
    for (let j = 0; j < n; j++) this.order[fill[this.keys[j]]++] = j;

    const g = this.geom;
    const unitsPerPx = 1 / this.camera.scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let k = 0; k < nKeys; k++) {
      const a = start[k];
      const b = start[k + 1];
      if (a === b) continue;
      const c = Math.floor(k / WIDTH_BUCKETS);
      const wb = k % WIDTH_BUCKETS;
      ctx.strokeStyle = this.colors[c] as string;
      ctx.lineWidth = 0.6 * 2 ** (wb / 4) * unitsPerPx;
      ctx.beginPath();
      for (let i = a; i < b; i++) {
        const j = this.order[i];
        ctx.moveTo(g.baseX[j], g.baseY[j]);
        ctx.lineTo(g.tipX[j], g.tipY[j]);
      }
      ctx.stroke();
    }
  }

  /**
   * One leaf at the tip of every metamer up to `leafAge` seasons old, on alternating sides,
   * coloured from shade to sun by the light the metamer's subtree gathers. Leaves unfold as their
   * metamer grows in and shrink away during the season in which they pass `leafAge`.
   */
  private drawLeaves(s: Snapshot, leafAge: number, t: number): void {
    const { ctx } = this;
    const g = this.geom;
    const n = s.metamerCount;
    let maxLight = 0;
    for (let j = 0; j < n; j++)
      if (s.age[j] <= leafAge + 1 && s.light[j] > maxLight) maxLight = s.light[j];
    const palette = this.theme.leaf;
    const leafLength = Math.max(LEAF_LENGTH, LEAF_MIN_PX / this.camera.scale);
    const leafWidth = leafLength * (LEAF_WIDTH / LEAF_LENGTH);
    const buckets: number[][] = Array.from({ length: RAMP_STEPS }, () => []);
    for (let j = 0; j < n; j++) {
      const age = s.age[j];
      if (age > leafAge + 1) continue;
      const u = maxLight > 0 ? Math.sqrt(s.light[j] / maxLight) : 0;
      const c = Math.floor(u * (RAMP_STEPS - 1)) + jitter(s.tree[j], s.birthId[j]);
      (buckets[Math.max(0, Math.min(RAMP_STEPS - 1, c))] as number[]).push(j);
    }
    ctx.save();
    ctx.globalAlpha = 0.92;
    for (let c = 0; c < RAMP_STEPS; c++) {
      const list = buckets[c] as number[];
      if (list.length === 0) continue;
      ctx.fillStyle = palette[c] as string;
      ctx.beginPath();
      for (const j of list) {
        const fading = s.age[j] > leafAge ? 1 - t : 1;
        const size = g.grown[j] * fading;
        if (size <= 0.02) continue;
        const bx = g.tipX[j];
        const by = g.tipY[j];
        const side = s.birthId[j] & 1 ? 1 : -1;
        const ang = Math.atan2(by - g.baseY[j], bx - g.baseX[j]) + side * LEAF_SPREAD;
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);
        const len = leafLength * size;
        const half = (leafWidth * size) / 2;
        const tx = bx + ux * len;
        const ty = by + uy * len;
        const mx = bx + ux * len * 0.5;
        const my = by + uy * len * 0.5;
        // A lens: two quadratic curves bulging either side of the midrib.
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(mx - uy * half * 2, my + ux * half * 2, tx, ty);
        ctx.quadraticCurveTo(mx + uy * half * 2, my - ux * half * 2, bx, by);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGhosts(alpha: number): void {
    const prev = this.prev;
    if (!prev) return;
    const { ctx } = this;
    const g = this.prevGeom;
    ctx.save();
    ctx.globalAlpha = 0.6 * alpha;
    ctx.strokeStyle = this.theme.ghost;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.8 / this.camera.scale, 0.1);
    ctx.beginPath();
    for (let j = 0; j < prev.metamerCount; j++) {
      if (!this.ghosts[j]) continue;
      ctx.moveTo(g.baseX[j], g.baseY[j]);
      ctx.lineTo(g.tipX[j], g.tipY[j]);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Buds coloured by state, or by their light Q (√ of Q over the brightest bud's) when `byLight`. */
  private drawBuds(s: Snapshot, byLight: boolean): void {
    const { ctx } = this;
    const g = this.geom;
    const size = Math.max(2.6 / this.camera.scale, 0.22);
    const half = size / 2;
    if (byLight) {
      let max = 0;
      for (let i = 0; i < s.budCount; i++) max = Math.max(max, s.budQ[i]);
      const n = SEQUENTIAL.length;
      for (let c = 0; c < n; c++) {
        ctx.fillStyle = SEQUENTIAL[c] as string;
        ctx.beginPath();
        for (let i = 0; i < s.budCount; i++) {
          const k = max > 0 ? Math.min(n - 1, Math.floor(Math.sqrt(s.budQ[i] / max) * n)) : 0;
          if (k !== c) continue;
          const m = s.budMetamer[i];
          ctx.rect(g.tipX[m] - half, g.tipY[m] - half, size, size);
        }
        ctx.fill();
      }
      return;
    }
    for (const [state, color] of [
      [BudState.active, BUD_ACTIVE],
      [BudState.dormant, BUD_DORMANT],
    ] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < s.budCount; i++) {
        if (s.budState[i] !== state) continue;
        const m = s.budMetamer[i];
        ctx.rect(g.tipX[m] - half, g.tipY[m] - half, size, size);
      }
      ctx.fill();
    }
  }

  private buildShadowImage(s: Snapshot): HTMLCanvasElement | null {
    const field = s.shadow;
    if (!field) return null;
    const canvas = this.shadowImage ?? document.createElement("canvas");
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(s.width, s.height);
    let max = 0;
    for (let i = 0; i < field.length; i++) if (field[i] > max) max = field[i];
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const v = field[y * s.width + x];
        const o = (y * s.width + x) * 4;
        if (v <= 0 || max <= 0) {
          img.data[o + 3] = 0;
          continue;
        }
        const [r, gr, b] = shadowRgb(v / max);
        img.data[o] = r;
        img.data[o + 1] = gr;
        img.data[o + 2] = b;
        img.data[o + 3] = Math.round(60 + 180 * Math.min(1, v / max));
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}
