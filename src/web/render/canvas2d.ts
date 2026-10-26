/**
 * Prototype renderer (Canvas 2D). Replaced by WebGL2 instancing at M6 (ADR 0001).
 *
 * Each frame rebuilds positions from angles and lengths in one parent-before-child loop,
 * interpolating between the previous and current snapshots, so growth and bending animate
 * rather than jump. Segments are grouped by (colour, width) and each group is stroked as one
 * path, which keeps Canvas 2D usable into the tens of thousands of segments.
 */

import type { Snapshot } from "../../core/snapshot.ts";
import { BudState } from "../../core/tree.ts";
import { BUD_ACTIVE, BUD_DORMANT, CATEGORICAL, SEQUENTIAL, shadowRgb } from "./colors.ts";

export type ColorMode = "order" | "light" | "resource" | "age" | "tree";

export interface ViewOptions {
  colorMode: ColorMode;
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

interface Geometry {
  baseX: Float32Array;
  baseY: Float32Array;
  tipX: Float32Array;
  tipY: Float32Array;
  radius: Float32Array;
}

function emptyGeometry(n: number): Geometry {
  return {
    baseX: new Float32Array(n),
    baseY: new Float32Array(n),
    tipX: new Float32Array(n),
    tipY: new Float32Array(n),
    radius: new Float32Array(n),
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.resize();
  }

  get snapshot(): Snapshot | null {
    return this.next;
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
  }

  /** Fits the trees and the ground beneath them in view, with a margin. */
  fit(): void {
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
    const midX = (minX + maxX) / 2;
    const spanX = Math.max(minSpan, (maxX - minX) * 1.2);
    const spanY = Math.max(minSpan, maxY * 1.15);
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const margin = 16;
    this.camera.scale = Math.min(w / spanX, (h - margin) / spanY);
    this.camera.cx = midX;
    // Ground (y = 0) sits `margin` pixels above the bottom edge.
    this.camera.cy = (h / 2 - margin) / this.camera.scale;
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!s) return;

    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const { cx, cy, scale } = this.camera;
    // World → CSS pixels: x' = (x − cx)·scale + w/2, y' = h/2 − (y − cy)·scale.
    ctx.setTransform(
      scale * this.dpr,
      0,
      0,
      -scale * this.dpr,
      (w / 2 - cx * scale) * this.dpr,
      (h / 2 + cy * scale) * this.dpr,
    );

    const style = getComputedStyle(this.canvas);
    if (view.showShadow && this.shadowImage) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.75;
      // Image row 0 is the ground row; the world transform already points y up.
      ctx.drawImage(this.shadowImage, 0, 0, s.width, s.height);
      ctx.restore();
    }

    this.computeGeometry(t);
    if (view.showGhosts && this.prev && t < 1) this.drawGhosts(1 - t);
    this.drawSegments(s, view.colorMode);
    if (view.showBuds) this.drawBuds(s);

    // Ground last, so the stubs of shoots that turned downward stay underground.
    ctx.fillStyle = style.getPropertyValue("--ground").trim() || "#8a7a5a";
    ctx.fillRect(-s.width, -3 / scale - 4, s.width * 3, 3 / scale + 4);
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
      } else {
        len = s.length[j] * (prev ? t : 1);
        ang = s.angle[j];
        r = s.radius[j] * (prev ? t : 1);
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
    else if (mode === "age") field = s.age;

    let max = 0;
    if (field) for (let j = 0; j < n; j++) if (field[j] > max) max = field[j];
    const palette = field ? SEQUENTIAL : CATEGORICAL;
    this.colors = palette;
    const pxPerUnit = this.camera.scale;
    for (let j = 0; j < n; j++) {
      let c: number;
      if (field)
        c =
          max > 0 ? Math.min(palette.length - 1, Math.floor((field[j] / max) * palette.length)) : 0;
      else c = (mode === "tree" ? s.tree[j] + 1 : s.order[j]) % palette.length;
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

  private drawGhosts(alpha: number): void {
    const prev = this.prev;
    if (!prev) return;
    const { ctx } = this;
    const g = this.prevGeom;
    ctx.save();
    ctx.globalAlpha = 0.6 * alpha;
    ctx.strokeStyle = "#9a8f80";
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

  private drawBuds(s: Snapshot): void {
    const { ctx } = this;
    const g = this.geom;
    const size = Math.max(2.2 / this.camera.scale, 0.18);
    const half = size / 2;
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
