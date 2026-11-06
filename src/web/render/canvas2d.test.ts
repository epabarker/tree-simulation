/**
 * The Canvas 2D fallback paints a 3D stand (I2): the renderer runs in Node against a recording
 * context, and the points of its wood strokes and leaf fills are counted where they land.
 */
import { afterAll, describe, expect, it } from "vitest";
import { productionWorld } from "../../../tests/production-world.ts";
import { forestParams } from "../../core/presets.ts";
import { Canvas2DRenderer } from "./canvas2d.ts";
import { nearAndFar } from "./fixture.ts";
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
  /** Every stroke and fill in turn, with its path's points in world units (before the transform). */
  events: { kind: "wood" | "leaf"; raw: [number, number][] }[] = [];
  private raw: [number, number][] = [];
  [key: string]: unknown;

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.m = [a, b, c, d, e, f];
  }
  beginPath(): void {
    this.path = [];
    this.raw = [];
  }
  moveTo(x: number, y: number): void {
    this.point(x, y);
  }
  lineTo(x: number, y: number): void {
    this.point(x, y);
  }
  stroke(): void {
    this.wood.push(...this.path);
    this.events.push({ kind: "wood", raw: this.raw });
  }
  fill(): void {
    this.leaves.push(...this.path);
    this.events.push({ kind: "leaf", raw: this.raw });
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
    this.raw.push([x, y]);
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

/** A Canvas2DRenderer drawing into a fresh recording context. */
function recorder(): { r: Canvas2DRenderer; ctx: RecordingContext; canvas: HTMLCanvasElement } {
  const ctx = new RecordingContext();
  const canvas = {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: W, height: H }),
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement;
  return { r: new Canvas2DRenderer(canvas), ctx, canvas };
}

describe("Canvas2DRenderer in depth (I3)", () => {
  it("draws far to near: the far tree's wood and leaf, then the near tree's", () => {
    const { r, ctx } = recorder();
    r.setSnapshot(nearAndFar());
    r.scene.fit(true);
    r.draw(1, view);
    // Which event drew each tree's wood (a stroke reaching its tip) and its leaf (a fill near it).
    const first = (kind: "wood" | "leaf", test: (x: number, y: number) => boolean) =>
      ctx.events.findIndex((e) => e.kind === kind && e.raw.some(([x, y]) => test(x, y)));
    const farWood = first("wood", (_, y) => Math.abs(y - 2) < 1e-6);
    const nearWood = first("wood", (_, y) => Math.abs(y - 4) < 1e-6);
    const farLeaf = first("leaf", (_, y) => y > 1.5 && y < 3);
    const nearLeaf = first("leaf", (_, y) => y > 4.2);
    for (const k of [farWood, nearWood, farLeaf, nearLeaf]) expect(k).toBeGreaterThanOrEqual(0);
    expect(farWood).toBeLessThan(farLeaf);
    expect(farLeaf).toBeLessThan(nearWood);
    expect(nearWood).toBeLessThan(nearLeaf);
  });
});

describe("Canvas2DRenderer on a 3D stand", () => {
  it("paints wood and leaves across the canvas (the garden's planting, 20 seasons)", () => {
    const params = forestParams(66, 10);
    params.o4 = { ...params.o4, enabled: false };
    const world = productionWorld(params);
    world.step(20);
    const s = world.snapshot(0, { junctions: false, field: false });
    world.dispose();

    const { r, ctx, canvas } = recorder();
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
