// Set 3's diagnosis (track E, 2026-11-02): the beech stand's renderer cues at one scale. Grows each
// stand as shots.mjs does (&frame=height, &clearBole), then reads the scene: per live tree, its
// height, limb crown base, the trunk's radius at breast height (1.3 m = 5.2 cells) and the width
// that radius draws at, and the clear bole's lateral offset in the picture's plane from the chord
// between its base and the limb crown base, with the page's wind on and off (Scene.wind = null).
//   node diagnose.mjs <origin> [source:trial:seed ...]   (default: beech stands, seeds 1–3)
// Prints one JSON line per tree and a summary per plate.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("playwright-core");
const here = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(readFileSync(join(here, "../../../../rust/presets.json"), "utf8")).presets.oakOpen.species;
const [origin, ...asked] = process.argv.slice(2);
const runs = (asked.length ? asked : ["beech:stand100:1", "beech:stand100:2", "beech:stand100:3"]).map((a) => {
  const [source, trial, seed] = a.split(":");
  return { source, trial, seed: Number(seed) };
});
const exe = process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const STAND_W = 84;
const ROW = [10.5, 31.5, 52.5, 73.5];
function patchOf(species, trial) {
  if (trial.startsWith("lone"))
    return { world: { width: 240, height: 200, walls: [] }, trees: [{ x: 120, species }], species: { [species]: table[species] } };
  const trees = [];
  for (let r = 0; r < 3; r++) for (const x of ROW) trees.push({ x: (x + r * 7) % STAND_W, z: (64 * (r + 0.5)) / 3, species });
  return {
    world: { width: STAND_W, height: 200, walls: [], sides: "periodic", faces: [0, 0] },
    trees,
    species: { [species]: table[species] },
  };
}
const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"],
});
for (const { source, trial, seed } of runs) {
  const seasons = trial.endsWith("60") ? 60 : 100;
  const p = Buffer.from(JSON.stringify(patchOf(source, trial))).toString("base64url");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() =>
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = ".app { grid-template-rows: 654px auto !important; } .charts { overflow: hidden; }";
      document.head.append(style);
    }),
  );
  const page = await ctx.newPage();
  const done = new Promise((resolve) => page.on("console", (m) => m.text().startsWith("bench") && resolve()));
  await page.goto(`${origin}?preset=oakOpen&seed=${seed}&p=${p}&bench&seasons=${seasons}&frame=height&clearBole`);
  await done;
  const out = await page.evaluate(() => {
    const sc = window.garden.scene;
    const s = sc.next;
    const scale = sc.camera.scale;
    const n = s.metamerCount;
    // The trunk: from each root, the thickest order-0 child of each order-0 metamer.
    const next = new Int32Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      const q = s.parent[j];
      if (q < 0 || s.order[j] !== 0 || s.order[q] !== 0) continue;
      if (next[q] < 0 || s.radius[j] > s.radius[next[q]]) next[q] = j;
    }
    const geom = () => {
      sc.computeGeometry(1);
      const g = sc.geom;
      return { bx: Float64Array.from(g.baseX), by: Float64Array.from(g.baseY), tx: Float64Array.from(g.tipX), ty: Float64Array.from(g.tipY) };
    };
    const on = geom();
    const wind = sc.wind;
    sc.wind = null;
    const off = geom();
    sc.wind = wind;
    sc.computeGeometry(1);
    const trees = [];
    for (const m of s.metrics) {
      if (!m.alive) continue;
      let j = -1;
      for (let k = 0; k < n; k++) if (s.parent[k] < 0 && s.tree[k] === m.tree) j = k;
      const chain = [];
      for (; j >= 0; j = next[j]) chain.push(j);
      const bh = chain.find((k) => s.y0[k] + s.length[k] >= 5.2) ?? chain[0];
      // The clear bole in the picture: its points up to the limb crown base, offset from the chord.
      const offset = (G) => {
        const pts = chain.filter((k) => G.ty[k] <= m.limbBase).map((k) => [G.tx[k], G.ty[k]]);
        if (pts.length < 3) return { max: 0, waves: 0, length: 0 };
        const [x0, y0] = [G.bx[chain[0]], G.by[chain[0]]];
        const [x1, y1] = pts[pts.length - 1];
        const L = Math.hypot(x1 - x0, y1 - y0);
        const d = pts.map(([x, y]) => ((x - x0) * (y1 - y0) - (y - y0) * (x1 - x0)) / L);
        // Waves: sign changes of the offset's slope between turning points at least 0.5 px apart.
        let waves = 0;
        let last = d[0];
        let dir = 0;
        for (const v of d) {
          const step = v - last;
          if (Math.abs(step) * scale < 0.5) continue;
          const sgn = Math.sign(step);
          if (dir !== 0 && sgn !== dir) waves++;
          dir = sgn;
          last = v;
        }
        return { max: Math.max(...d.map(Math.abs)), waves, length: L };
      };
      const a = offset(off);
      const b = offset(on);
      trees.push({
        tree: m.tree,
        height: m.height,
        limbBase: m.limbBase,
        dbhCm: s.radius[bh] * 50,
        drawnPx: 2 * s.radius[bh] * scale,
        hd: m.height / (2 * s.radius[bh]),
        bolePct: (100 * a.max) / Math.max(a.length, 1e-9),
        bolePx: a.max * scale,
        waves: a.waves,
        windPx: b.max * scale,
        windWaves: b.waves,
      });
    }
    return { scale, trees };
  });
  const med = (k) => {
    const v = out.trees.map((t) => t[k]).sort((x, y) => x - y);
    return Number(v[Math.floor(v.length / 2)].toFixed(2));
  };
  for (const t of out.trees) console.log(JSON.stringify({ source, trial, seed, ...t }));
  console.log(
    JSON.stringify({
      summary: `${source}-${trial}-s${seed}`,
      trees: out.trees.length,
      pxPerCell: out.scale,
      ...Object.fromEntries(["height", "limbBase", "dbhCm", "drawnPx", "hd", "bolePct", "bolePx", "waves", "windPx", "windWaves"].map((k) => [k, med(k)])),
    }),
  );
  await ctx.close();
}
await browser.close();
