/**
 * THROWAWAY (after G3, ADR 0024): the slab sweep's light drawn as the lab draws its shade overlay
 * (src/web/render/colors.ts `shadeImage`, over the lab's sky), at season 100 with whole-cell shifts
 * and with bilinear reads, plus their difference, so any banding is on record before calibration.
 * The lab itself is 2D and cannot show the 3D field, so this page puts the slab's maps through the
 * lab's own heatmap code and Playwright screenshots it.
 *
 *   cargo run --release --manifest-path docs/experiments/code/2026-10-29-g3/Cargo.toml -- \
 *     runs/g3/deposits runs/g3/heatmap heatmap
 *   NODE_PATH=$(npm root -g) node docs/experiments/code/2026-10-29-g3/heatmaps.ts runs/g3/heatmap
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { shadeImage } from "../../../../src/web/render/colors.ts";

const W = 210;
const H = 130;
const SCALE = 3;
const dir = process.argv[2] ?? "runs/g3/heatmap";

function map(name: string): Float32Array {
  const b = readFileSync(join(dir, `${name}.f32`));
  return new Float32Array(b.buffer, b.byteOffset, W * H);
}

/** RGBA rows top-down (the field is stored with row 0 at the ground), as a base64 string. */
function rgba(img: Uint8ClampedArray): string {
  const out = new Uint8ClampedArray(img.length);
  for (let y = 0; y < H; y++) out.set(img.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  return Buffer.from(out.buffer).toString("base64");
}

/** shifts − bilinear: blue where shifts are lighter, red where darker, at ±0.1 of open sky. */
function difference(a: Float32Array, b: Float32Array): Uint8ClampedArray {
  const img = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const d = Math.max(-1, Math.min(1, ((a[i] as number) - (b[i] as number)) / 0.1));
    img[i * 4] = d > 0 ? 200 : 40;
    img[i * 4 + 1] = 60;
    img[i * 4 + 2] = d < 0 ? 200 : 40;
    img[i * 4 + 3] = Math.round(255 * Math.abs(d));
  }
  return img;
}

const stands = [
  ["d64-hard-r6", "τ = 1 (hedgerow)"],
  ["d64-t020-r6", "τ = 0.2 (wood interior)"],
] as const;
const cells: string[] = [];
const stats: string[] = [];
for (const [name, label] of stands) {
  for (const what of ["slice", "mean"] as const) {
    const s = map(`${name}-s100-shifts-${what}`);
    const b = map(`${name}-s100-bilinear-${what}`);
    let sum = 0;
    let worst = 0;
    for (let i = 0; i < W * H; i++) {
      const d = Math.abs((s[i] as number) - (b[i] as number));
      sum += d;
      worst = Math.max(worst, d);
    }
    stats.push(`${name} ${what}: mean |Δshade| ${(sum / (W * H)).toFixed(4)}, max ${worst.toFixed(3)}`);
    const title = `${label}, ${what === "slice" ? "mid-depth slice z = 32" : "mean over z"}`;
    for (const [col, img] of [
      ["whole-cell shifts", shadeImage(s, W, H)],
      ["bilinear", shadeImage(b, W, H)],
      ["shifts − bilinear (red: darker, ±0.1)", difference(s, b)],
    ] as const) {
      cells.push(
        `<figure><canvas data-px="${rgba(img)}"></canvas><figcaption>${title}<br>${col}</figcaption></figure>`,
      );
    }
  }
}

const html = `<!doctype html><meta charset="utf-8"><style>
body { margin: 12px; font: 12px system-ui, sans-serif; background: #fff; color: #222; }
main { display: grid; grid-template-columns: repeat(3, ${W * SCALE}px); gap: 10px; }
figure { margin: 0; }
canvas { width: ${W * SCALE}px; height: ${H * SCALE}px; image-rendering: pixelated;
  background: linear-gradient(#cfe2ee, #f4efe2); display: block; }
h1 { font-size: 14px; margin: 0 0 8px; }
</style><h1>Slab sweep light, season 100, K = 16 rotating, D = 64: shade 1 − Q/C as the lab's overlay draws it</h1>
<main>${cells.join("")}</main>
<script>
for (const c of document.querySelectorAll("canvas")) {
  c.width = ${W}; c.height = ${H};
  const bytes = Uint8ClampedArray.from(atob(c.dataset.px), (ch) => ch.charCodeAt(0));
  c.getContext("2d").putImageData(new ImageData(bytes, ${W}, ${H}), 0, 0);
}
</script>`;
writeFileSync(join(dir, "heatmaps.html"), html);
console.log(stats.join("\n"));

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3 * W * SCALE + 50, height: 800 } });
await page.goto(`file://${join(process.cwd(), dir, "heatmaps.html")}`);
await page.screenshot({
  path: "docs/experiments/figures/2026-10-29-g3-heatmaps.png",
  fullPage: true,
});
await browser.close();
