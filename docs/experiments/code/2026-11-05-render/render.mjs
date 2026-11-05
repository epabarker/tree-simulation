// Bundles page.ts (rolldown, no dev server), serves runs/beech-render on a throwaway static server in this process, and
// screenshots the sheet with headless system Firefox through puppeteer-core (installed in a scratch folder).
//   NODE_PATH=<scratch>/node_modules node docs/experiments/code/2026-11-05-render/render.mjs runs/beech-render out.png
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { rolldown } from "../../../../node_modules/rolldown/dist/index.mjs";

const require = createRequire(`${process.env.NODE_PATH}/`);
const puppeteer = require("puppeteer-core");
const [dir = "runs/beech-render", out = "sheet.png"] = process.argv.slice(2);
const here = new URL(".", import.meta.url).pathname;

const b = await rolldown({ input: `${here}page.ts`, logLevel: "warn" });
await b.write({ file: `${dir}/page.js`, format: "iife" });
const css = readFileSync("src/web/render/scene.css", "utf8");
const fits = "docs/experiments/fits";
const v3 = JSON.parse(readFileSync(`${fits}/level1-pilot-v3/beech.json`, "utf8"));
const v4 = JSON.parse(readFileSync(`${fits}/level1-pilot-v4/beech-best.json`, "utf8"));
const knobs = v3.knobs.map((k) => k.replace("r2.levels.", "L").replace("r2.", ""));
const fmt = (a) => v3.knobs.map((k, i) => `${knobs[i]} ${a[k]}`).join(" · ");
// The labels' numbers are snapshots.ts's log lines: "<col>-<trial>-<seed> {json}".
const summary = Object.fromEntries(readFileSync(`${dir}/snapshots.log`, "utf8").split("\n").filter((l) => /^\w+-(stand|lone)-\d+ \{/.test(l)).map((l) => [l.split(" ")[0], JSON.parse(l.slice(l.indexOf(" ") + 1))]));
const only = (process.env.COLS ?? "hand,fit,v4").split(",");
const seeds = (process.env.SEEDS ?? "101,102").split(",").map(Number);
const spec = {
  dir: ".", seeds, standSeason: 70, summary, qsmFiles: "qsm.json",
  stand: { w: 330, h: 640 }, lone: { w: 460, h: 420, scale: 2.6 },
  cols: [
    { key: "hand", title: "hand: the shipped beech", params: `no assign. Level 1 knobs: ${fmt(v3.hand.assign)}` },
    { key: "fit", title: `fit: pilot v3 finalist (loss ${v3.fit.loss.toFixed(2)} on 101–110)`, params: `fits/level1-pilot-v3/beech.json fit.assign over the shipped beech. ${fmt(v3.fit.assign)}` },
    { key: "v4", title: `pilot v4 best so far (generation ${v4.generation}, loss ${v4.loss.toFixed(2)}): provisional, search seeds`, params: `fits/level1-pilot-v4/beech-best.json. ${fmt(v4.assign)}` },
  ].filter((c) => only.includes(c.key)),
};
const html = `<!doctype html><meta charset=utf-8><style>${css}
body{margin:0;background:#fff;font:13px/1.35 system-ui,sans-serif;color:#222}#sheet{padding:18px;width:max-content}
h1{font-size:20px;margin:0 0 4px}.note{margin:0 0 12px;color:#555}.grid{display:grid;grid-template-columns:150px repeat(3,max-content);gap:10px 18px;align-items:start}
.rowhead{font-weight:600;padding-top:30px}.colhead{max-width:960px}.small{font-size:11px;color:#555;max-width:960px}
.cell{display:flex;gap:6px}.panel{position:relative}.cap{font-size:11px;font-weight:600}.cap2{font-size:11px;color:#444;margin-bottom:2px}
canvas{border:1px solid #ccc}</style><div id=sheet></div><script src=page.js></script>`;
writeFileSync(`${dir}/index.html`, html);
const server = createServer((req, res) => {
  const f = `${dir}${decodeURIComponent(req.url.split("?")[0])}`;
  if (!existsSync(f) || f.endsWith("/")) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : f.endsWith(".js") ? "text/javascript" : f.endsWith(".json") ? "application/json" : "application/octet-stream" });
  res.end(readFileSync(f));
}).listen(0);
const port = server.address().port;
const browser = await puppeteer.launch({ browser: "firefox", executablePath: "/usr/bin/firefox", headless: true });
try {
  const page = await browser.newPage();
  page.on("console", (m) => console.log("page:", m.text()));
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.setViewport({ width: 2800, height: 1200, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.evaluate((s) => window.run(s), spec);
  await page.waitForFunction(() => window.done === true, { timeout: 600_000, polling: 500 });
  await (await page.$("#sheet")).screenshot({ path: out });
  console.log("wrote", out);
} finally {
  await browser.close();
  server.close();
}
