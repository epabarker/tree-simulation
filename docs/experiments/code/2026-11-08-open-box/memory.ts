// WASM linear memory of one lone-tree world after N seasons, in a fresh process (memory never shrinks).
// node memory.ts <params.json> <seasons>
import { readFileSync } from "node:fs";
const R = new URL("../../../../src", import.meta.url).href;
const { coreWasm, loadWorldsSync, RustWorld, wasmMemoryBytes } = await import(`${R}/wasm/world.ts`);
loadWorldsSync(readFileSync(coreWasm));
const w = RustWorld.create(JSON.parse(readFileSync(process.argv[2] as string, "utf8")));
const n = Number(process.argv[3]);
const t0 = performance.now();
const per: number[] = [];
for (let k = 0; k < n; k++) {
  const ts = performance.now();
  w.step(1);
  per.push((performance.now() - ts) / 1000);
}
const late = per.slice(-10);
console.log(JSON.stringify({ params: process.argv[2], seasons: n, memoryMB: wasmMemoryBytes() / 2 ** 20, secs: (performance.now() - t0) / 1000, late10: late.reduce((a, b) => a + b, 0) / late.length, max: Math.max(...per) }));
