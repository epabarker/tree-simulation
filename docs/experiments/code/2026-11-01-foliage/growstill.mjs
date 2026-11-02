// Track C step 4 (I3 step 5): how long a reduced-motion visitor waits for the garden's picture.
// garden.html at the phone's size (390 × 844) and the laptop's (1440 × 900) with
// prefers-reduced-motion: reduce, seed 10: the time from navigation to `garden.ready` (the worker
// grows the 40-season intro in one call, growStill, and the plate is drawn), three loads each.
//   node docs/experiments/code/2026-11-01-foliage/growstill.mjs [origin] [out.png]
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const [origin = "http://localhost:5173/", shot] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [name, viewport] of Object.entries({
  phone: { width: 390, height: 844 },
  laptop: { width: 1440, height: 900 },
})) {
  const times = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(`${origin}garden.html?seed=10`);
    await page.waitForFunction(() => window.garden !== undefined, null, { timeout: 600_000 });
    await page.evaluate(() => window.garden.ready);
    const ms = Date.now() - t0;
    const stats = await page.evaluate(() => ({ ...window.garden.stats }));
    times.push(ms);
    if (shot && i === 0 && name === "phone") await page.screenshot({ path: shot });
    console.log(name, `load ${i + 1}: ${ms} ms to the still picture`, JSON.stringify({ season: stats.season, metamers: stats.metamers, workerMs: Math.round(stats.workerMs) }));
    await context.close();
  }
  times.sort((a, b) => a - b);
  console.log(name, "median", times[1], "ms");
}
await browser.close();
