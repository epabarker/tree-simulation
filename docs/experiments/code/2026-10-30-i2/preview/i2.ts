/**
 * THROWAWAY (I2, ADR 0024–0025): the visual check V and the season's time on the visitor's device.
 *
 * V: the garden's planting at a phone's or a laptop's plate width, seed 10, as today's garden
 * (0.14.0, 2D, served by the site at /garden/0.14.0/) opens it, beside the same planting grown in
 * the slab at D = 64 in one of the three looks (bake.ts), drawn orthographically with the garden's
 * renderer (slab-view.ts). Both are still frames at season 40 or 100.
 *
 * Timing: from each stand at season 40, ten seasons through `step_timed` (one lane, every phase),
 * then each season's light again in four workers (lane.ts), every fourth direction each, as G3
 * timed lanes; the four-lane season is the one-lane season with its light replaced by the
 * slowest lane plus the lanes' sum.
 */
import { createRenderer } from "../../../../../src/web/render/create.ts";
import sceneTokens from "../../../../../src/web/render/scene.css?inline";
import { coreWasm, loadWorlds, RustWorld } from "../../../../../src/wasm/world.ts";
import { DEFAULTS, drawSlab } from "./slab-view.ts";

const style = document.createElement("style");
style.textContent = sceneTokens;
document.head.prepend(style);
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const sel = (id: string) => $(id) as HTMLSelectElement;
const ready = loadWorlds(coreWasm);

async function gunzip(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const stream = (res.body as ReadableStream).pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const deep = createRenderer($("deepCanvas") as HTMLCanvasElement, "auto");
deep.scene.frame = "world";
// biome-ignore lint: the 0.14.0 garden's own API, loaded from the site at run time
let flat: any = null;
let showing = "";

async function show(): Promise<void> {
  const w = Number(sel("width").value);
  const look = sel("look").value;
  const season = Number(sel("season").value);
  const planted = sel("trees").value === "planted";
  const key = planted ? `${w}-planted-${look}-${season}` : `${w}-${look}-${season}`;
  showing = key;
  const aspect = w <= 66 ? 0.6 : 1.5;
  for (const id of ["flat", "deep"]) $(id).style.setProperty("--aspect", String(aspect));
  $("stats").textContent = "loading…";
  await ready;
  const bytes = await gunzip(`./stands/${key}.bin.gz`);
  if (showing !== key) return;
  const world = RustWorld.load(bytes);
  const s = world.snapshot(0, { junctions: false, field: false });
  world.dispose();
  deep.resize();
  deep.refreshTheme();
  deep.scene.clearHistory();
  deep.setSnapshot(s);
  deep.scene.clearHistory();
  deep.scene.depth = false;
  deep.scene.fit(true);
  if (deep.kind === "webgl2") drawSlab(deep, s, { ...DEFAULTS, model: "open", D: 64, z: s.z0 });
  $("stats").textContent = `3D: ${s.metrics.filter((m) => m.alive).length} trees, ${s.metamerCount} metamers (renderer ${deep.kind})`;
  // Today's garden, opening still on the 2D forest of the same planting and season.
  try {
    flat?.destroy();
    const url = "/garden/0.14.0/garden.js";
    const mod = await import(/* @vite-ignore */ url);
    flat = mod.mountGarden($("flat"), {
      first: { base: `./flat/${season}`, widths: [w], seeds: [10] },
      autoplay: false,
      wind: false,
      physics: false,
      adaptive: false,
      interaction: "none",
      loupe: false,
    });
  } catch (e) {
    $("flat").textContent = `today's garden is served by the site only (${(e as Error).message})`;
  }
}
for (const id of ["width", "look", "season", "trees"]) sel(id).addEventListener("change", () => void show());
void show();

// —— Timing ——

const CASES = [
  { file: "forest-interior-40", label: "forest (210-cell ring), wood interior" },
  { file: "forest-edge-40", label: "forest, wood edge" },
  { file: "forest-hedgerow-40", label: "forest, hedgerow" },
  { file: "160-interior-40", label: "the garden at a laptop's plate (160), interior" },
  { file: "66-interior-40", label: "the garden at a phone's plate (66), interior" },
];
const SEASONS = 10;
const LANES = 4;
const results: Record<string, unknown> = { userAgent: navigator.userAgent, cores: navigator.hardwareConcurrency };

function lanes(params: Record<string, unknown>): Promise<Worker[]> {
  return Promise.all(
    Array.from({ length: LANES }, () => {
      const w = new Worker(new URL("./lane.ts", import.meta.url), { type: "module" });
      return new Promise<Worker>((res) => {
        w.onmessage = (e) => e.data.type === "ready" && res(w);
        w.postMessage({ type: "init", params });
      });
    }),
  );
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

async function time(file: string): Promise<Record<string, number>> {
  const world = RustWorld.load(await gunzip(`./stands/${file}.bin.gz`));
  const p = world.params;
  const w = p.world.width;
  const h = p.world.height;
  const d = p.world.depth ?? 1;
  const workers = await lanes({
    w, h, d, K: p.c2.K, kExt: p.c2.kExt, skyExponent: p.c2.skyExponent, minElevation: p.c2.minElevation,
    C: p.c2.C, rotate: p.c2.rotate, faces: p.world.faces ?? [1, 1], periodic: p.world.sides === "periodic",
  });
  const season: number[] = [];
  const light: number[] = [];
  const four: number[] = [];
  const sum: number[] = [];
  let metamers = 0;
  for (let k = 0; k < SEASONS; k++) {
    const t0 = performance.now();
    const ms = world.core().step_timed(true) as unknown as number[];
    season.push(performance.now() - t0);
    light.push(ms[0] as number);
    const lad = world.core().light_lad() as Float32Array;
    const s = world.season - 1;
    const lane = await Promise.all(
      workers.map(
        (wk, i) =>
          new Promise<{ ms: number; top: number }>((res) => {
            wk.onmessage = (e) => e.data.type === "done" && res(e.data);
            wk.postMessage({ type: "run", season: s, lane: i, lanes: LANES, lad });
          }),
      ),
    );
    four.push(Math.max(...lane.map((l) => l.ms)));
    // The lanes' sum: four Float32 fields (Q, V) of the rows below the top, three adds each.
    const n = (lane[0]?.top ?? 0) * w * d * 4;
    const parts = Array.from({ length: LANES }, () => new Float32Array(n).fill(0.5));
    const t1 = performance.now();
    const acc = parts[0] as Float32Array;
    for (let l = 1; l < LANES; l++) {
      const q = parts[l] as Float32Array;
      for (let i = 0; i < n; i++) acc[i] = (acc[i] as number) + (q[i] as number);
    }
    sum.push(performance.now() - t1);
    metamers = world.trees.filter((t) => t.alive).reduce((m, t) => m + t.m.length, 0);
  }
  for (const wk of workers) wk.terminate();
  world.dispose();
  const s1 = median(season);
  const l1 = median(light);
  const l4 = median(four) + median(sum);
  return { metamers, season1: s1, light1: l1, passes: s1 - l1, light4: l4, season4: s1 - l1 + l4 };
}

$("go").addEventListener("click", async () => {
  ($("go") as HTMLButtonElement).disabled = true;
  await ready;
  const rows: string[] = [];
  for (const c of CASES) {
    $("status").textContent = `timing ${c.label}…`;
    try {
      const r = await time(c.file);
      results[c.file] = r;
      rows.push(
        `<tr><td>${c.label}</td><td>${r.metamers}</td><td>${r.season1?.toFixed(0)}</td><td>${r.light1?.toFixed(0)}</td><td>${r.passes?.toFixed(0)}</td><td>${r.light4?.toFixed(0)}</td><td>${r.season4?.toFixed(0)}</td></tr>`,
      );
    } catch (e) {
      rows.push(`<tr><td>${c.label}</td><td colspan="6">${(e as Error).message}</td></tr>`);
    }
    $("out").innerHTML = `<table><tr><th>stand (season 40 →)</th><th>metamers</th><th>season, 1 lane</th><th>light, 1 lane</th><th>passes</th><th>light, 4 lanes</th><th>season, 4 lanes</th></tr>${rows.join("")}</table><p>ms, medians of ${SEASONS} seasons.</p>`;
    $("json").textContent = JSON.stringify(results, null, 1);
  }
  $("status").textContent = "done: copy the JSON below";
});
