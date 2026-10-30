/** The garden's plate (I3): its width for a host, its cap and its intended height. */

/**
 * The plate's intended height in cells (the 2D world's 130): the ring's width follows the host's
 * aspect at this height, and a young garden is framed at half of it (`Scene.frameHeight`), not at
 * half the woods' 200-cell top (I3).
 */
export const PLATE_HEIGHT = 130;
/**
 * The widest ring (I3, ADR 0026): a 200-cell plate reached 225 MB by season 100 on its own, past
 * the worker's 256 MB with the specimen beside it; 160 cells reached 161 MB.
 */
export const PLATE_MAX = 160;

/**
 * The ring's width for a host of this size: a share of what the host's aspect would give the
 * plate's height, at most PLATE_MAX. The plate fits the ring's width, so the share sets how large
 * the trees are drawn: two thirds on a portrait host (a phone; M21 art pass) and 0.7 on a landscape
 * one (M24: with the site's wide plate, about as many trees as before, 1.7 times larger). Crowns
 * taller than the plate ease the camera out, as ever.
 */
export function plateWidth(width: number, height: number): number {
  const aspect = width / Math.max(1, height);
  return Math.min(PLATE_MAX, PLATE_HEIGHT * aspect * (aspect < 1 ? 0.65 : 0.7));
}
