/**
 * A renderer turns the shared Scene into pixels. WebGL2 is the default (ADR 0001, M6b);
 * Canvas 2D is the fallback for devices without WebGL2, and for comparison (`?renderer=canvas`).
 */

import type { Snapshot } from "../../core/types.ts";
import type { Scene, ViewOptions } from "./scene.ts";

export interface Renderer {
  readonly kind: "webgl2" | "canvas2d";
  readonly canvas: HTMLCanvasElement;
  readonly scene: Scene;
  /** Makes `s` the tween target (see Scene.setSnapshot) and refreshes per-snapshot resources. */
  setSnapshot(s: Snapshot): void;
  /** Matches the backing store to the canvas's CSS size and the device pixel ratio. */
  resize(): void;
  /** Draws the scene at tween time t ∈ [0, 1]. */
  draw(t: number, view: ViewOptions): void;
  /** Re-reads the colour tokens (after a light/dark switch). */
  refreshTheme(): void;
  /** Caps device pixels per CSS pixel (adaptive quality, M15) and resizes to match. */
  setMaxDpr(dpr: number): void;
}

/** Device pixels per CSS pixel, capped: beyond 2 the extra pixels cost more than they show. */
export const MAX_DPR = 2;

export interface RendererOptions {
  /** Leave the sky out and keep the canvas transparent, so the host page shows through. */
  transparent?: boolean;
  /** Cap on device pixels per CSS pixel (default MAX_DPR). */
  maxDpr?: number;
}
