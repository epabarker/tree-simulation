// I3 step 6: the garden's `?bench&seasons=40&seed=10` (the 40-season intro, sampling every
// animated frame) in headless Chromium with software GL (SwiftShader) on the laptop, at the phone's
// viewport (390 × 844) with WebGL2 and Canvas 2D and at the laptop's (1440 × 900) with WebGL2, dpr 2.
// Draw times under software GL are relative, not a phone's. Prints each BenchResult (memoryMB too).
//   PW=<dir with node_modules/playwright> node docs/experiments/code/2026-11-02-i3-remaining/bench.mjs [origin] [runs]
import { createRequire } from "node:module";

const require = createRequire(process.env.PW ? `${process.env.PW}/` : import.meta.url);
const { chromium } = require("playwright");
const [origin = "http://localhost:5181/", runsArg = "1"] = process.argv.slice(2);
const cases = [
  ["phone", { width: 390, height: 844 }, "webgl2"],
  ["phone", { width: 390, height: 844 }, "canvas"],
  ["laptop", { width: 1440, height: 900 }, "webgl2"],
];
const browser = await chromium.launch();
for (let run = 1; run <= Number(runsArg); run++) {
  for (const [name, viewport, renderer] of cases) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const t0 = Date.now();
    const extra = renderer === "canvas" ? "&renderer=canvas" : "";
    await page.goto(`${origin}garden.html?bench&seasons=40&seed=10${extra}`);
    await page.waitForFunction(() => window.bench !== undefined, null, { timeout: 1_800_000, polling: 1000 });
    const b = await page.evaluate(() => window.bench);
    const { coverage, ...rest } = b;
    console.log(JSON.stringify({ run, name, renderer, seconds: Math.round((Date.now() - t0) / 1000), ...rest, leafPixels: coverage?.pixelCover }));
    await context.close();
  }
}
await browser.close();
