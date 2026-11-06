import { SkySweep } from "../../../../src/core/light/sky-sweep.ts";
import { presetParams } from "../../../../src/core/presets.ts";
import { World } from "../../../../src/core/world.ts";
import { SlabSweep, Shadowed } from "../../../../cli/slab-light.ts";

const p = presetParams("forest");
const w = new World(p);
const D = 8;
const sh = new Shadowed(w.light, new SlabSweep(p.world.width, p.world.height, D, p.c2, 16, true, false, Float64Array), (s) => s === 50);
w.light = sh;
for (let s = 0; s < 51; s++) w.step();
const deps = sh.lastDeposits;
const W = p.world.width, H = p.world.height;
// 1. fused == plain, both precisions, open and periodic z
for (const pz of [false, true]) for (const A of [Float64Array, Float32Array]) {
  const a = new SlabSweep(W, H, D, p.c2, 16, true, pz, A, false);
  const b = new SlabSweep(W, H, D, p.c2, 16, true, pz, A, true);
  for (const m of [a, b]) { m.clear(); for (let i = 0; i < deps.length / 4; i++) m.deposit(deps[4*i], deps[4*i+1], deps[4*i+2], deps[4*i+3]); m.compute(); }
  let maxd = 0; for (let c = 0; c < a.q.length; c++) maxd = Math.max(maxd, Math.abs(a.q[c] - b.q[c]));
  let mn = Infinity; for (let c = 0; c < a.q.length; c++) mn = Math.min(mn, a.q[c]);
  console.log(`periodicZ=${pz} ${A.name}: max |q_plain − q_fused| = ${maxd.toExponential(2)}, min q = ${mn.toFixed(3)}`);
}
// 2. With the 2D directions (dz = 0) and ℓ the same on every z line, the slab equals the 2D row march.
const two = new SkySweep(W, H, p.c2, true);
for (let i = 0; i < deps.length / 4; i++) two.deposit(deps[4*i], deps[4*i+1], deps[4*i+3]);
two.compute(0);
for (const fused of [false, true]) {
  const s3 = new SlabSweep(W, H, 3, p.c2, two.weight.length, true, true, Float64Array, fused);
  for (let k = 0; k < two.weight.length; k++) { s3.dirX[k] = two.dirX[k]; s3.dirY[k] = two.dirY[k]; s3.dirZ[k] = 0; s3.weight[k] = two.weight[k]; }
  s3.clear();
  for (let i = 0; i < deps.length / 4; i++) for (let z = 0; z < 3; z++) s3.deposit(deps[4*i], deps[4*i+1], z + 0.5, deps[4*i+3]);
  s3.compute();
  let maxd = 0;
  for (let row = 0; row < H; row++) for (let z = 0; z < 3; z++) for (let col = 0; col < W; col++) maxd = Math.max(maxd, Math.abs(s3.q[(row*3+z)*W+col] - two.q[row*W+col]));
  console.log(`2D directions, fused=${fused}: max |q_slab − q_2D| = ${maxd.toExponential(2)}`);
}
