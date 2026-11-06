/**
 * THROWAWAY PROTOTYPE (G3): the Rust slab sweep (production build: no parity, WASM SIMD) as the
 * prototype's light, so its stands grow under the real kernel: K, rotation and τ per face.
 */
import { readFileSync } from "node:fs";
import type { Params } from "../../../../src/core/params.ts";
import * as core from "../../../../src/wasm/pkg/core.js";

let wasm: core.InitOutput | null = null;

/** The slab light the prototype calls (cli/slab-light.ts's shape). */
export interface Light3D {
  clear(): void;
  deposit(x: number, y: number, z: number, area: number): void;
  compute(season?: number): void;
  sample(x: number, y: number, z: number, out: Float64Array): void;
}

export class RustSlab implements Light3D {
  private readonly s: core.SlabSweep;
  constructor(W: number, H: number, D: number, c2: Params["c2"], K: number, tau: number | readonly [number, number], rotate: boolean) {
    wasm ??= core.initSync({
      module: readFileSync(new URL("../../../../src/wasm/pkg/core_bg.wasm", import.meta.url)),
    });
    const [front, back] = typeof tau === "number" ? [tau, tau] : tau;
    this.s = new core.SlabSweep(W, H, D, K, c2.kExt, c2.skyExponent, c2.minElevation, c2.C, rotate, front, back, true);
  }
  clear(): void {
    this.s.clear();
  }
  deposit(x: number, y: number, z: number, area: number): void {
    this.s.deposit(x, y, z, area);
  }
  compute(season = 0): void {
    this.s.compute(season);
  }
  sample(x: number, y: number, z: number, out: Float64Array): void {
    this.s.sample(x, y, z);
    const v = new Float32Array((wasm as core.InitOutput).memory.buffer, this.s.sample_ptr(), 4);
    out[0] = v[0] as number;
    out[1] = v[1] as number;
    out[2] = v[2] as number;
    out[3] = v[3] as number;
  }
}
