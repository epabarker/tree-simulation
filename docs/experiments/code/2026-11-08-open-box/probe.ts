/**
 * PROTOTYPE (wayfinder "What does a cheap feature probe look like?"): throwaway, not part of any
 * build or test. A feature probe in one command: a lone tree and the garden at fixed seasons over
 * three seeds, at HEAD and with a param patch, drawn frontally on one HTML contact sheet with a few
 * numbers. Three layouts are switchable with ?variant=A|B|C (or the arrow keys) for the user to
 * react to. Exploratory only: 3 seeds never support an adoption claim (AGENTS.md).
 *
 *   node cli/prototype-probe.ts [--species beech] [--patch patch.json] [--label name]
 *        [--seeds 1,2,3] [--lone 30,60,100] [--garden 50,100,150] [--width 160]
 *
 * patch.json: { "params": <a Params patch for every world>,
 *               "species": { "<name>": { "<dotted.path>": value } } }  (trials.ts' amendSpecies)
 * Writes runs/probe/<label>/sheet.html.
 */

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { mergeParams, type Params } from "../../../../src/core/params.ts";
import { forestParams } from "../../../../src/core/presets.ts";
import { BudState } from "../../../../src/core/types.ts";
import type { TreeView } from "../../../../src/wasm/world.ts";
import { loneParams, newWorld, withAssign } from "../../../../cli/trials.ts";

const CELL = 0.25; // m per cell
const DISPLAY = 1.3 / CELL; // a stem counts as drawn from 1.3 m (regeneration research)

const arg = (name: string, dflt: string): string => {
  const k = process.argv.indexOf(`--${name}`);
  return k > 0 ? (process.argv[k + 1] as string) : dflt;
};
const nums = (s: string): number[] => s.split(",").map(Number);

type Patch = { params?: Record<string, unknown>; species?: Record<string, Record<string, unknown>> };

function applyPatch(p: Params, patch: Patch): Params {
  let out = patch.params ? mergeParams(p, patch.params as never) : p;
  for (const [sp, assign] of Object.entries(patch.species ?? {})) out = withAssign(out, sp, assign);
  return out;
}

// ---- the numbers, from the tables (prototype definitions, named in the sheet) ----

function leafy(t: TreeView): number[] {
  const b = t.b.cols;
  const out: number[] = [];
  for (let j = 0; j < t.b.length; j++) {
    const s = b.state[j];
    if (s === BudState.active || s === BudState.shortShoot) out.push(b.metamer[j] as number);
  }
  return out;
}

/** Clear bole by leaf: the height below which 5% of the leafy buds sit, over tree height. */
function leafBole(t: TreeView, height: number): number {
  const ys = leafy(t)
    .map((i) => t.tipY(i))
    .sort((a, b) => a - b);
  if (ys.length === 0 || height <= 0) return Number.NaN;
  return (ys[Math.floor(0.05 * ys.length)] as number) / height;
}

/**
 * Top fullness: the leafy crown's width in its top fifth (by crown depth) over its widest width.
 * About 1 for a flat cap, ~0.8 for a dome, ~0.3 for a spire.
 */
function topFullness(t: TreeView): number {
  const pts = leafy(t).map((i) => [t.tipX(i), t.tipY(i)] as const);
  if (pts.length < 20) return Number.NaN;
  const ys = pts.map((p) => p[1]).sort((a, b) => a - b);
  const lo = ys[Math.floor(0.05 * ys.length)] as number;
  const hi = ys[ys.length - 1] as number;
  const bands = 10;
  const w = Array.from({ length: bands }, () => [Infinity, -Infinity]);
  for (const [x, y] of pts) {
    if (y < lo) continue;
    const k = Math.min(bands - 1, Math.floor(((y - lo) / (hi - lo + 1e-9)) * bands));
    const band = w[k] as number[];
    band[0] = Math.min(band[0] as number, x);
    band[1] = Math.max(band[1] as number, x);
  }
  const widths = w.map(([a, b]) => (b! > a! ? b! - a! : 0));
  const top = Math.max(widths[bands - 1] as number, widths[bands - 2] as number);
  return top / Math.max(...widths);
}

// ---- a frame: the drawing, packed small ----

type Frame = {
  season: number;
  wood: number[]; // x0,y0,x1,y1,r per metamer (cells, rounded to 0.1)
  leaves: number[]; // x,y,tree-species index, deduplicated on a half-cell grid
  numbers: Record<string, number>;
};

const SPECIES: string[] = [];
const spIndex = (s: string): number => {
  let k = SPECIES.indexOf(s);
  if (k < 0) k = SPECIES.push(s) - 1;
  return k;
};
const r1 = (x: number): number => Math.round(x * 10) / 10;

function frame(world: ReturnType<typeof newWorld>, kind: "lone" | "garden"): Frame {
  const wood: number[] = [];
  const leaves: number[] = [];
  const seen = new Set<string>();
  const trees = world.trees.filter((t) => t.alive);
  for (const t of trees) {
    const c = t.m.cols;
    const minR = kind === "lone" ? 0.05 : 0.15; // drop the finest twigs: leaves carry the outline
    for (let i = 0; i < t.m.length; i++) {
      const r = c.radius[i] as number;
      if (r < minR && i > 0) continue;
      wood.push(r1(c.baseX[i] as number), r1(c.baseY[i] as number), r1(t.tipX(i)), r1(t.tipY(i)), r1(r));
    }
    const sp = spIndex(t.species);
    for (const i of leafy(t)) {
      const x = Math.round(t.tipX(i) * 2) / 2;
      const y = Math.round(t.tipY(i) * 2) / 2;
      const key = `${x},${y},${sp}`;
      if (seen.has(key)) continue;
      seen.add(key);
      leaves.push(x, y, sp);
    }
  }
  const numbers: Record<string, number> = {};
  if (kind === "lone") {
    const t = trees[0];
    if (t) {
      const m = world.metricsOf(t);
      numbers.heightM = m.height * CELL;
      numbers.widthM = m.crownWidth * CELL;
      numbers.boleLimb = m.boleHeight / m.height;
      numbers.boleLeaf = leafBole(t, m.height);
      numbers.topFull = topFullness(t);
    }
  } else {
    const ms = trees.map((t) => world.metricsOf(t));
    numbers.alive = ms.length;
    numbers.drawn = ms.filter((m) => m.height >= DISPLAY).length;
    numbers.over10m = ms.filter((m) => m.height * CELL >= 10).length;
    const tall = ms.filter((m) => m.height * CELL >= 10);
    numbers.boleLimbTall = median(tall.map((m) => m.boleHeight / m.height));
    numbers.boleLeafTall = median(
      trees.filter((t, k) => (ms[k]?.height ?? 0) * CELL >= 10).map((t) => leafBole(t, world.metricsOf(t).height)),
    );
  }
  return { season: world.season, wood, leaves, numbers };
}

function median(xs: number[]): number {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return Number.NaN;
  const k = s.length >> 1;
  return s.length % 2 ? (s[k] as number) : ((s[k - 1] as number) + (s[k] as number)) / 2;
}

// ---- one job: a world, one seed, with or without the patch ----

function job(kind: "lone" | "garden", seed: number, patched: boolean, out: string): void {
  const species = arg("species", "beech");
  const patch: Patch = patched ? JSON.parse(readFileSync(arg("patch", ""), "utf8")) : {};
  // --lonebox <side>: the open-grown lone stage (ADR 0062): τ 1 faces, open x sides, a square box.
  const box = Number(arg("lonebox", "0"));
  const lone = box
    ? mergeParams(loneParams(species, seed), {
        world: { width: box, depth: box, faces: [1, 1], sidesZ: "open" },
        trees: [{ x: box / 2, z: box / 2, species }],
      } as never)
    : loneParams(species, seed);
  const base = kind === "lone" ? lone : forestParams(Number(arg("width", "160")), seed);
  const world = newWorld(applyPatch(base, patch));
  const frames = nums(arg(kind, kind === "lone" ? "30,60,100" : "50,100,150"));
  const last = Math.max(...frames);
  const series: Record<string, number>[] = [];
  const shots: Frame[] = [];
  const t0 = Date.now();
  const perSeason: number[] = [];
  while (world.season < last) {
    const ts = performance.now();
    world.step(1);
    perSeason.push((performance.now() - ts) / 1000);
    if (world.season % 10 === 0) series.push({ season: world.season, ...frame(world, kind).numbers });
    if (frames.includes(world.season)) shots.push(frame(world, kind));
  }
  const width = world.params.world.width;
  writeFileSync(
    out,
    JSON.stringify({ kind, seed, patched, width, species: SPECIES, frames: shots, series, secs: (Date.now() - t0) / 1000, perSeason, hash: world.hash?.() }),
  );
}

// ---- the driver ----

async function main(): Promise<void> {
  const k = process.argv.indexOf("--job");
  if (k > 0) {
    const [kind, seed, patched, out] = process.argv.slice(k + 1);
    job(kind as "lone" | "garden", Number(seed), patched === "1", out as string);
    return;
  }
  const label = arg("label", "probe");
  const dir = `runs/probe/${label}`;
  mkdirSync(dir, { recursive: true });
  const hasPatch = process.argv.includes("--patch");
  const seeds = nums(arg("seeds", "1,2,3"));
  const jobs: string[][] = [];
  const kinds = arg("garden", "") === "none" ? ["lone"] : ["lone", "garden"];
  for (const kind of kinds)
    for (const seed of seeds)
      for (const p of hasPatch ? ["0", "1"] : ["0"]) jobs.push([kind, String(seed), p, `${dir}/${kind}-${seed}-${p}.json`]);
  const pass = process.argv.slice(2);
  const limit = Math.min(12, cpus().length);
  let next = 0;
  const t0 = Date.now();
  const run = async (): Promise<void> => {
    while (next < jobs.length) {
      const j = jobs[next++] as string[];
      await new Promise<void>((ok, bad) => {
        const c = spawn(process.execPath, [import.meta.filename, ...pass, "--job", ...j], { stdio: "inherit" });
        c.on("exit", (code) => (code === 0 ? ok() : bad(new Error(`${j.join(" ")} exited ${code}`))));
      });
      process.stderr.write(`done ${j.slice(0, 3).join(" ")}\n`);
    }
  };
  await Promise.all(Array.from({ length: limit }, run));
  const results = jobs.map((j) => JSON.parse(readFileSync(j[3] as string, "utf8")));
  const meta = {
    label,
    species: arg("species", "beech"),
    patch: hasPatch ? JSON.parse(readFileSync(arg("patch", ""), "utf8")) : null,
    seeds,
    wall: (Date.now() - t0) / 1000,
    date: new Date().toISOString().slice(0, 16),
  };
  const tpl = readFileSync(new URL("./probe.html", import.meta.url), "utf8");
  const html = tpl.replace("/*DATA*/null", JSON.stringify({ meta, results }));
  writeFileSync(`${dir}/sheet.html`, html);
  console.log(`${dir}/sheet.html  (${(html.length / 1e6).toFixed(1)} MB, ${meta.wall.toFixed(0)} s)`);
}

await main();
