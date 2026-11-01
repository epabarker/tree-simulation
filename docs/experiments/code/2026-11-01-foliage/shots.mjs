// Track C (foliage), the contact sheets' screenshots: each link of links.json (links.ts) played in
// the lab to its season in headless Chromium (pre-installed Playwright), then the canvas shot at
// the phone's viewport (390 × 844) and the laptop's (1440 × 900), both at device pixel ratio 2, and
// a close look at the lower trunk at the laptop's size (the lab's scroll zoom).
//   node docs/experiments/code/2026-11-01-foliage/shots.mjs runs/foliage <tag> [origin] [species,…]
// <tag> names the build ("before", "after"); origin replaces the links' own (another dev server).
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

// Playwright is installed globally (require resolves it from any directory); ESM imports do not.
const { chromium } = createRequire(import.meta.url)("playwright");

const [dir = "runs/foliage", tag = "after", origin, only] = process.argv.slice(2);
const links = JSON.parse(readFileSync(`${dir}/links.json`, "utf8"));
const species = only ? only.split(",") : Object.keys(links);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const VIEWS = { phone: { width: 390, height: 844 }, laptop: { width: 1440, height: 900 } };

async function shoot(sp, view, url) {
  const files = [...Object.keys(VIEWS), "close"].map((v) => `${dir}/${tag}-${sp}-${view}-${v}.png`);
  if (files.every((f) => existsSync(f))) return;
  const context = await browser.newContext({ viewport: VIEWS.phone, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const u = origin ? url.replace(/^https?:\/\/[^/]+\//, origin) : url;
  await page.goto(u, { timeout: 300_000 });
  const t0 = Date.now();
  await page.waitForFunction(() => window.bench !== undefined, null, { timeout: 1_800_000, polling: 1000 });
  for (const [v, size] of Object.entries(VIEWS)) {
    await page.setViewportSize(size);
    await page.waitForTimeout(2500); // the camera eases to its new fit
    // The canvas's box (an element shot waits for it to be still, and the lab's wind never is).
    const clip = await page.$eval("canvas", (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    await page.screenshot({ path: `${dir}/${tag}-${sp}-${view}-${v}.png`, clip, timeout: 300_000 });
  }
  // A close look at the laptop's size: scrolled in on the lower trunk, where the bark reads.
  const box = await page.$eval("canvas", (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  // Software GL can stall on a wheel event; give up on the close look after two minutes.
  const zoom = async () => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 140);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(150);
    }
  };
  await Promise.race([
    zoom(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("zoom stalled")), 120_000)),
  ]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/${tag}-${sp}-${view}-close.png`, clip: box, timeout: 300_000 });
  console.log(tag, sp, view, `${Math.round((Date.now() - t0) / 1000)} s`);
  await context.close();
}

const jobs = [];
for (const sp of species) for (const [view, url] of Object.entries(links[sp])) jobs.push([sp, view, url]);
// One page at a time: software GL at the laptop's size is slow to settle a frame.
const workers = Array.from({ length: 1 }, async () => {
  while (jobs.length) {
    const [sp, view, url] = jobs.shift();
    await shoot(sp, view, url).catch((e) => console.error(sp, view, e.message));
  }
});
await Promise.all(workers);
await browser.close();
