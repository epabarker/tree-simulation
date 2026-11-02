// Screenshots of the garden plate with the round's beech (review of the fresh-look beech, 2026-11-01):
// garden.html?seed=S&bench&seasons=N at the phone's viewport (390 × 844; dpr 1, since SwiftShader at dpr 2 stalls) and a laptop's
// (1440 × 900), waiting for the bench to report, then a shot of the page. Run against a dev server
// on the branch ("after") and one on claude/ship-week ("before").
//   node docs/experiments/code/2026-11-01-fresh-look-beech/garden-shots.mjs <origin> <label> <out-dir> <seasons> <view:seed,…> …
//   e.g. … http://localhost:5173/ after runs/fresh-look/garden-shots 100 phone:2,3 laptop:3,10
// Playwright and Chromium are the container's (require('playwright')); nothing is installed.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [origin, label, out, seasons, ...jobs] = process.argv.slice(2);
const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  laptop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
for (const job of jobs) {
  const [view, seeds] = job.split(":");
  for (const seed of seeds.split(",")) {
    const ctx = await browser.newContext(VIEWS[view]);
    const page = await ctx.newPage();
    const done = new Promise((resolve) => {
      page.on("console", (m) => {
        if (m.text().startsWith("bench")) resolve(m.text());
      });
    });
    const url = `${origin}garden.html?seed=${seed}&bench&seasons=${seasons}`;
    const t = Date.now();
    await page.goto(url);
    const result = await Promise.race([
      done,
      new Promise((r) => setTimeout(() => r("timeout"), 20 * 60 * 1000)),
    ]);
    await page.waitForTimeout(1500);
    const file = `${out}/garden-${view}-s${seed}-${seasons}-${label}.png`;
    await page.screenshot({ path: file });
    console.log(file, `${Math.round((Date.now() - t) / 1000)} s`, String(result).slice(0, 120));
    await ctx.close();
  }
}
await browser.close();
