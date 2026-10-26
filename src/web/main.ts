/**
 * Page entry: wires the worker, renderer, panel and charts together.
 *
 * Playback is a pull loop: when playing, the page asks the worker for one season, tweens to
 * it, then asks for the next. Nothing queues up, and the simulation never blocks a frame.
 */

import * as Comlink from "comlink";
import { mergeParams, type Params } from "../core/params.ts";
import { defaultPreset, type PresetName, presetParams } from "../core/presets.ts";
import type { Snapshot } from "../core/snapshot.ts";
import type { SimApi } from "../worker/api.ts";
import { Canvas2DRenderer, type ViewOptions } from "./render/canvas2d.ts";
import { attachInput } from "./render/input.ts";
import { Charts } from "./ui/charts.ts";
import { Panel, type PlaybackState, type Stats } from "./ui/panel.ts";
import "./ui/layout.css";

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el as T;
}

const canvas = element<HTMLCanvasElement>("view");
const renderer = new Canvas2DRenderer(canvas);
const charts = new Charts(element("charts"));
const worker = new Worker(new URL("../worker/sim.worker.ts", import.meta.url), { type: "module" });
const sim = Comlink.wrap<SimApi>(worker);

const playback: PlaybackState = { playing: false, speed: 3 };
const stats: Stats = { season: 0, metamers: 0, workerMs: 0 };
const view: ViewOptions & { preset: PresetName } = {
  preset: defaultPreset,
  colorMode: "order",
  showBuds: true,
  showShadow: true,
  showGhosts: true,
};

let busy = false;
let dirty = true;
let visible = true;
let tweenStart = 0;
let tweenMs = 1;
let lastStep = 0;
let generation = 0;
/** Keep refitting the view as the trees grow, until the user pans or zooms. */
let autoFit = true;

function accept(s: Snapshot, animate: boolean): void {
  renderer.setSnapshot(s);
  if (!animate) renderer.clearHistory();
  if (autoFit) renderer.fit();
  stats.season = s.season;
  stats.metamers = s.metamerCount;
  stats.workerMs = s.seasonMs;
  charts.push(s.season, s.metrics, s.junctions, panel.current.c6.n);
  tweenStart = performance.now();
  tweenMs = animate ? Math.min(450, (1000 / playback.speed) * 0.85) : 1;
  dirty = true;
}

async function restart(params: Params): Promise<void> {
  generation += 1;
  const mine = generation;
  busy = true;
  const s = await sim.init(params);
  busy = false;
  if (mine !== generation) return;
  charts.reset();
  autoFit = true;
  accept(s, false);
}

async function step(): Promise<void> {
  if (busy) return;
  busy = true;
  const mine = generation;
  const s = await sim.step(1);
  busy = false;
  if (mine !== generation) return;
  accept(s, true);
}

const panel = new Panel(element("panel"), presetParams(defaultPreset), playback, stats, view, {
  onPlay: (playing) => {
    if (playing) lastStep = 0;
  },
  onStep: () => void step(),
  onRestart: (params) => void restart(params),
  onPatch: (patch) => {
    void sim.setParams(patch);
  },
  onPreset: (name) => {
    const params = presetParams(name, panel.current.seed);
    panel.setParams(params);
    void restart(params);
  },
  onView: () => {
    dirty = true;
  },
  onFit: () => {
    autoFit = true;
    renderer.fit();
    dirty = true;
  },
  onExport: () => void exportRun(),
});

async function exportRun(): Promise<void> {
  const record = await sim.record();
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tree-run-seed${record.params.seed}-s${record.seasons}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

attachInput(renderer, {
  onChange: () => {
    autoFit = false;
    dirty = true;
  },
  onTap: () => {},
  onRefit: () => {
    autoFit = true;
    renderer.fit();
    dirty = true;
  },
});

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (!visible) return;
  const t = Math.min(1, (now - tweenStart) / tweenMs);
  if (dirty || t < 1) {
    renderer.draw(t * t * (3 - 2 * t), view);
    dirty = t < 1;
  }
  if (playback.playing && !busy && t >= 1 && now - lastStep >= 1000 / playback.speed) {
    lastStep = now;
    void step();
  }
}

new ResizeObserver(() => {
  renderer.resize();
  dirty = true;
}).observe(canvas);
new IntersectionObserver((entries) => {
  visible = entries.some((e) => e.isIntersecting) && !document.hidden;
}).observe(canvas);
document.addEventListener("visibilitychange", () => {
  visible = !document.hidden;
});

void restart(mergeParams(panel.current, {})).then(() => {
  requestAnimationFrame(frame);
  void charts.load();
});
