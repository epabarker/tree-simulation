/** Original N1 lone trial path: direct Rust/WASM params, full-precision column dump. */
import { readFileSync, writeFileSync } from "node:fs";
import { newWorld } from "../../cli/trials.ts";
const [input, out] = process.argv.slice(2);
const params = JSON.parse(readFileSync(input, "utf8"));
if (params.world.sides === "periodic" || params.world.sidesZ === "periodic" || params.o4.enabled ||
    params.trees.length !== 1 || params.trees[0].species !== "beech")
  throw new Error("registered lone trial must be one open-sided beech without recruitment");
const world = newWorld(params);
const columns = ["parent", "slot", "order", "axis", "baseX", "baseY", "baseZ", "hx", "hy", "hz", "length", "radius", "stressWood"] as const;
const trees = [];
for (const season of [100, 150]) {
  world.run(season - world.season);
  const tree = world.trees[0];
  if (!tree.alive) throw new Error(`lone beech died before ${season}`);
  const p = world.paramsOf(tree);
  trees.push({species: "beech", seed: params.seed, trial: "lone", season, alive: true,
    r6: {enabled: p.r6.enabled, leafArea: p.r6.leafArea},
    m: Object.fromEntries(columns.map((key) => [key, Array.from(tree.m.cols[key])])),
    b: {metamer: Array.from(tree.b.cols.metamer), state: Array.from(tree.b.cols.state)},
    form: {}, profile: []});
}
writeFileSync(out, `${JSON.stringify({trees, hash: world.hash()})}\n`);
world.dispose();
