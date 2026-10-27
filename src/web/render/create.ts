/**
 * Picks the renderer: WebGL2 when the device supports it, otherwise Canvas 2D.
 * `prefer: "canvas2d"` forces the fallback (the page reads it from `?renderer=canvas`).
 */

import { Canvas2DRenderer } from "./canvas2d.ts";
import type { Renderer, RendererOptions } from "./renderer.ts";
import { WebGL2Renderer } from "./webgl2.ts";

export function createRenderer(
  canvas: HTMLCanvasElement,
  prefer: "auto" | "canvas2d" = "auto",
  options: RendererOptions = {},
): Renderer {
  if (prefer === "auto") {
    try {
      return new WebGL2Renderer(canvas, options);
    } catch (error) {
      console.warn("WebGL2 renderer unavailable, falling back to Canvas 2D:", error);
      // A canvas keeps the first context type it was asked for, so start from a fresh one.
      const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
      canvas.replaceWith(fresh);
      return new Canvas2DRenderer(fresh, options);
    }
  }
  return new Canvas2DRenderer(canvas, options);
}
