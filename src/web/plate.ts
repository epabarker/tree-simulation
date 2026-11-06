/** The garden's plate (I3): its width for a host, its cap and its intended height. */
import { GROUND_MARGIN, HEADER_MARGIN } from "./render/scene.ts";

/**
 * The plate's intended height in cells: the ring is as wide as it takes for the canvas, fitted to
 * one lap across its width, to show this many cells between the ground and the headroom line. Mature
 * crowns (oak and hornbeam, ≈ 128 cells by season 150) fit under it. A young garden is framed at
 * half of it (`Scene.frameHeight`), not at half the woods' 200-cell top (I3).
 */
export const PLATE_HEIGHT = 140;
/**
 * The widest ring (I3, ADR 0026), set by the worker's 256 MB with the specimen beside the forest at
 * 200 seasons (`memory-worker.ts` swap, seed 10): 160 cells reach 187 MB, 200 reach 211 MB, 240 reach
 * 290 MB. The 160-cell cap held 146–160 cells in practice; 200 leaves about 45 MB for a seed that
 * grows more (the browser's laptop runs spread ±20 MB across seeds 9, 10 and 12). With the generic
 * irregularity base on the broadleaves (overnight RC, 2026-11-06; one process per run, seeds 9, 10,
 * 12, the swap): 200 cells reach 231–247 MB, 180 reach 221–240 MB, 170 reach 210–216 MB. The
 * budget is now 230 MB, so the cap is 170. The peak is the garden's at season 200, not the
 * specimen's, and it does not fall monotonically with width (seed 9: 231 MB at 200, 240 at 180).
 */
export const PLATE_MAX = 170;
/** The narrowest ring: a tall, narrow host still gets a few trees. */
export const PLATE_MIN = 40;

/**
 * The ring's width for a host of this size: the camera fits the ring's width to the canvas
 * (`Scene.fit`, "world" frame on a periodic world), so the canvas shows PLATE_HEIGHT cells above the
 * ground and below the host's headroom (CSS pixels of title and text kept clear) when the ring is
 * `PLATE_HEIGHT × width / (height − ground margin − headroom)` cells wide, between PLATE_MIN and
 * PLATE_MAX. A host too wide for the cap shows less height, and the tallest crowns crop at the top.
 */
export function plateWidth(width: number, height: number, headroom = HEADER_MARGIN): number {
  const fitH = Math.max(1, height - GROUND_MARGIN - headroom);
  return Math.max(PLATE_MIN, Math.min(PLATE_MAX, (PLATE_HEIGHT * width) / fitH));
}
