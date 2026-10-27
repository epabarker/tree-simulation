/**
 * Page entry: wires the worker, renderer, panel and charts together.
 *
 * Playback is a pull loop: when playing, the page asks the worker for one season, tweens to
 * it, then asks for the next. Nothing queues up, and the simulation never blocks a frame.
 */

import * as Comlink from "comlink";
import { mergeParams, type Params } from "../core/params.ts";
import { defaultPreset, type PresetName, presetParams, presets } from "../core/presets.ts";
import type { Snapshot } from "../core/snapshot.ts";
import type { SimApi } from "../worker/api.ts";
import { createRenderer } from "./render/create.ts";
import { attachInput } from "./render/input.ts";
import { isLeafStyleName, LEAF_STYLES, type LeafStyleName } from "./render/leaf-styles.ts";
import type { ViewOptions } from "./render/scene.ts";
import { Charts } from "./ui/charts.ts";
import { Panel, type PlaybackState, type Stats } from "./ui/panel.ts";
import "./ui/layout.css";

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el as T;
}

// WebGL2 by default; `?renderer=canvas` forces the Canvas 2D fallback (for comparison).
const forceCanvas = new URLSearchParams(location.search).get("renderer") === "canvas";
const renderer = createRenderer(
  element<HTMLCanvasElement>("view"),
  forceCanvas ? "canvas2d" : "auto",
);
const { scene, canvas } = renderer;
const charts = new Charts(element("charts"));
const worker = new Worker(new URL("../worker/sim.worker.ts", import.meta.url), { type: "module" });
const sim = Comlink.wrap<SimApi>(worker);

const narrow = window.matchMedia("(max-width: 700px)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// A phone shows a four-tree grove; the ten-tree stand would be too small to read.
const startPreset: PresetName = narrow ? "skyGrove" : defaultPreset;

/** The foliage style a preset asks for (broadleaf unless it names one). */
function leafStyleOf(name: PresetName): LeafStyleName {
  const leaf: string | undefined = (presets[name] as { leaf?: string }).leaf;
  return leaf !== undefined && isLeafStyleName(leaf) ? leaf : "broadleaf";
}

const hud = element("hud");
const playback: PlaybackState = { playing: false, speed: 3 };
const stats: Stats = {
  season: 0,
  metamers: 0,
  workerMs: 0,
  renderer: renderer.kind === "webgl2" ? "WebGL2" : "Canvas 2D",
  fps: 0,
  drawMs: 0,
};
const view: ViewOptions & { preset: PresetName } = {
  preset: startPreset,
  colorMode: "natural",
  showLeaves: true,
  depth: true,
  leafAge: LEAF_STYLES[leafStyleOf(startPreset)].leafAge,
  leafStyle: leafStyleOf(startPreset),
  showBuds: false,
  showShadow: false,
  showGhosts: true,
};

let busy = false;
let dirty = true;
let lastFrame = 0;
let drewLastFrame = false;
let visible = true;
let tweenStart = 0;
let tweenMs = 1;
let lastStep = 0;
let generation = 0;
/** Keep refitting the view as the trees grow, until the user pans or zooms. */
let autoFit = true;

function accept(s: Snapshot, animate: boolean): void {
  renderer.setSnapshot(s);
  if (!animate) scene.clearHistory();
  if (autoFit) scene.fit(!animate);
  const trees = s.metrics.length;
  hud.textContent = `Season ${s.season} · ${trees} ${trees === 1 ? "tree" : "trees"}`;
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

const panel = new Panel(element("panel"), presetParams(startPreset), playback, stats, view, {
  onPlay: (playing) => {
    if (playing) lastStep = 0;
  },
  onStep: () => void step(),
  onRestart: (params) => void restart(params),
  onPatch: (patch) => {
    void sim.setParams(patch);
  },
  onPreset: (name) => {
    // A species preset brings its own foliage style and how long foliage stays on.
    view.leafStyle = leafStyleOf(name);
    view.leafAge = LEAF_STYLES[view.leafStyle].leafAge;
    const params = presetParams(name, panel.current.seed);
    panel.setParams(params);
    void restart(params);
  },
  onView: () => {
    dirty = true;
  },
  onFit: () => {
    autoFit = true;
    scene.fit();
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

attachInput(
  { canvas, camera: scene.camera, screenToWorld: (x, y) => scene.screenToWorld(x, y) },
  {
    onChange: () => {
      autoFit = false;
      dirty = true;
    },
    // Direct manipulation: tap a tree to fell it; neighbours lean into the gap (§8, M5).
    onTap: (wx, wy) => {
      const tree = scene.pickTree(wx, wy);
      if (tree === null) return;
      void sim.removeTree(tree);
      if (!playback.playing) void step();
    },
    onRefit: () => {
      autoFit = true;
      scene.fit();
      dirty = true;
    },
  },
);

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = lastFrame > 0 ? Math.min(100, now - lastFrame) : 16;
  lastFrame = now;
  if (!visible) return;
  if (autoFit && scene.animateCamera(dt)) dirty = true;
  const t = Math.min(1, (now - tweenStart) / tweenMs);
  if (dirty || t < 1) {
    const t0 = performance.now();
    renderer.draw(t * t * (3 - 2 * t), view);
    // Smoothed CPU cost of a draw, and frame rate while drawing every frame.
    stats.drawMs += (performance.now() - t0 - stats.drawMs) * 0.1;
    if (drewLastFrame) stats.fps += (1000 / dt - stats.fps) * 0.1;
    drewLastFrame = true;
    dirty = t < 1;
  } else {
    drewLastFrame = false;
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
// Follow the system colour scheme, and a data-theme attribute on <html> if the host page sets one.
const onTheme = (): void => {
  renderer.refreshTheme();
  dirty = true;
};
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onTheme);
new MutationObserver(onTheme).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

void restart(mergeParams(panel.current, {})).then(() => {
  // Start growing straight away, unless the visitor asked for reduced motion.
  if (!reduceMotion) {
    playback.playing = true;
    panel.setPlaying(true);
  }
  requestAnimationFrame(frame);
  void charts.load();
});
