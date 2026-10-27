/**
 * Wind on the page (M16; the page only, the simulation never sees it). An ambient breeze whose
 * gusts travel across the forest as a wave, a gale in storm seasons, and puffs from the pointer:
 * moving the cursor (or a finger) across the plate pushes the trees it passes, in the direction it
 * moves. Positive wind blows toward +x. Units: wind 1 is a strong breeze; x, y in cells; t in s.
 */

export interface Puff {
  x: number;
  y: number;
  /** Signed push at the centre, in wind units. */
  strength: number;
  t: number;
}

export interface Wind {
  /** The breeze it eases toward: calm, or a gale in a storm season. */
  target: number;
  level: number;
  puffs: Puff[];
  lastT: number;
}

export const CALM = 0.35;
export const GALE = 1.6;
/** A puff's reach (cells) and how fast it dies away (s). */
const PUFF_SIGMA = 12;
const PUFF_TAU = 0.9;
/** Gusts: wavelength and speed across the forest (cells, cells/s). */
const GUST_K = (2 * Math.PI) / 70;
const GUST_SPEED = 14;
const MAX_PUFFS = 24;

export function createWind(): Wind {
  return { target: CALM, level: CALM, puffs: [], lastT: 0 };
}

/** Advances the breeze toward its target (a gale eases in and out over a couple of seconds). */
export function advanceWind(w: Wind, t: number): void {
  const dt = Math.min(0.1, Math.max(0, t - w.lastT));
  w.lastT = t;
  w.level += (w.target - w.level) * (1 - Math.exp(-dt / 1.5));
  if (w.puffs.length > 0) w.puffs = w.puffs.filter((p) => t - p.t < 5 * PUFF_TAU);
}

/** A push from the pointer at (x, y), e.g. its horizontal speed in cells per second / 40. */
export function addPuff(w: Wind, x: number, y: number, strength: number, t: number): void {
  w.puffs.push({ x, y, strength: Math.max(-3, Math.min(3, strength)), t });
  if (w.puffs.length > MAX_PUFFS) w.puffs.shift();
}

/** The wind at (x, y) at time t. */
export function windAt(w: Wind, x: number, y: number, t: number): number {
  // A wave of gusts travelling with the wind, swelling and easing over a few seconds.
  const wave = 0.5 + 0.5 * Math.sin(GUST_K * (x - GUST_SPEED * t));
  const swell = 0.75 + 0.25 * Math.sin(0.29 * t) * Math.sin(0.11 * t + 1.7);
  let v = w.level * (0.35 + 0.65 * wave) * swell;
  for (const p of w.puffs) {
    const age = t - p.t;
    if (age < 0 || age > 4.5 * PUFF_TAU) continue; // under 1% left
    const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
    v += p.strength * Math.exp(-d2 / (2 * PUFF_SIGMA * PUFF_SIGMA) - age / PUFF_TAU);
  }
  return v;
}
