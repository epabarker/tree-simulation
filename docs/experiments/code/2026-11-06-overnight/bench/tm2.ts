import { readFileSync } from "node:fs";
const [root, w, seeds, mode] = [process.argv[2]!, +process.argv[3]!, process.argv[4]!.split(",").map(Number), process.argv[5] ?? ""];
const { forestParams } = await import(`${root}/src/core/presets.ts`);
const { coreWasm, loadWorldsSync, RustWorld, wasmMemoryBytes } = await import(`${root}/src/wasm/world.ts`);
loadWorldsSync(readFileSync(coreWasm));
const mb = () => +(wasmMemoryBytes() / 1048576).toFixed(0);
for (const seed of seeds) {
  const world = RustWorld.create(forestParams(w, seed));
  const out: any = { seed };
  for (let s = 1; s <= 200; s++) {
    world.step(1, true);
    world.snapshot(0, { junctions: false, field: false });
    if (s === 100 || s === 200) {
      const m = world.metrics();
      const al = m.filter((t: any) => t.alive);
      out["s" + s] = { mem: mb(), met: m.reduce((a: number, t: any) => a + (t.alive ? t.metamers : 0), 0), bud: al.reduce((a: number, t: any) => a + t.buds, 0), alive: al.length, total: m.length };
    }
  }
  console.log(JSON.stringify(out));
}
