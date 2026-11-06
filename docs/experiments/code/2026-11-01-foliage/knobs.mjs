// Track C step 3 (I3 step 4): the garden's phone plate (garden.html, 390 × 844, device pixel
// ratio 2, seed 10) played through its 40-season intro under `?bench`, then drawn at three settings
// of each foliage knob (leaf opacity; LEAF_MIN_PX), each shot and measured by the coverage
// instrument (garden.coverage(), render/coverage.ts). Writes <dir>/knobs.json and the shots.
//   node docs/experiments/code/2026-11-01-foliage/knobs.mjs runs/knobs [origin] [seasons]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const [dir = "runs/knobs", origin = "http://localhost:5173/", seasons = "40"] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const SETTINGS = [
  { name: "opacity-0.7", leafOpacity: 0.7, leafMinPx: 3.5 },
  { name: "default", leafOpacity: 0.92, leafMinPx: 3.5 },
  { name: "opacity-1", leafOpacity: 1, leafMinPx: 3.5 },
  { name: "minpx-0", leafOpacity: 0.92, leafMinPx: 0 },
  { name: "minpx-6", leafOpacity: 0.92, leafMinPx: 6 },
];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.goto(`${origin}garden.html?bench&seasons=${seasons}&seed=10`);
await page.waitForFunction(() => window.bench !== undefined, null, { timeout: 1_800_000, polling: 1000 });
const out = { bench: await page.evaluate(() => window.bench), settings: {} };
for (const s of SETTINGS) {
  const coverage = await page.evaluate(({ leafOpacity, leafMinPx }) => {
    window.garden.view.leafOpacity = leafOpacity;
    window.garden.view.leafMinPx = leafMinPx;
    window.garden.redraw();
    return window.garden.coverage();
  }, s);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/knobs-${seasons}-${s.name}.png`, timeout: 300_000 });
  out.settings[s.name] = { ...s, coverage };
  console.log(s.name, JSON.stringify(coverage));
}
writeFileSync(`${dir}/knobs-${seasons}.json`, `${JSON.stringify(out, null, 1)}\n`);
await browser.close();
