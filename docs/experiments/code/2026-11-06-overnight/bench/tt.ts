// One world per process: ms/season over seasons 81-100 and 181-200, width W, seed S.
import { readFileSync } from "node:fs";
const [root, w, seed] = [process.argv[2]!, +process.argv[3]!, +process.argv[4]!];
const { forestParams } = await import(`${root}/src/core/presets.ts`);
const { coreWasm, loadWorldsSync, RustWorld } = await import(`${root}/src/wasm/world.ts`);
loadWorldsSync(readFileSync(coreWasm));
const world = RustWorld.create(forestParams(w, seed));
let t0 = 0; const out: any = { seed, w };
for (let s = 1; s <= 200; s++) {
  if (s === 81 || s === 181) t0 = performance.now();
  world.step(1, true); world.snapshot(0, { junctions: false, field: false });
  if (s === 100) out.ms100 = +((performance.now() - t0) / 20).toFixed(1);
  if (s === 200) out.ms200 = +((performance.now() - t0) / 20).toFixed(1);
}
console.log(JSON.stringify(out));
