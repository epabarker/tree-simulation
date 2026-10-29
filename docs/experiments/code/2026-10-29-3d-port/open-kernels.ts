// WASM scalar and SIMD (1 lane) on a stand's season-96 field, open z, K = 16, Float32, at D = 32, 48,
// 64 and at D = 64 in cells twice the size. usage: node open-kernels.ts <case> (SLAB_DIR holds
// dep-<case>.bin and slab-{scalar,simd}.wasm)
import { readFileSync } from "node:fs";

const SP = process.env.SLAB_DIR ?? "runs/slab";
const cname = process.argv[2] ?? "panorama";
const [W0, H0] = cname === "panorama" ? [520, 140] : cname === "wideForest" ? [420, 130] : [210, 130];
const dep = new Float64Array(readFileSync(`${SP}/dep-${cname}.bin`).buffer.slice(0));
const PHI = (Math.sqrt(5) - 1) / 2;
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number;
const out: Record<string, unknown>[] = [];
for (const [D0, s] of [[32, 1], [48, 1], [64, 1], [64, 2]] as const) {
  const W = W0 / s, H = Math.ceil(H0 / s), D = D0 / s;
  const lad = new Float32Array(W * H * D);
  let top = 0;
  for (let i = 0; i < dep.length / 4; i++) {
    const x = ((Math.floor((dep[4 * i] as number) / s) % W) + W) % W;
    const y = Math.floor((dep[4 * i + 1] as number) / s);
    const z = Math.floor((D0 * ((0.5 + i * PHI) % 1)) / s);
    if (y < 0 || y >= H) continue;
    lad[(y * D + z) * W + x] += (dep[4 * i + 3] as number) / (s * s);
    top = Math.max(top, y + 1);
  }
  const row: Record<string, unknown> = { case: cname, D: D0, cell: s, updates: 16 * W * top * D };
  for (const kind of ["scalar", "simd"]) {
    const { instance } = await WebAssembly.instantiate(readFileSync(`${SP}/slab-${kind}.wasm`), {});
    // biome-ignore lint: raw exports
    const e = instance.exports as Record<string, any>;
    e.new32(W, H, D, 16, 1, 0, 0.5, 15, 1, 1, kind === "simd" ? 1 : 0);
    new Float32Array(e.memory.buffer, e.lad32(), W * H * D).set(lad);
    e.top32(top);
    const fn = kind === "simd" ? e.compute32simd : e.compute32;
    fn();
    const t: number[] = [];
    for (let r = 0; r < 5; r++) { const t0 = performance.now(); fn(); t.push(performance.now() - t0); }
    row[kind] = +med(t).toFixed(1);
  }
  out.push(row);
  console.log(JSON.stringify(row));
}
