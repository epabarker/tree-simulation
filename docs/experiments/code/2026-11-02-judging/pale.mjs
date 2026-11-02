// Why trees read pale (track E's findings on the judging sheets, 2026-11-02): grows a plate in the
// real page as shots.mjs does and measures its wood as drawn. For every live metamer: its colour
// (the natural palette's entry), its drawn width in CSS px (the shader draws a stem under 1 px at
// 1 px with alpha = its width, `coverage`), the sky behind it (the backdrop's gradient at its
// height), and so its contrast: ΔL* (CIE) between the sky and the colour composited over it.
// Reports, weighted by drawn length: the share of wood that vanishes (ΔL* < 10), is faint (10–25)
// or reads (≥ 25), the share under 1 px, by species; and the planted trees' depths.
//   node pale.mjs <origin> [case …]      cases: garden-<seed>-<seasons>, <species>-<trial>
// VIEW adds view options to every URL (e.g. "&woodContrast=0" for the old look).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("playwright-core");
const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.ROOT ?? join(here, "../../../..");
const table = JSON.parse(readFileSync(join(root, "rust/presets.json"), "utf8")).presets.oakOpen.species;
const [origin, ...cases] = process.argv.slice(2);
const exe = process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const VIEW = process.env.VIEW ?? "";

const STAND_W = 84;
function standTrees(species) {
  const trees = [];
  for (let r = 0; r < 3; r++)
    for (const x of [10.5, 31.5, 52.5, 73.5]) trees.push({ x: (x + r * 7) % STAND_W, z: (64 * (r + 0.5)) / 3, species });
  return trees;
}
function labURL(species, trial) {
  const lone = trial !== "stand100";
  const patch = {
    world: lone
      ? { width: 240, height: 200, walls: [] }
      : { width: STAND_W, height: 200, walls: [], sides: "periodic", faces: [0, 0] },
    trees: lone ? [{ x: 120, species }] : standTrees(species),
    species: { [species]: table[species] },
  };
  const seasons = trial === "lone60" ? 60 : 100;
  const p = Buffer.from(JSON.stringify(patch)).toString("base64url");
  return `${origin}/?preset=oakOpen&seed=4&p=${p}&bench&seasons=${seasons}&frame=height${VIEW}`;
}

// The measurement, in the page: everything it reads is the scene's and the renderer's own.
function measure() {
  const g = window.garden;
  const sc = g.scene;
  const s = sc.next;
  const theme = g.renderer.theme;
  const pal = sc.palette("natural", theme);
  const idx = sc.colorIndices("natural", pal.length);
  sc.computeGeometry(1);
  const geom = sc.geom;
  // "#rrggbb" or "rgb(r, g, b)" (the ramps are rgb()) as 0–1 channels.
  const hex = (c) =>
    c.startsWith("#")
      ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      : c.match(/[\d.]+/g).slice(0, 3).map((v) => Number(v) / 255);
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const Lstar = (rgb) => {
    const Y = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
  };
  const top = hex(theme.skyTop);
  const bottom = hex(theme.skyBottom);
  const yTop = sc.screenToWorld(0, 0)[1];
  const species = Object.fromEntries(s.metrics.map((m) => [m.tree, m.species]));
  const out = {};
  // Drawn length by stem diameter (cm, the model's: radius in cells × 50), upper bounds.
  const BINS = [0.5, 1, 2, 4, 8, 16, 32, Infinity];
  const add = (key, w, dL, thin, cm) => {
    const o = (out[key] ??= { len: 0, vanish: 0, faint: 0, reads: 0, thin: 0, dL: 0, cm: BINS.map(() => 0) });
    o.cm[BINS.findIndex((b) => cm < b)] += w;
    o.len += w;
    o.dL += w * dL;
    if (dL < 10) o.vanish += w;
    else if (dL < 25) o.faint += w;
    else o.reads += w;
    if (thin) o.thin += w;
  };
  const scale = sc.camera.scale; // CSS px per cell
  for (let j = 0; j < s.metamerCount; j++) {
    const len = Math.hypot(geom.tipX[j] - geom.baseX[j], geom.tipY[j] - geom.baseY[j]) * scale;
    if (!(len > 0)) continue;
    const width = 2 * geom.radius[j] * scale;
    const cov = Math.min(1, width);
    const c = pal[idx[j]];
    const rgb = hex(c);
    const f = Math.min(1, Math.max(0, (geom.baseY[j] + geom.tipY[j]) / 2 / yTop));
    const sky = bottom.map((b, q) => b + (top[q] - b) * f);
    const shown = rgb.map((v, q) => cov * v + (1 - cov) * sky[q]);
    const dL = Math.abs(Lstar(shown) - Lstar(sky));
    const sp = species[s.tree[j]] ?? "?";
    const cm = (s.radius[j] ?? 0) * 50;
    add(sp, len, dL, width < 1, cm);
    add("all", len, dL, width < 1, cm);
  }
  const roots = [];
  for (let j = 0; j < s.metamerCount; j++) if (s.parent[j] < 0) roots.push(Math.round(s.z0[j] * 10) / 10);
  const pct = (a, b) => Math.round((100 * a) / b);
  const table = Object.fromEntries(
    Object.entries(out).map(([k, o]) => [
      k,
      {
        vanish: pct(o.vanish, o.len),
        faint: pct(o.faint, o.len),
        reads: pct(o.reads, o.len),
        under1px: pct(o.thin, o.len),
        meanDL: Math.round(o.dL / o.len),
        px: Math.round(o.len),
        // Share of drawn length by diameter, cm: < 0.5, < 1, < 2, < 4, < 8, < 16, < 32, ≥ 32.
        cm: o.cm.map((w) => pct(w, o.len)),
      },
    ]),
  );
  return { season: s.season, depth: s.depth, rootZ: [Math.min(...roots), Math.max(...roots)], trees: roots.length, table };
}

const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"],
});
for (const c of cases) {
  const garden = c.match(/^garden-(\d+)-(\d+)$/);
  const ctx = await browser.newContext(
    garden
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "light" }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" },
  );
  const page = await ctx.newPage();
  const done = new Promise((resolve) => page.on("console", (m) => m.text().startsWith("bench") && resolve()));
  if (garden) {
    await page.goto(`${origin}/garden.html?seed=${garden[1]}&bench&seasons=${garden[2]}${VIEW}`);
    await page.waitForFunction(() => window.garden);
    await page.evaluate(() => window.garden.setYearSeconds(0));
  } else {
    const [species, trial] = c.split("-");
    await page.goto(labURL(species, trial));
  }
  await done;
  await page.waitForTimeout(500);
  console.log(c, JSON.stringify(await page.evaluate(measure)));
  await ctx.close();
}
await browser.close();
