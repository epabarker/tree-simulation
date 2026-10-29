// Stacked slices: flat renders of each tree through the page's own renderer (a.html), leaves on
// (summer) and off (winter), in colour and as a black-on-white mask (?mask=1), 1000 px.
// puppeteer-core is not a project dependency: install it in a scratch folder and pass its path.
// usage: PUPPETEER=<scratch>/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js \
//   node capture_flat.mjs http://localhost:5173/analysis/experiments/structure_vs_drawing/a.html <outDir> [--bench] tree...
const { default: puppeteer } = await import(process.env.PUPPETEER ?? "puppeteer-core");
const args = process.argv.slice(2);
const bench = args.includes("--bench");
const [base, out, ...trees] = args.filter((a) => a !== "--bench");
const browser = await puppeteer.launch({ browser: "firefox", executablePath: "/usr/bin/firefox", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
for (const tree of trees) {
  for (const leaves of [1, 0]) {
    for (const mask of [0, 1]) {
      const extra = mask === 0 && leaves === 1 && bench ? "&bench=1" : "";
      await page.goto(`${base}?tree=${tree}&leaves=${leaves}&mask=${mask}${extra}`, { waitUntil: "load" });
      await page.waitForFunction(() => window.rendered, { timeout: 600000, polling: 200 });
      const info = await page.evaluate(() => window.rendered);
      const file = `${out}/${tree}-${leaves ? "summer" : "winter"}${mask ? "-mask" : ""}.png`;
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1000, height: 1000 } });
      if (extra) console.log(tree, JSON.stringify(info));
    }
  }
}
await browser.close();
