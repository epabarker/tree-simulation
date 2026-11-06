// The like-for-like sheet (adapted from 2026-11-05-render). Bundles page.ts (rolldown, no dev server), serves runs/like-for-like-render on a throwaway static server in this process, and
// screenshots the sheet with headless system Firefox through puppeteer-core (installed in a scratch folder).
//   NODE_PATH=<scratch>/node_modules node docs/experiments/code/2026-11-05-like-for-like-render/render.mjs runs/like-for-like-render out.png
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { rolldown } from "../../../../node_modules/rolldown/dist/index.mjs";

const require = createRequire(`${process.env.NODE_PATH}/`);
const puppeteer = require("puppeteer-core");
const [dir = "runs/like-for-like-render", out = "sheet.png"] = process.argv.slice(2);
const here = new URL(".", import.meta.url).pathname;

const b = await rolldown({ input: `${here}page.ts`, logLevel: "warn" });
await b.write({ file: `${dir}/page.js`, format: "iife" });
const css = readFileSync("src/web/render/scene.css", "utf8");
const spec = {
  seed: Number(process.env.SEED ?? 101), stand: { w: 300, h: 640 },
  rows: [{ key: "hand", title: "the pilots' hand" }, { key: "v3", title: "pilot v3's finalist" },
    { key: "v4", title: "pilot v4's finalist" }, { key: "real", title: "BioDiv, crownBase80 deciles 10–90" }],
};
const html = `<!doctype html><meta charset=utf-8><style>${css}
body{margin:0;background:#fff;font:13px/1.35 system-ui,sans-serif;color:#222}#sheet{padding:18px;width:max-content}
h1{font-size:20px;margin:0 0 4px}.note{margin:0 0 12px;color:#555}.grid{display:grid;grid-template-columns:130px repeat(9,max-content);gap:10px 18px;align-items:start}
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
  await page.setViewport({ width: 3300, height: 1200, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.evaluate((s) => window.run(s), spec);
  await page.waitForFunction(() => window.done === true, { timeout: 600_000, polling: 500 });
  await (await page.$("#sheet")).screenshot({ path: out });
  console.log("wrote", out);
} finally {
  await browser.close();
  server.close();
}
