/**
 * THROWAWAY PROTOTYPE: the "leafy to the ground" measure on today's full 2D model, as an anchor
 * for the τ runs: each tree's leaf area below half its height over its total, at seasons 40, 100.
 *
 *   OUT=runs/proto3d-tau/stands node docs/experiments/code/2026-10-29-proto3d/anchor2d.ts forest mixedWood oakOpen
 */
import { isLiveBud } from "../../../../src/core/principles/c3-allocation.ts";
import { depositArea } from "../../../../src/core/principles/r6-short-shoots.ts";
import { presetParams } from "../../../../src/core/presets.ts";
import { SnapshotBuilder } from "../../../../src/core/snapshot.ts";
import { World } from "../../../../src/core/world.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

/** The stands for cover.py, in run.ts's format (written when OUT is set). */
const OUT = process.env.OUT;
function encode(s: object): Buffer {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s))
    o[k] = ArrayBuffer.isView(v) ? { t: v.constructor.name, b: Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64") } : v;
  return gzipSync(JSON.stringify(o), { level: 9 });
}

const q = (a: number[], p: number) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? (b[Math.min(b.length - 1, Math.floor(p * b.length))] as number) : 0;
};

for (const preset of process.argv.slice(2)) {
  const w = new World(presetParams(preset, 1));
  for (let s = 1; s <= 100; s++) {
    w.step();
    if (s !== 40 && s !== 100) continue;
    if (OUT) {
      mkdirSync(OUT, { recursive: true });
      const snap = new SnapshotBuilder().build(w, 0, { junctions: false, field: false });
      writeFileSync(`${OUT}/full-${preset}-s${s}.json.gz`, encode(snap));
    }
    const trees: { h: number; lo: number; tot: number }[] = [];
    for (const t of w.trees) {
      if (!t.alive) continue;
      const r6 = w.paramsOf(t).r6;
      const m = t.m.cols;
      const b = t.b.cols;
      const ys: number[] = [];
      const as: number[] = [];
      for (let i = 0; i < t.b.length; i++) {
        const area = isLiveBud(b.state[i] as number) ? depositArea(b.state[i] as number, r6) : 0;
        if (area <= 0) continue;
        const j = b.metamer[i] as number;
        ys.push((m.baseY[j] as number) + (m.length[j] as number) * Math.sin(m.angle[j] as number));
        as.push(area);
      }
      if (!ys.length) continue;
      const h = Math.max(...ys);
      let lo = 0;
      let tot = 0;
      ys.forEach((y, i) => {
        tot += as[i] as number;
        if (y < 0.5 * h) lo += as[i] as number;
      });
      trees.push({ h, lo, tot });
    }
    // Saplings under the canopy are all "low" against the stand: only trees reaching half the
    // tallest's height are scored, each against its own height (as in the 3D runs).
    const top = Math.max(...trees.map((t) => t.h));
    const canopy = trees.filter((t) => t.h >= 0.5 * top);
    const shares = canopy.map((t) => t.lo / t.tot);
    const low = canopy.reduce((n, t) => n + t.lo, 0);
    const all = canopy.reduce((n, t) => n + t.tot, 0);
    console.log(JSON.stringify({ preset, season: s, trees: shares.length, p10: q(shares, 0.1), p50: q(shares, 0.5), p90: q(shares, 0.9), pooled: low / all }));
  }
}
