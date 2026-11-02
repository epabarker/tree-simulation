/**
 * How the page draws wood, per species (track C, after the species cards: docs/research/
 * 2026-11-01-species-identity.md, the bark row). Page only: the model's wood is unchanged.
 *
 * A species' wood is a colour ramp in three tokens (scene.css, light and dark, read by theme.ts):
 * `--<palette>-bark-twig` (a new shoot), `--<palette>-bark` (the bark a stem reaches within a few
 * seasons) and `--<palette>-bark-old` (the bark of a thick stem, near the trunk's base). Age moves
 * a stem from twig to bark; girth moves it from bark to old, because bark is the stem's own record
 * of its girth (the rhytidome thickens and cracks as the stem widens), not of the stand's age. Over
 * the colour, WebGL2 draws a texture that also grows with girth: vertical fissures (oak's deep ones,
 * maple's shallow ones), birch's dark horizontal marks, pine's plates. Canvas 2D draws the colour.
 *
 * Girth is the stem's diameter in cm: a cell is 0.25 m, so diameter = radius (cells) × 50. The
 * thresholds are set on the model's girths, not a forester's: under ADR 0027's pipe radii a stand's
 * trunks at 100 measure 17–55 cm at the base (pine and birch ≈ 20, oak and beech 25–55; lone trees
 * at 60, 29–54), about half a real stand's, so each threshold is ≈ 0.55 of the real girth at which
 * the bark changes.
 */

/** Bark palettes, stored per metamer as an index: append, never reorder. */
export const BARK_PALETTES = [
  "birch",
  "oak",
  "beech",
  "hornbeam",
  "maple",
  "holly",
  "rowan",
  "willow",
  "pine",
  "fir",
] as const;
export type BarkPalette = (typeof BARK_PALETTES)[number];

/** Steps of each species' ramp: the first half by age (twig → bark), the second by girth. */
export const BARK_STEPS = 16;

export interface BarkStyle {
  /** Seasons a shoot takes to turn from its twig colour to its bark. */
  mature: number;
  /** Diameters (cm) between which the bark turns to its old colour (`-bark-old`). */
  oldFrom: number;
  oldAt: number;
  /** Vertical fissures: depth (0 none, 1 near the fissure colour), and the diameters they open over. */
  fissure: number;
  fissureFrom: number;
  fissureAt: number;
  /** Horizontal marks (birch's lenticels and black patches): strength on the white bark. */
  marks: number;
  /** Pine's plates: fissures that also break across, into blocks. */
  plates: number;
}

export const BARK_STYLES: Record<BarkPalette, BarkStyle> = {
  /**
   * Silver birch: red-brown twigs, white bark "interspersed with conspicuous black patches", and a
   * base that "becomes black and rugged" (RHS) with dark diamond fissures.
   */
  birch: {
    mature: 8,
    oldFrom: 20,
    oldAt: 32,
    fissure: 0.85,
    fissureFrom: 16,
    fissureAt: 30,
    marks: 0.8,
    plates: 0.4,
  },
  /** Oak: grey-brown and deeply fissured, the fissures from early on. */
  oak: {
    mature: 3,
    oldFrom: 8,
    oldAt: 33,
    fissure: 0.7,
    fissureFrom: 4,
    fissureAt: 16,
    marks: 0,
    plates: 0,
  },
  /**
   * Beech: smooth "into old age" (TSO); its tone is the measured mid grey (Pilarski et al. 2008,
   * scene.css), where TSO says "bark pale grey" (the `data-bark="pale"` alternative).
   */
  beech: {
    mature: 3,
    oldFrom: 16,
    oldAt: 50,
    fissure: 0,
    fissureFrom: 0,
    fissureAt: 1,
    marks: 0,
    plates: 0,
  },
  /** Hornbeam: smooth steel grey with paler vertical markings; fluted when old. */
  hornbeam: {
    mature: 3,
    oldFrom: 11,
    oldAt: 33,
    fissure: 0.18,
    fissureFrom: 6,
    fissureAt: 22,
    marks: 0,
    plates: 0,
  },
  /** Field maple: grey to pale brown, "shallow, longitudinal fissures with age" (TSO). */
  maple: {
    mature: 3,
    oldFrom: 8,
    oldAt: 25,
    fissure: 0.35,
    fissureFrom: 6,
    fissureAt: 19,
    marks: 0,
    plates: 0,
  },
  /** Holly: green shoots, smooth silver-grey bark. */
  holly: {
    mature: 5,
    oldFrom: 11,
    oldAt: 33,
    fissure: 0,
    fissureFrom: 0,
    fissureAt: 1,
    marks: 0,
    plates: 0,
  },
  /** Rowan: "trunk smooth and grey" (TSO), with faint lenticels. */
  rowan: {
    mature: 3,
    oldFrom: 11,
    oldAt: 28,
    fissure: 0,
    fissureFrom: 0,
    fissureAt: 1,
    marks: 0.15,
    plates: 0,
  },
  /** Goat willow: grey-brown, "develops diamond-shaped fissures" (Woodland Trust). */
  willow: {
    mature: 3,
    oldFrom: 8,
    oldAt: 22,
    fissure: 0.5,
    fissureFrom: 4,
    fissureAt: 16,
    marks: 0,
    plates: 0.35,
  },
  /**
   * Scots pine: thin, flaking, orange-red bark on the upper stem and limbs, "thick, scaly-plated,
   * grey-brown" on the lower stem (conifers.org): the strongest cue at distance.
   */
  pine: {
    mature: 8,
    oldFrom: 9,
    oldAt: 19,
    fissure: 0.6,
    fissureFrom: 8,
    fissureAt: 19,
    marks: 0,
    plates: 0.8,
  },
  /** Silver fir: grey-brown, then pale silvery-grey, scaly and fissured when old (TSO). */
  fir: {
    mature: 4,
    oldFrom: 14,
    oldAt: 33,
    fissure: 0.3,
    fissureFrom: 14,
    fissureAt: 33,
    marks: 0,
    plates: 0.5,
  },
};

function smooth(a: number, b: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/** A stem's step on its species' ramp (0 … BARK_STEPS − 1), from its age (seasons) and radius (cells). */
export function barkStep(style: BarkStyle, age: number, radius: number): number {
  const half = BARK_STEPS / 2;
  if (age < style.mature) return Math.floor((age / style.mature) * half);
  const t = smooth(style.oldFrom, style.oldAt, radius * 50);
  return Math.min(BARK_STEPS - 1, half + Math.floor(t * half));
}

/** How open a stem's fissures are, 0 → 1, from its radius (cells), before the style's depth. */
export function fissureOpen(style: BarkStyle, radius: number): number {
  return style.fissure > 0 ? smooth(style.fissureFrom, style.fissureAt, radius * 50) : 0;
}
