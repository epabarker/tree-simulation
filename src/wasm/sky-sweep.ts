/**
 * C2's sky sweep in the Rust core (rust/core/src/light/sky_sweep.rs) behind the TypeScript core's
 * LightModel. It is bit-identical to src/core/light/sky-sweep.ts (tests/wasm-sky.test.ts), so
 * swapping it in leaves every golden as it was.
 *
 * The fields live in WASM memory; `lad`, `q`, `vx` and `vy` are views onto them, valid until the
 * next call into the module (which may grow the memory and detach them).
 */

import type { LightModel, LightSample } from "../core/light/light-model.ts";
import type { Params, Wall } from "../core/params.ts";
import { wasm } from "./core.ts";
import { SkySweep } from "./pkg/core.js";

export class WasmSkySweep implements LightModel {
  readonly width: number;
  readonly height: number;
  private readonly sweep: SkySweep;
  /** Q, V_x, V_y of the last sample, as a view (rebuilt when the memory grows). */
  private out = new Float64Array(0);

  constructor(width: number, height: number, c2: Params["c2"], periodic: boolean) {
    this.width = width;
    this.height = height;
    this.sweep = new SkySweep(
      width,
      height,
      c2.K,
      c2.kExt,
      c2.skyExponent,
      c2.skyTilt,
      c2.minElevation,
      c2.C,
      c2.rotate,
      c2.sweep === "columns",
      periodic,
    );
  }

  private view(ptr: number, length: number): Float64Array<ArrayBuffer> {
    return new Float64Array(wasm().memory.buffer, ptr, length);
  }

  clear(): void {
    this.sweep.clear();
  }

  deposit(x: number, y: number, area = 1): void {
    this.sweep.deposit(x, y, area);
  }

  addWall(wall: Wall): void {
    this.sweep.add_wall(wall.x, wall.y, wall.width, wall.height, wall.shade);
  }

  compute(season = 0): void {
    this.sweep.compute(season);
  }

  sample(x: number, y: number, dir: number, out: LightSample): void {
    this.sweep.sample(x, y, dir);
    let o = this.out;
    if (o.buffer !== wasm().memory.buffer) o = this.out = this.view(this.sweep.sample_ptr(), 3);
    out.q = o[0];
    out.vx = o[1];
    out.vy = o[2];
  }

  field(): Float64Array<ArrayBuffer> {
    const ptr = this.sweep.field_ptr();
    return this.view(ptr, this.width * this.height);
  }

  /** Leaf area density per cell (a view; see the file comment). */
  get lad(): Float64Array<ArrayBuffer> {
    return this.view(this.sweep.lad_ptr(), this.width * this.height);
  }

  get q(): Float64Array<ArrayBuffer> {
    return this.view(this.sweep.q_ptr(), this.width * this.height);
  }

  get vx(): Float64Array<ArrayBuffer> {
    return this.view(this.sweep.vx_ptr(), this.width * this.height);
  }

  get vy(): Float64Array<ArrayBuffer> {
    return this.view(this.sweep.vy_ptr(), this.width * this.height);
  }

  dispose(): void {
    this.sweep.free();
  }
}
