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
 * Cost: O(K · W · H) per season, independent of the number of trees (§C2.11). Two shortcuts
 * leave every value bit-identical (M13): rows above the highest leafy row see open sky in every
 * direction (their optical depth is exactly 0), so only the rows below are swept; and a periodic
 * shallow sweep stops as soon as a lap around the ring changes nothing.
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
  /** Rows 0 … top − 1 hold all of this season's leaf area; rows from `top` up are empty. */
  private top = 0;
  private shade: Float64Array<ArrayBuffer> | null = null;
  private shadeFresh = false;
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
    this.lad.fill(0, 0, this.top * this.width);
    this.top = 0;
    this.shadeFresh = false;
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
    if (J >= this.top) this.top = J + 1;
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
    if (x1 > x0 && y1 > this.top) this.top = y1;
  }

  /**
   * Phase 1 of §6, after all deposits: one sweep per sky direction, then Q and V per cell.
   * With c2.rotate the directions move by a golden-ratio step each season, so the streaks a
   * small K leaves behind dense foliage fall in a different place every season and average out
   * over a tree's life at no extra cost (deterministic, no RNG; the M6e K convergence note).
   */
  compute(season = 0): void {
    if (this.c2.rotate) this.setDirections((0.5 + season * GOLDEN) % 1);
    const { width: W, height: H, depth, q, vx, vy, kExt } = this;
    const top = this.top;
    const n = top * W;
    // Row `top` is read as the empty row above the foliage: clear what an earlier season left.
    if (top < H) depth.fill(0, n, n + W);
    q.fill(0, 0, n);
    vx.fill(0, 0, n);
    vy.fill(0, 0, n);
    // Open sky, summed in the same order as a cell's own sum, so both give the same bits.
    let qOpen = 0;
    let vxOpen = 0;
    let vyOpen = 0;
    for (let k = 0; k < this.weight.length; k++) {
      const w = this.weight[k];
      const dx = this.dirX[k];
      const dy = this.dirY[k];
      this.sweep(dx, dy);
      for (let c = 0; c < n; c++) {
        const d = depth[c];
        const light = d === 0 ? w : w * Math.exp(-kExt * d); // exp(−0) = 1 exactly
        q[c] += light;
        vx[c] += light * dx;
        vy[c] += light * dy;
      }
      qOpen += w;
      vxOpen += w * dx;
      vyOpen += w * dy;
    }
    q.fill(qOpen, n);
    vx.fill(vxOpen, n);
    vy.fill(vyOpen, n);
    this.shadeFresh = false;
  }

  /**
   * Fills `depth` with the optical depth T along direction (dx, dy) (toward the sky, dy > 0)
   * from the sky down to the entry into each cell. Steep rays step one row up per cell, shallow
   * rays one column toward the sky side; the upstream point falls between two cells and is
   * interpolated linearly. Upstream points outside the grid are open sky (T = 0). Only rows
   * below `top` are written; row `top` (if inside the grid) must hold zeros.
   */
  private sweep(dx: number, dy: number): void {
    const { width: W, height: H, lad, depth, periodic, top } = this;
    // The optical depth on leaving a cell along the ray is its entry depth plus its own foliage,
    // depth[i] + lad[i]·step; upstream cells outside the grid are open sky (0). Columns are
    // wrapped by one width at most, which is all a single step can cross.

    if (Math.abs(dx) <= dy) {
      const step = 1 / dy; // path length per row
      const shift = dx / dy; // columns moved per row up, |shift| ≤ 1
      for (let row = top - 1; row >= 0; row--) {
        const base = row * W;
        if (row === H - 1) {
          depth.fill(0, base, base + W);
          continue;
        }
        const above = base + W;
        for (let col = 0; col < W; col++) {
          const u = col + shift;
          const c0 = Math.floor(u);
          const f = u - c0;
          let i0 = c0;
          let i1 = c0 + 1;
          if (periodic) {
            if (i0 < 0) i0 += W;
            else if (i0 >= W) i0 -= W;
            if (i1 >= W) i1 -= W;
            else if (i1 < 0) i1 += W;
          }
          const e0 = i0 >= 0 && i0 < W ? depth[above + i0] + lad[above + i0] * step : 0;
          const e1 = i1 >= 0 && i1 < W ? depth[above + i1] + lad[above + i1] * step : 0;
          depth[base + col] = e0 * (1 - f) + e1 * f;
        }
      }
    } else {
      const step = 1 / Math.abs(dx); // path length per column
      const rise = dy / Math.abs(dx); // rows moved per column toward the sky
      const toward = dx > 0 ? 1 : -1;
      // Periodic: a ray climbs H rows over H/rise columns, so sweep the ring until every path has
      // climbed out, starting from open sky; every later lap overwrites with the full path. The
      // linear interpolation diffuses a ray (some of its weight climbs slower), so allow 3 H/rise.
      // A lap is a fixed map of the whole field, so once one changes nothing, none will: stop.
      const laps = periodic ? Math.ceil((3 * H) / rise / W) + 1 : 1;
      if (periodic) depth.fill(0, 0, top * W);
      let changed = false;
      for (let n = 0; n < laps * W; n++) {
        const col = toward > 0 ? W - 1 - (n % W) : n % W;
        let up = col + toward;
        if (periodic) {
          if (up < 0) up += W;
          else if (up >= W) up -= W;
        }
        if (up < 0 || up >= W) {
          for (let row = 0; row < top; row++) depth[row * W + col] = 0;
        } else {
          for (let row = 0; row < top; row++) {
            const v = row + rise;
            const r0 = Math.floor(v);
            const f = v - r0;
            const i0 = r0 * W + up;
            const e0 = r0 < H ? depth[i0] + lad[i0] * step : 0;
            const e1 = r0 + 1 < H ? depth[i0 + W] + lad[i0 + W] * step : 0;
            const d = e0 * (1 - f) + e1 * f;
            const i = row * W + col;
            if (d !== depth[i]) {
              depth[i] = d;
              changed = true;
            }
          }
        }
        if (n % W === W - 1) {
          if (!changed) break;
          changed = false;
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
    if (!this.shade) this.shade = new Float64Array(this.q.length);
    if (!this.shadeFresh) {
      let full = 0;
      for (let k = 0; k < this.weight.length; k++) full += this.weight[k];
      const shade = this.shade;
      for (let c = 0; c < shade.length; c++) shade[c] = full > 0 ? 1 - this.q[c] / full : 0;
      this.shadeFresh = true;
    }
    return this.shade;
  }
}
