// Species round 4, step B.6: the screenshots of panel.json's links (panel-links.ts), the lab's plate
// after it has played to the link's season (`window.bench` set). Headless system Firefox through
// puppeteer-core, installed in a scratch folder, never the repo:
//   NODE_PATH=<scratch>/node_modules node docs/experiments/code/2026-10-31-species-round4/panel-shots.mjs runs/panel [species,…]
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(`${process.env.NODE_PATH}/`);
const puppeteer = require("puppeteer-core");
const dir = process.argv[2] ?? "runs/panel";
const panel = JSON.parse(readFileSync(`${dir}/panel.json`, "utf8"));
const only = process.argv[3]?.split(",");
const browser = await puppeteer.launch({ browser: "firefox", executablePath: "/usr/bin/firefox", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 900 });
for (const [sp, rounds] of Object.entries(panel)) {
  if (only && !only.includes(sp)) continue;
  for (const [name, { links }] of Object.entries(rounds)) {
    for (const [view, url] of Object.entries(links)) {
      const file = `${dir}/${sp}-${name.replace(" ", "")}-${view.replace(" ", "")}.png`;
      if (existsSync(file)) continue;
      await page.goto(url);
      await page.waitForFunction(() => window.bench !== undefined, { timeout: 600_000, polling: 1000 });
      await new Promise((r) => setTimeout(r, 800));
      const canvas = await page.$("canvas");
      await (canvas ?? page).screenshot({ path: file });
      console.log("shot", file);
    }
  }
}
await browser.close();
