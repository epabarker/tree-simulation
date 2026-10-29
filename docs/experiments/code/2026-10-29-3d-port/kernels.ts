// Times the fused slab march as TypeScript and as Rust→WASM (scalar, SIMD) on the same deposits.
// usage: node kernels.ts <case> <D> <K> <f32|f64> <reps>
import { readFileSync } from "node:fs";
import { SlabSweep } from "../../../../cli/slab-light.ts";
import { presetParams } from "../../../../src/core/presets.ts";

const SP = process.env.SLAB_DIR ?? "runs/slab";
const [cname, Ds, Ks, prec, repsS, only] = process.argv.slice(2);
const D = Number(Ds), K = Number(Ks), reps = Number(repsS);
const p = presetParams("forest");
const W = cname === "wideForest" ? 2 * p.world.width : p.world.width;
const H = p.world.height;
const buf = readFileSync(`${SP}/dep-${cname}.bin`);
const dep = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
const G = (Math.sqrt(5) - 1) / 2;
const A = prec === "f32" ? Float32Array : Float64Array;
const ts = new SlabSweep(W, H, D, p.c2, K, true, false, A, true);
ts.clear();
for (let i = 0; i < dep.length / 4; i++) ts.deposit(dep[4 * i], dep[4 * i + 1], D * ((0.5 + i * G) % 1), dep[4 * i + 3]);
let top = 0;
for (let i = 0; i < dep.length / 4; i++) top = Math.max(top, Math.floor(dep[4 * i + 1]) + 1);
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number;
const out: Record<string, unknown> = { case: cname, D, K, prec, updates: K * top * W * D, kExt: p.c2.kExt, minElevation: p.c2.minElevation, skyExponent: p.c2.skyExponent };
const tt: number[] = [];
if (!only || only === "ts") {
  for (let r = 0; r <= reps; r++) { const t0 = performance.now(); ts.compute(); if (r > 0) tt.push(performance.now() - t0); }
  out.ts = med(tt);
} else ts.compute();
for (const kind of ["scalar", "simd"]) {
  if (only && only !== kind && only !== "wasm") continue;
  for (const fast of prec === "f32" && kind === "simd" ? [0, 1, 2] : [0, 1]) {
    const bytes = readFileSync(`${SP}/slab-${kind}.wasm`);
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const e = instance.exports as Record<string, any>;
    const sfx = prec === "f32" ? "32" : "64";
    e[`new${sfx}`](W, H, D, K, 1, 0, p.c2.kExt, p.c2.minElevation, p.c2.skyExponent, p.c2.C, fast ? 1 : 0);
    const mem = () => (e.memory as WebAssembly.Memory).buffer;
    const n = W * H * D;
    new A(mem(), e[`lad${sfx}`](), n).set(ts.lad);
    e[`top${sfx}`](top);
    const t: number[] = [];
    const fn = fast === 2 ? e.compute32simd : e[`compute${sfx}`];
    for (let r = 0; r <= reps; r++) { const t0 = performance.now(); fn(); if (r > 0) t.push(performance.now() - t0); }
    const q = new A(mem(), e[`q${sfx}`](), n);
    let maxd = 0, sum = 0;
    for (let c = 0; c < n; c++) { const d = Math.abs(q[c] - ts.q[c]); if (d > maxd) maxd = d; sum += d; }
    const name = `${kind}${["", "Fast", "Explicit"][fast]}`;
    out[name] = med(t);
    out[`${name}Err`] = { max: maxd, mean: sum / n };
  }
}
console.log(JSON.stringify(out));
