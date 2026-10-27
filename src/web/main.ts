/**
 * The lab: a garden (garden.ts) with the control panel, charts and HUD around it. The garden owns
 * the worker, the renderer and playback; this file only wires the controls to it.
 */

import {
  defaultPreset,
  isPresetName,
  type PresetName,
  presetParams,
  presets,
} from "../core/presets.ts";
import { FULL_SNAPSHOT } from "../core/snapshot.ts";
import { mountGarden } from "./garden.ts";
import { isLeafStyleName, LEAF_STYLES, type LeafStyleName } from "./render/leaf-styles.ts";
import type { ViewOptions } from "./render/scene.ts";
import { Charts } from "./ui/charts.ts";
import { Panel } from "./ui/panel.ts";
import "./ui/layout.css";

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el as T;
}

const query = new URLSearchParams(location.search);
const narrow = window.matchMedia("(max-width: 700px)").matches;
// A phone shows a four-tree grove; the ten-tree stand would be too small to read.
// `?preset=name` picks another (and `?bench` measures it, M15).
const asked = query.get("preset");
const startPreset: PresetName =
  asked !== null && isPresetName(asked) ? asked : narrow ? "skyGrove" : defaultPreset;

/** The foliage style a preset asks for (broadleaf unless it names one). */
function leafStyleOf(name: PresetName): LeafStyleName {
  const leaf: string | undefined = (presets[name] as { leaf?: string }).leaf;
  return leaf !== undefined && isLeafStyleName(leaf) ? leaf : "broadleaf";
}

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
  showObstacles: true,
};

const hud = element("hud");
const charts = new Charts(element("charts"));
const garden = mountGarden(element("stage"), {
  params: presetParams(startPreset),
  view,
  canvas: element<HTMLCanvasElement>("view"),
  label: "Tree growth simulation",
  // WebGL2 by default; `?renderer=canvas` forces the Canvas 2D fallback (for comparison).
  renderer: query.get("renderer") === "canvas" ? "canvas2d" : "auto",
  interaction: "full",
  obstacles: null, // the lab's own obstacles come from the preset (ADR 0015)
  frame: "trees",
  headroom: 52, // the title and hint
  pace: null,
  speed: 3,
  maxTweenMs: 450,
  reducedMotion: "pause",
  snapshot: FULL_SNAPSHOT,
  // `?bench[&preset=forest][&seasons=60]`: play at the panel's speed, then report frame costs.
  bench: query.has("bench")
    ? {
        seasons: Number(query.get("seasons") ?? 60),
        onDone: (result) => {
          (window as unknown as { bench: unknown }).bench = result;
          console.log("bench", JSON.stringify(result));
          hud.textContent = `bench: draw p95 ${result.drawP95} ms · frame p95 ${result.frameP95} ms · worker ${result.workerMean} ms`;
          panel.setPlaying(false);
        },
      }
    : undefined,
  onSnapshot: (s, fresh) => {
    if (fresh) charts.reset();
    const trees = s.metrics.length;
    hud.textContent = `Season ${s.season} · ${trees} ${trees === 1 ? "tree" : "trees"}`;
    charts.push(s.season, s.metrics, s.junctions, panel.current.c6.n);
  },
});

const panel = new Panel(
  element("panel"),
  presetParams(startPreset),
  garden.playback,
  garden.stats,
  view,
  {
    onPlay: (playing) => garden.setPlaying(playing),
    onStep: () => void garden.step(),
    onRestart: (params) => void garden.restart(params),
    onPatch: (patch) => garden.setParams(patch),
    onPreset: (name) => {
      // A species preset brings its own foliage style and how long foliage stays on.
      view.leafStyle = leafStyleOf(name);
      view.leafAge = LEAF_STYLES[view.leafStyle].leafAge;
      const params = presetParams(name, panel.current.seed);
      panel.setParams(params);
      void garden.restart(params);
    },
    onView: () => garden.redraw(),
    onFit: () => garden.fit(),
    onExport: () => void exportRun(),
  },
);

async function exportRun(): Promise<void> {
  const record = await garden.record();
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tree-run-seed${record.params.seed}-s${record.seasons}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Exposed for poking at from the console (and headless checks).
(window as unknown as { garden: typeof garden }).garden = garden;

void garden.ready.then(() => {
  panel.setPlaying(garden.playback.playing);
  void charts.load();
});
