/** Registered step5 full-precision WASM trials; no shipping param changes. */
import { readFileSync, writeFileSync } from "node:fs";
import { loneParams, newWorld } from "../../cli/trials.ts";
import { forestParams, specimenParams } from "../../src/core/presets.ts";
import { wasmMemoryBytes } from "../../src/wasm/world.ts";
const [mode, condition, seedText, widthText, output] = process.argv.slice(2);
if (!["lone", "garden", "budget", "params"].includes(mode) || !["current", "n3"].includes(condition)) throw new Error("bad trial");
const seed = Number(seedText), width = Number(widthText);
const patch = JSON.parse(readFileSync(new URL("day3_oak_n3.patch.json", import.meta.url), "utf8")).oak;
function apply(p: ReturnType<typeof loneParams>) {
  if (condition === "n3") for (const [path, value] of Object.entries(patch)) {
    const parts = path.split("."); let at: any = p.species!.oak;
    for (const part of parts.slice(0, -1)) at = at[part];
    at[parts.at(-1)!] = value;
  }
  return p;
}
const p = apply(mode === "lone" ? loneParams("oak", seed) : forestParams(width, seed, { recruits: 0.25 }));
if (mode === "params") { writeFileSync(output, JSON.stringify(p)); process.exit(0); }
const world = newWorld(p);
if (mode === "budget") {
  const start = performance.now();
  for (let s = 0; s < 300; s++) { world.step(1, true); world.snapshot(0, { junctions: false, field: false }); }
  const gardenMs = performance.now() - start;
  const specimen = newWorld(apply(specimenParams(seed)));
  for (let s = 0; s < 150; s++) { specimen.step(1, true); specimen.snapshot(0, { junctions: false, field: false }); }
  writeFileSync(output, JSON.stringify({ seed, width, condition, gardenMs, totalMs: performance.now() - start,
    memoryMB: wasmMemoryBytes() / 1e6, gardenMetamers: world.trees.reduce((n, t) => n + t.m.length, 0),
    specimenMetamers: specimen.trees.reduce((n, t) => n + t.m.length, 0), gardenHash: world.hash(), specimenHash: specimen.hash() }));
  specimen.dispose(); world.dispose(); process.exit(0);
}
const columns = ["parent", "slot", "order", "axis", "baseX", "baseY", "baseZ", "hx", "hy", "hz", "length", "radius", "stressWood"] as const;
const trees = [], survival = [];
for (const season of [100, 150]) {
  world.run(season - world.season);
  for (let index = 0; index < p.trees.length; index++) {
    if (p.trees[index].species !== "oak") continue;
    const t = world.trees[index];
    survival.push({ seed, season, index, alive: t.alive });
    if (!t.alive) continue;
    const q = world.paramsOf(t);
    trees.push({ species: "oak", seed, trial: mode === "lone" ? "lone" : "stand", season, index, alive: true,
      r6: { enabled: q.r6.enabled, leafArea: q.r6.leafArea },
      m: Object.fromEntries(columns.map(k => [k, Array.from(t.m.cols[k])])),
      b: { metamer: Array.from(t.b.cols.metamer), state: Array.from(t.b.cols.state) }, form: {}, profile: [] });
  }
}
writeFileSync(output, JSON.stringify({ params: p, trees, survival, hash: world.hash() }));
world.dispose();
