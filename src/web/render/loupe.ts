/**
 * The loupe (M26): hold a finger or the mouse on the forest and a round glass shows the spot under
 * it at four times the zoom, leaves at their true length (the main view draws them no shorter
 * than LEAF_MIN_PX, so a zoomed-out crown still reads as foliage). It is a second scene drawn by
 * the Canvas 2D renderer into a small canvas of its own, fed the main view's snapshot only while it
 * is open, so it costs nothing until it is used.
 */

import type { Snapshot } from "../../core/types.ts";
import { Canvas2DRenderer } from "./canvas2d.ts";
import type { Scene, ViewOptions } from "./scene.ts";
import { readTheme } from "./theme.ts";

/** How much nearer the loupe looks than the main view. */
export const LOUPE_ZOOM = 4;

export interface Loupe {
  readonly open: boolean;
  /** Opens the glass over canvas pixel (sx, sy) of the main view, showing `s`. */
  show(sx: number, sy: number, s: Snapshot): void;
  /** Follows the pointer. */
  move(sx: number, sy: number): void;
  hide(): void;
  /** A new snapshot from the main view; `animate` false drops the tween history. */
  setSnapshot(s: Snapshot, animate: boolean): void;
  /** Draws at the main view's tween time, copying its camera, wind, year and view. */
  draw(t: number, view: ViewOptions): void;
  destroy(): void;
}

/**
 * A loupe over the main view's canvas. The glass is a fixed-position canvas inside the host (so
 * it inherits the host's scene tokens), above the pointer so a finger does not hide it.
 */
export function createLoupe(
  main: Scene,
  mainCanvas: HTMLCanvasElement,
  host: HTMLElement,
  transparent = false,
): Loupe {
  const size = Math.round(Math.min(200, Math.max(140, 0.42 * Math.min(innerWidth, innerHeight))));
  const glass = document.createElement("canvas");
  glass.setAttribute("aria-hidden", "true");
  Object.assign(glass.style, {
    position: "fixed",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    pointerEvents: "none",
    boxShadow: "0 2px 12px rgb(0 0 0 / 0.35), inset 0 0 0 1px rgb(255 255 255 / 0.5)",
    zIndex: "10",
    display: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  host.append(glass);
  let renderer: Canvas2DRenderer | null = null;
  let open = false;
  let at = { x: 0, y: 0 };
  /** What shows behind the trees: the page's background on a transparent host. */
  let pageBackground = "Canvas";

  /**
   * The glass draws no sky of its own (its gradient would span the glass, not the plate): behind
   * the trees it shows the main view's sky colour at the pointer's height, or the page.
   */
  const backdrop = (): void => {
    if (transparent) {
      glass.style.background = pageBackground;
      return;
    }
    const theme = readTheme(mainCanvas);
    const f = Math.min(1, Math.max(0, at.y / Math.max(1, main.groundY())));
    const pct = Math.round(f * 100);
    glass.style.background = `color-mix(in srgb, ${theme.skyBottom} ${pct}%, ${theme.skyTop})`;
  };

  const place = (): void => {
    const box = mainCanvas.getBoundingClientRect();
    backdrop();
    // Above the pointer, kept on screen.
    const left = Math.min(innerWidth - size - 4, Math.max(4, box.left + at.x - size / 2));
    const above = box.top + at.y - size - 28;
    const top = above >= 4 ? above : Math.min(innerHeight - size - 4, box.top + at.y + 28);
    glass.style.left = `${left}px`;
    glass.style.top = `${top}px`;
  };

  return {
    get open() {
      return open;
    },
    show(sx, sy, s) {
      at = { x: sx, y: sy };
      glass.style.display = "block";
      // Made on first use, once the glass has a size to measure.
      renderer ??= new Canvas2DRenderer(glass, { transparent: true });
      if (transparent) {
        // The nearest ancestor with a background of its own.
        for (let el: Element | null = host; el; el = el.parentElement) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
            pageBackground = bg;
            break;
          }
        }
      }
      renderer.resize();
      renderer.refreshTheme();
      renderer.setSnapshot(s);
      renderer.scene.clearHistory();
      open = true;
      place();
    },
    move(sx, sy) {
      at = { x: sx, y: sy };
      if (open) place();
    },
    hide() {
      open = false;
      glass.style.display = "none";
    },
    setSnapshot(s, animate) {
      if (!open || !renderer) return;
      renderer.setSnapshot(s);
      if (!animate) renderer.scene.clearHistory();
    },
    draw(t, view) {
      if (!open || !renderer) return;
      const scene = renderer.scene;
      const [wx, wy] = main.screenToWorld(at.x, at.y);
      scene.camera.cx = wx;
      scene.camera.cy = wy;
      scene.camera.scale = main.camera.scale * LOUPE_ZOOM;
      scene.frame = main.frame;
      scene.solo = main.solo;
      scene.wind = main.wind;
      scene.time = main.time;
      scene.seasons = main.seasons;
      scene.tau = main.tau;
      // Falling wood is the main view's: in the glass, shed branches fade where they were.
      scene.physics = false;
      renderer.draw(t, { ...view, showShadow: false });
    },
    destroy() {
      glass.remove();
    },
  };
}
