// The judging sheets (2026-11-02): labelled renders for the user's eye, not a blind test.
//   node shots.mjs <origin> <out-dir> <garden|lab> [concurrency]
// garden: garden.html as a visitor's phone shows it (390 × 844 CSS px, device pixel ratio 3,
// portrait, light), the default forest at seeds 10 (the bench's pinned phone forest, one of the
// shipped first-paint seeds), 2 and 3: grown to 40 seasons (the intro's end), and to 100 leaf-on
// (seasons off, the scene's summer) and leaf-off (the scene held at τ 0.95, winter). The overlay's
// text is put back after the bench has written its numbers over it.
// lab: the blind test v3's plates (one scale, &frame=height), at device pixel ratio 2: each of the
// eight garden species alone in beechOpen's world (240 wide) at 60 and 100, and as a closed stand
// (84 wide, periodic, 12 trees) at 100, seed 4. Each species is its entry in rust/presets.json.
// ROOT is the checkout whose rust/presets.json the served build was built from (default this one).
// VIEW adds view options to every URL (e.g. "&woodContrast=0"); SPECIES (a comma list) and SEEDS
// (garden seeds, a comma list) narrow a run, e.g. the fix's re-renders: SPECIES=birch, garden 10,2,3.
// Needs playwright-core (PW_FROM: any scratch install) and Playwright's Chromium (CHROME overrides).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("playwright-core");
const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.ROOT ?? join(here, "../../../..");
const table = JSON.parse(readFileSync(join(root, "rust/presets.json"), "utf8")).presets.oakOpen.species;
const [origin, out, mode, conc = "3"] = process.argv.slice(2);
const exe = process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;

const SPECIES = (process.env.SPECIES ?? "birch,beech,oak,hornbeam,maple,willow,rowan,holly").split(",");
const SEED = 4;
const GARDEN_SEEDS = (process.env.SEEDS ?? "10,2,3").split(",").map(Number);
const VIEW = process.env.VIEW ?? "";

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
function patchOf(species, trial) {
  const t = TRIALS[trial];
  const world = t.lone
    ? { width: 240, height: 200, walls: [] }
    : { width: STAND_W, height: 200, walls: [], sides: "periodic", faces: [0, 0] };
  const trees = t.lone ? [{ x: 120, species }] : standTrees(species);
  return { world, trees, species: { [species]: table[species] } };
}
const encode = (patch) => Buffer.from(JSON.stringify(patch)).toString("base64url");

const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"],
});
const log = [];

/** Opens url and resolves with the bench line once the page has played to its seasons. */
async function bench(page, url, label, before) {
  const done = new Promise((resolve) => {
    page.on("console", (m) => {
      if (m.text().startsWith("bench")) resolve(m.text());
      else if (m.type() === "error" || m.type() === "warning") console.error(label, m.text());
    });
  });
  await page.goto(url);
  if (before) await before();
  let timer;
  const result = await Promise.race([done, new Promise((r) => (timer = setTimeout(() => r("timeout"), 30 * 60 * 1000)))]);
  clearTimeout(timer);
  return result;
}

async function garden({ seed, seasons }) {
  const files = seasons === 40 ? [`garden-s${seed}-40.png`] : [`garden-s${seed}-100.png`, `garden-s${seed}-100-winter.png`];
  if (files.every((f) => existsSync(join(out, f)))) return;
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  const t = Date.now();
  const url = `${origin}/garden.html?seed=${seed}&bench&seasons=${seasons}${VIEW}`;
  const result = await bench(page, url, `garden ${seed} ${seasons}`, async () => {
    await page.waitForFunction(() => window.garden);
    await page.evaluate(() => {
      window.note = document.querySelector(".overlay p").innerHTML;
      // Past the intro the garden's year lasts 16 s a season; with no year it steps at the pace's
      // ambient rate (0.5 a second) and draws every season in summer.
      window.garden.setYearSeconds(0);
    });
  });
  await page.evaluate(() => {
    document.querySelector(".overlay p").innerHTML = window.note;
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(out, files[0]) });
  if (files[1]) {
    await page.evaluate(() => {
      window.garden.scene.seasons = true;
      window.garden.scene.tau = 0.95;
      window.garden.redraw();
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(out, files[1]) });
  }
  const line = { files, seed, seasons, s: Math.round((Date.now() - t) / 1000), bench: String(result).slice(0, 200) };
  log.push(line);
  console.log(JSON.stringify(line));
  await ctx.close();
}

async function lab({ species, trial }) {
  const file = join(out, `${species}-${trial}-s${SEED}.png`);
  if (existsSync(file)) return;
  const url = `${origin}/?preset=oakOpen&seed=${SEED}&p=${encode(patchOf(species, trial))}&bench&seasons=${TRIALS[trial].seasons}&frame=height${VIEW}`;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  // The lab's charts row grows with the number of trees, which would shrink a stand's canvas and so
  // its scale; pin the canvas at the blind tests' 1120 × 654 for every trial.
  await ctx.addInitScript(() =>
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = ".app { grid-template-rows: 654px auto !important; } .charts { overflow: hidden; }";
      document.head.append(style);
    }),
  );
  const page = await ctx.newPage();
  const t = Date.now();
  const result = await bench(page, url, `${species} ${trial}`);
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
  const line = { file, species, trial, s: Math.round((Date.now() - t) / 1000), pxPerCell: Number(cam.scale.toFixed(4)), bench: String(result).slice(0, 160) };
  log.push(line);
  console.log(JSON.stringify(line));
  await ctx.close();
}

mkdirSync(out, { recursive: true });
const jobs =
  mode === "garden"
    ? GARDEN_SEEDS.flatMap((seed) => [100, 40].map((seasons) => () => garden({ seed, seasons })))
    : Object.keys(TRIALS).flatMap((trial) => SPECIES.map((species) => () => lab({ species, trial })));
await Promise.all(
  Array.from({ length: Number(conc) }, async () => {
    while (jobs.length) await jobs.shift()();
  }),
);
writeFileSync(join(out, `log-${mode}-${Date.now()}.json`), JSON.stringify(log, null, 1));
await browser.close();
