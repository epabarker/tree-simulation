/**
 * I3 step 4's foliage coverage instrument (the I3 plan, §1.2 and §2.5): how much of the canopy the
 * drawn leaves cover, so a change of leaf opacity or LEAF_MIN_PX, or of a species' style, is read
 * as a number beside the picture the user judges. `?bench` reports it at the end of its run.
 *
 *  - Cells: the picture cut into 1-cell squares (x across the world, y up); the canopy runs from
 *    the ground to its highest leaf, split at half height. Per half, the share of cells holding a
 *    drawn leaf and the leaves per covered cell (§1.2's measure, now on the leaves as drawn: after
 *    clumping, at their place this frame, not at their metamers' bases).
 *  - Pixels: the canvas read back after a draw, in the canopy's band of rows (its highest leaf to
 *    the ground) and its upper half: the share of pixels drawn in a leaf's colour (green over red
 *    and blue), against the sky and the wood.
 */

import type { Renderer } from "./renderer.ts";
import { DEPTH_SLICES, type Leaves, type ViewOptions } from "./scene.ts";

export interface Coverage {
  /** Leaves drawn this frame (on the crowns; falling ones are left out). */
  leaves: number;
  /** Highest leaf, cells. */
  top: number;
  coverLow: number;
  coverHigh: number;
  perCellLow: number;
  perCellHigh: number;
  /** Share of canopy pixels in leaf colour: from the highest leaf to the ground, and its upper half. */
  pixelCover: number;
  pixelCoverHigh: number;
}

const round = (x: number, d = 3): number => Math.round(x * 10 ** d) / 10 ** d;

/** The cell measures of a frame's leaves on a world `width` cells wide (wrapped on a ring). */
export function cellCoverage(
  leaves: Leaves,
  width: number,
): Omit<Coverage, "pixelCover" | "pixelCoverHigh"> {
  const W = Math.max(1, Math.ceil(width));
  const end = leaves.slices[DEPTH_SLICES] as number;
  let top = 0;
  let n = 0;
  for (let k = 0; k < end; k++) {
    if ((leaves.size[k] as number) <= 0) continue;
    top = Math.max(top, leaves.y[k] as number);
    n++;
  }
  const H = Math.floor(top) + 1;
  const cells = new Uint16Array(W * H);
  for (let k = 0; k < end; k++) {
    if ((leaves.size[k] as number) <= 0) continue;
    const x = ((Math.floor(leaves.x[k] as number) % W) + W) % W;
    const y = Math.min(H - 1, Math.max(0, Math.floor(leaves.y[k] as number)));
    const c = y * W + x;
    if ((cells[c] as number) < 65535) cells[c] = (cells[c] as number) + 1;
  }
  const half = Math.floor(top / 2);
  let lo = 0;
  let hi = 0;
  let loN = 0;
  let hiN = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = cells[y * W + x] as number;
      if (!c) continue;
      if (y < half) {
        lo++;
        loN += c;
      } else {
        hi++;
        hiN += c;
      }
    }
  }
  return {
    leaves: n,
    top: round(top, 1),
    coverLow: round(lo / Math.max(1, W * half)),
    coverHigh: round(hi / Math.max(1, W * (H - half))),
    perCellLow: round(loN / Math.max(1, lo), 1),
    perCellHigh: round(hiN / Math.max(1, hi), 1),
  };
}

/** Whether an RGB pixel is drawn in a leaf's colour: green over both red and blue. */
export function isLeafPixel(r: number, g: number, b: number): boolean {
  return g > r + 6 && g > b + 6;
}

let readback: CanvasRenderingContext2D | null = null;

/**
 * Draws the renderer's scene once (t = 1, so leaves are full size) and measures it: the cells from
 * the frame's leaves, the pixels from the canvas read back in the same task (a WebGL canvas without
 * preserveDrawingBuffer still holds the frame until it is composited).
 */
export function measureCoverage(renderer: Renderer, view: ViewOptions): Coverage {
  const { scene, canvas } = renderer;
  renderer.draw(1, view);
  const s = scene.next;
  const cells = cellCoverage(scene.leaves(view.leafAge, 1), s ? s.width : 1);
  readback ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  let pixelCover = 0;
  let pixelCoverHigh = 0;
  if (readback && canvas.width > 0 && canvas.height > 0) {
    const ctx = readback;
    ctx.canvas.width = canvas.width;
    ctx.canvas.height = canvas.height;
    ctx.drawImage(canvas, 0, 0);
    const dpr = canvas.width / Math.max(1, scene.width);
    const [, topY] = scene.worldToScreen(0, cells.top);
    const groundY = scene.groundY();
    const y0 = Math.max(0, Math.floor(topY * dpr));
    const y1 = Math.min(canvas.height, Math.ceil(groundY * dpr));
    const yHalf = Math.round((y0 + y1) / 2);
    if (y1 > y0) {
      const px = ctx.getImageData(0, y0, canvas.width, y1 - y0).data;
      let leaf = 0;
      let leafHigh = 0;
      for (let y = 0; y < y1 - y0; y++) {
        const row = y * canvas.width * 4;
        for (let x = 0; x < canvas.width; x++) {
          const q = row + 4 * x;
          if (!isLeafPixel(px[q] as number, px[q + 1] as number, px[q + 2] as number)) continue;
          leaf++;
          if (y0 + y < yHalf) leafHigh++;
        }
      }
      pixelCover = round(leaf / (canvas.width * (y1 - y0)));
      pixelCoverHigh = round(leafHigh / Math.max(1, canvas.width * (yHalf - y0)));
    }
  }
  return { ...cells, pixelCover, pixelCoverHigh };
}
