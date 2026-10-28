/**
 * C2 ablation: shared pooled light instead of directional shade (spec §8; Weiner 1990, Schwinning
 * & Weiner 1998). All foliage is pooled into one homogeneous canopy across the world each season,
 * and every leaf receives that canopy's mean light,
 *
 *   Q = C · (1 − e^(−k·L)) / (k·L),   L = total leaf area / world width (leaf area index),
 *
 * Beer–Lambert integrated down the canopy depth (Monsi & Saeki 1953). V points straight up. A
 * tree's share of the light is then its share of the leaf area: competition is size-symmetric, so
 * nothing about where a tree stands (above or below, beside a gap) matters. Walls are ignored:
 * there are no directions for them to block. Outside the world Q = 0, as in every model.
 *
 * Params: c2.model = "pooled", c2.kExt (k), c2.C.
 */

import type { Params } from "../params.ts";
import type { LightModel, LightSample } from "./light-model.ts";

export class PooledLight implements LightModel {
  readonly width: number;
  readonly height: number;
  private readonly kExt: number;
  private readonly C: number;
  private area = 0;
  private q = 0;

  constructor(width: number, height: number, c2: Params["c2"]) {
    this.width = width;
    this.height = height;
    this.kExt = c2.kExt;
    this.C = c2.C;
    this.q = c2.C;
  }

  clear(): void {
    this.area = 0;
  }

  deposit(x: number, y: number, area = 1): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.area += area;
  }

  addWall(): void {}

  compute(): void {
    const kL = (this.kExt * this.area) / this.width;
    this.q = kL > 0 ? (this.C * (1 - Math.exp(-kL))) / kL : this.C;
  }

  sample(x: number, y: number, _dir: number, out: LightSample): void {
    const inside = x >= 0 && x < this.width && y >= 0 && y < this.height;
    out.q = inside ? this.q : 0;
    out.vx = 0;
    out.vy = 1;
  }

  field(): null {
    return null;
  }
}
