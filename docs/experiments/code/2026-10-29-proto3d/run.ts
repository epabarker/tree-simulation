/**
 * THROWAWAY PROTOTYPE: the experiment. Grows `forest`'s planting with C1–C6 and R1 in 2D (the core)
 * and in 3D (grow3d.ts) at each configuration, for SEASONS seasons, and writes:
 *  - results.json: metamers, ms per season and per metamer (light, passes), the foliage profile
 *    across z, crown extents, heights, at seasons 20, 30, 40, 60 and 100;
 *  - snapshots for the page (seasons 40 and 100): the 2D stand, and each 3D stand projected to
 *    (x, y) with a z per row, gzipped JSON.
 *
 *   node docs/experiments/code/2026-10-29-proto3d/run.ts <outDir> [config ...]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { treeMetrics } from "../../../../src/core/metrics.ts";
import type { Phase } from "../../../../src/core/season.ts";
import { type Snapshot, SnapshotBuilder } from "../../../../src/core/snapshot.ts";
import type { Tree } from "../../../../src/core/tree.ts";
import { World } from "../../../../src/core/world.ts";
import { bc, mc, type Options, Stand3D } from "./grow3d.ts";
import { protoParams } from "./params.ts";

const SEASONS = 100;
/** Growth (20–40; the garden's intro grows 40 seasons) and the mature stand (60, 100). */
const REPORT = [20, 30, 40, 60, 100];
const BAKE = [40, 100];
/** Seasons averaged for the per-season costs at each report. */
const WINDOW = 10;
const out = process.argv[2] ?? "runs/proto3d";
const R6 = process.env.R6 === "1";
const tag = R6 ? "-r6" : "";
const only = process.argv.slice(3);
mkdirSync(join(out, "stands"), { recursive: true });

const CONFIGS: Record<string, Omit<Options, "K" | "seed">> = {
  "d32-hard": { D: 32, fade: 0, divergence: 137.5 },
  "d48-hard": { D: 48, fade: 0, divergence: 137.5 },
  "d64-hard": { D: 64, fade: 0, divergence: 137.5 },
  "d32-fade": { D: 32, fade: 3, divergence: 137.5 },
  "d48-fade": { D: 48, fade: 3, divergence: 137.5 },
  "d64-fade": { D: 64, fade: 3, divergence: 137.5 },
  "d48-hard-distichous": { D: 48, fade: 0, divergence: 180 },
};

const q = (a: number[], p: number) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? (b[Math.min(b.length - 1, Math.floor(p * b.length))] as number) : 0;
};

function encode(s: Snapshot, z?: Float32Array): Buffer {
  const enc = (v: unknown): unknown =>
    ArrayBuffer.isView(v)
      ? { t: v.constructor.name, b: Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64") }
      : v;
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) o[k] = enc(v);
  if (z) o.z = enc(z);
  return gzipSync(JSON.stringify(o), { level: 9 });
}

/** A World-shaped holder for the snapshot builder (metrics read params, light and the trees). */
function holder(stand: Stand3D): World {
  const light = { sample: (_x: number, _y: number, _d: number, o: { q: number; vx: number; vy: number }) => { o.q = 1; o.vx = 0; o.vy = 1; } };
  return { trees: stand.trees, params: stand.params, season: stand.season, storm: false, light, paramsOf: () => stand.params } as unknown as World;
}

/** The 3D stand projected to (x, y) for the renderer, with the mid-depth of every row. */
function bake3D(stand: Stand3D): Buffer {
  const saved = stand.trees.map((t) => ({ a: mc(t).angle.slice(0, t.m.length), l: mc(t).length.slice(0, t.m.length) }));
  const zs: number[] = [];
  for (const t of stand.trees) {
    if (!t.alive) continue;
    const m = mc(t);
    for (let i = 0; i < t.m.length; i++) {
      const dx = m.dx[i] as number;
      const dy = m.dy[i] as number;
      const l = m.length[i] as number;
      m.angle[i] = Math.atan2(dy, dx);
      m.length[i] = l * Math.hypot(dx, dy);
      zs.push((m.z0[i] as number) + 0.5 * l * (m.dz[i] as number));
    }
  }
  const s = new SnapshotBuilder().build(holder(stand), 0, { junctions: false, field: false });
  stand.trees.forEach((t, k) => {
    const m = mc(t);
    m.angle.set(saved[k]!.a);
    m.length.set(saved[k]!.l);
  });
  return encode(s, new Float32Array(zs));
}

/** Live buds' z, in 1-cell bins (the foliage profile across the slab), and per-tree extents. */
function profile(stand: Stand3D) {
  const D = stand.o.D;
  const bins = new Array(D + 2).fill(0);
  const ext: number[] = [];
  const wid: number[] = [];
  const height: number[] = [];
  let leaves = 0;
  for (const t of stand.trees) {
    if (!t.alive) continue;
    const b = bc(t);
    let zmin = Infinity, zmax = -Infinity, xmin = Infinity, xmax = -Infinity, ymax = 0;
    for (let i = 0; i < t.b.length; i++) {
      if (b.state[i] === 0) continue;
      const [x, y, z] = stand.tip(t, b.metamer[i] as number);
      bins[Math.max(0, Math.min(D + 1, Math.floor(z) + 1))] += 1;
      leaves += 1;
      zmin = Math.min(zmin, z); zmax = Math.max(zmax, z);
      xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
      ymax = Math.max(ymax, y);
    }
    if (Number.isFinite(zmin)) { ext.push(zmax - zmin); wid.push(xmax - xmin); height.push(ymax); }
  }
  // Faces: the outermost 2 cells on each side, against an even spread (4/D of the leaves).
  const inner = bins.slice(1, D + 1);
  const faceShare = (inner[0] + inner[1] + inner[D - 2] + inner[D - 1]) / Math.max(1, leaves);
  return { bins: inner, beyond: bins[0] + bins[D + 1], leaves, faceShare, faceEven: 4 / D,
    crownDepth: { p50: q(ext, 0.5), p90: q(ext, 0.9), max: q(ext, 1) },
    crownWidth: { p50: q(wid, 0.5), p90: q(wid, 0.9) },
    height: { p50: q(height, 0.5), max: q(height, 1) }, trees: ext.length };
}

const results: Record<string, unknown> = {};

// 2D reference: the core, same planting and principles, timed by phase.
{
  const p = protoParams(1, R6);
  const w = new World(p);
  let last = 0;
  let light = 0;
  let passes = 0;
  const window: { light: number; passes: number; metamers: number }[] = [];
  const mark = (phase: Phase) => {
    const now = performance.now();
    if (phase === "light") light += now - last; else passes += now - last;
    last = now;
  };
  const rows: Record<string, unknown> = {};
  const builder = new SnapshotBuilder();
  for (let s = 1; s <= SEASONS; s++) {
    const l0 = light, p0 = passes;
    last = performance.now();
    w.step(mark);
    const m = w.trees.filter((t) => t.alive).reduce((n, t) => n + t.m.length, 0);
    window.push({ light: light - l0, passes: passes - p0, metamers: m });
    if (REPORT.includes(s)) {
      const recent = window.slice(-WINDOW);
      const ms = recent.reduce((a, r) => a + r.passes, 0) / recent.length;
      const mm = recent.reduce((a, r) => a + r.metamers, 0) / recent.length;
      const live = w.trees.filter((t: Tree) => t.alive);
      rows[s] = { metamers: m, trees: live.length, lightMs: recent.reduce((a, r) => a + r.light, 0) / recent.length, passesMs: ms, usPerMetamer: (1000 * ms) / mm,
        crownWidth: q(live.map((t) => treeMetrics(t, w).crownWidth), 0.5), height: q(live.map((t) => treeMetrics(t, w).height), 0.5),
        leaves: live.reduce((n, t) => n + t.b.length, 0) };
      console.log(`2D s${s}`, JSON.stringify(rows[s]));
    }
    if (BAKE.includes(s)) {
      builder.reset();
      writeFileSync(join(out, "stands", `2d${tag}-s${s}.json.gz`), encode(builder.build(w, 0, { junctions: false, field: false })));
    }
  }
  results[`2d${tag}`] = rows;
}

for (const [name, cfg] of Object.entries(CONFIGS)) {
  if (only.length && !only.includes(name)) continue;
  const p = protoParams(1, R6);
  const stand = new Stand3D(p, { ...cfg, K: 16, seed: 1 });
  const window: { light: number; passes: number; metamers: number }[] = [];
  const rows: Record<string, unknown> = {};
  for (let s = 1; s <= SEASONS; s++) {
    const l0 = stand.ms.light, p0 = stand.ms.passes;
    stand.step();
    window.push({ light: stand.ms.light - l0, passes: stand.ms.passes - p0, metamers: stand.metamers() });
    if (REPORT.includes(s)) {
      const recent = window.slice(-WINDOW);
      const ms = recent.reduce((a, r) => a + r.passes, 0) / recent.length;
      const mm = recent.reduce((a, r) => a + r.metamers, 0) / recent.length;
      rows[s] = { metamers: stand.metamers(), lightMs: recent.reduce((a, r) => a + r.light, 0) / recent.length, passesMs: ms, usPerMetamer: (1000 * ms) / mm, ...profile(stand) };
      const r = rows[s] as Record<string, unknown>;
      console.log(`${name} s${s}`, JSON.stringify({ ...r, bins: undefined }));
    }
    if (BAKE.includes(s)) writeFileSync(join(out, "stands", `${name}${tag}-s${s}.json.gz`), bake3D(stand));
  }
  results[`${name}${tag}`] = { config: cfg, rows };
  writeFileSync(join(out, `results${tag}.json`), `${JSON.stringify(results, null, 1)}\n`);
}
writeFileSync(join(out, `results${tag}.json`), `${JSON.stringify(results, null, 1)}\n`);
console.log("DONE");
