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
 *  - With periodic sides (M11, ADR 0013) the world is a ring: x wraps for deposits, samples and
 *    rays, so a stand has no edge. Shallow rays, which can cross the width more than once before
 *    reaching the top, are swept around the ring until every ray has climbed out of the grid.
 *
 * Params: c2.K, c2.kExt (k_ext), c2.skyExponent (p), c2.skyTilt, c2.minElevation, c2.C,
 * c2.rotate.
 * Cost: O(K · W · H) per season, independent of the number of trees (§C2.11).
 */

import { DEG, type Params, type Wall } from "../params.ts";
import type { LightModel, LightSample } from "./light-model.ts";

/** φ − 1: successive multiples mod 1 spread as evenly as any sequence can (Weyl, three-gap). */
const GOLDEN = (Math.sqrt(5) - 1) / 2;

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
  private readonly c2: Params["c2"];
  private readonly depth: Float64Array<ArrayBuffer>;
  private shade: Float64Array<ArrayBuffer> | null = null;
  /** Periodic sides: x wraps around (M11). */
  readonly periodic: boolean;

  constructor(width: number, height: number, c2: Params["c2"], periodic = false) {
    this.periodic = periodic;
    this.width = width;
    this.height = height;
    const n = width * height;
    this.lad = new Float64Array(n);
    this.q = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.depth = new Float64Array(n);
    this.kExt = c2.kExt;
    this.c2 = c2;
    const K = Math.max(1, Math.floor(c2.K));
    this.dirX = new Float64Array(K);
    this.dirY = new Float64Array(K);
    this.weight = new Float64Array(K);
    this.setDirections(null);
  }

  /**
   * Places the K sky directions between minElevation and 180° − minElevation, from +x (sky to
   * the right) to −x. With `offset` null they include both ends and are symmetric about the
   * zenith (the M6 grid). With an offset f in [0, 1) they sit at (k + f)/K of the span, one per
   * equal stratum, so a per-season f moves every direction within its stratum (c2.rotate).
   */
  private setDirections(offset: number | null): void {
    const { c2, dirX, dirY, weight } = this;
    const K = weight.length;
    const lo = Math.min(89, Math.max(1, c2.minElevation)) * DEG;
    const span = Math.PI - 2 * lo;
    let total = 0;
    for (let k = 0; k < K; k++) {
      let theta: number;
      if (offset !== null) theta = lo + (span * (k + offset)) / K;
      else theta = K === 1 ? Math.PI / 2 : lo + (span * k) / (K - 1);
      dirX[k] = Math.cos(theta);
      dirY[k] = Math.sin(theta);
      const w = Math.sin(theta) ** c2.skyExponent * Math.max(0, 1 + c2.skyTilt * Math.cos(theta));
      weight[k] = w;
      total += w;
    }
    for (let k = 0; k < K; k++) weight[k] = total > 0 ? (weight[k] * c2.C) / total : 0;
  }

  clear(): void {
    this.lad.fill(0);
    this.shade = null;
  }

  /** Column of x: wrapped around the ring with periodic sides. */
  private column(x: number): number {
    const I = Math.floor(x);
    return this.periodic ? ((I % this.width) + this.width) % this.width : I;
  }

  deposit(x: number, y: number, area = 1): void {
    const I = this.column(x);
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

  /**
   * Phase 1 of §6, after all deposits: one sweep per sky direction, then Q and V per cell.
   * With c2.rotate the directions move by a golden-ratio step each season, so the streaks a
   * small K leaves behind dense foliage fall in a different place every season and average out
   * over a tree's life at no extra cost (deterministic, no RNG; the M6e K convergence note).
   */
  compute(season = 0): void {
    if (this.c2.rotate) this.setDirections((0.5 + season * GOLDEN) % 1);
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
    const { width: W, height: H, lad, depth, periodic } = this;
    const wrap = (col: number) => (periodic ? ((col % W) + W) % W : col);
    // Optical depth on leaving cell (col, row) along the ray: entry depth plus its own foliage.
    const exitDepth = (c: number, row: number, step: number): number => {
      const col = wrap(c);
      return col < 0 || col >= W || row < 0 || row >= H
        ? 0
        : depth[row * W + col] + lad[row * W + col] * step;
    };

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
      // Periodic: a ray climbs H rows over H/rise columns, so sweep the ring until every path has
      // climbed out, starting from open sky; every later lap overwrites with the full path. The
      // linear interpolation diffuses a ray (some of its weight climbs slower), so allow 3 H/rise.
      const laps = periodic ? Math.ceil((3 * H) / rise / W) + 1 : 1;
      if (periodic) depth.fill(0);
      for (let n = 0; n < laps * W; n++) {
        const col = toward > 0 ? W - 1 - (n % W) : n % W;
        const up = wrap(col + toward);
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
    const I = this.column(x);
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
