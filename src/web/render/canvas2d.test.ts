/**
 * The Canvas 2D fallback paints a 3D stand (I2): the renderer runs in Node against a recording
 * context, and the points of its wood strokes and leaf fills are counted where they land.
 */
import { afterAll, describe, expect, it } from "vitest";
import { productionWorld } from "../../../tests/production-world.ts";
import { forestParams } from "../../core/presets.ts";
import { Canvas2DRenderer } from "./canvas2d.ts";
import { LEAF_STYLES } from "./leaf-styles.ts";
import type { ViewOptions } from "./scene.ts";

const W = 600;
const H = 400;
const DPR = 2;
const BANDS = 6;

/** A 2D context that applies setTransform and sorts path points into wood (stroked) and leaves (filled). */
class RecordingContext {
  private m = [1, 0, 0, 1, 0, 0];
  private path: [number, number][] = [];
  wood: [number, number][] = [];
  leaves: [number, number][] = [];
  [key: string]: unknown;

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.m = [a, b, c, d, e, f];
  }
  beginPath(): void {
    this.path = [];
  }
  moveTo(x: number, y: number): void {
    this.point(x, y);
  }
  lineTo(x: number, y: number): void {
    this.point(x, y);
  }
  stroke(): void {
    this.wood.push(...this.path);
  }
  fill(): void {
    this.leaves.push(...this.path);
  }
  createLinearGradient(): { addColorStop(): void } {
    return { addColorStop: () => {} };
  }
  // The sky, the ground and state: drawn, but not counted.
  fillRect(): void {}
  closePath(): void {}
  save(): void {}
  restore(): void {}
  private point(x: number, y: number): void {
    const [a, b, c, d, e, f] = this.m as [number, number, number, number, number, number];
    this.path.push([a * x + c * y + e, b * x + d * y + f]);
  }
}

// What the renderer reads from the DOM: the theme (whose fallbacks are hex, so no probe canvas),
// the device pixel ratio and the canvas's CSS size.
const g = globalThis as Record<string, unknown>;
const saved = { window: g.window, getComputedStyle: g.getComputedStyle };
g.window = { devicePixelRatio: DPR };
g.getComputedStyle = () => ({ getPropertyValue: () => "" });
afterAll(() => Object.assign(g, saved));

const view: ViewOptions = {
  colorMode: "natural",
  showLeaves: true,
  depth: false,
  leafAge: LEAF_STYLES.broadleaf.leafAge,
  leafStyle: "broadleaf",
  showBuds: false,
  showShadow: false,
  showGhosts: false,
};

/** Each point inside the canvas, counted in BANDS vertical bands across it. */
function bands(points: [number, number][]): number[] {
  const out = new Array<number>(BANDS).fill(0);
  for (const [x, y] of points)
    if (x >= 0 && x < W * DPR && y >= 0 && y < H * DPR)
      out[Math.floor((x / (W * DPR)) * BANDS)] += 1;
  return out;
}

describe("Canvas2DRenderer on a 3D stand", () => {
  it("paints wood and leaves across the canvas (the garden's planting, 20 seasons)", () => {
    const params = forestParams(66, 10);
    params.o4 = { ...params.o4, enabled: false };
    const world = productionWorld(params);
    world.step(20);
    const s = world.snapshot(0, { junctions: false, field: false });
    world.dispose();

    const ctx = new RecordingContext();
    const canvas = {
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: W, height: H }),
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;
    const r = new Canvas2DRenderer(canvas);
    expect([canvas.width, canvas.height]).toEqual([W * DPR, H * DPR]);
    r.scene.frame = "world";
    r.setSnapshot(s);
    r.scene.fit(true);
    r.draw(1, view);

    const wood = bands(ctx.wood);
    const leaves = bands(ctx.leaves);
    // Every tree is drawn: s.metamerCount segments, each a moveTo and a lineTo, nearly all in view.
    expect(ctx.wood.length).toBeGreaterThan(1.8 * s.metamerCount);
    expect(wood.reduce((a, b) => a + b)).toBeGreaterThan(0.9 * ctx.wood.length);
    // Across the canvas, not in a corner: the ring's trees fill most bands with wood and leaves.
    expect(wood.filter((n) => n > 0).length).toBeGreaterThanOrEqual(BANDS - 1);
    expect(leaves.filter((n) => n > 100).length).toBeGreaterThanOrEqual(BANDS - 2);
  });
});
