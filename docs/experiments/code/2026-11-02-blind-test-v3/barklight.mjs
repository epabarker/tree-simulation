// Set 5's pilot measure (2026-11-02): would bark by light separate a stand's shaded boles from a lone
// tree's limbs? Grows each plate as shots.mjs does (seed 1, 100 seasons, &frame=height&clearBole
// &barkLight=0.5) and prints, per plate, the median light factor (1 − 0.5·shade) on the clear bole
// (order 0 below the limb crown base), on limbs (orders 1–2, older than 5) and on shoots (age ≤ 1):
// once by the field (Scene.woodLight, as committed) and once by the snapshot's `light` normalised as
// the leaves read it (√(light / the brightest shoot's)).
//   node barklight.mjs <origin>
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("playwright-core");
const here = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(readFileSync(join(here, "../../../../rust/presets.json"), "utf8")).presets.oakOpen.species;
const [origin] = process.argv.slice(2);
const exe = process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const ROW = [10.5, 31.5, 52.5, 73.5];
function patchOf(species, lone) {
  if (lone) return { world: { width: 240, height: 200, walls: [] }, trees: [{ x: 120, species }], species: { [species]: table[species] } };
  const trees = [];
  for (let r = 0; r < 3; r++) for (const x of ROW) trees.push({ x: (x + r * 7) % 84, z: (64 * (r + 0.5)) / 3, species });
  return { world: { width: 84, height: 200, walls: [], sides: "periodic", faces: [0, 0] }, trees, species: { [species]: table[species] } };
}
const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"],
});
for (const [species, lone] of [["beech", false], ["beech", true], ["hornbeam", false], ["birch", false]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const done = new Promise((resolve) => page.on("console", (m) => m.text().startsWith("bench") && resolve()));
  const p = Buffer.from(JSON.stringify(patchOf(species, lone))).toString("base64url");
  await page.goto(`${origin}?preset=oakOpen&seed=1&p=${p}&bench&seasons=100&frame=height&clearBole&barkLight=0.5`);
  await done;
  const out = await page.evaluate(() => {
    const sc = window.garden.scene;
    const s = sc.next;
    const n = s.metamerCount;
    const field = sc.woodLight(s);
    let max = 0;
    for (let j = 0; j < n; j++) if (s.age[j] <= 4 && s.light[j] > max) max = s.light[j];
    const byLight = Float32Array.from({ length: n }, (_, j) => 1 - 0.5 * (1 - Math.sqrt(Math.min(1, s.light[j] / max))));
    const limbBase = new Map(s.metrics.map((m) => [m.tree, m.limbBase]));
    const parts = {
      bole: (j) => s.order[j] === 0 && s.y0[j] < limbBase.get(s.tree[j]),
      limbs: (j) => s.order[j] >= 1 && s.order[j] <= 2 && s.age[j] > 5,
      shoots: (j) => s.age[j] <= 1,
    };
    const median = (L, pick) => {
      const v = [];
      for (let j = 0; j < n; j++) if (pick(j)) v.push(L[j]);
      v.sort((a, b) => a - b);
      return v.length ? Number(v[v.length >> 1].toFixed(2)) : null;
    };
    const row = (L) => Object.fromEntries(Object.entries(parts).map(([k, f]) => [k, median(L, f)]));
    return { field: row(field), light: row(byLight) };
  });
  console.log(JSON.stringify({ plate: `${species}-${lone ? "lone" : "stand"}100-s1`, ...out }));
  await ctx.close();
}
await browser.close();
