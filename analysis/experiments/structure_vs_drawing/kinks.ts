// Along each limb's thickest path (from every node follow the thickest child), the turn at each
// step, classified by whether the step continues the axis (main slot) or switches to a lateral.
import { patchSpecies } from "../../../src/core/params.ts";
import { presetParams } from "../../../src/core/presets.ts";
import { World } from "../../../src/core/world.ts";
const DEG = 180 / Math.PI;
function kinks(w: World) {
  const t = w.trees[0]!; const c = t.m.cols; const n = t.m.length;
  const kids: number[][] = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) kids[c.parent[i]]!.push(i);
  const res = { main: { n: 0, big: 0, sum: 0 }, lateral: { n: 0, big: 0, sum: 0 }, bigAt: [] as string[] };
  // Start at every node, follow the thickest child; each step counted once (thickest-child edges).
  for (let i = 0; i < n; i++) {
    const k = kids[i]!; if (k.length === 0) continue;
    const j = k.reduce((a, b) => (c.radius[b] > c.radius[a] ? b : a));
    if (c.radius[j] < 0.4 * c.radius[0]! * 0 + 0.2) continue; // limbs only: r ≥ 0.2 cells (5 cm)
    let d = c.angle[j] - c.angle[i]; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * DEG;
    const kind = c.slot[j] === 0 ? "main" : "lateral";
    res[kind].n++; res[kind].sum += d; if (d > 20) { res[kind].big++; }
  }
  return { main: { steps: res.main.n, meanTurn: +(res.main.sum / res.main.n).toFixed(1), over20: res.main.big },
           lateral: { steps: res.lateral.n, meanTurn: +(res.lateral.sum / res.lateral.n).toFixed(1), over20: res.lateral.big } };
}
for (const [name, p] of [["default", presetParams("oakOpen", 3)], ["r3 off", patchSpecies(presetParams("oakOpen", 3), "oak", { r3: { enabled: false } })]] as const) {
  const w = new World(p); w.run(150); console.log(name.padEnd(10), JSON.stringify(kinks(w)));
}
