/**
 * Canvas 2D renderer: the fallback when WebGL2 is unavailable, and the M0–M5 prototype renderer.
 * Segments are grouped by (colour, width) and each group is stroked as one path, which keeps
 * Canvas 2D usable into the tens of thousands of segments.
 */

import type { Snapshot } from "../../core/snapshot.ts";
import { BudState } from "../../core/tree.ts";
import { BUD_ACTIVE, BUD_DORMANT, SEQUENTIAL, shadeImage } from "./colors.ts";
import {
  LEAF_PALETTES,
  LEAF_SHAPES,
  LEAF_STYLES,
  type LeafPalette,
  leafProfile,
  palmateRadius,
} from "./leaf-styles.ts";

/**
 * Each leaf shape's outline as (along, across) points of a leaf of unit length and unit width,
 * base at (0, 0), tip at (1, 0): the profile sampled up one side and down the other, or the
 * palmate lobes around the centre. The WebGL shader draws the same profiles exactly.
 */
const OUTLINES: Float32Array[] = LEAF_SHAPES.map((shape) => {
  const pts: number[] = [];
  if (shape === "palmate") {
    for (let i = 0; i < 30; i++) {
      const theta = (2 * Math.PI * i) / 30;
      const r = palmateRadius(theta);
      pts.push(0.5 + 0.5 * r * Math.cos(theta), 0.5 * r * Math.sin(theta));
    }
  } else {
    const n = shape === "lens" || shape === "needle" ? 8 : 24;
    for (let i = 0; i <= n; i++) pts.push(i / n, 0.5 * leafProfile(shape, i / n));
    for (let i = n - 1; i > 0; i--) pts.push(i / n, -0.5 * leafProfile(shape, i / n));
  }
  return new Float32Array(pts);
});

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
    if (view.showObstacles && s.obstacles.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = this.theme.wall;
      for (const o of s.obstacles) ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.restore();
    }

    scene.depth = view.depth;
    scene.leafStyle = LEAF_STYLES[view.leafStyle];
    scene.computeGeometry(t);
    const leaves = view.showLeaves ? scene.leaves(view.leafAge, t) : null;
    // On a ring seen whole, the trees are drawn once per copy of the world (Scene.wrapOffsets).
    for (const offset of scene.wrapOffsets()) {
      world(offset);
      if (view.showGhosts && scene.physics) this.drawDebris();
      else if (view.showGhosts && scene.prev && t < 1) this.drawGhosts(1 - t);
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
    if (theme.groundHatch) {
      // An ink line along the ground and diagonal hatching below it (an engraved plate).
      ctx.save();
      ctx.strokeStyle = theme.ground;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 0.5);
      ctx.lineTo(w, groundY + 0.5);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (let x = -(h - groundY); x < w; x += 5) {
        ctx.moveTo(x, h);
        ctx.lineTo(x + (h - groundY), groundY);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }
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
        if (scene.solo >= 0 && s.tree[j] !== scene.solo) continue; // a solo plate: one specimen
        ctx.moveTo(g.baseX[j], g.baseY[j]);
        ctx.lineTo(g.tipX[j], g.tipY[j]);
      }
      ctx.stroke();
    }
  }

  private drawLeaves(leaves: Leaves, from: number, to: number): void {
    const { ctx } = this;
    const style = this.scene.leafStyle;
    const full = leafLength(this.scene.camera.scale, style.length);
    // The palettes this frame's leaves use (each tree is drawn as its species, M19).
    const used = new Set<number>();
    for (let k = from; k < to; k++) used.add(leaves.palette[k] as number);
    ctx.save();
    ctx.globalAlpha = 0.92;
    // Leaves drawn in two passes per colour: green, then those past halfway to autumn (M17).
    for (const p of used) {
      const name = LEAF_PALETTES[p] as LeafPalette;
      const palette = this.theme.leaf[name];
      const autumn = this.theme.autumn[name];
      for (let pass = 0; pass < 2 * RAMP_STEPS; pass++) {
        const c = pass % RAMP_STEPS;
        const turned = pass >= RAMP_STEPS;
        ctx.fillStyle = (turned ? autumn : palette)[c] as string;
        ctx.beginPath();
        for (let k = from; k < to; k++) {
          if (leaves.palette[k] !== p) continue;
          if (leaves.color[k] !== c || (leaves.turn[k] as number) > 0.5 !== turned) continue;
          const bx = leaves.x[k];
          const by = leaves.y[k];
          const ux = leaves.ux[k];
          const uy = leaves.uy[k];
          const len = full * leaves.size[k];
          const wid = len * (leaves.aspect[k] as number);
          // The species' outline (M23): (along, across) points of a unit leaf, laid on the shoot.
          const outline = OUTLINES[leaves.shape[k] as number] as Float32Array;
          for (let q = 0; q < outline.length; q += 2) {
            const al = (outline[q] as number) * len;
            const ac = (outline[q + 1] as number) * wid;
            const x = bx + ux * al - uy * ac;
            const y = by + uy * al + ux * ac;
            if (q === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Falling and fallen wood (M16), in the ghost colour, fading on the ground. */
  private drawDebris(): void {
    const { ctx, scene } = this;
    const d = scene.debris();
    ctx.save();
    ctx.strokeStyle = this.theme.ghost;
    ctx.lineCap = "round";
    for (let k = 0; k < d.count; k++) {
      ctx.globalAlpha = 0.85 * (d.alpha[k] as number);
      ctx.lineWidth = Math.max(2 * (d.r[k] as number), 0.8 / scene.camera.scale);
      ctx.beginPath();
      ctx.moveTo(d.ax[k] as number, d.ay[k] as number);
      ctx.lineTo(d.bx[k] as number, d.by[k] as number);
      ctx.stroke();
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
      if (scene.solo >= 0 && prev.tree[j] !== scene.solo) continue; // a solo plate: one specimen
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
