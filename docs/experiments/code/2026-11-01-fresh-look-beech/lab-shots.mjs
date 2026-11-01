// The garden's worlds drawn by the lab (review of the fresh-look beech, 2026-11-01). garden.html plays
// its ambient pace after season 40, which under software GL takes over 20 minutes to reach 100; the
// lab's ?bench plays at bench speed with the same renderer. Each shot is the lab's mixedWood preset
// with the garden's own world, trees and recruits (garden-params.ts: forestParams(width, seed)) as
// its ?p= patch, played to `seasons`, then a screenshot. Run against a dev server on the branch
// ("after") and one on claude/ship-week ("before"); the patch carries no species, so each server's
// own beech is drawn.
//   node docs/experiments/code/2026-11-01-fresh-look-beech/lab-shots.mjs <origin> <label> <out-dir> <seasons> <view>:<params.json> …
// Under this review's software GL (SwiftShader) a 100-season shot did not finish in 15 minutes; on a
// machine with a GPU it should take a minute or two.
//   view: phone (390 × 844) or laptop (1440 × 900); params from garden-params.ts. mixedWood itself: a
//   params file written with kind "mixedWood".
import { mkdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [origin, label, out, seasons, ...jobs] = process.argv.slice(2);
const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  laptop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const encode = (patch) => Buffer.from(JSON.stringify(patch)).toString("base64url");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
for (const job of jobs) {
  const [view, file] = job.split(":");
  const p = JSON.parse(readFileSync(file, "utf8"));
  const patch = { world: p.world, trees: p.trees, o4: p.o4 };
  const url = `${origin}?preset=mixedWood&seed=${p.seed}&p=${encode(patch)}&bench&seasons=${seasons}`;
  const ctx = await browser.newContext(VIEWS[view]);
  const page = await ctx.newPage();
  const done = new Promise((resolve) => {
    page.on("console", (m) => {
      if (m.text().startsWith("bench")) resolve(m.text());
    });
  });
  const t = Date.now();
  await page.goto(url);
  const result = await Promise.race([
    done,
    new Promise((r) => setTimeout(() => r("timeout"), 15 * 60 * 1000)),
  ]);
  await page.waitForTimeout(1500);
  const shot = `${out}/lab-${view}-${basename(file, ".json")}-${seasons}-${label}.png`;
  await page.screenshot({ path: shot });
  console.log(shot, `${Math.round((Date.now() - t) / 1000)} s`, String(result).slice(0, 100));
  await ctx.close();
}
await browser.close();
