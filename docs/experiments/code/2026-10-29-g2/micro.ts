/**
 * G2 timing: where the Rust sky sweep's time goes, against the TypeScript sweep's, on the same
 * field. Grows `forest` (or the preset named) for 60 seasons in TypeScript, copies the season's
 * deposits into both sweeps, then times compute(), the deposits and the samples separately.
 *
 *   node docs/experiments/code/2026-10-29-g2/micro.ts [preset] [seasons]
 */
import { readFileSync } from "node:fs";
import type { LightModel, LightSample } from "../../../../src/core/light/light-model.ts";
import { SkySweep } from "../../../../src/core/light/sky-sweep.ts";
import { presetParams, type PresetName } from "../../../../src/core/presets.ts";
import { World } from "../../../../src/core/world.ts";
import { coreWasmUrl, loadCoreSync } from "../../../../src/wasm/core.ts";
import { WasmSkySweep } from "../../../../src/wasm/sky-sweep.ts";

loadCoreSync(readFileSync(coreWasmUrl));
const preset = (process.argv[2] ?? "forest") as PresetName;
const params = presetParams(preset, 1);
const world = new World(params);
world.run(Number(process.argv[3] ?? 60));

// This season's deposits, as the season loop makes them.
const deps: number[] = [];
const rec = { deposit: (x: number, y: number, a = 1) => deps.push(x, y, a) } as unknown as LightModel;
const real = world.light;
world.light = new Proxy(real, {
  get: (t, k) => (k === "deposit" ? rec.deposit : Reflect.get(t, k)),
});
world.step();
world.light = real;
const { width: W, height: H } = params.world;
const periodic = params.world.sides === "periodic";
const models: [string, LightModel][] = [
  ["ts", new SkySweep(W, H, params.c2, periodic)],
  ["rust", new WasmSkySweep(W, H, params.c2, periodic)],
];
const out: LightSample = { q: 0, vx: 0, vy: 0 };
const time = (f: () => void, reps: number) => {
  for (let i = 0; i < 3; i++) f();
  const t: number[] = [];
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    f();
    t.push(performance.now() - t0);
  }
  t.sort((a, b) => a - b);
  return t[Math.floor(t.length / 2)] as number;
};
console.log(`${preset}: ${deps.length / 3} deposits`);
// Interleaved rounds, so the VM's drift falls on both models alike; medians over all rounds.
const res: Record<string, { compute: number[]; deposit: number[]; sample: number[] }> = {};
for (const [name] of models) res[name] = { compute: [], deposit: [], sample: [] };
const ROUNDS = Number(process.env.ROUNDS ?? 15);
for (let round = 0; round < ROUNDS; round++) {
  for (const [name, m] of models) {
    const deposit = () => {
      m.clear();
      for (let i = 0; i < deps.length; i += 3) m.deposit(deps[i] as number, deps[i + 1] as number, deps[i + 2] as number);
    };
    deposit();
    const r = res[name] as { compute: number[]; deposit: number[]; sample: number[] };
    r.compute.push(time(() => m.compute(world.season), 10));
    r.deposit.push(time(deposit, 10));
    r.sample.push(
      time(() => {
        for (let i = 0; i < deps.length; i += 3) m.sample(deps[i] as number, deps[i + 1] as number, 1.5, out);
      }, 10),
    );
  }
}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number;
for (const [name] of models) {
  const r = res[name] as { compute: number[]; deposit: number[]; sample: number[] };
  console.log(`${name.padEnd(5)} compute ${med(r.compute).toFixed(3)} ms · deposits ${med(r.deposit).toFixed(3)} ms · samples ${med(r.sample).toFixed(3)} ms`);
}
