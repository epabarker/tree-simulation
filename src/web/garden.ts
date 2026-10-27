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
import type { TreeMetrics } from "../core/metrics.ts";
import { mergeParams, type Obstacle, type Params, type ParamsPatch } from "../core/params.ts";
import { presetParams } from "../core/presets.ts";
import type { Snapshot, SnapshotOptions } from "../core/snapshot.ts";
import type { RunRecord } from "../core/world.ts";
import type { SimApi } from "../worker/api.ts";
import { createRenderer } from "./render/create.ts";
import { attachInput } from "./render/input.ts";
import { LEAF_STYLES } from "./render/leaf-styles.ts";
import { governor, judge, type QualityLevel, qualityLevels } from "./render/quality.ts";
import { MAX_DPR, type Renderer } from "./render/renderer.ts";
import sceneTokens from "./render/scene.css?inline";
import type { Scene, ViewOptions } from "./render/scene.ts";
import { addPuff, advanceWind, CALM, createWind, GALE } from "./render/wind.ts";

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
  /** The adaptive quality level in use: device pixel ratio, and "lite" without back leaves. */
  quality: string;
}

/** What `bench` measures over a run (M15): milliseconds unless named otherwise. */
export interface BenchResult {
  renderer: string;
  dpr: number;
  seasons: number;
  metamers: number;
  /** Animated frames sampled. */
  frames: number;
  /** CPU time of a draw call, and the interval between animated frames. */
  drawP50: number;
  drawP95: number;
  frameP50: number;
  frameP95: number;
  /** Animated frames that took longer than 33 ms (missed two vsyncs at 60 Hz). */
  longFrames: number;
  /** Worker time per season, simulation plus snapshot. */
  workerMean: number;
  workerMax: number;
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
  /** Seed of the default run (ignored with `params`). Default: a new one per visit. */
  seed?: number;
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
  /**
   * "forest" (default): the frame above. "specimen": one tree alone, the broadest crown among the
   * taller trees when chosen, kept
   * while it lives, as a botanical plate draws one specimen (D3). Change it later with
   * `setFocus`; the camera eases.
   */
  focus?: "forest" | "specimen";
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
  /**
   * Seasons (M17): seconds a year lasts once the opening has grown the forest, shown as spring
   * (new growth unfolds), summer, autumn (leaves turn and fall) and winter (bare). It sets the
   * ambient pace; 0 keeps the old one without seasons. Default 16. Needs a pace (not the lab's).
   */
  yearSeconds?: number;
  /** Lower the resolution, then the leaf detail, when frames run slow (default on; off in bench). */
  adaptive?: boolean;
  /**
   * Motion (M16), both on by default and off with reduced motion: `wind` sways the trees (a
   * breeze, a gale in storm seasons, and the pointer pushing them as it moves over the forest);
   * `physics` lets shed and felled wood fall instead of fading.
   */
  wind?: boolean;
  physics?: boolean;
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
  /**
   * Page elements the forest grows around (ADR 0015): a CSS selector, default
   * "[data-garden-obstacle]"; null for none. Their screen rectangles, padded by `obstacleMargin`
   * CSS pixels (default 12), become obstacles in world cells, re-measured at every season and on
   * resize and sent only when they change.
   */
  obstacles?: string | null;
  obstacleMargin?: number;
  /** A tree was tapped (canvas pixels `at`): return true to handle it instead of felling it. */
  onTreeTap?(tree: number, metrics: TreeMetrics | undefined, at: { x: number; y: number }): boolean;
  /** A tap that hit no tree, at world x (wrapped onto the world on a ring). */
  onEmptyTap?(x: number, at: { x: number; y: number }): void;
  /** Bench mode (`?bench`): play to `seasons`, sampling every animated frame, then report. */
  bench?: { seasons: number; onDone(result: BenchResult): void };
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
  /** Fells a tree at the next season the worker has not computed. */
  fell(tree: number): void;
  /** Sows a seedling at world x at the next season the worker has not computed. */
  plant(x: number): void;
  /** Re-measures the obstacle elements now (after a layout change the garden can't see). */
  refreshObstacles(): void;
  /** The run's seed: shown as "forest #seed", and passed back as `seed` to regrow the same forest. */
  readonly seed: number;
  /** Frames the whole forest, or one specimen (see `focus`); the camera eases to it. */
  setFocus(focus: "forest" | "specimen"): void;
  /** The tree a "specimen" focus frames, or -1. */
  readonly focusTree: number;
  /** Each live tree's crown top and trunk base in canvas pixels, for labels (Scene.anchors). */
  anchors(): { tree: number; x: number; y: number; baseX: number; baseY: number }[];
  /** The latest metrics of a live tree, or undefined. */
  metrics(tree: number): TreeMetrics | undefined;
  /** Seconds a year lasts from the next year on (see `yearSeconds`). */
  setYearSeconds(seconds: number): void;
  /** The season showing, or null when seasons are not (the opening, the lab, reduced motion). */
  readonly seasonName: "spring" | "summer" | "autumn" | "winter" | null;
  /** Stops the worker, the frame loop and every listener; removes a canvas the garden made. */
  destroy(): void;
}

const DEFAULT_PACE: Pace = { intro: 4, introSeasons: 40, ambient: 0.5 };
/** The intro slows to the ambient pace over its last this many seasons. */
const SLOWDOWN = 12;
/** Seasons (M17) show once a year lasts at least this long; spring is this share of a year. */
const SEASONS_FROM_MS = 3000;
const SPRING = 0.3;
/** Rows of sky above the forest's ground in its preset (130): the ring's width follows the host. */
const WORLD_HEIGHT = 130;

/**
 * The `forest` preset (M11) on a ring `width` cells wide, with a tree every ≈ 21 cells: about as
 * wide as the host is wide relative to the world's height, so a phone gets a narrower forest.
 */
export function forestParams(width = 210, seed?: number): Params {
  const base = presetParams("forest", seed);
  // A phone in portrait gets a narrow ring of two or three trees, drawn large (D1).
  const W = Math.round(Math.min(320, Math.max(54, width)));
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
  let focus = options.focus ?? "forest";
  // Motion (M16): off with reduced motion.
  const wind = (options.wind ?? true) && !reduceMotion ? createWind() : null;
  scene.wind = wind;
  scene.physics = (options.physics ?? true) && !reduceMotion;
  scene.frame = focus === "specimen" ? "tree" : (options.frame ?? "world");
  if (options.headroom !== undefined) scene.headroom = options.headroom;
  const rect = renderer.canvas.getBoundingClientRect();
  const params =
    options.params ??
    forestParams(
      (WORLD_HEIGHT * rect.width) / Math.max(1, rect.height),
      options.seed ?? randomSeed(),
    );

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
    quality: "",
  };

  // Adaptive quality (render/quality.ts): fewer pixels, then fewer leaves, when frames run slow.
  const adaptive = (options.adaptive ?? true) && !options.bench;
  const quality = governor(qualityLevels(window.devicePixelRatio, options.maxDpr ?? MAX_DPR));
  const describeQuality = (level: QualityLevel): string =>
    `dpr ${level.dpr}${level.lite ? ", lite" : ""}`;
  stats.quality = describeQuality(quality.levels[0] as QualityLevel);
  const judgeFrame = (dt: number, now: number): void => {
    const next = judge(quality, dt, now);
    if (next === null) return;
    const level = quality.levels[next] as QualityLevel;
    view.lite = level.lite;
    renderer.setMaxDpr(level.dpr);
    stats.quality = describeQuality(level);
    dirty = true;
  };

  const worker = new Worker(new URL("../worker/sim.worker.ts", import.meta.url), {
    type: "module",
  });
  const sim = Comlink.wrap<SimApi>(worker);
  void sim.setSnapshotOptions(options.snapshot ?? { junctions: false, field: false });

  /** A season is being computed; a computed season is waiting for its turn (pipelining, M15). */
  let inFlight = false;
  /** The run's params (for obstacle events) and the obstacles last sent, as JSON. */
  let current = params;
  let sentObstacles = JSON.stringify(params.world.obstacles ?? []);
  const obstacleSelector =
    options.obstacles === undefined ? "[data-garden-obstacle]" : options.obstacles;
  let ahead: Snapshot | null = null;
  let dirty = true;
  let lastFrame = 0;
  let drewLastFrame = false;
  let onScreen = true;
  let tweenStart = 0;
  let tweenMs = 1;
  /** The current tween is one of a playing run: linear in time rather than eased. */
  let continuous = false;
  /** Seasons (M17): seconds a year lasts, and when this year began and how long it lasts. */
  let yearSeconds = options.yearSeconds ?? 16;
  let yearStart = 0;
  let yearMs = 1;
  let lastStep = 0;
  let generation = 0;
  let season = 0;
  let frameId = 0;
  let destroyed = false;
  const samples = { draw: [] as number[], frame: [] as number[], worker: [] as number[] };
  /** Keep refitting the view as the trees grow, until the user pans or zooms. */
  let autoFit = true;

  /**
   * Seasons per second. With a pace, the intro runs at `intro` and then slows geometrically to
   * `ambient` over its last SLOWDOWN seasons, so the forest settles rather than stops short (D1).
   */
  const speed = (): number => {
    if (!pace) return playback.speed;
    const ambient = yearSeconds > 0 ? 1 / yearSeconds : pace.ambient;
    const from = pace.introSeasons - SLOWDOWN;
    if (season < from) return pace.intro;
    if (season >= pace.introSeasons) return ambient;
    const f = (season - from) / SLOWDOWN;
    return pace.intro * (ambient / pace.intro) ** f;
  };

  function accept(s: Snapshot, animate: boolean, fresh: boolean): void {
    renderer.setSnapshot(s);
    if (focus === "specimen") chooseSpecimen(s);
    if (wind) wind.target = s.storm ? GALE : CALM;
    if (!animate) scene.clearHistory();
    if (autoFit) scene.fit(!animate);
    season = s.season;
    stats.season = s.season;
    stats.metamers = s.metamerCount;
    stats.workerMs = s.seasonMs + s.snapshotMs;
    if (options.bench && !fresh) samples.worker.push(stats.workerMs);
    options.onSnapshot?.(s, fresh);
    tweenStart = performance.now();
    // While playing, each season's tween fills its whole interval and runs at constant speed, so
    // one season hands straight on to the next and growth never stops (D1); a single step eases.
    const interval = 1000 / speed();
    // Seasons (M17), once a year lasts long enough to watch: growth unfolds over spring, the first
    // 30% of the year, and the rest of the year turns through summer, autumn and winter.
    const seasonal =
      animate && !!pace && yearSeconds > 0 && !reduceMotion && interval >= SEASONS_FROM_MS;
    scene.seasons = seasonal;
    yearStart = performance.now();
    yearMs = interval;
    continuous = animate && playback.playing && !seasonal;
    tweenMs = !animate
      ? 1
      : seasonal
        ? SPRING * interval
        : Math.min(maxTweenMs, continuous ? interval : interval * 0.85);
    dirty = true;
  }

  async function restart(next: Params): Promise<void> {
    generation += 1;
    const mine = generation;
    inFlight = true;
    ahead = null;
    current = next;
    sentObstacles = JSON.stringify(next.world.obstacles ?? []);
    const s = await sim.init(next);
    if (mine !== generation || destroyed) return;
    inFlight = false;
    autoFit = true;
    accept(s, false, true);
    measureObstacles();
    if (playback.playing) request();
  }

  /** Shows a computed season, and while playing asks for the next one straight away. */
  function show(s: Snapshot): void {
    accept(s, !(reduceMotion && reducedMode === "still"), false);
    measureObstacles();
    if (playback.playing) request();
  }

  /**
   * Obstacles from the page (ADR 0015): each matching element's screen rectangle, padded, mapped
   * through the camera into world cells (rounded to half a cell, so a camera still easing doesn't
   * resend them every season). Sent as a params event, which applies at the next season the worker
   * has not computed; on a ring, x beyond the world wraps in the core.
   */
  function measureObstacles(): void {
    if (obstacleSelector === null || !scene.next) return;
    const canvas = renderer.canvas.getBoundingClientRect();
    const pad = options.obstacleMargin ?? 12;
    const half = (v: number): number => Math.round(v * 2) / 2;
    const found: Obstacle[] = [];
    for (const el of document.querySelectorAll(obstacleSelector)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const [x0, y0] = scene.screenToWorld(r.left - canvas.left - pad, r.bottom - canvas.top + pad);
      const [x1, y1] = scene.screenToWorld(r.right - canvas.left + pad, r.top - canvas.top - pad);
      const y = Math.max(0, y0);
      if (y1 <= y) continue; // entirely below the ground
      found.push({ x: half(x0), y: half(y), width: half(x1 - x0), height: half(y1 - y) });
    }
    const key = JSON.stringify(found);
    if (key === sentObstacles) return;
    sentObstacles = key;
    void sim.setParams({ world: { ...current.world, obstacles: found } });
  }

  /**
   * Asks the worker for the next season unless one is being computed or is waiting. While
   * playing, the worker thus computes season s + 1 while the page tweens to s, and the result
   * waits in `ahead` for its turn; when paused it is shown at once. Events (a felled tree, a
   * param change) apply at the next season the worker has not yet computed: while playing that
   * is one season later than without pipelining.
   */
  function request(): void {
    if (inFlight || ahead || destroyed) return;
    inFlight = true;
    const mine = generation;
    void sim.step(1).then((s) => {
      if (mine !== generation || destroyed) return;
      inFlight = false;
      if (playback.playing) ahead = s;
      else show(s);
    });
  }

  /** One season: the waiting one if there is one, else the next from the worker. */
  async function step(): Promise<void> {
    if (ahead) {
      const s = ahead;
      ahead = null;
      show(s);
    } else {
      request();
    }
  }

  /** Reduced motion, "still": the forest as it stands after the intro, without animation. */
  async function growStill(): Promise<void> {
    if (!pace) return;
    const mine = generation;
    inFlight = true;
    const s = await sim.step(pace.introSeasons);
    if (mine !== generation || destroyed) return;
    inFlight = false;
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
            // A host may take the tap instead (a tree's card), or use taps that miss (sowing).
            onTap: (wx, wy, sx, sy) => {
              const tree = scene.pickTree(wx, wy);
              const at = { x: sx, y: sy };
              if (tree === null) {
                const W = current.world.width;
                options.onEmptyTap?.(
                  current.world.sides === "periodic" ? ((wx % W) + W) % W : wx,
                  at,
                );
                return;
              }
              if (options.onTreeTap?.(tree, metricsOf(tree), at)) return;
              fell(tree);
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
    scene.time = now / 1000;
    if (scene.seasons && playback.playing) scene.tau = Math.min(0.999, (now - yearStart) / yearMs);
    if (wind) advanceWind(wind, scene.time);
    if (scene.animating()) dirty = true;
    if (autoFit && scene.animateCamera(dt)) dirty = true;
    const t = Math.min(1, (now - tweenStart) / tweenMs);
    if (dirty || t < 1) {
      const t0 = performance.now();
      renderer.draw(continuous ? t : t * t * (3 - 2 * t), view);
      const ms = performance.now() - t0;
      // Smoothed CPU cost of a draw, and frame rate while drawing every frame.
      stats.drawMs += (ms - stats.drawMs) * 0.1;
      if (drewLastFrame) stats.fps += (1000 / dt - stats.fps) * 0.1;
      if (adaptive && drewLastFrame && t < 1) judgeFrame(dt, now);
      if (options.bench && playback.playing && t < 1) {
        samples.draw.push(ms);
        if (drewLastFrame) samples.frame.push(dt);
      }
      drewLastFrame = true;
      dirty = t < 1;
    } else {
      drewLastFrame = false;
    }
    if (options.bench && playback.playing && t >= 1 && season >= options.bench.seasons) {
      playback.playing = false;
      options.bench.onDone(benchResult());
    }
    if (playback.playing && t >= 1 && now - lastStep >= 1000 / speed()) {
      if (ahead) {
        const s = ahead;
        ahead = null;
        lastStep = now;
        show(s);
      } else {
        request();
      }
    }
  }

  function benchResult(): BenchResult {
    const q = (xs: number[], p: number): number => {
      const sorted = [...xs].sort((a, b) => a - b);
      return sorted.length
        ? (sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] as number)
        : 0;
    };
    const round = (x: number): number => Math.round(x * 100) / 100;
    const w = samples.worker;
    return {
      renderer: stats.renderer,
      dpr: scene.dpr,
      seasons: season,
      metamers: stats.metamers,
      frames: samples.draw.length,
      drawP50: round(q(samples.draw, 0.5)),
      drawP95: round(q(samples.draw, 0.95)),
      frameP50: round(q(samples.frame, 0.5)),
      frameP95: round(q(samples.frame, 0.95)),
      longFrames: samples.frame.filter((dt) => dt > 33).length,
      workerMean: round(w.reduce((a, b) => a + b, 0) / Math.max(1, w.length)),
      workerMax: round(Math.max(0, ...w)),
    };
  }

  /** Keeps the framed specimen while it lives; otherwise frames the tallest tree. */
  function chooseSpecimen(s: Snapshot): void {
    if (!s.metrics.some((m) => m.tree === scene.focusTree)) {
      // The broadest crown among the taller trees: the nearest a forest has to an open-grown
      // specimen, which reads better on a plate than the tallest, slenderest tree.
      const tallest = Math.max(0, ...s.metrics.map((m) => m.height));
      let best: (typeof s.metrics)[number] | undefined;
      for (const m of s.metrics) {
        if (m.height < 0.5 * tallest) continue;
        if (!best || m.crownWidth > best.crownWidth) best = m;
      }
      scene.focusTree = best ? best.tree : -1;
    }
    scene.solo = scene.focusTree;
  }

  function setFocus(next: "forest" | "specimen"): void {
    focus = next;
    scene.frame = next === "specimen" ? "tree" : (options.frame ?? "world");
    scene.solo = -1;
    if (next === "specimen" && scene.next) chooseSpecimen(scene.next);
    autoFit = true;
    scene.fit();
    dirty = true;
  }

  // Pointer wind (M16): moving across the forest pushes the trees near the pointer its way.
  let lastPointer: { x: number; y: number; t: number } | null = null;
  const onPointerMove = (e: PointerEvent): void => {
    if (!wind || !scene.next) return;
    const box = renderer.canvas.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const t = performance.now() / 1000;
    if (lastPointer && t > lastPointer.t) {
      const speed = (x - lastPointer.x) / scene.camera.scale / (t - lastPointer.t); // cells/s
      if (Math.abs(speed) > 4) {
        const [wx, wy] = scene.screenToWorld(x, y);
        addPuff(wind, wx, wy, speed / 40, t);
      }
    }
    lastPointer = { x, y, t };
  };
  const onPointerLeave = (): void => {
    lastPointer = null;
  };
  renderer.canvas.addEventListener("pointermove", onPointerMove);
  renderer.canvas.addEventListener("pointerleave", onPointerLeave);

  function fell(tree: number): void {
    void sim.removeTree(tree);
    if (!playback.playing) void step();
  }

  function plant(x: number): void {
    void sim.plantTree(x);
    if (!playback.playing) void step();
  }

  function metricsOf(tree: number): TreeMetrics | undefined {
    return scene.next?.metrics.find((m) => m.tree === tree);
  }

  const resizer = new ResizeObserver(() => {
    renderer.resize();
    if (autoFit) scene.fit(true);
    measureObstacles();
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
      if (playing) {
        lastStep = 0;
        request();
      } else if (ahead) {
        // Pausing shows the season already computed, so later taps and steps act at once.
        const s = ahead;
        ahead = null;
        show(s);
      }
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
    seed: params.seed,
    setYearSeconds(seconds) {
      yearSeconds = Math.max(0, seconds);
    },
    get seasonName() {
      if (!scene.seasons) return null;
      const tau = scene.tau;
      return tau < 0.25 ? "spring" : tau < 0.52 ? "summer" : tau < 0.85 ? "autumn" : "winter";
    },
    setFocus,
    get focusTree() {
      return scene.focusTree;
    },
    anchors: () => scene.anchors(),
    fell,
    plant,
    refreshObstacles: measureObstacles,
    metrics: metricsOf,
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
      renderer.canvas.removeEventListener("pointermove", onPointerMove);
      renderer.canvas.removeEventListener("pointerleave", onPointerLeave);
      if (ownCanvas) renderer.canvas.remove();
    },
  };
}

/** A fresh forest per visit (the page may use Math.random; the core may not). */
function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}
