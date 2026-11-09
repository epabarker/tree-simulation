/**
 * The feature probe (wayfinder #81, ADR 0062): one command that grows a lone open-grown tree and
 * the garden at fixed seasons over a few seeds, at HEAD and with a param patch, and draws them on
 * one HTML contact sheet, numbers under each frame and over seasons below. It is the instrument
 * the feature playbook's builds look with. Exploratory: three seeds never support an adoption
 * claim (AGENTS.md), so the sheet says so.
 *
 *   node cli/probe.ts [--species beech] [--patch patch.json] [--label name] [--seeds 1,2,3]
 *        [--lone 30,60,100] [--garden 50,100,150 | none] [--width 160] [--box 240] [--walled]
 *
 * patch.json: { "params": <a Params patch for every world>,
 *               "species": { "<name>": { "<dotted.path>": value } } }  (trials.ts' amendSpecies)
 *
 * The lone stage is open-grown (`openLoneParams`: τ 1 on all four sides, a `--box`-cell square box,
 * the tree at its centre); `--walled` grows the half-walled lone trial (`loneParams`) instead, as a
 * control. **The hard check:** in the open box no bud may sit outside the light's box in any
 * season (metrics' `budsOutside`); if one does, the probe says which run and exits 1. The garden
 * is `forestParams(--width)`. Writes runs/probe/<label>/sheet.html and each job's JSON beside it.
 */

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { mergeParams, type Params } from "../src/core/params.ts";
import { forestParams, OPEN_BOX } from "../src/core/presets.ts";
import { BudState } from "../src/core/types.ts";
import type { TreeView } from "../src/wasm/world.ts";
import { loneParams, newWorld, openLoneParams, withAssign } from "./trials.ts";

const CELL = 0.25; // m per cell
const DISPLAY = 1.3 / CELL; // a stem counts as drawn from 1.3 m (regeneration research)
const BANDS = 10; // the crown outline's height bands

const arg = (name: string, dflt: string): string => {
  const k = process.argv.indexOf(`--${name}`);
  return k > 0 ? (process.argv[k + 1] as string) : dflt;
};
const nums = (s: string): number[] => s.split(",").map(Number);

type Patch = {
  params?: Record<string, unknown>;
  species?: Record<string, Record<string, unknown>>;
};
type Kind = "lone" | "garden";

function applyPatch(p: Params, patch: Patch): Params {
  let out = patch.params ? mergeParams(p, patch.params as never) : p;
  for (const [sp, assign] of Object.entries(patch.species ?? {})) out = withAssign(out, sp, assign);
  return out;
}

// ---- the numbers, from the tables ----

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
 * The crown outline: the leafy silhouette's frontal extent in BANDS height bands, from the height
 * under 5% of the leafy buds to the top. Each band is [y0, y1, xmin, xmax] in cells (an empty band
 * has xmin > xmax).
 */
function outline(t: TreeView): number[][] {
  const pts = leafy(t).map((i) => [t.tipX(i), t.tipY(i)] as const);
  if (pts.length < 20) return [];
  const ys = pts.map((p) => p[1]).sort((a, b) => a - b);
  const lo = ys[Math.floor(0.05 * ys.length)] as number;
  const hi = ys[ys.length - 1] as number;
  const step = (hi - lo + 1e-9) / BANDS;
  const bands = Array.from({ length: BANDS }, (_, k) => [
    lo + k * step,
    lo + (k + 1) * step,
    Infinity,
    -Infinity,
  ]);
  for (const [x, y] of pts) {
    if (y < lo) continue;
    const band = bands[Math.min(BANDS - 1, Math.floor((y - lo) / step))] as number[];
    band[2] = Math.min(band[2] as number, x);
    band[3] = Math.max(band[3] as number, x);
  }
  return bands.map((b) => b.map(r1));
}

/** Top fullness: the outline's width in its top fifth over its widest (≈1 flat cap, ≈0.3 spire). */
function topFullness(bands: number[][]): number {
  if (bands.length === 0) return Number.NaN;
  const widths = bands.map(([, , a, b]) =>
    (b as number) > (a as number) ? (b as number) - (a as number) : 0,
  );
  return Math.max(widths[BANDS - 1] as number, widths[BANDS - 2] as number) / Math.max(...widths);
}

// ---- a frame: the drawing, packed small ----

type Frame = {
  season: number;
  wood: number[]; // x0,y0,x1,y1,r per metamer (cells, rounded to 0.1)
  leaves: number[]; // x,y,species index, deduplicated on a half-cell grid
  outline: number[][]; // the lone crown's bands (see `outline`)
  numbers: Record<string, number>;
};

const SPECIES: string[] = [];
const spIndex = (s: string): number => {
  let k = SPECIES.indexOf(s);
  if (k < 0) k = SPECIES.push(s) - 1;
  return k;
};
const r1 = (x: number): number => Math.round(x * 10) / 10;

function numbers(
  world: ReturnType<typeof newWorld>,
  kind: Kind,
  bands: number[][],
): Record<string, number> {
  const trees = world.trees.filter((t) => t.alive);
  const out: Record<string, number> = {};
  if (kind === "lone") {
    const t = trees[0];
    if (t) {
      const m = world.metricsOf(t);
      out.heightM = m.height * CELL;
      out.widthM = m.crownWidth * CELL;
      out.depthM = m.crownDepth * CELL;
      out.boleLimb = m.boleHeight / m.height;
      out.boleLeaf = leafBole(t, m.height);
      out.topFull = topFullness(bands);
      out.outside = m.budsOutside;
    }
  } else {
    const ms = trees.map((t) => world.metricsOf(t));
    out.alive = ms.length;
    out.drawn = ms.filter((m) => m.height >= DISPLAY).length;
    out.over10m = ms.filter((m) => m.height * CELL >= 10).length;
    const tall = trees.filter((_, k) => (ms[k]?.height ?? 0) * CELL >= 10);
    out.boleLimbTall = median(
      tall.map((t) => world.metricsOf(t)).map((m) => m.boleHeight / m.height),
    );
    out.boleLeafTall = median(tall.map((t) => leafBole(t, world.metricsOf(t).height)));
    out.floorLight = world.groundLight(0, world.params.world.width - 1);
  }
  return out;
}

function frame(world: ReturnType<typeof newWorld>, kind: Kind): Frame {
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
      wood.push(
        r1(c.baseX[i] as number),
        r1(c.baseY[i] as number),
        r1(t.tipX(i)),
        r1(t.tipY(i)),
        r1(r),
      );
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
  const bands = kind === "lone" && trees[0] ? outline(trees[0]) : [];
  return {
    season: world.season,
    wood,
    leaves,
    outline: bands,
    numbers: numbers(world, kind, bands),
  };
}

function median(xs: number[]): number {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return Number.NaN;
  const k = s.length >> 1;
  return s.length % 2 ? (s[k] as number) : ((s[k - 1] as number) + (s[k] as number)) / 2;
}

// ---- one job: a world, one seed, with or without the patch ----

function job(kind: Kind, seed: number, patched: boolean, out: string): void {
  const species = arg("species", "beech");
  const patch: Patch = patched ? JSON.parse(readFileSync(arg("patch", ""), "utf8")) : {};
  const walled = process.argv.includes("--walled");
  const lone = walled
    ? loneParams(species, seed)
    : openLoneParams(species, seed, Number(arg("box", String(OPEN_BOX))));
  const base = kind === "lone" ? lone : forestParams(Number(arg("width", "160")), seed);
  const world = newWorld(applyPatch(base, patch));
  const frames = nums(arg(kind, kind === "lone" ? "30,60,100" : "50,100,150"));
  const last = Math.max(...frames);
  const series: Record<string, number>[] = [];
  const shots: Frame[] = [];
  const perSeason: number[] = [];
  // The hard check reads every season, not only the recorded ones.
  const outside = { max: 0, seasons: 0, first: 0 };
  const present = new Set<string>();
  const t0 = Date.now();
  while (world.season < last) {
    const ts = performance.now();
    world.step(1);
    perSeason.push((performance.now() - ts) / 1000);
    for (const t of world.trees) if (t.alive) present.add(t.species);
    if (kind === "lone") {
      const n = world.trees
        .filter((t) => t.alive)
        .reduce((a, t) => a + world.metricsOf(t).budsOutside, 0);
      if (n > 0) {
        outside.seasons += 1;
        outside.max = Math.max(outside.max, n);
        outside.first ||= world.season;
      }
    }
    if (world.season % 10 === 0) {
      const f = frame(world, kind);
      series.push({ season: world.season, ...f.numbers });
      if (frames.includes(world.season)) shots.push(f);
    } else if (frames.includes(world.season)) shots.push(frame(world, kind));
  }
  writeFileSync(
    out,
    JSON.stringify({
      kind,
      seed,
      patched,
      walled: kind === "lone" && walled,
      width: world.params.world.width,
      species: SPECIES,
      present: [...present].sort(),
      frames: shots,
      series,
      outside,
      perSeason,
      secs: (Date.now() - t0) / 1000,
      hash: world.hash(),
    }),
  );
}

// ---- the driver ----

async function main(): Promise<void> {
  const k = process.argv.indexOf("--job");
  if (k > 0) {
    const [kind, seed, patched, out] = process.argv.slice(k + 1);
    job(kind as Kind, Number(seed), patched === "1", out as string);
    return;
  }
  const label = arg("label", "probe");
  const dir = `runs/probe/${label}`;
  mkdirSync(dir, { recursive: true });
  const hasPatch = process.argv.includes("--patch");
  const seeds = nums(arg("seeds", "1,2,3"));
  const kinds: Kind[] = arg("garden", "") === "none" ? ["lone"] : ["lone", "garden"];
  const jobs: string[][] = [];
  for (const kind of kinds)
    for (const seed of seeds)
      for (const p of hasPatch ? ["0", "1"] : ["0"])
        jobs.push([kind, String(seed), p, `${dir}/${kind}-${seed}-${p}.json`]);
  const pass = process.argv.slice(2);
  // The open box holds ≈ 0.5–0.7 GB a world: twelve at once fit a 32 GB laptop (STATUS: cap 12).
  const limit = Math.min(12, cpus().length, jobs.length);
  let next = 0;
  const t0 = Date.now();
  const run = async (): Promise<void> => {
    while (next < jobs.length) {
      const j = jobs[next++] as string[];
      await new Promise<void>((ok, bad) => {
        const c = spawn(process.execPath, [import.meta.filename, ...pass, "--job", ...j], {
          stdio: "inherit",
        });
        c.on("exit", (code) =>
          code === 0 ? ok() : bad(new Error(`${j.join(" ")} exited ${code}`)),
        );
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
    walled: process.argv.includes("--walled"),
    box: Number(arg("box", String(OPEN_BOX))),
    wall: (Date.now() - t0) / 1000,
    date: new Date().toISOString().slice(0, 16),
  };
  const tpl = readFileSync(new URL("./probe.html", import.meta.url), "utf8");
  const html = tpl.replace("/*DATA*/null", JSON.stringify({ meta, results }));
  writeFileSync(`${dir}/sheet.html`, html);
  console.log(
    `${dir}/sheet.html  (${(html.length / 1e6).toFixed(1)} MB, ${meta.wall.toFixed(0)} s)`,
  );
  // The hard check (ADR 0062): the open box holds every bud, every season.
  const failed = results.filter((r) => r.kind === "lone" && !r.walled && r.outside.seasons > 0);
  for (const r of failed)
    console.error(
      `FAIL buds outside the box: lone seed ${r.seed}${r.patched ? " patch" : ""}: up to ${r.outside.max} in ${r.outside.seasons} seasons from ${r.outside.first}`,
    );
  if (failed.length > 0) process.exitCode = 1;
}

await main();
