/**
 * Trace B's second half: how much of the floor's light at one season predicts the next, over
 * every ground cell (not only the promoted). One garden run (s3d), read at seasons N and N + 1
 * (and N + 2). Measures at season N: the cell's centre at y 0.5 (promotion's), the mean over its
 * 3 × 3 cells, and the centre at y 4.5. EXPLORATORY: a trace, not a claim.
 *
 *   node docs/experiments/code/2026-11-16-stub-churn-and-hornbeam-ceiling/floor.ts [--width 160] [--seed 1] [--at 100] [--patch '{}']
 */
import { readFileSync } from "node:fs";
import { arg, type Patch, patched } from "../../../../cli/shared.ts";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";
import { ARMS_FOR_TRACE } from "./arms.ts";

loadWorldsSync(readFileSync(coreWasm));
const width = Number(arg("--width", "160"));
const seed = Number(arg("--seed", "1"));
const at = Number(arg("--at", "100"));
const extra = JSON.parse(arg("--patch", "{}")) as Patch["params"];
const params = patched(
  patched(forestParams(width, seed), ARMS_FOR_TRACE.s3d as Patch),
  { params: extra },
);
const world = RustWorld.create(params);
const C = world.params.c2.C;
const depth = world.params.world.depth ?? 64;
world.run(at);
const read = (y: number) => {
  const out: number[] = [];
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++) out.push(world.sample(x + 0.5, y, z + 0.5).q / C);
  return out;
};
const box = (g: number[]) =>
  g.map((_, k) => {
    const x = k % width;
    const z = Math.floor(k / width);
    let s = 0;
    let n = 0;
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const zz = z + dz;
        if (zz < 0 || zz >= depth) continue;
        s += g[zz * width + ((x + dx + width) % width)] as number;
        n++;
      }
    return s / n;
  });
const g0 = read(0.5);
const b0 = box(g0);
const h0 = read(4.5);
world.run(1);
const g1 = read(0.5);
world.run(1);
const g2 = read(0.5);
world.dispose();

const rank = (xs: number[]) => {
  const r = new Array<number>(xs.length);
  xs.map((x, i) => [x, i] as const)
    .sort((a, b) => a[0] - b[0])
    .forEach(([, i], k) => {
      r[i] = k;
    });
  return r;
};
const rho = (a: number[], b: number[]) => {
  const ra = rank(a);
  const rb = rank(b);
  const m = (a.length - 1) / 2;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < a.length; i++) {
    const da = (ra[i] as number) - m;
    const db = (rb[i] as number) - m;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return (sab / Math.sqrt(saa * sbb)).toFixed(2);
};
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
const share = (xs: number[], f: (x: number, i: number) => boolean) =>
  ((100 * xs.filter(f).length) / xs.length).toFixed(1);
const lit = g0.map((q) => q >= 0.15);
const litIdx = g0.flatMap((q, i) => (q >= 0.15 ? [i] : []));
console.log(`garden ${width} seed ${seed}, seasons ${at}–${at + 2}, ${g0.length} ground cells`);
console.log(`  median ground Q/C at y 0.5: ${med(g0).toFixed(3)} (N), ${med(g1).toFixed(3)} (N+1)`);
console.log(`  cells ≥ 0.15 at N: ${share(g0, (q) => q >= 0.15)}%; at N+1: ${share(g1, (q) => q >= 0.15)}%`);
console.log(
  `  of the cells ≥ 0.15 at N (${litIdx.length}): ≥ 0.15 at N+1 ${share(litIdx, (i) => (g1[i] as number) >= 0.15)}%, < 0.075 at N+1 ${share(litIdx, (i) => (g1[i] as number) < 0.075)}%, ≥ 0.15 at both N+1 and N+2 ${share(litIdx, (i) => (g1[i] as number) >= 0.15 && (g2[i] as number) >= 0.15)}%`,
);
console.log(`  ρ(centre y 0.5 at N, at N+1): ${rho(g0, g1)}; (N, N+2): ${rho(g0, g2)}; (N+1, N+2): ${rho(g1, g2)}`);
console.log(`  ρ(3×3 mean at N, centre at N+1): ${rho(b0, g1)}`);
console.log(`  ρ(centre y 4.5 at N, centre y 0.5 at N+1): ${rho(h0, g1)}`);
const g01 = g0.map((q, i) => (q + (g1[i] as number)) / 2);
console.log(`  ρ(mean of N and N+1, N+2): ${rho(g01, g2)}`);
void lit;
