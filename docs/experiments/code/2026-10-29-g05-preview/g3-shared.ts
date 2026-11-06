/** G3 page (ADR 0024): the Rust slab sweep (production WASM build) on the prototype's 3D stands. */
import init, { type InitOutput, SlabSweep } from "../../../../src/wasm/pkg/core.js";

export interface Stand {
  label: string;
  file: string;
  tau: number;
}
/** The prototype's R6 stands at D = 64 (run.ts DUMP): the default look and the hedgerow. */
export const STANDS: Stand[] = [
  { label: "interior τ 0.2, season 40", file: "d64-t020-r6-s40.bin", tau: 0.2 },
  { label: "interior τ 0.2, season 100", file: "d64-t020-r6-s100.bin", tau: 0.2 },
  { label: "hedgerow τ 1, season 100", file: "d64-hard-r6-s100.bin", tau: 1 },
];
export const W = 210;
export const H = 130;
export const D = 64;

let wasm: InitOutput | null = null;
export async function load(): Promise<InitOutput> {
  wasm ??= await init();
  return wasm;
}

/** A sweep holding a stand's foliage: each live bud's leaf area at its tip. */
export function sweep(buds: Float64Array, tau: number, K: number, simd: boolean): SlabSweep {
  const s = new SlabSweep(W, H, D, K, 0.5, 1, 15, 1, true, tau, tau, true);
  for (let i = 0; i < buds.length; i += 4) {
    const a = buds[i + 3] as number;
    if (a > 0) s.deposit(buds[i] as number, buds[i + 1] as number, buds[i + 2] as number, a);
  }
  s.set_simd(simd);
  return s;
}
