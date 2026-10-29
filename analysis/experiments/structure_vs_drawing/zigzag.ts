// usage: node analysis/experiments/structure_vs_drawing/zigzag.ts
// Zigzag diagnostic: along each axis (same order, parent→child), the turning angle between
// consecutive metamers and how often its sign alternates. Ablations of R3 and C4 terms on oakOpen.
import { mergeParams, patchSpecies } from "../../../src/core/params.ts";
import { presetParams } from "../../../src/core/presets.ts";
import { World } from "../../../src/core/world.ts";

function zig(world: World) {
  let turns = 0, abs = 0, alt = 0, pairs = 0;
  for (const t of world.trees) {
    if (!t.alive) continue;
    const c = t.m.cols;
    const turn = new Float64Array(t.m.length).fill(Number.NaN);
    for (let i = 0; i < t.m.length; i++) {
      const p = c.parent[i];
      if (p < 0 || c.order[i] !== c.order[p]) continue;
      let d = c.angle[i] - c.angle[p];
      d = Math.atan2(Math.sin(d), Math.cos(d));
      turn[i] = d; turns++; abs += Math.abs(d);
      if (!Number.isNaN(turn[p]) && turn[p] !== 0 && d !== 0) { pairs++; if (Math.sign(d) !== Math.sign(turn[p])) alt++; }
    }
  }
  return { meanTurnDeg: +((abs / turns) * 180 / Math.PI).toFixed(1), signAlternation: +(alt / pairs).toFixed(2) };
}
const cases: [string, (p: any) => any][] = [
  ["default", (p) => p],
  ["r3 posture off", (p) => patchSpecies(p, "oak", { r3: { posture: false } })],
  ["r3 off", (p) => patchSpecies(p, "oak", { r3: { enabled: false } })],
  ["c4 noise 0", (p) => mergeParams(p, { c4: { sigma: 0 } })],
];
for (const [name, f] of cases) {
  const w = new World(f(presetParams("oakOpen", 3)));
  w.run(150);
  console.log(name.padEnd(16), JSON.stringify(zig(w)), "metamers", w.trees[0]?.m.length);
}
