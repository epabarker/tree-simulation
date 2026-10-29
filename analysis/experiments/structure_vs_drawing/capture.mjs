// Structure vs drawing: captures renderer A (our page's own renderer, a.html) and renderer B (three.js,
// b.html) for each tree, leaves on (summer) and off (winter), with headless Firefox. Both pages are
// served by `npm run dev`. B is drawn at 2000 px and downscaled later (sheet.py).
// puppeteer-core is not a project dependency: install it in a scratch folder and pass its path.
// usage: PUPPETEER=<scratch>/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js \
//   node capture.mjs http://localhost:5173/analysis/experiments/structure_vs_drawing/a.html \
//   http://localhost:5173/analysis/experiments/structure_vs_drawing/b.html <outDir> tree...
const { default: puppeteer } = await import(process.env.PUPPETEER ?? "puppeteer-core");
const [aBase, bBase, out, ...trees] = process.argv.slice(2);
const browser = await puppeteer.launch({ browser: "firefox", executablePath: "/usr/bin/firefox", headless: true,
  extraPrefsFirefox: { "webgl.force-enabled": true, "layout.css.devPixelsPerPx": "1.0" } });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
for (const tree of trees) {
  for (const leaves of [1, 0]) {
    for (const [r, base] of [["A", aBase], ["B", bBase]]) {
      const t0 = Date.now();
      const px = r === "B" ? 2000 : 1000;
      await page.setViewport({ width: px, height: px, deviceScaleFactor: 1 });
      await page.goto(`${base}?tree=${tree}&leaves=${leaves}`, { waitUntil: "load" });
      await page.waitForFunction(() => window.rendered, { timeout: 600000, polling: 500 });
      const info = await page.evaluate(() => window.rendered);
      const file = `${out}/${tree}-${r}-${leaves ? "summer" : "winter"}.png`;
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: px, height: px } });
      console.log(file, JSON.stringify(info), `${((Date.now() - t0) / 1000).toFixed(1)} s`);
    }
  }
}
await browser.close();
