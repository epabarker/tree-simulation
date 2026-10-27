/**
 * The garden: a living view of the simulation that any page can mount (ADR 0014). It owns the
 * worker, the renderer, the frame loop and the observers. The lab (main.ts) is a garden plus a
 * control panel and charts; the home page is a garden alone.
 *
 *   import { mountGarden } from "./garden.js";
 *   const garden = mountGarden(document.querySelector("#garden"));
 *
 * Playback is a pull loop: when playing, the garden asks the worker for one season, tweens to it,
 * then asks for the next. Nothing queues up, and the simulation never blocks a frame. By default
 * the forest grows up quickly (the intro), then slows to an ambient pace and keeps going: seeds
 * land, seedlings wait in the shade and gaps refill (O4), on a ring with no edges (ADR 0013).
 */

import * as Comlink from "comlink";
import { mergeParams, type Params, type ParamsPatch } from "../core/params.ts";
import { presetParams } from "../core/presets.ts";
import type { Snapshot, SnapshotOptions } from "../core/snapshot.ts";
import type { RunRecord } from "../core/world.ts";
import type { SimApi } from "../worker/api.ts";
import { createRenderer } from "./render/create.ts";
import { attachInput } from "./render/input.ts";
import { LEAF_STYLES } from "./render/leaf-styles.ts";
import type { Renderer } from "./render/renderer.ts";
import sceneTokens from "./render/scene.css?inline";
import type { Scene, ViewOptions } from "./render/scene.ts";

export interface PlaybackState {
  playing: boolean;
  /** Seasons per second when no `pace` is set (the lab's speed slider). */
  speed: number;
}

export interface Stats {
  season: number;
  metamers: number;
  /** Worker milliseconds behind the last snapshot: the season plus building the snapshot. */
  workerMs: number;
  renderer: string;
  /** Frames per second while animating, and CPU milliseconds per draw. */
  fps: number;
  drawMs: number;
}

/** Seasons per second: `intro` until the world reaches `introSeasons`, then `ambient`. */
export interface Pace {
  intro: number;
  introSeasons: number;
  ambient: number;
}

export interface GardenOptions {
  /** The run. Default: the `forest` preset on a ring shaped to the host (`forestParams`). */
  params?: Params;
  /** View settings; an object passed here is used (and filled in) by reference. */
  view?: Partial<ViewOptions>;
  /** WebGL2 with a Canvas 2D fallback, or Canvas 2D only. */
  renderer?: "auto" | "canvas2d";
  /** Draw into this canvas instead of one the garden appends to the host. */
  canvas?: HTMLCanvasElement;
  /** Accessible name of the canvas. */
  label?: string;
  /** "fell": tap a tree to fell it (default). "full": also pan, pinch, zoom (the lab). */
  interaction?: "none" | "fell" | "full";
  /** What the camera fits (Scene.frame). Default "world". */
  frame?: "trees" | "world";
  /** CSS pixels kept free above the crowns, e.g. for text over the sky. Default 0. */
  headroom?: number;
  /** Leave the sky out so the page shows through. */
  transparent?: boolean;
  maxDpr?: number;
  /** Default: grow 40 seasons at 4 a second, then one every 2 seconds. Unset: `speed`. */
  pace?: Pace | null;
  /** Seasons per second without a pace. */
  speed?: number;
  /** Longest tween between two seasons, ms: short in the lab, long for slow ambient growth. */
  maxTweenMs?: number;
  autoplay?: boolean;
  /**
   * With prefers-reduced-motion: "still" (default) shows the forest after the intro without
   * animating it, and holds; "pause" starts paused at season 0 (the lab).
   */
  reducedMotion?: "still" | "pause";
  /** Optional snapshot parts (default: none, which is all the garden draws). */
  snapshot?: SnapshotOptions;
  /** Called with every snapshot; `fresh` marks the first one of a new run. */
  onSnapshot?(s: Snapshot, fresh: boolean): void;
}

export interface Garden {
  readonly renderer: Renderer;
  readonly scene: Scene;
  readonly view: ViewOptions;
  readonly playback: PlaybackState;
  readonly stats: Stats;
  /** Settles once the first snapshot of the first run is in (autoplay has begun, if on). */
  readonly ready: Promise<void>;
  restart(params: Params): Promise<void>;
  step(): Promise<void>;
  setPlaying(playing: boolean): void;
  /** Queues a parameter change for the next season boundary. */
  setParams(patch: ParamsPatch): void;
  record(): Promise<RunRecord>;
  /** Fits the view again and keeps fitting as the trees grow (until the user pans, in the lab). */
  fit(): void;
  /** Redraws on the next frame (after a view change). */
  redraw(): void;
  /** Stops the worker, the frame loop and every listener; removes a canvas the garden made. */
  destroy(): void;
}

const DEFAULT_PACE: Pace = { intro: 4, introSeasons: 40, ambient: 0.5 };
/** Rows of sky above the forest's ground in its preset (130): the ring's width follows the host. */
const WORLD_HEIGHT = 130;

/**
 * The `forest` preset (M11) on a ring `width` cells wide, with a tree every ≈ 21 cells: about as
 * wide as the host is wide relative to the world's height, so a phone gets a narrower forest.
 */
export function forestParams(width = 210, seed?: number): Params {
  const base = presetParams("forest", seed);
  const W = Math.round(Math.min(320, Math.max(90, width)));
  const n = Math.max(2, Math.round(W / 21));
  const trees = Array.from({ length: n }, (_, k) => ({ x: ((k + 0.5) * W) / n }));
  return mergeParams(base, { world: { ...base.world, width: W }, trees });
}

/** Puts the scene's colour tokens first in <head>, once: their cascade layer then loses to any host. */
function injectSceneTokens(): void {
  const id = "tree-garden-tokens";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = sceneTokens;
  document.head.prepend(style);
}

export function mountGarden(host: HTMLElement, options: GardenOptions = {}): Garden {
  injectSceneTokens();
  const interaction = options.interaction ?? "fell";
  const pace = options.pace === undefined ? DEFAULT_PACE : options.pace;
  const maxTweenMs = options.maxTweenMs ?? 2500;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reducedMode = options.reducedMotion ?? "still";

  let canvas = options.canvas;
  const ownCanvas = !canvas;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "tree-garden";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    host.append(canvas);
  }
  canvas.setAttribute("aria-label", options.label ?? "A forest growing from simple rules");
  // Only the lab takes over drags; elsewhere the page keeps scrolling and zooming.
  canvas.style.touchAction = interaction === "full" ? "none" : "manipulation";

  const renderer = createRenderer(canvas, options.renderer ?? "auto", {
    transparent: options.transparent,
    maxDpr: options.maxDpr,
  });
  const { scene } = renderer;
  scene.frame = options.frame ?? "world";
  if (options.headroom !== undefined) scene.headroom = options.headroom;
  const rect = renderer.canvas.getBoundingClientRect();
  const params =
    options.params ??
    forestParams((WORLD_HEIGHT * rect.width) / Math.max(1, rect.height), randomSeed());

  const view = Object.assign(options.view ?? {}, {
    colorMode: "natural",
    showLeaves: true,
    depth: true,
    leafAge: LEAF_STYLES.broadleaf.leafAge,
    leafStyle: "broadleaf",
    showBuds: false,
    showShadow: false,
    showGhosts: true,
    ...options.view,
  } satisfies ViewOptions) as ViewOptions;
  const playback: PlaybackState = { playing: false, speed: options.speed ?? 3 };
  const stats: Stats = {
    season: 0,
    metamers: 0,
    workerMs: 0,
    renderer: renderer.kind === "webgl2" ? "WebGL2" : "Canvas 2D",
    fps: 0,
    drawMs: 0,
  };

  const worker = new Worker(new URL("../worker/sim.worker.ts", import.meta.url), {
    type: "module",
  });
  const sim = Comlink.wrap<SimApi>(worker);
  void sim.setSnapshotOptions(options.snapshot ?? { junctions: false, field: false });

  let busy = false;
  let dirty = true;
  let lastFrame = 0;
  let drewLastFrame = false;
  let onScreen = true;
  let tweenStart = 0;
  let tweenMs = 1;
  let lastStep = 0;
  let generation = 0;
  let season = 0;
  let frameId = 0;
  let destroyed = false;
  /** Keep refitting the view as the trees grow, until the user pans or zooms. */
  let autoFit = true;

  const speed = (): number =>
    pace ? (season < pace.introSeasons ? pace.intro : pace.ambient) : playback.speed;

  function accept(s: Snapshot, animate: boolean, fresh: boolean): void {
    renderer.setSnapshot(s);
    if (!animate) scene.clearHistory();
    if (autoFit) scene.fit(!animate);
    season = s.season;
    stats.season = s.season;
    stats.metamers = s.metamerCount;
    stats.workerMs = s.seasonMs + s.snapshotMs;
    options.onSnapshot?.(s, fresh);
    tweenStart = performance.now();
    tweenMs = animate ? Math.min(maxTweenMs, (1000 / speed()) * 0.85) : 1;
    dirty = true;
  }

  async function restart(next: Params): Promise<void> {
    generation += 1;
    const mine = generation;
    busy = true;
    const s = await sim.init(next);
    busy = false;
    if (mine !== generation || destroyed) return;
    autoFit = true;
    accept(s, false, true);
  }

  async function step(): Promise<void> {
    if (busy || destroyed) return;
    busy = true;
    const mine = generation;
    const s = await sim.step(1);
    busy = false;
    if (mine !== generation || destroyed) return;
    accept(s, !(reduceMotion && reducedMode === "still"), false);
  }

  /** Reduced motion, "still": the forest as it stands after the intro, without animation. */
  async function growStill(): Promise<void> {
    if (!pace) return;
    const mine = generation;
    busy = true;
    const s = await sim.step(pace.introSeasons);
    busy = false;
    if (mine !== generation || destroyed) return;
    accept(s, false, false);
  }

  const detachInput =
    interaction === "none"
      ? () => {}
      : attachInput(
          {
            canvas: renderer.canvas,
            camera: scene.camera,
            screenToWorld: (x, y) => scene.screenToWorld(x, y),
          },
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
          { panZoom: interaction === "full" },
        );

  function frame(now: number): void {
    frameId = requestAnimationFrame(frame);
    const dt = lastFrame > 0 ? Math.min(100, now - lastFrame) : 16;
    lastFrame = now;
    if (!onScreen) return;
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
    if (playback.playing && !busy && t >= 1 && now - lastStep >= 1000 / speed()) {
      lastStep = now;
      void step();
    }
  }

  const resizer = new ResizeObserver(() => {
    renderer.resize();
    if (autoFit) scene.fit(true);
    dirty = true;
  });
  resizer.observe(renderer.canvas);
  let inView = true;
  const watcher = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    onScreen = inView && !document.hidden;
  });
  watcher.observe(renderer.canvas);
  const onVisibility = (): void => {
    onScreen = inView && !document.hidden;
  };
  document.addEventListener("visibilitychange", onVisibility);
  // Follow the system colour scheme, and a data-theme attribute on <html> if the host sets one.
  const onTheme = (): void => {
    renderer.refreshTheme();
    dirty = true;
  };
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", onTheme);
  const themeWatch = new MutationObserver(onTheme);
  themeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });

  const ready = restart(params).then(async () => {
    if (destroyed) return;
    if (reduceMotion) {
      if (reducedMode === "still") await growStill();
    } else if (options.autoplay ?? true) {
      playback.playing = true;
    }
    frameId = requestAnimationFrame(frame);
  });

  return {
    renderer,
    scene,
    view,
    playback,
    stats,
    ready,
    restart,
    step,
    setPlaying(playing) {
      playback.playing = playing;
      if (playing) lastStep = 0;
    },
    setParams(patch) {
      void sim.setParams(patch);
    },
    record: () => sim.record(),
    fit() {
      autoFit = true;
      scene.fit();
      dirty = true;
    },
    redraw() {
      dirty = true;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      detachInput();
      resizer.disconnect();
      watcher.disconnect();
      themeWatch.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      scheme.removeEventListener("change", onTheme);
      worker.terminate();
      if (ownCanvas) renderer.canvas.remove();
    },
  };
}

/** A fresh forest per visit (the page may use Math.random; the core may not). */
function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}
