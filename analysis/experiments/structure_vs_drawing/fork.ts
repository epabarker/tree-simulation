import { presetParams } from "../../../src/core/presets.ts";
import { mergeParams } from "../../../src/core/params.ts";
import { HAND_FLORA } from "../../../src/core/flora.ts";
import { World } from "../../../src/core/world.ts";
import { formMetrics } from "../../../src/core/form.ts";
for (const [name, mk] of [["fitted", (s: number) => presetParams("oakOpen", s)], ["hand", (s: number) => mergeParams(presetParams("oakOpen", s), { species: HAND_FLORA } as any)]] as const) {
  for (const seed of [3, 4]) {
    const w = new World(mk(seed)); const row: string[] = [];
    for (const until of [10, 20, 30, 40, 60, 100, 150]) {
      w.run(until - w.season); const t = w.trees[0]!; const f = formMetrics(t, w.paramsOf(t));
      let h = 0; for (let i = 0; i < t.m.length; i++) h = Math.max(h, t.tipY(i));
      row.push(`s${until}: H ${(h * .25).toFixed(1)}m fork ${(f.forkHeight * h * .25).toFixed(1)}m lead ${f.leaderDominance.toFixed(1)}`);
    }
    console.log(name, seed, row.join(" | "));
  }
}
