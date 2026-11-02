// The garden's planted trees at seed 10 under oak today and "held" (r2.dLambda 0.04), sampled every 3 s
// as the page grows them to 100 (the judging sheets' garden-oak rows): species, alive, H, H/D.
//   node oakfate.mjs <origin>
import { createRequire } from "node:module";
const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"],
});
for (const assign of [{}, { "r2.dLambda": 0.04 }]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const done = new Promise((r) => page.on("console", (m) => m.text().startsWith("bench") && r()));
  await page.goto(`${process.argv[2]}/garden.html?seed=10&bench&seasons=100`);
  await page.waitForFunction(() => window.garden);
  await page.evaluate(async (assign) => {
    const g = window.garden;
    g.setYearSeconds(0);
    await g.ready;
    const p = structuredClone((await g.record()).params);
    for (const [k, v] of Object.entries(assign)) {
      const ks = k.split(".");
      let o = p.species.oak;
      for (const x of ks.slice(0, -1)) o = o[x];
      o[ks.at(-1)] = v;
    }
    window.planted = p.trees.map((t) => t.species);
    await g.restart(p);
  }, assign);
  const seen = {};
  // Sample the planted trees' metrics every few seconds as the run goes.
  const timer = setInterval(async () => {
    try {
      const m = await page.evaluate(() => {
        const s = window.garden.scene.next;
        return { season: s.season, trees: s.metrics.filter((t) => t.tree < 2).map((t) => ({ tree: t.tree, sp: t.species, alive: t.alive, H: Math.round(t.height), hd: Math.round(t.slenderness ?? 0) })) };
      });
      for (const t of m.trees) seen[t.tree] = { ...t, season: m.season };
    } catch {}
  }, 3000);
  await done;
  clearInterval(timer);
  const end = await page.evaluate(() => ({ planted: window.planted, trees: window.garden.scene.next.metrics.filter((t) => t.tree < 2).map((t) => ({ tree: t.tree, sp: t.species, alive: t.alive, H: Math.round(t.height) })), events: (window.garden.scene.next.events ?? []).length }));
  const rec = await page.evaluate(async () => (await window.garden.record()).events.slice(0, 20));
  console.log(JSON.stringify(assign), "last seen:", JSON.stringify(seen), "end:", JSON.stringify(end), "record events:", JSON.stringify(rec));
  await ctx.close();
}
await browser.close();
