/**
 * G2 (ADR 0024): the Rust sky sweep against the TypeScript one, field by field. Both run side by
 * side in one world; after every compute the Q, V and leaf-area fields must hold the same bits,
 * and so must every sample. This is sharper than the golden hashes (which see only the trees),
 * and it covers paths the goldens do not: rotating directions, the M6 column sweep (open and
 * ring), walls under the sky model, a tilted sky.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LightModel, LightSample } from "../src/core/light/light-model.ts";
import { SkySweep } from "../src/core/light/sky-sweep.ts";
import { mergeParams, type Params, type ParamsPatch } from "../src/core/params.ts";
import { type PresetName, presetParams } from "../src/core/presets.ts";
import { setSkySweepFactory, World } from "../src/core/world.ts";
import { WasmSkySweep } from "../src/wasm/sky-sweep.ts";
import { loadRustCore } from "./wasm.ts";

const bitsEqual = (a: Float64Array, b: Float64Array) =>
  a.length === b.length &&
  new BigUint64Array(a.buffer, a.byteOffset, a.length).every(
    (v, i) => v === new BigUint64Array(b.buffer, b.byteOffset, b.length)[i],
  );

const same = (a: number, b: number) => Object.is(a, b);

/** Runs both sweeps and throws at the first difference; hands the world TypeScript's values. */
class Dual implements LightModel {
  readonly width: number;
  readonly height: number;
  computes = 0;
  samples = 0;
  private readonly o: LightSample = { q: 0, vx: 0, vy: 0 };
  readonly ts: SkySweep;
  readonly rs: WasmSkySweep;
  constructor(ts: SkySweep, rs: WasmSkySweep) {
    this.ts = ts;
    this.rs = rs;
    this.width = ts.width;
    this.height = ts.height;
  }
  clear(): void {
    this.ts.clear();
    this.rs.clear();
  }
  deposit(x: number, y: number, area?: number): void {
    this.ts.deposit(x, y, area);
    this.rs.deposit(x, y, area);
  }
  addWall(wall: Params["world"]["walls"][number]): void {
    this.ts.addWall(wall);
    this.rs.addWall(wall);
  }
  compute(season: number): void {
    this.ts.compute(season);
    this.rs.compute(season);
    for (const k of ["lad", "q", "vx", "vy"] as const) {
      if (!bitsEqual(this.ts[k], this.rs[k])) throw new Error(`${k} differs at season ${season}`);
    }
    this.computes++;
  }
  sample(x: number, y: number, dir: number, out: LightSample): void {
    this.ts.sample(x, y, dir, out);
    this.rs.sample(x, y, dir, this.o);
    if (!same(out.q, this.o.q) || !same(out.vx, this.o.vx) || !same(out.vy, this.o.vy)) {
      throw new Error(`sample (${x}, ${y}) differs: ${JSON.stringify([out, this.o])}`);
    }
    this.samples++;
  }
  field(): Float64Array<ArrayBuffer> {
    const a = this.ts.field();
    if (!bitsEqual(a, this.rs.field())) throw new Error("field differs");
    return a;
  }
  dispose(): void {
    this.rs.dispose();
  }
}

const cases: [string, PresetName, ParamsPatch, number][] = [
  ["skyStand", "skyStand", {}, 30],
  ["skyTree", "skyTree", {}, 40],
  ["overcast (p = 1.5)", "overcast", {}, 30],
  ["obliqueSun (tilt)", "obliqueSun", {}, 30],
  ["forest (ring)", "forest", {}, 40],
  ["skyStand, rotating", "skyStand", { c2: { rotate: true } }, 30],
  ["forest, rotating, K = 9", "forest", { c2: { rotate: true, K: 9 } }, 30],
  ["skyStand, M6 columns", "skyStand", { c2: { sweep: "columns" } }, 30],
  ["forest, M6 columns (ring laps)", "forest", { c2: { sweep: "columns", rotate: true } }, 30],
  [
    "skyTree under a wall and a roof",
    "skyTree",
    {
      world: {
        walls: [
          { x: 10, y: 0, width: 6, height: 40, shade: 3 },
          { x: 60, y: 70, width: 30, height: 1, shade: 0.5 },
          { x: 40, y: 500, width: 10, height: 10, shade: 1 },
        ],
      },
    },
    30,
  ],
];

describe("the Rust sky sweep is bit-identical to TypeScript's, field by field (G2)", () => {
  const made: Dual[] = [];
  beforeAll(() => {
    loadRustCore();
    setSkySweepFactory((w, h, c2, periodic) => {
      const d = new Dual(new SkySweep(w, h, c2, periodic), new WasmSkySweep(w, h, c2, periodic));
      made.push(d);
      return d;
    });
  });
  afterAll(() => setSkySweepFactory(null));
  for (const [name, preset, patch, seasons] of cases) {
    it(name, () => {
      made.length = 0;
      const world = new World(mergeParams(presetParams(preset, 1), patch));
      world.run(seasons);
      world.light.field();
      const d = made.at(-1) as Dual;
      expect(d.computes).toBe(seasons);
      expect(d.samples).toBeGreaterThan(1000);
    });
  }
});
