/**
 * The light-memory probe's floor reading (docs/experiments/2026-11-16-light-memory-probe.md): how
 * well a ground cell's light at one season predicts the next, raw and under ADR 0073's running
 * mean. One garden run under an arm of cli/seedling-stubs-probe.ts, in WASM, from season 1 to
 * `--at` + 5. Every season the script samples every ground cell's centre at y 0.5 (the field O4
 * reads, `stubLightY` absent) and folds it into its own running mean m ← m + a·(q − m),
 * a = 1 − e^(−1/τ) (`--tau`, default the arm's lightMemory, else 5): the core's rule restated, so
 * it reads the same quantity for an arm without the memory (s3d) as for one with it. Reports, at
 * season N = `--at`: ρ(raw N, raw N+1), ρ(mean N, mean N+1), and ρ(mean N, the raw mean over
 * N+1..N+5) (what a recruit selected at N will see), Spearman over all cells. EXPLORATORY.
 *
 *   node docs/experiments/code/2026-11-16-light-memory-probe/floor.ts --arm s3dT5 [--width 160] [--seed 1] [--at 100] [--tau 5]
 */
import { readFileSync } from "node:fs";
import { arg, type Patch, patched } from "../../../../cli/shared.ts";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

const o4 = (o: Record<string, unknown>): Patch => ({ params: { o4: o } as Patch["params"] });
const S3D = { stubs: true, stubLight: 0.15, stubDeath: 3, stubDemote: 0.075 };
/** cli/seedling-stubs-probe.ts' arms, restated (importing it would run it). */
const ARMS: Record<string, Patch> = {
  s3d: o4(S3D),
  s3dT25: o4({ ...S3D, lightMemory: 2.5 }),
  s3dT5: o4({ ...S3D, lightMemory: 5 }),
  s3dT10: o4({ ...S3D, lightMemory: 10 }),
};

loadWorldsSync(readFileSync(coreWasm));
const armName = arg("--arm", "s3dT5");
const width = Number(arg("--width", "160"));
const seed = Number(arg("--seed", "1"));
const at = Number(arg("--at", "100"));
const arm = ARMS[armName] as Patch;
const armTau = (arm.params as { o4: { lightMemory?: number } }).o4.lightMemory;
const tau = Number(arg("--tau", String(armTau ?? 5)));
const a = 1 - Math.exp(-1 / tau);
const world = RustWorld.create(patched(forestParams(width, seed), arm));
const C = world.params.c2.C;
const depth = world.params.world.depth ?? 64;
const read = () => {
  const out = new Float64Array(width * depth);
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++) out[z * width + x] = world.sample(x + 0.5, 0.5, z + 0.5).q / C;
  return out;
};
let mean: Float64Array | undefined;
const raw: Float64Array[] = [];
const means: Float64Array[] = [];
for (let s = 1; s <= at + 5; s++) {
  world.run(1);
  const q = read();
  if (!mean) mean = q.slice();
  else for (let k = 0; k < q.length; k++) mean[k] += a * ((q[k] as number) - (mean[k] as number));
  if (s >= at) {
    raw.push(q);
    means.push(mean.slice());
  }
}
world.dispose();

const rank = (xs: Float64Array) => {
  const idx = Array.from(xs.keys()).sort((i, j) => (xs[i] as number) - (xs[j] as number));
  const r = new Float64Array(xs.length);
  idx.forEach((i, k) => {
    r[i] = k;
  });
  return r;
};
const rho = (x: Float64Array, y: Float64Array) => {
  const [rx, ry] = [rank(x), rank(y)];
  const m = (x.length - 1) / 2;
  let [sxy, sxx, syy] = [0, 0, 0];
  for (let i = 0; i < x.length; i++) {
    const [dx, dy] = [(rx[i] as number) - m, (ry[i] as number) - m];
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return (sxy / Math.sqrt(sxx * syy)).toFixed(2);
};
const ahead = new Float64Array(width * depth);
for (let k = 1; k <= 5; k++)
  for (let i = 0; i < ahead.length; i++) ahead[i] += ((raw[k] as Float64Array)[i] as number) / 5;
const [r0, r1, m0, m1] = [raw[0], raw[1], means[0], means[1]] as Float64Array[];
const share = (xs: Float64Array, f: (x: number) => boolean) =>
  ((100 * xs.filter(f).length) / xs.length).toFixed(1);
console.log(
  `${armName} w${width} s${seed} N ${at} τ ${tau}: ρ(raw N, raw N+1) ${rho(r0, r1)}; ρ(mean N, mean N+1) ${rho(m0, m1)}; ρ(mean N, raw mean N+1..N+5) ${rho(m0, ahead)}; ρ(raw N, raw mean N+1..N+5) ${rho(r0, ahead)}; cells ≥ 0.15: raw ${share(r0, (q) => q >= 0.15)}%, mean ${share(m0, (q) => q >= 0.15)}%`,
);
