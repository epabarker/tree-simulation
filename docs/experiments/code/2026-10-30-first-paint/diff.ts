/**
 * How the regenerated opening forests differ from garden 0.14.0's: per forest, the trees and
 * metamers whose rows differ at all, and the largest difference in any metamer's tip position and
 * radius (cells). Same tables when every count is 0.
 *
 *   node docs/experiments/code/2026-10-30-first-paint/diff.ts runs/first-compare
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { coreWasm, loadWorldsSync, RustWorld } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));
const dir = process.argv[2] ?? "runs/first-compare";
const open = (f: string) => RustWorld.load(new Uint8Array(gunzipSync(readFileSync(f))));

for (const w of [66, 100, 160, 220]) {
  for (const s of [9, 10, 12]) {
    const a = open(`${dir}/old/${w}-${s}.bin.gz`);
    const b = open(`${dir}/new/${w}-${s}.bin.gz`);
    let rows = 0;
    let differ = 0;
    let trees = 0;
    let tip = 0;
    let radius = 0;
    let structure = "same";
    for (let t = 0; t < a.trees.length; t++) {
      const ta = a.trees[t];
      const tb = b.trees[t];
      if (!ta || !tb || ta.m.length !== tb.m.length) {
        structure = "DIFFERS";
        continue;
      }
      let treeDiffers = false;
      for (let i = 0; i < ta.m.length; i++) {
        rows += 1;
        if (ta.m.cols.parent[i] !== tb.m.cols.parent[i] || ta.m.cols.birthId[i] !== tb.m.cols.birthId[i]) structure = "DIFFERS";
        const d = Math.hypot(ta.tipX(i) - tb.tipX(i), ta.tipY(i) - tb.tipY(i));
        const dr = Math.abs((ta.m.cols.radius[i] as number) - (tb.m.cols.radius[i] as number));
        if (d > 0 || dr > 0) {
          differ += 1;
          treeDiffers = true;
        }
        tip = Math.max(tip, d);
        radius = Math.max(radius, dr);
      }
      if (treeDiffers) trees += 1;
    }
    console.log(
      `${String(w).padStart(3)}-${String(s).padEnd(2)} topology ${structure}; ${trees} of ${a.trees.length} trees and ${differ} of ${rows} metamers differ; largest tip shift ${tip.toExponential(2)} cells, radius ${radius.toExponential(2)}`,
    );
  }
}
