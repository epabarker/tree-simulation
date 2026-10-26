/**
 * The light-model boundary of spec §C2.8: `sample(pos, dir) → (Q, V)`. The shadow triangle
 * (C2 baseline), the sky sweep (M6) and space colonisation (O3) all sit behind it.
 */

import type { Wall } from "../params.ts";

export interface LightSample {
  q: number;
  vx: number;
  vy: number;
}

export interface LightModel {
  readonly width: number;
  readonly height: number;
  /** Phase 1 of §6: start a new season's field. */
  clear(): void;
  /** A bud (or leaf) at (x, y) adds its shadow or leaf area. */
  deposit(x: number, y: number): void;
  /** A static shade source. */
  addWall(wall: Wall): void;
  /** Light Q and optimal direction V for a bud at (x, y) whose default direction is `dir` (radians). */
  sample(x: number, y: number, dir: number, out: LightSample): void;
  /** Per-cell shadow for overlays, or null when the model has no grid. */
  field(): Float64Array<ArrayBuffer> | null;
}

/**
 * C2 switched off: every bud above ground is fully exposed (Q = C) and V points straight up.
 * The ground is opaque in every light model: a bud below it gets Q = 0 and cannot grow.
 */
export class UniformLight implements LightModel {
  readonly width: number;
  readonly height: number;
  private readonly q: number;

  constructor(width: number, height: number, q: number) {
    this.width = width;
    this.height = height;
    this.q = q;
  }

  clear(): void {}
  deposit(): void {}
  addWall(): void {}

  sample(_x: number, y: number, _dir: number, out: LightSample): void {
    out.q = y < 0 ? 0 : this.q;
    out.vx = 0;
    out.vy = 1;
  }

  field(): null {
    return null;
  }
}
