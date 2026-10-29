/**
 * G2 in the browser (throwaway): every golden run with the TypeScript core and with the sky sweep
 * in Rust, against tests/golden.json (made by Node on x86-64 Linux), and this engine's Math
 * against the Rust core's (which is Node's V8, bit for bit). Results go to #out as JSON.
 *
 *   npx vite build -c docs/experiments/code/2026-10-29-g2/vite.config.ts   (then serve runs/g2-browser)
 */
import golden from "../../../../tests/golden.json";
import { caseKey, GOLDEN_CASES, runCase } from "../../../../tests/golden-cases.ts";
import { loadCore, useRustSkySweep } from "../../../../src/wasm/core.ts";
import { math_cos, math_exp, math_hypot, math_pow, math_sin } from "../../../../src/wasm/pkg-parity/core.js";

const out = document.getElementById("out") as HTMLElement;
const want = golden as Record<string, string>;

function goldens(label: string) {
  const failed: string[] = [];
  const t0 = performance.now();
  for (const c of GOLDEN_CASES) if (runCase(c) !== want[caseKey(c)]) failed.push(caseKey(c));
  return { label, cases: GOLDEN_CASES.length, failed, ms: Math.round(performance.now() - t0) };
}

let a = 99;
const rnd = () => {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const u = (lo: number, hi: number) => lo + (hi - lo) * rnd();
const N = 200_000;
function math() {
  const r: Record<string, number> = {};
  const count1 = (name: string, f: (x: number) => number, g: (x: number) => number, gen: () => number) => {
    let bad = 0;
    for (let i = 0; i < N; i++) {
      const x = gen();
      if (!Object.is(f(x), g(x))) bad++;
    }
    r[name] = bad;
  };
  const count2 = (name: string, f: (x: number, y: number) => number, g: (x: number, y: number) => number, gen: () => [number, number]) => {
    let bad = 0;
    for (let i = 0; i < N; i++) {
      const [x, y] = gen();
      if (!Object.is(f(x, y), g(x, y))) bad++;
    }
    r[name] = bad;
  };
  count1("sin", Math.sin, math_sin, () => u(-2 * Math.PI, 2 * Math.PI));
  count1("cos", Math.cos, math_cos, () => u(-2 * Math.PI, 2 * Math.PI));
  count1("exp", Math.exp, math_exp, () => u(-50, 0));
  count2("pow", (x, y) => x ** y, math_pow, () => [u(0, 1), u(0, 4)]);
  count2("hypot", Math.hypot, math_hypot, () => [u(-2, 2), u(-2, 2)]);
  return { samples: N, mismatches: r };
}

async function main() {
  const res: Record<string, unknown> = { userAgent: navigator.userAgent };
  res.ts = goldens("TypeScript core");
  await loadCore();
  res.math = math();
  useRustSkySweep();
  res.rust = goldens("sky sweep in Rust");
  out.textContent = JSON.stringify(res, null, 2);
  out.dataset.done = "1";
}
main().catch((e) => {
  out.textContent = String(e?.stack ?? e);
  out.dataset.done = "1";
});
