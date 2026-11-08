// Exploratory (1 seed): Q against depth z in the slab, lone oak and garden, at HEAD.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const R = new URL("../../../../src", import.meta.url).href;
const { coreWasm, loadWorldsSync, RustWorld } = await import(`${R}/wasm/world.ts`);
const { forestParams, presetParams } = await import(`${R}/core/presets.ts`);
const { mergeParams } = await import(`${R}/core/params.ts`);
loadWorldsSync(readFileSync(coreWasm));
const out = process.argv[2];
mkdirSync(dirname(out), { recursive: true });
const rows: string[] = ["case,season,x,y,z,q,vx,vy,vz"];
const lrows: string[] = ["case,season,y,z,lad"];
const brows: string[] = ["case,season,tree,state,x,y,z,q"];
const mrows: string[] = ["case,season,tree,rootX,height,crownWidth,boleHeight"];
function grid(name: string, w: any, season: number, xs: number[]) {
  const D = w.paramsOf({ species: "" }).world.depth ?? 64;
  for (const x of xs) for (let y = 0.5; y < 200; y += 2) for (let z = 0.5; z < D; z += 1) {
    const s = w.sample(x, y, z);
    rows.push([name, season, x, y, z, s.q, s.vx, s.vy, s.vz].join(","));
  }
}
const cases: [string, any, number[]][] = [];
const oak = presetParams("oakOpen", 1);
const OX = Array.from({ length: 20 }, (_, i) => i * 8 + 4);
cases.push(["oak", oak, OX]);
cases.push(["oak_faces1", mergeParams(oak, { world: { faces: [1, 1] } }), OX]);
const g = forestParams(210, 1);
cases.push(["garden", g, Array.from({ length: 21 }, (_, i) => i * 10 + 5)]);
for (const [name, p, xs] of cases) {
  const w = RustWorld.create(p);
  let s = 0;
  for (const target of [60, 120]) {
    const t0 = Date.now(); w.step(target - s); s = target;
    console.error(name, s, ((Date.now() - t0) / 1000).toFixed(1) + "s", "trees", w.metrics().length, "h", Math.max(...w.metrics().map((m: any) => m.height ?? 0)).toFixed(1));
    grid(name, w, s, xs);
    const lad = w.core().light_lad(); const P = w.paramsOf({ species: "" }).world; const W = P.width, H = P.height, D = P.depth;
    for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) { let a = 0; for (let x = 0; x < W; x++) a += lad[(y * D + z) * W + x]; if (a > 0) lrows.push([name, s, y, z, a].join(",")); }
    w.trees.forEach((t: any, ti: number) => { const b = t.b; for (let i = 0; i < b.length; i++) { const st = b.cols.state[i]; if (st !== 1 && st !== 2 && st !== 5) continue; const m = b.cols.metamer[i]; brows.push([name, s, ti, st, t.tipX(m), t.tipY(m), t.tipZ(m), b.cols.q[i]].join(",")); } });
    w.metrics().forEach((m: any, i: number) => mrows.push([name, s, i, m.rootX, m.height, m.crownWidth, m.boleHeight].join(",")));
  }
  w.dispose();
}
writeFileSync(out, rows.join("\n") + "\n");
writeFileSync(out.replace(".csv","_lad.csv"), lrows.join("\n") + "\n");
writeFileSync(out.replace(".csv","_buds.csv"), brows.join("\n") + "\n");
writeFileSync(out.replace(".csv","_trees.csv"), mrows.join("\n") + "\n");
