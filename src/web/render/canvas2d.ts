/**
 * Canvas 2D renderer: the fallback when WebGL2 is unavailable, and the M0–M5 prototype renderer.
 * Segments are grouped by (colour, width) and each group is stroked as one path, which keeps
 * Canvas 2D usable into the tens of thousands of segments.
 */

import type { Snapshot } from "../../core/snapshot.ts";
import { BudState } from "../../core/tree.ts";
import { BUD_ACTIVE, BUD_DORMANT, SEQUENTIAL, shadeImage } from "./colors.ts";
import { LEAF_STYLES } from "./leaf-styles.ts";
import { MAX_DPR, type Renderer, type RendererOptions } from "./renderer.ts";
import { type ColorMode, type Leaves, leafLength, Scene, type ViewOptions } from "./scene.ts";
import { RAMP_STEPS, readTheme, type Theme } from "./theme.ts";

const WIDTH_BUCKETS = 48;

export class Canvas2DRenderer implements Renderer {
  readonly kind = "canvas2d";
  readonly canvas: HTMLCanvasElement;
  readonly scene = new Scene();
  private readonly ctx: CanvasRenderingContext2D;
  private shadowImage: HTMLCanvasElement | null = null;
  private shadowFor: Snapshot | null = null;
  private keys = new Uint16Array(0);
  private order = new Int32Array(0);
  private theme: Theme;

  private readonly transparent: boolean;
  private maxDpr: number;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    this.transparent = options.transparent ?? false;
    this.maxDpr = options.maxDpr ?? MAX_DPR;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.theme = readTheme(canvas);
    this.resize();
  }

  refreshTheme(): void {
    this.theme = readTheme(this.canvas);
  }

  setSnapshot(s: Snapshot): void {
    this.scene.setSnapshot(s);
    this.shadowFor = null;
  }

  setMaxDpr(dpr: number): void {
    this.maxDpr = dpr;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.scene.setSize(rect.width, rect.height, dpr);
  }

  draw(t: number, view: ViewOptions): void {
    const { ctx, scene } = this;
    const s = scene.next;
    const { width: w, height: h, dpr } = scene;
    const { cx, scale } = scene.camera;
    const groundY = scene.groundY();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.transparent) ctx.clearRect(0, 0, w, h);
    else this.drawSky(w, h, groundY);
    if (!s) return;

    // World → CSS pixels: x' = (x − cx)·scale + w/2, y' = groundY − y·scale.
    const world = (offset: number): void =>
      ctx.setTransform(
        scale * dpr,
        0,
        0,
        -scale * dpr,
        (w / 2 - (cx - offset) * scale) * dpr,
        groundY * dpr,
      );
    world(0);

    if (view.showShadow && this.shadowFor !== s) {
      // Built once per snapshot, and only while the overlay is shown.
      this.shadowImage = s.shadow ? this.buildShadowImage(s) : null;
      this.shadowFor = s;
    }
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

    scene.depth = view.depth;
    scene.leafStyle = LEAF_STYLES[view.leafStyle];
    scene.computeGeometry(t);
    const leaves = view.showLeaves ? scene.leaves(view.leafAge, t) : null;
    // On a ring seen whole, the trees are drawn once per copy of the world (Scene.wrapOffsets).
    for (const offset of scene.wrapOffsets()) {
      world(offset);
      if (view.showGhosts && scene.prev && t < 1) this.drawGhosts(1 - t);
      // Back-layer leaves (pseudo-depth, ADR 0008) go behind the wood, the rest in front.
      if (leaves && !view.lite) this.drawLeaves(leaves, 0, leaves.back);
      this.drawSegments(s, view.colorMode);
      if (leaves) this.drawLeaves(leaves, leaves.back, leaves.count);
      if (view.showBuds) this.drawBuds(s, view.colorMode === "light");
    }

    // Ground last, in screen space, so stubs of shoots that turned downward stay underground.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  private drawSegments(s: Snapshot, mode: ColorMode): void {
    const { ctx, scene } = this;
    const n = s.metamerCount;
    const palette = scene.palette(mode, this.theme);
    const colors = scene.colorIndices(mode, palette.length);
    if (this.keys.length < n) {
      this.keys = new Uint16Array(n * 2);
      this.order = new Int32Array(n * 2);
    }
    const g = scene.geom;
    const pxPerUnit = scene.camera.scale;
    for (let j = 0; j < n; j++) {
      const widthPx = Math.max(0.6, 2 * g.radius[j] * pxPerUnit);
      const wb = Math.min(WIDTH_BUCKETS - 1, Math.max(0, Math.round(Math.log2(widthPx / 0.6) * 4)));
      this.keys[j] = colors[j] * WIDTH_BUCKETS + wb;
    }
    // Counting sort of segments by (colour, width) key.
    const nKeys = palette.length * WIDTH_BUCKETS;
    const start = new Int32Array(nKeys + 1);
    for (let j = 0; j < n; j++) start[this.keys[j] + 1]++;
    for (let k = 0; k < nKeys; k++) start[k + 1] += start[k];
    const fill = start.slice(0, nKeys);
    for (let j = 0; j < n; j++) this.order[fill[this.keys[j]]++] = j;

    const unitsPerPx = 1 / scene.camera.scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let k = 0; k < nKeys; k++) {
      const a = start[k];
      const b = start[k + 1];
      if (a === b) continue;
      ctx.strokeStyle = palette[Math.floor(k / WIDTH_BUCKETS)] as string;
      ctx.lineWidth = 0.6 * 2 ** ((k % WIDTH_BUCKETS) / 4) * unitsPerPx;
      ctx.beginPath();
      for (let i = a; i < b; i++) {
        const j = this.order[i];
        ctx.moveTo(g.baseX[j], g.baseY[j]);
        ctx.lineTo(g.tipX[j], g.tipY[j]);
      }
      ctx.stroke();
    }
  }

  private drawLeaves(leaves: Leaves, from: number, to: number): void {
    const { ctx } = this;
    const style = this.scene.leafStyle;
    const palette = this.theme.leaf[style.palette];
    const full = leafLength(this.scene.camera.scale, style.length);
    ctx.save();
    ctx.globalAlpha = 0.92;
    for (let c = 0; c < RAMP_STEPS; c++) {
      ctx.fillStyle = palette[c] as string;
      ctx.beginPath();
      for (let k = from; k < to; k++) {
        if (leaves.color[k] !== c) continue;
        const bx = leaves.x[k];
        const by = leaves.y[k];
        const ux = leaves.ux[k];
        const uy = leaves.uy[k];
        const len = full * leaves.size[k];
        const bulge = len * style.aspect; // control points at twice the half-width
        const tx = bx + ux * len;
        const ty = by + uy * len;
        const mx = bx + ux * len * 0.5;
        const my = by + uy * len * 0.5;
        // A lens: two quadratic curves bulging either side of the midrib.
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(mx - uy * bulge, my + ux * bulge, tx, ty);
        ctx.quadraticCurveTo(mx + uy * bulge, my - ux * bulge, bx, by);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGhosts(alpha: number): void {
    const { ctx, scene } = this;
    const prev = scene.prev;
    if (!prev) return;
    const g = scene.prevGeom;
    ctx.save();
    ctx.globalAlpha = 0.6 * alpha;
    ctx.strokeStyle = this.theme.ghost;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.8 / scene.camera.scale, 0.1);
    ctx.beginPath();
    for (let j = 0; j < prev.metamerCount; j++) {
      if (!scene.ghosts[j]) continue;
      ctx.moveTo(g.baseX[j], g.baseY[j]);
      ctx.lineTo(g.tipX[j], g.tipY[j]);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Buds coloured by state, or by their light Q (√ of Q over the brightest bud's) when `byLight`. */
  private drawBuds(s: Snapshot, byLight: boolean): void {
    const { ctx, scene } = this;
    const g = scene.geom;
    const size = Math.max(2.6 / scene.camera.scale, 0.22);
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
      [BudState.shortShoot, BUD_ACTIVE],
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
    if (!s.shadow) return null;
    const canvas = this.shadowImage ?? document.createElement("canvas");
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(
      new ImageData(shadeImage(s.shadow, s.width, s.height), s.width, s.height),
      0,
      0,
    );
    return canvas;
  }
}
