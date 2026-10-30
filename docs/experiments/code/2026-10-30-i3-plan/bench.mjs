// Headless Chromium: the garden's ?bench through the intro at a phone's and a laptop's viewport,
// and the lab on mixedWood with Canvas 2D. Prints one JSON line per case.
import pw from "playwright"; // this VM: /opt/node-tools/node_modules/playwright/index.js
const { chromium } = pw;

const base = process.argv[2] ?? "http://localhost:4173";
const cases = [
  { name: "garden phone webgl", url: "/garden.html?bench&seasons=40", vp: { width: 390, height: 844 } },
  { name: "garden laptop webgl", url: "/garden.html?bench&seasons=40", vp: { width: 1440, height: 900 } },
  { name: "lab mixedWood webgl", url: "/?bench&preset=mixedWood&seasons=40", vp: { width: 1440, height: 900 } },
  { name: "lab mixedWood canvas", url: "/?bench&preset=mixedWood&seasons=40&renderer=canvas", vp: { width: 1440, height: 900 } },
  { name: "lab forest webgl", url: "/?bench&preset=forest&seasons=40", vp: { width: 1440, height: 900 } },
];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const c of cases) {
  const page = await browser.newPage({ viewport: c.vp, deviceScaleFactor: 2 });
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  await page.goto(base + c.url);
  const t0 = Date.now();
  let result = null;
  while (Date.now() - t0 < 600_000) {
    result = await page.evaluate(() => window.bench ?? null);
    if (result) break;
    await page.waitForTimeout(1000);
  }
  console.log(JSON.stringify({ case: c.name, seconds: (Date.now() - t0) / 1000, ...result }));
  if (!result) console.log(logs.slice(-5).join(" | "));
  await page.close();
}
await browser.close();
