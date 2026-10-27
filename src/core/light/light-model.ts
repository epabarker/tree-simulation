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
  /** A bud (or leaf) at (x, y) adds its shadow or leaf area, scaled by `area` (R6; default 1). */
  deposit(x: number, y: number, area?: number): void;
  /** A static shade source. */
  addWall(wall: Wall): void;
  /** After all deposits (end of §6 Phase 1): derive the light field. */
  compute(): void;
  /** Light Q and optimal direction V for a bud at (x, y) whose default direction is `dir` (radians). */
  sample(x: number, y: number, dir: number, out: LightSample): void;
  /** Per-cell shadow for overlays, or null when the model has no grid. */
  field(): Float64Array<ArrayBuffer> | null;
}

/**
 * C2 switched off: every bud inside the world is fully exposed (Q = C) and V points straight up.
 * In every light model the world is a closed box: outside it (below the ground, beyond the
 * sides, above the top) Q = 0, so nothing grows out of the world.
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
  compute(): void {}

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
