// Track C step 4 (I3 step 6): the garden's `?bench` on the phone's plate (390 × 844, device pixel
// ratio 2, seed 10, the 40-season intro), WebGL2 and Canvas 2D (`renderer=canvas`), headless
// Chromium with software GL on this VM: relative, not a phone's numbers. Prints each BenchResult.
//   node docs/experiments/code/2026-11-01-foliage/bench.mjs [origin] [shot-prefix]
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const [origin = "http://localhost:5173/", prefix] = process.argv.slice(2);
const browser = await chromium.launch();
for (const renderer of ["webgl2", "canvas"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(`${origin}garden.html?bench&seasons=40&seed=10${renderer === "canvas" ? "&renderer=canvas" : ""}`);
  await page.waitForFunction(() => window.bench !== undefined, null, { timeout: 1_800_000, polling: 1000 });
  const bench = await page.evaluate(() => window.bench);
  if (prefix) await page.screenshot({ path: `${prefix}-${renderer}.png`, timeout: 300_000 });
  console.log(renderer, `${Math.round((Date.now() - t0) / 1000)} s`, JSON.stringify(bench));
  await context.close();
}
await browser.close();
