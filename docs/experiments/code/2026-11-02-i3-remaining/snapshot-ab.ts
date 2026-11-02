// The snapshot's cost before and after its reused buffer (I3, the memory levers), interleaved in
// one process: the same world (forestParams(160, 10)) grown in each of two built packages, then 15
// rounds of one snapshot in each, A then B, as the garden takes it (no junctions, no field).
//   node docs/experiments/code/2026-11-02-i3-remaining/snapshot-ab.ts <pkg A> <pkg B> [seasons]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { forestParams } from "../../../../src/core/presets.ts";

const [a, b, seasonsArg = "100"] = process.argv.slice(2);
async function open(dir: string) {
  const pkg = await import(pathToFileURL(`${dir}/core.js`).href);
  pkg.initSync({ module: readFileSync(`${dir}/core_bg.wasm`) });
  const w = new pkg.World(JSON.stringify(forestParams(160, 10)));
  w.step(Number(seasonsArg), true);
  return w;
}
const worlds = [await open(a as string), await open(b as string)];
const ms: number[][] = [[], []];
for (let round = 0; round < 17; round++)
  for (const k of [0, 1]) {
    const t0 = performance.now();
    worlds[k].snapshot(false, false);
    if (round >= 2) ms[k]?.push(performance.now() - t0);
  }
const median = (xs: number[]) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)]?.toFixed(2);
console.log(JSON.stringify({ seasons: Number(seasonsArg), before: median(ms[0] as number[]), after: median(ms[1] as number[]) }));
