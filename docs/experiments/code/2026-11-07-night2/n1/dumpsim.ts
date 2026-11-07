// node dumpsim.ts <species> <seed> <out> : lone tree, HEAD params, dumped at seasons 30, 60, 100 in dump-trees' column format
import { writeFileSync } from "node:fs";
import { newWorld, loneParams } from "/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170/cli/trials.ts";
import { allometry } from "/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170/cli/allometry.ts";
const [species, seedS, out] = process.argv.slice(2) as [string, string, string];
const METAMER = ["parent","slot","order","axis","baseX","baseY","baseZ","hx","hy","hz","length","radius","stressWood"] as const;
const plain = (xs: ArrayLike<number>) => Array.from(xs, (x) => (Number.isFinite(x) ? x : null));
const lp: any = loneParams(species, Number(seedS)); const L = Number(process.env.LAMBDA0 ?? "0"); if (L > 0) lp.species[species].r2.levels[0].lambda = L; const w = newWorld(lp);
const trees: any[] = []; let at = 0;
for (const s of [30, 60, 100, 150]) {
  w.run(s - at); at = s;
  const t: any = w.trees[0];
  if (!t.alive) continue;
  const p = w.paramsOf(t);
  const a = allometry(t.m.cols, t.b.cols);
  trees.push({ species, seed: Number(seedS), trial: "lone", season: s, index: 0, alive: true,
    r6: { enabled: p.r6.enabled, leafArea: p.r6.leafArea },
    m: Object.fromEntries(METAMER.map((c) => [c, plain(t.m.cols[c])])),
    b: { metamer: plain(t.b.cols.metamer), state: plain(t.b.cols.state) }, form: {}, profile: [], allometry: a });
}
writeFileSync(out, JSON.stringify({ trees }));
