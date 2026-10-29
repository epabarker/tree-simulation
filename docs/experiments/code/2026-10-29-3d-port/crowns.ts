import { treeMetrics } from "../../../../src/core/metrics.ts";
import { forestParams, presetParams } from "../../../../src/core/presets.ts";
import { World } from "../../../../src/core/world.ts";
import type { Params } from "../../../../src/core/params.ts";

const cases: Record<string, (s: number) => Params> = {
  forest: (s) => presetParams("forest", s),
  home210: (s) => forestParams(210, s),
  home520: (s) => forestParams(520, s),
  oakOpen: (s) => presetParams("oakOpen", s),
  skyTree: (s) => presetParams("skyTree", s),
};
const q = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))] ?? 0; };
for (const [name, make] of Object.entries(cases)) {
  for (const season of [60, 100, 150]) {
    const all: number[] = []; const canopy: number[] = []; const hs: number[] = [];
    for (const seed of [1, 2, 3, 4, 5]) {
      const w = new World(make(seed));
      for (let s = 0; s < season; s++) w.step();
      const ms = w.trees.filter((t) => t.alive).map((t) => treeMetrics(t, w));
      const hmax = Math.max(...ms.map((m) => m.height));
      for (const m of ms) { if (m.height <= 0) continue; all.push(m.crownWidth); if (m.height >= 0.7 * hmax) { canopy.push(m.crownWidth); hs.push(m.height); } }
    }
    console.log(`${name} s${season}: canopy n=${canopy.length} crownW p50=${q(canopy,0.5).toFixed(1)} p90=${q(canopy,0.9).toFixed(1)} max=${q(canopy,1).toFixed(1)}  height p50=${q(hs,0.5).toFixed(1)} | all n=${all.length} p50=${q(all,0.5).toFixed(1)}`);
  }
}
