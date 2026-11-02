// I3 step 5: how long a reduced-motion visitor waits for the garden (after the foliage note's
// growstill.mjs). garden.html with prefers-reduced-motion: reduce, seed 10, at the phone's size
// (390 × 844) and the laptop's (1440 × 900), dpr 2, headless Chromium (software GL), five loads
// each: the time from navigation to `garden.ready` (the worker grows the 40-season intro in one
// call, growStill, then the frame loop starts), and the core's share of it (seasonMs × 40).
//   PW=<dir with node_modules/playwright> node docs/experiments/code/2026-11-02-i3-remaining/growstill.mjs [origin] [loads]
import { createRequire } from "node:module";

const require = createRequire(process.env.PW ? `${process.env.PW}/` : import.meta.url);
const { chromium } = require("playwright");
const [origin = "http://localhost:5181/", loadsArg = "5"] = process.argv.slice(2);
const loads = Number(loadsArg);
const browser = await chromium.launch();
for (const [name, viewport] of Object.entries({
  phone: { width: 390, height: 844 },
  laptop: { width: 1440, height: 900 },
})) {
  const rows = [];
  for (let i = 0; i < loads; i++) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(`${origin}garden.html?seed=10`);
    await page.waitForFunction(() => window.garden !== undefined, null, { timeout: 600_000 });
    await page.evaluate(() => window.garden.ready);
    const ms = Date.now() - t0;
    const s = await page.evaluate(() => ({ ...window.garden.stats }));
    rows.push({ ms, season: s.season, metamers: s.metamers, coreMs: Math.round(40 * (s.workerMs ?? 0)) });
    await context.close();
  }
  const sorted = rows.map((r) => r.ms).sort((a, b) => a - b);
  console.log(JSON.stringify({ name, medianMs: sorted[Math.floor(loads / 2)], minMs: sorted[0], maxMs: sorted.at(-1), rows }));
}
await browser.close();
