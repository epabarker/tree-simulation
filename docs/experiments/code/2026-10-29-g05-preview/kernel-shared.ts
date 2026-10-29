/** Loading and driving the WebAssembly slab kernel (docs/experiments/code/2026-10-29-3d-port/rust). */
export const K = 16;
export const C2 = { kExt: 0.5, minElevation: 15, skyExponent: 1, C: 1 };
const PHI = (Math.sqrt(5) - 1) / 2;

/**
 * One slab: the `forest` ring (210 × 130) at depth D, open in z, in cells `cell` times the model's
 * (1, or 2 for the coarse lattice: W/2 × H/2 × D/2 cells).
 */
export interface Cfg {
  label: string;
  D: number;
  cell: number;
}
export const dims = (c: Cfg) => ({ W: 210 / c.cell, H: Math.ceil(130 / c.cell), D: c.D / c.cell });

/**
 * The forest field: each 2D deposit (x, y, area) placed at z = D·frac(½ + iφ), as in the bench. In
 * coarse cells a cell's leaf area is divided by the cell's cross-section (cell²), so optical depth
 * per unit length is kept.
 */
export function field(dep: Float64Array, c: Cfg): { lad: Float32Array; top: number } {
  const { W, H, D } = dims(c);
  const lad = new Float32Array(W * H * D);
  let top = 0;
  const s = c.cell;
  for (let i = 0; i < dep.length / 4; i++) {
    const x = ((Math.floor((dep[4 * i] as number) / s) % W) + W) % W;
    const y = Math.floor((dep[4 * i + 1] as number) / s);
    const z = Math.floor((c.D * ((0.5 + i * PHI) % 1)) / s);
    if (y < 0 || y >= H || z < 0 || z >= D) continue;
    lad[(y * D + z) * W + x] += (dep[4 * i + 3] as number) / (s * s);
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

/** Open z (pz = 0), periodic x, as the ring. */
export function setup(e: Exports, c: Cfg, lad: Float32Array, top: number, fast: boolean): void {
  const { W, H, D } = dims(c);
  e.new32(W, H, D, K, 1, 0, C2.kExt, C2.minElevation, C2.skyExponent, C2.C, fast ? 1 : 0);
  new Float32Array((e.memory as WebAssembly.Memory).buffer, e.lad32(), W * H * D).set(lad);
  e.top32(top);
}
