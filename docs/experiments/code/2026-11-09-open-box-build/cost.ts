// The lab's cost in WASM (#98): one preset's world, a season and then a snapshot as the worker
// takes one (`snapshot`), per season; WASM linear memory at the end. Fresh process per run.
// node cost.ts <preset> <seed> [seasons = 100] [walled]: "walled" puts the preset back in the
// half-walled box it had before ADR 0062 (64 deep, τ 0.2 faces; 240 wide for beechOpen, else 160).
import { readFileSync } from "node:fs";

const R = new URL("../../../../src", import.meta.url).href;
const { coreWasm, loadWorldsSync, RustWorld, wasmMemoryBytes } = await import(`${R}/wasm/world.ts`);
const { presetParams, WALLED_LONE } = await import(`${R}/core/presets.ts`);
const { mergeParams } = await import(`${R}/core/params.ts`);
loadWorldsSync(readFileSync(coreWasm));
const [preset, seed, seasons] = [process.argv[2] as string, Number(process.argv[3]), Number(process.argv[4] ?? 100)];
const base = presetParams(preset, seed);
const width = preset === "beechOpen" ? 240 : 160;
const params =
  process.argv[5] === "walled"
    ? mergeParams(base, {
        world: { ...WALLED_LONE, width },
        trees: [{ x: width / 2, species: base.trees[0].species }],
      })
    : base;
const w = RustWorld.create(params);
const step: number[] = [];
const snap: number[] = [];
for (let k = 0; k < seasons; k++) {
  const t0 = performance.now();
  w.step(1);
  const t1 = performance.now();
  w.snapshot(1000);
  step.push((t1 - t0) / 1000);
  snap.push((performance.now() - t1) / 1000);
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
console.log(
  JSON.stringify({
    preset,
    seed,
    seasons,
    hash: w.hash(),
    memoryMB: Math.round(wasmMemoryBytes() / 2 ** 20),
    total: +(mean(step) * seasons + mean(snap) * seasons).toFixed(1),
    stepLate10: +mean(step.slice(-10)).toFixed(3),
    snapLate10: +mean(snap.slice(-10)).toFixed(3),
    stepMax: +Math.max(...step).toFixed(3),
  }),
);
