// The blind test v3's renders (2026-11-02): v2's shots.mjs with one change, one scale. The lab's
// real renderer (WebGL2, bark and foliage of claude/foliage) on a GPU, through
// ?preset=oakOpen&seed=S&p=<patch>&bench&seasons=N&frame=height, so every plate is drawn at the
// same pixels per cell, the camera fixed by the world's height (200 for every trial) and centred on
// the world, never fitted to the trees. The screenshot is the #view canvas (the HUD hidden) cropped
// to the world's width: the lone tree's 240-cell field, the stand's one lap of 84 cells. Each source
// is a full species entry from rust/presets.json (mergeParams replaces a species entry whole): beech
// is the accepted build's (claude/beech-overnight, no c5.Tvig), "today" its entry with the round's
// rules off. Trials: the lone tree in beechOpen's world (240 wide, x 120) at 60 and 100; the closed
// stand at 100 (84 wide, periodic sides, faces [0, 0], 12 trees in three rows as render.py's
// stand_trees).
//   node shots.mjs <origin> <out-dir> [concurrency]
// VIEW adds view options to every URL, and SOURCES (a comma list) limits the sources:
//   set 2, the addendum: SOURCES=beech VIEW='&clearBole' (no rosettes on a trunk below its limb
//   crown base); set 3: VIEW='&clearBole&girth=1.45' (stems drawn at 1.45 × their radius).
// Needs playwright-core (any scratch install) and Playwright's Chromium; set CHROME to override.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("playwright-core");
const here = dirname(fileURLToPath(import.meta.url));
const presets = JSON.parse(readFileSync(join(here, "../../../../rust/presets.json"), "utf8"));
const table = presets.presets.oakOpen.species;
const [origin, out, conc = "3"] = process.argv.slice(2);
const exe = process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;

const clone = (x) => JSON.parse(JSON.stringify(x));
function today() {
  const e = clone(table.beech);
  Object.assign(e.r2, { relay: 0, forkAt: 0, vigourShare: 0, lightSetPoint: null });
  e.c5.Tvig = 0;
  e.r2.levels[0].curve = 0;
  return e;
}
const SOURCES = {
  beech: ["beech", clone(table.beech)],
  today: ["beech", today()],
  hornbeam: ["hornbeam", clone(table.hornbeam)],
  oak: ["oak", clone(table.oak)],
  birch: ["birch", clone(table.birch)],
  fir: ["fir", clone(table.fir)],
};
const STAND_W = 84;
const DEPTH = 64;
const SPACING = 21;
const ROW = [10.5, 31.5, 52.5, 73.5];
function standTrees(species) {
  const rows = Math.max(1, Math.round(DEPTH / SPACING));
  const trees = [];
  for (let r = 0; r < rows; r++)
    for (const x of ROW) trees.push({ x: (x + (r * SPACING) / rows) % STAND_W, z: (DEPTH * (r + 0.5)) / rows, species });
  return trees;
}
const TRIALS = {
  lone60: { seasons: 60, lone: true },
  lone100: { seasons: 100, lone: true },
  stand100: { seasons: 100, lone: false },
};
function patchOf(source, trial) {
  const [species, entry] = SOURCES[source];
  const t = TRIALS[trial];
  const world = t.lone
    ? { width: 240, height: 200, walls: [] }
    : { width: STAND_W, height: 200, walls: [], sides: "periodic", faces: [0, 0] };
  const trees = t.lone ? [{ x: 120, species }] : standTrees(species);
  return { world, trees, species: { [species]: entry } };
}
const encode = (patch) => Buffer.from(JSON.stringify(patch)).toString("base64url");

mkdirSync(out, { recursive: true });
const jobs = [];
for (const seed of [1, 2, 3])
  for (const trial of Object.keys(TRIALS))
    for (const source of Object.keys(SOURCES))
      if (!process.env.SOURCES || process.env.SOURCES.split(",").includes(source)) jobs.push({ source, trial, seed });
const view = `&frame=height${process.env.VIEW ?? ""}`;
const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"],
});
const log = [];
async function shoot({ source, trial, seed }) {
  const file = join(out, `${source}-${trial}-s${seed}.png`);
  if (existsSync(file)) return;
  if (process.env.ONLY && !file.includes(process.env.ONLY)) return; // e.g. ONLY=beech-lone60-s1
  const url = `${origin}?preset=oakOpen&seed=${seed}&p=${encode(patchOf(source, trial))}&bench&seasons=${TRIALS[trial].seasons}${view}`;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  // The lab's charts row is `auto` and grows with the number of trees, which would shrink a stand's
  // canvas and so its scale; pin the canvas at v2's lone plate, 1120 × 654, for every trial.
  await ctx.addInitScript(() =>
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = ".app { grid-template-rows: 654px auto !important; } .charts { overflow: hidden; }";
      document.head.append(style);
    }),
  );
  const page = await ctx.newPage();
  const done = new Promise((resolve) => {
    page.on("console", (m) => {
      if (m.text().startsWith("bench")) resolve(m.text());
      else if (m.type() === "error" || m.type() === "warning") console.error(source, trial, seed, m.text());
    });
  });
  const t = Date.now();
  await page.goto(url);
  let timer;
  const result = await Promise.race([done, new Promise((r) => (timer = setTimeout(() => r("timeout"), 20 * 60 * 1000)))]);
  clearTimeout(timer);
  await page.addStyleTag({ content: "#hud, .hud, .hint, .title { visibility: hidden !important; }" });
  await page.waitForTimeout(1500);
  // The plate is the world's width at the fixed scale (cells → CSS pixels as Scene.toScreen).
  const cam = await page.evaluate(() => {
    const sc = window.garden.scene;
    const at = (x) => (x - sc.camera.cx) * sc.camera.scale + sc.width / 2;
    return { left: at(0), right: at(sc.next.width), scale: sc.camera.scale, w: sc.width, h: sc.height };
  });
  const box = await page.locator("#view").boundingBox();
  const left = Math.max(0, Math.floor(cam.left));
  const right = Math.min(cam.w, Math.ceil(cam.right));
  await page.screenshot({ path: file, clip: { x: box.x + left, y: box.y, width: right - left, height: cam.h } });
  const line = {
    file,
    source,
    trial,
    seed,
    s: Math.round((Date.now() - t) / 1000),
    pxPerCell: Number(cam.scale.toFixed(4)),
    plate: [right - left, cam.h],
    bench: String(result).slice(0, 160),
  };
  log.push(line);
  console.log(JSON.stringify(line));
  await ctx.close();
}
const queue = [...jobs];
await Promise.all(
  Array.from({ length: Number(conc) }, async () => {
    while (queue.length) await shoot(queue.shift());
  }),
);
writeFileSync(join(out, `log-${Date.now()}.json`), JSON.stringify(log, null, 1));
await browser.close();
