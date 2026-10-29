/**
 * G2 and I1 (ADR 0024): every Math routine the core calls, the Rust core's against V8's, bit for
 * bit, on this machine's Node (whose Math.pow is the C library's). A failure here on a new
 * platform means its JavaScript differs, not that the Rust does: the goldens are made on x86-64
 * Linux (G2 note).
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  math_acos,
  math_asin,
  math_atan2,
  math_cbrt,
  math_cos,
  math_exp,
  math_hypot,
  math_log,
  math_pow,
  math_sin,
} from "../src/wasm/pkg-parity/core.js";
import { loadRustCore } from "./wasm.ts";

let a = 2026;
const rnd = () => {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const u = (lo: number, hi: number) => lo + (hi - lo) * rnd();
const f64 = new Float64Array(1);
const u64 = new BigUint64Array(f64.buffer);
const anyBits = () => {
  u64[0] = (BigInt(Math.floor(rnd() * 2 ** 32)) << 32n) | BigInt(Math.floor(rnd() * 2 ** 32));
  return f64[0];
};
const SPECIALS = [0, -0, Infinity, -Infinity, NaN, 1, -1, 0.5, 2, -2, 1.5, 5e-324, 1e-300, 1e300];
const N = 100_000;

function mismatches(f: (x: number) => number, g: (x: number) => number, gen: () => number) {
  const bad: number[] = [];
  for (const x of SPECIALS) if (!Object.is(f(x), g(x))) bad.push(x);
  for (let i = 0; i < N; i++) {
    const x = gen();
    if (!Object.is(f(x), g(x))) bad.push(x);
  }
  return bad.slice(0, 5);
}

function mismatches2(
  f: (x: number, y: number) => number,
  g: (x: number, y: number) => number,
  gen: () => [number, number],
) {
  const bad: [number, number][] = [];
  for (const x of SPECIALS)
    for (const y of SPECIALS) if (!Object.is(f(x, y), g(x, y))) bad.push([x, y]);
  for (let i = 0; i < N; i++) {
    const [x, y] = gen();
    if (!Object.is(f(x, y), g(x, y))) bad.push([x, y]);
  }
  return bad.slice(0, 5);
}

const angle = () =>
  rnd() < 0.7 ? u(-2 * Math.PI, 2 * Math.PI) : rnd() < 0.7 ? u(-1e6, 1e6) : anyBits();

describe("the Rust core's Math is V8's, bit for bit (G2, I1)", () => {
  beforeAll(loadRustCore);
  it("sin", () => expect(mismatches(math_sin, Math.sin, angle)).toEqual([]));
  it("cos", () => expect(mismatches(math_cos, Math.cos, angle)).toEqual([]));
  it("exp", () =>
    expect(mismatches(math_exp, Math.exp, () => (rnd() < 0.7 ? u(-50, 0) : u(-746, 710)))).toEqual(
      [],
    ));
  it("pow", () =>
    expect(
      mismatches2(
        math_pow,
        (x, y) => x ** y,
        () => {
          const r = rnd();
          if (r < 0.4) return [u(0, 1), u(0, 4)];
          if (r < 0.6) return [10 ** u(-300, 300), u(-3, 3)];
          if (r < 0.8) return [-u(0, 10), Math.round(u(-40, 40))];
          return [anyBits(), u(-2, 2)];
        },
      ),
    ).toEqual([]));
  it("log", () =>
    expect(mismatches(math_log, Math.log, () => (rnd() < 0.7 ? u(0, 2) : anyBits()))).toEqual([]));
  it("atan2", () =>
    expect(
      mismatches2(math_atan2, Math.atan2, () =>
        rnd() < 0.7 ? [u(-3, 3), u(-3, 3)] : [anyBits(), anyBits()],
      ),
    ).toEqual([]));
  it("asin", () =>
    expect(mismatches(math_asin, Math.asin, () => (rnd() < 0.7 ? u(-1, 1) : anyBits()))).toEqual(
      [],
    ));
  it("acos", () =>
    expect(mismatches(math_acos, Math.acos, () => (rnd() < 0.7 ? u(-1, 1) : anyBits()))).toEqual(
      [],
    ));
  it("cbrt", () =>
    expect(mismatches(math_cbrt, Math.cbrt, () => (rnd() < 0.7 ? u(0, 1e4) : anyBits()))).toEqual(
      [],
    ));
  it("hypot", () =>
    expect(
      mismatches2(math_hypot, Math.hypot, () =>
        rnd() < 0.7 ? [u(-2, 2), u(-2, 2)] : [anyBits(), anyBits()],
      ),
    ).toEqual([]));
});
