/**
 * A renderer turns the shared Scene into pixels. WebGL2 is the default (ADR 0001, M6b);
 * Canvas 2D is the fallback for devices without WebGL2, and for comparison (`?renderer=canvas`).
 */

import type { Snapshot } from "../../core/snapshot.ts";
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
}

/** Device pixels per CSS pixel, capped: beyond 2 the extra pixels cost more than they show. */
export const MAX_DPR = 2;
