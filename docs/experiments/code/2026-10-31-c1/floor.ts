/**
 * C1: where the floor's light comes from. Grows `forest` (as runs.sh's base, seed 1) to season
 * 45 in WASM, then reports the floor (row 0) in (x, z): its distribution, by distance from the
 * nearest face, and the stand's leaf area per ground column (LAI) beside the light at its base.
 *   node docs/experiments/code/2026-10-31-c1/floor.ts [faces=0.2] [seasons=45]
 */
import { readFileSync } from "node:fs";
import { mergeParams } from "../../../../src/core/params.ts";
import { presetParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const tau = Number(process.argv[2] ?? 0.2);
const seasons = Number(process.argv[3] ?? 45);
const params = mergeParams(presetParams("forest", 1), { world: { faces: [tau, tau] } });
const world = RustWorld.create(params);
world.step(seasons);
const [W, H, D] = [params.world.width, params.world.height, params.world.depth ?? 64];
const lad = world.core().light_lad() as Float32Array;
const floor: number[] = [];
const lai: number[] = [];
const byFace = new Map<number, number[]>();
for (let z = 0; z < D; z++)
  for (let x = 0; x < W; x++) {
    const q = world.sample(x + 0.5, 0.5, z + 0.5).q;
    floor.push(q);
    let l = 0;
    for (let y = 0; y < H; y++) l += lad[(y * D + z) * W + x] as number;
    lai.push(l);
    const band = Math.min(4, Math.floor(Math.min(z, D - 1 - z) / 8));
    byFace.set(band, [...(byFace.get(band) ?? []), q]);
  }
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))] as number;
const r = (v: number) => Math.round(v * 1000) / 1000;
console.log(JSON.stringify({ tau, seasons, floorMean: r(mean(floor)), p10: r(q(floor, 0.1)), p50: r(q(floor, 0.5)), p90: r(q(floor, 0.9)), shareUnder10: r(floor.filter((v) => v < 0.1).length / floor.length) }));
console.log(JSON.stringify({ byFaceDistance8: [...byFace.entries()].sort((a, b) => a[0] - b[0]).map(([b, v]) => [b * 8, r(mean(v))]) }));
// The floor against the leaf area above it: deciles of LAI.
const idx = lai.map((_, i) => i).sort((a, b) => (lai[a] as number) - (lai[b] as number));
const dec = [];
for (let k = 0; k < 10; k++) {
  const part = idx.slice(Math.floor((k * idx.length) / 10), Math.floor(((k + 1) * idx.length) / 10));
  dec.push([r(mean(part.map((i) => lai[i] as number))), r(mean(part.map((i) => floor[i] as number)))]);
}
console.log(JSON.stringify({ laiDecilesFloor: dec, laiMean: r(mean(lai)) }));
world.dispose();
