/**
 * I1 (ADR 0024): every Math routine the TypeScript core calls, Rust's `libm` crate (the production
 * build, src/wasm/pkg) against this Node's V8, bit for bit, on 10⁶ inputs each: half in the range
 * the core feeds it, half any bit pattern. A routine with mismatches is ported into parity mode.
 *
 *   node docs/experiments/code/2026-10-29-i1/math-survey.ts [pkg]   (after npm run build:wasm)
 */
import { readFileSync } from "node:fs";

const pkg = process.argv[2] ?? "pkg";
const m = await import(`../../../../src/wasm/${pkg}/core.js`);
m.initSync({ module: readFileSync(new URL(`../../../../src/wasm/${pkg}/core_bg.wasm`, import.meta.url)) });

let a = 1729;
const rnd = () => {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const u = (lo: number, hi: number) => lo + (hi - lo) * rnd();
const f = new Float64Array(1);
const b = new BigUint64Array(f.buffer);
const bits = () => {
  b[0] = (BigInt(Math.floor(rnd() * 2 ** 32)) << 32n) | BigInt(Math.floor(rnd() * 2 ** 32));
  return f[0] as number;
};
const N = 1_000_000;

type Gen = () => number[];
const cases: [string, (...x: number[]) => number, (...x: number[]) => number, Gen][] = [
  ["sin", m.math_sin, Math.sin, () => [rnd() < 0.5 ? u(-7, 7) : bits()]],
  ["cos", m.math_cos, Math.cos, () => [rnd() < 0.5 ? u(-7, 7) : bits()]],
  ["exp", m.math_exp, Math.exp, () => [rnd() < 0.5 ? u(-50, 1) : u(-746, 710)]],
  ["log", m.math_log, Math.log, () => [rnd() < 0.5 ? u(0, 1) : bits()]],
  ["atan2", m.math_atan2, Math.atan2, () => (rnd() < 0.5 ? [u(-3, 3), u(-3, 3)] : [bits(), bits()])],
  ["asin", m.math_asin, Math.asin, () => [rnd() < 0.5 ? u(-1, 1) : bits()]],
  ["acos", m.math_acos, Math.acos, () => [rnd() < 0.5 ? u(-1, 1) : bits()]],
  ["cbrt", m.math_cbrt, Math.cbrt, () => [rnd() < 0.5 ? u(0, 1e5) : bits()]],
  ["hypot", m.math_hypot, Math.hypot, () => (rnd() < 0.5 ? [u(-5, 5), u(-5, 5)] : [bits(), bits()])],
  ["pow", m.math_pow, (x: number, y: number) => x ** y, () => (rnd() < 0.5 ? [u(0, 1), u(0.3, 3)] : [bits(), u(-3, 3)])],
  
  
  
  
];
for (const [name, rust, v8, gen] of cases) {
  let bad = 0;
  let example = "";
  for (let i = 0; i < N; i++) {
    const x = gen();
    const r = rust(...x);
    const j = v8(...x);
    if (!Object.is(r, j)) {
      bad += 1;
      if (!example) example = `${name}(${x.join(", ")}) = ${r} (V8 ${j})`;
    }
  }
  console.log(`${name.padEnd(6)} ${String(bad).padStart(7)} of ${N} differ ${example}`);
}
