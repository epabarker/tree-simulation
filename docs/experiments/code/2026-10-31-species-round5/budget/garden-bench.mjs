// The garden's ?bench at a phone's viewport (390 × 844, dpr 2), headless Firefox: seed 10, to N seasons.
import puppeteer from "puppeteer-core";
const [base, seasons, label] = process.argv.slice(2);
const browser = await puppeteer.launch({ browser: "firefox", executablePath: "/usr/bin/firefox", headless: true, protocolTimeout: 1_800_000 });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const t0 = Date.now();
await page.goto(`${base}/garden.html?bench&seed=10&seasons=${seasons}`);
await page.waitForFunction(() => window.bench !== undefined, { timeout: 1_200_000, polling: 1000 });
const r = await page.evaluate(() => window.bench);
console.log(JSON.stringify({ label, seasons: Number(seasons), wallS: (Date.now() - t0) / 1000, ...r }));
await browser.close();
