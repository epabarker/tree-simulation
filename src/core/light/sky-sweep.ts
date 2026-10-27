/**
 * C2. Shared light field: the Beer–Lambert sky sweep (spec §C2.4 "recommended upgrade", M6).
 *
 * Every bud adds one unit of leaf area to its cell (density ℓ). Light comes from K sky directions
 * d_k spread over the upper half-plane, with weights w_k ∝ sin(elevation)^p · (1 + tilt·cos θ_k)
 * normalised so Σ w_k = C. For each direction one sweep, starting at the sky side, accumulates the
 * optical depth T_k along the ray into every cell (linear interpolation between the two upstream
 * cells), and the light reaching the cell is I_k = exp(−k_ext · T_k). A bud then receives
 * Q = Σ w_k I_k and V = normalize(Σ w_k I_k d_k), the direction of the brightest sky.
 *
 * Choices the spec leaves open (docs/architecture.md):
 *  - A bud receives the light entering its own cell, so the cell's own foliage does not shade it
 *    ("a bud does not cast a shadow on itself"); shade comes from foliage along the rays.
 *  - Rays arriving from beyond the sides of the world are unobstructed (open sky), which is what
 *    gives edge trees their side light. Growth is still confined to the box: outside it Q = 0.
 *
 * Params: c2.K, c2.kExt (k_ext), c2.skyExponent (p), c2.skyTilt, c2.minElevation, c2.C.
 * Cost: O(K · W · H) per season, independent of the number of trees (§C2.11).
 */

import { DEG, type Params, type Wall } from "../params.ts";
import type { LightModel, LightSample } from "./light-model.ts";

export class SkySweep implements LightModel {
  readonly width: number;
  readonly height: number;
  /** Leaf area density per cell, row-major, row 0 at the ground. */
  readonly lad: Float64Array<ArrayBuffer>;
  /** Light Q and the light-weighted sky direction (vx, vy) per cell, from the last compute(). */
  readonly q: Float64Array<ArrayBuffer>;
  readonly vx: Float64Array<ArrayBuffer>;
  readonly vy: Float64Array<ArrayBuffer>;
  /** Sky directions (unit vectors toward the sky) and their weights. */
  readonly dirX: Float64Array<ArrayBuffer>;
  readonly dirY: Float64Array<ArrayBuffer>;
  readonly weight: Float64Array<ArrayBuffer>;
  private readonly kExt: number;
  private readonly depth: Float64Array<ArrayBuffer>;
  private shade: Float64Array<ArrayBuffer> | null = null;

  constructor(width: number, height: number, c2: Params["c2"]) {
    this.width = width;
    this.height = height;
    const n = width * height;
    this.lad = new Float64Array(n);
    this.q = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.depth = new Float64Array(n);
    this.kExt = c2.kExt;

    const K = Math.max(1, Math.floor(c2.K));
    const lo = Math.min(89, Math.max(1, c2.minElevation)) * DEG;
    this.dirX = new Float64Array(K);
    this.dirY = new Float64Array(K);
    this.weight = new Float64Array(K);
    let total = 0;
    for (let k = 0; k < K; k++) {
      // Angles from +x (sky to the right) to −x, evenly spread and symmetric about the zenith.
      const theta = K === 1 ? Math.PI / 2 : lo + ((Math.PI - 2 * lo) * k) / (K - 1);
      this.dirX[k] = Math.cos(theta);
      this.dirY[k] = Math.sin(theta);
      const w = Math.sin(theta) ** c2.skyExponent * Math.max(0, 1 + c2.skyTilt * Math.cos(theta));
      this.weight[k] = w;
      total += w;
    }
    for (let k = 0; k < K; k++) this.weight[k] = total > 0 ? (this.weight[k] * c2.C) / total : 0;
  }

  clear(): void {
    this.lad.fill(0);
    this.shade = null;
  }

  deposit(x: number, y: number, area = 1): void {
    const I = Math.floor(x);
    const J = Math.floor(y);
    if (I < 0 || I >= this.width || J < 0 || J >= this.height) return;
    this.lad[J * this.width + I] += area;
  }

  addWall(wall: Wall): void {
    const { width: W, height: H, lad } = this;
    const x0 = Math.max(0, Math.floor(wall.x));
    const x1 = Math.min(W, Math.ceil(wall.x + wall.width));
    const y0 = Math.max(0, Math.floor(wall.y));
    const y1 = Math.min(H, Math.ceil(wall.y + wall.height));
    for (let row = y0; row < y1; row++) {
      for (let col = x0; col < x1; col++) lad[row * W + col] += wall.shade;
    }
  }

  /** Phase 1 of §6, after all deposits: one sweep per sky direction, then Q and V per cell. */
  compute(): void {
    this.q.fill(0);
    this.vx.fill(0);
    this.vy.fill(0);
    for (let k = 0; k < this.weight.length; k++) {
      this.sweep(this.dirX[k], this.dirY[k]);
      const w = this.weight[k];
      const dx = this.dirX[k];
      const dy = this.dirY[k];
      const { depth, q, vx, vy } = this;
      for (let c = 0; c < depth.length; c++) {
        const light = w * Math.exp(-this.kExt * depth[c]);
        q[c] += light;
        vx[c] += light * dx;
        vy[c] += light * dy;
      }
    }
    this.shade = null;
  }

  /**
   * Fills `depth` with the optical depth T along direction (dx, dy) (toward the sky, dy > 0)
   * from the sky down to the entry into each cell. Steep rays step one row up per cell, shallow
   * rays one column toward the sky side; the upstream point falls between two cells and is
   * interpolated linearly. Upstream points outside the grid are open sky (T = 0).
   */
  private sweep(dx: number, dy: number): void {
    const { width: W, height: H, lad, depth } = this;
    // Optical depth on leaving cell (col, row) along the ray: entry depth plus its own foliage.
    const exitDepth = (col: number, row: number, step: number): number =>
      col < 0 || col >= W || row < 0 || row >= H
        ? 0
        : depth[row * W + col] + lad[row * W + col] * step;

    if (Math.abs(dx) <= dy) {
      const step = 1 / dy; // path length per row
      const shift = dx / dy; // columns moved per row up
      for (let row = H - 1; row >= 0; row--) {
        for (let col = 0; col < W; col++) {
          if (row === H - 1) {
            depth[row * W + col] = 0;
            continue;
          }
          const u = col + shift;
          const c0 = Math.floor(u);
          const f = u - c0;
          depth[row * W + col] =
            exitDepth(c0, row + 1, step) * (1 - f) + exitDepth(c0 + 1, row + 1, step) * f;
        }
      }
    } else {
      const step = 1 / Math.abs(dx); // path length per column
      const rise = dy / Math.abs(dx); // rows moved per column toward the sky
      const toward = dx > 0 ? 1 : -1;
      for (let n = 0; n < W; n++) {
        const col = toward > 0 ? W - 1 - n : n;
        const up = col + toward;
        for (let row = 0; row < H; row++) {
          if (up < 0 || up >= W) {
            depth[row * W + col] = 0;
            continue;
          }
          const v = row + rise;
          const r0 = Math.floor(v);
          const f = v - r0;
          depth[row * W + col] =
            exitDepth(up, r0, step) * (1 - f) + exitDepth(up, r0 + 1, step) * f;
        }
      }
    }
  }

  sample(x: number, y: number, dir: number, out: LightSample): void {
    const I = Math.floor(x);
    const J = Math.floor(y);
    const { width: W, height: H } = this;
    if (I < 0 || I >= W || J < 0 || J >= H) {
      out.q = 0;
      out.vx = 0;
      out.vy = 1;
      return;
    }
    const c = J * W + I;
    out.q = this.q[c];
    const len = Math.hypot(this.vx[c], this.vy[c]);
    if (len > 0) {
      out.vx = this.vx[c] / len;
      out.vy = this.vy[c] / len;
    } else {
      out.vx = Math.cos(dir);
      out.vy = Math.sin(dir);
    }
  }

  /** Shade per cell for the overlay: 1 − Q/Q_max, where Q_max is the open-sky light. */
  field(): Float64Array<ArrayBuffer> {
    if (!this.shade) {
      let full = 0;
      for (let k = 0; k < this.weight.length; k++) full += this.weight[k];
      const shade = new Float64Array(this.q.length);
      for (let c = 0; c < shade.length; c++) shade[c] = full > 0 ? 1 - this.q[c] / full : 0;
      this.shade = shade;
    }
    return this.shade;
  }
}
