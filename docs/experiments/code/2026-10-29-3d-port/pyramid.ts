// The 3D pyramid as TypeScript (cli/slab-light.ts SlabPyramid, literal) and as Rust→WASM (literal
// and precomputed cone), on the same buds. usage: node pyramid.ts <case> <copies>
import { readFileSync } from "node:fs";
import { SlabPyramid } from "../../../../cli/slab-light.ts";
import { presetParams } from "../../../../src/core/presets.ts";

const SP = process.env.SLAB_DIR ?? "runs/slab";
const [cname, copiesS] = process.argv.slice(2);
const copies = Number(copiesS ?? 1);
const p = presetParams("forest");
const W = cname === "wideForest" ? 420 : 210;
const H = p.world.height;
const D = 32;
const one = new Float64Array(readFileSync(`${SP}/dep-${cname}.bin`).buffer.slice(0));
const dep = new Float64Array(one.length * copies);
for (let c = 0; c < copies; c++) dep.set(one, c * one.length);
const n = dep.length / 4;
const G = (Math.sqrt(5) - 1) / 2;
for (let i = 0; i < n; i++) dep[4 * i + 2] = D * ((0.5 + i * G) % 1);
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number;
const time = (fn: () => void, reps: number) => {
  fn();
  const t: number[] = [];
  for (let r = 0; r < reps; r++) {
    const t0 = performance.now();
    fn();
    t.push(performance.now() - t0);
  }
  return med(t);
};
const out: Record<string, unknown> = { case: cname, buds: n };
const ts = new SlabPyramid(W, H, D, p.c2, true, false, Float32Array);
const o = new Float64Array(4);
out.tsDeposit = time(() => {
  ts.clear();
  for (let i = 0; i < n; i++) ts.deposit(dep[4 * i], dep[4 * i + 1], dep[4 * i + 2], dep[4 * i + 3]);
}, 3);
out.tsSample = time(() => {
  for (let i = 0; i < n; i++) ts.sample(dep[4 * i], dep[4 * i + 1], dep[4 * i + 2], o);
}, 2);
for (const kind of ["scalar", "simd"]) {
  const { instance } = await WebAssembly.instantiate(readFileSync(`${SP}/slab-${kind}.wasm`), {});
  // biome-ignore lint: raw exports
  const e = instance.exports as Record<string, any>;
  e.pyr_new(W, H, D, 1, 0);
  const ptr = e.pyr_buf(4 * n);
  new Float64Array((e.memory as WebAssembly.Memory).buffer, ptr, 4 * n).set(dep);
  out[`${kind}Deposit`] = time(() => e.pyr_deposit(n), 5);
  out[`${kind}Literal`] = time(() => e.pyr_sample(n, 0), 5);
  out[`${kind}Cone`] = time(() => e.pyr_sample(n, 1), 5);
}
console.log(JSON.stringify(out));
