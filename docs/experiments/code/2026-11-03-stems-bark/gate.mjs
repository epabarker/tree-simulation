// Step 0's gate (2026-11-03): does the backdrop rule separate a closed stand from a lone tree? Grows
// each plate as shots.mjs does (&frame=height) and computes, from the snapshot's field, d(y): the
// field's shade at the row's 10th percentile, over the top row's (Scene's `interiorDepth`, mirrored
// here so the gate runs before the code). Prints per plate: max d over all rows, and the median d over
// the clear bole's heights (1 m up to the median limb crown base).
//   node gate.mjs <origin> [source:trial:seed ...]   (default: beech, hornbeam, oak, birch; all trials; seeds 1–3)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("playwright-core");
const here = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(readFileSync(join(here, "../../../../rust/presets.json"), "utf8")).presets.oakOpen.species;
const [origin, ...asked] = process.argv.slice(2);
const exe = process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const ROW = [10.5, 31.5, 52.5, 73.5];
function patchOf(species, trial) {
  if (trial.startsWith("lone"))
    return { world: { width: 240, height: 200, walls: [] }, trees: [{ x: 120, species }], species: { [species]: table[species] } };
  const trees = [];
  for (let r = 0; r < 3; r++) for (const x of ROW) trees.push({ x: (x + r * 7) % 84, z: (64 * (r + 0.5)) / 3, species });
  return { world: { width: 84, height: 200, walls: [], sides: "periodic", faces: [0, 0] }, trees, species: { [species]: table[species] } };
}
const runs = asked.length
  ? asked.map((a) => a.split(":"))
  : ["beech", "hornbeam", "oak", "birch"].flatMap((sp) =>
      ["lone60", "lone100", "stand100"].flatMap((t) => [1, 2, 3].map((s) => [sp, t, String(s)])),
    );
const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"],
});
async function one([species, trial, seed]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const done = new Promise((resolve) => page.on("console", (m) => m.text().startsWith("bench") && resolve()));
  const p = Buffer.from(JSON.stringify(patchOf(species, trial))).toString("base64url");
  const seasons = trial === "lone60" ? 60 : 100;
  await page.goto(`${origin}?preset=oakOpen&seed=${seed}&p=${p}&bench&seasons=${seasons}&frame=height`);
  await done;
  const out = await page.evaluate(() => {
    const s = window.garden.scene.next;
    const W = s.width;
    const H = Math.floor(s.shadow.length / W);
    const row = new Float32Array(W);
    const at = Math.min(W - 1, Math.floor(0.1 * W));
    const q = (y) => {
      row.set(s.shadow.subarray(y * W, (y + 1) * W));
      row.sort();
      return Math.min(1, Math.max(0, row[at]));
    };
    const sky = q(H - 1);
    const d = [];
    for (let y = 0; y < H; y++) d.push(sky < 1 ? Math.min(1, Math.max(0, (q(y) - sky) / (1 - sky))) : 0);
    const live = s.metrics.filter((m) => m.alive);
    const lb = live.map((m) => m.limbBase).sort((a, b) => a - b);
    const limbBase = lb[Math.floor(lb.length / 2)];
    const bole = d.slice(4, Math.max(5, Math.floor(limbBase))).sort((a, b) => a - b);
    return {
      sky: +sky.toFixed(3),
      maxD: +Math.max(...d).toFixed(3),
      boleD: +(bole[Math.floor(bole.length / 2)] ?? 0).toFixed(3),
      limbBase: +limbBase.toFixed(1),
      height: +Math.max(...live.map((m) => m.height)).toFixed(1),
      profile: d.filter((_, y) => y % 20 === 0).map((x) => +x.toFixed(2)),
    };
  });
  console.log(JSON.stringify({ species, trial, seed: Number(seed), ...out }));
  await ctx.close();
}
const queue = [...runs];
await Promise.all(Array.from({ length: Number(process.env.CONC ?? 3) }, async () => { while (queue.length) await one(queue.shift()); }));
await browser.close();
