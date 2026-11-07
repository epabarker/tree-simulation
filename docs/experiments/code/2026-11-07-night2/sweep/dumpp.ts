// dumpp.ts <repo> <species> <seed> <out.json> [patch JSON {"dotted.path": value}] : lone tree at 100 and 150
import { writeFileSync } from "node:fs";
const [repo, species, seedS, out, patchS] = process.argv.slice(2) as [string, string, string, string, string?];
const { newWorld, loneParams } = await import(`${repo}/cli/trials.ts`);
const { allometry } = await import(`${repo}/cli/allometry.ts`);
const METAMER = ["parent","slot","order","axis","baseX","baseY","baseZ","hx","hy","hz","length","radius","stressWood"] as const;
const plain = (xs: ArrayLike<number>) => Array.from(xs, (x) => (Number.isFinite(x) ? x : null));
const lp: any = loneParams(species, Number(seedS));
const patch = patchS ? JSON.parse(patchS) : {};
for (const [path, v] of Object.entries(patch)) {
  const keys = path.split("."); let cur: any = lp.species[species];
  for (const k of keys.slice(0, -1)) cur = cur[Array.isArray(cur) ? Number(k) : k] ??= {};
  cur[keys.at(-1) as string] = v;
}
const w = newWorld(lp);
const trees: any[] = []; let at = 0;
for (const s of [100, 150]) {
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
