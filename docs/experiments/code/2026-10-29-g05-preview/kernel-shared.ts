/** Loading and driving the WebAssembly slab kernel (docs/experiments/code/2026-10-29-3d-port/rust). */
export const W = 210;
export const H = 130;
export const D = 32;
export const K = 16;
export const C2 = { kExt: 0.5, minElevation: 15, skyExponent: 1, C: 1 };
const PHI = (Math.sqrt(5) - 1) / 2;

/** The forest field: each 2D deposit (x, y, z, area) placed at z = D·frac(½ + iφ), as in the bench. */
export function field(dep: Float64Array, periodicZ: boolean): { lad: Float32Array; top: number } {
  const lad = new Float32Array(W * H * D);
  let top = 0;
  for (let i = 0; i < dep.length / 4; i++) {
    const x = ((Math.floor(dep[4 * i] as number) % W) + W) % W;
    const y = Math.floor(dep[4 * i + 1] as number);
    let z = Math.floor(D * ((0.5 + i * PHI) % 1));
    if (periodicZ) z = ((z % D) + D) % D;
    if (y < 0 || y >= H || z < 0 || z >= D) continue;
    lad[(y * D + z) * W + x] += dep[4 * i + 3] as number;
    top = Math.max(top, y + 1);
  }
  return { lad, top };
}

// biome-ignore lint: raw wasm exports
export type Exports = Record<string, any>;

export async function instance(bytes: ArrayBuffer): Promise<Exports> {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  return instance.exports as Exports;
}

export function setup(e: Exports, lad: Float32Array, top: number, periodicZ: boolean, fast: boolean): void {
  e.new32(W, H, D, K, 1, periodicZ ? 1 : 0, C2.kExt, C2.minElevation, C2.skyExponent, C2.C, fast ? 1 : 0);
  new Float32Array((e.memory as WebAssembly.Memory).buffer, e.lad32(), W * H * D).set(lad);
  e.top32(top);
}
