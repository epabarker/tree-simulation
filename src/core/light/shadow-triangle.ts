/**
 * C2. Shared light field: the shadow triangle (spec §C2; Palubicki et al. 2009 §4.1, in 2D).
 *
 * Every bud in cell (I, J) adds a·b^(−q) to the cells (I ± p, J − q) for q = 0…qMax, p ≤ q: a
 * triangle of shadow widening downwards. A bud's light is Q = max(C − s + a, 0), where adding a
 * cancels the bud's own deposit in its cell ("a bud does not cast a shadow on itself"). The
 * optimal direction V points at the least-shaded cell within the perception wedge (half-angle
 * θ around the bud's direction, radius r). All trees deposit into one grid, so competition
 * between trees needs no extra rule (§C2.9).
 *
 * The world is a closed box: outside the grid (beside it, above it, below the ground) is
 * opaque, so Q = 0 there and V never points out of the box. Without this, shoots that escape
 * the grid see unshaded sky and explode exponentially, as at M0.
 *
 * Params: c2.a, c2.b, c2.qMax, c2.C, c2.perceptionAngle (θ, degrees), c2.perceptionDistance (r).
 * Cost: O(buds · (qMax + 1)²) to deposit, O(buds · r²) to sample.
 */

import { DEG, type Params, type Wall } from "../params.ts";
import type { LightModel, LightSample } from "./light-model.ts";

export class ShadowTriangle implements LightModel {
  readonly width: number;
  readonly height: number;
  /** Shadow s per cell, row-major, row 0 at the ground. */
  readonly s: Float64Array<ArrayBuffer>;
  private readonly weights: Float64Array<ArrayBuffer>;
  private readonly a: number;
  private readonly C: number;
  private readonly cosHalfAngle: number;
  private readonly radius: number;

  constructor(width: number, height: number, c2: Params["c2"]) {
    this.width = width;
    this.height = height;
    this.s = new Float64Array(width * height);
    const qMax = Math.max(0, Math.floor(c2.qMax));
    this.weights = new Float64Array(qMax + 1);
    for (let q = 0; q <= qMax; q++) this.weights[q] = c2.a * c2.b ** -q;
    this.a = c2.a;
    this.C = c2.C;
    this.cosHalfAngle = Math.cos(c2.perceptionAngle * DEG);
    this.radius = Math.max(1, Math.floor(c2.perceptionDistance));
  }

  clear(): void {
    this.s.fill(0);
  }

  deposit(x: number, y: number, area = 1): void {
    const I = Math.floor(x);
    const J = Math.floor(y);
    const { width: W, height: H, s, weights } = this;
    for (let q = 0; q < weights.length; q++) {
      const row = J - q;
      if (row < 0) break;
      if (row >= H) continue;
      const w = weights[q] * area;
      const lo = Math.max(0, I - q);
      const hi = Math.min(W - 1, I + q);
      const base = row * W;
      for (let col = lo; col <= hi; col++) s[base + col] += w;
    }
  }

  addWall(wall: Wall): void {
    const { width: W, height: H, s } = this;
    const x0 = Math.max(0, Math.floor(wall.x));
    const x1 = Math.min(W, Math.ceil(wall.x + wall.width));
    const y0 = Math.max(0, Math.floor(wall.y));
    const y1 = Math.min(H, Math.ceil(wall.y + wall.height));
    for (let row = y0; row < y1; row++) {
      for (let col = x0; col < x1; col++) s[row * W + col] += wall.shade;
    }
  }

  /** The shadow is complete once deposited. */
  compute(): void {}

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
    out.q = Math.max(this.C - this.s[J * W + I] + this.a, 0);

    // V: the least-shaded cell in the wedge; ties go to the cell best aligned with `dir`.
    const dx = Math.cos(dir);
    const dy = Math.sin(dir);
    const r = this.radius;
    let best = Number.POSITIVE_INFINITY;
    let bestAlign = -2;
    let vx = dx;
    let vy = dy;
    for (let row = Math.max(0, J - r); row <= Math.min(H - 1, J + r); row++) {
      for (let col = Math.max(0, I - r); col <= Math.min(W - 1, I + r); col++) {
        if (col === I && row === J) continue;
        const ex = col + 0.5 - x;
        const ey = row + 0.5 - y;
        const d = Math.hypot(ex, ey);
        if (d > r || d === 0) continue;
        const align = (ex * dx + ey * dy) / d;
        if (align < this.cosHalfAngle) continue;
        const sh = this.s[row * W + col];
        if (sh < best || (sh === best && align > bestAlign)) {
          best = sh;
          bestAlign = align;
          vx = ex / d;
          vy = ey / d;
        }
      }
    }
    out.vx = vx;
    out.vy = vy;
  }

  field(): Float64Array<ArrayBuffer> {
    return this.s;
  }
}
