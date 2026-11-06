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
  /**
   * Diameters (cm) over which a stem turns from twig to bark, as well as by age (unset: by age
   * alone). Birch's twigs stay red-brown until they thicken, so its fine crown reads as the
   * "purplish-brown haze" of the species card, and only its trunk and limbs white.
   */
  barkFrom?: number;
  barkAt?: number;
  /**
   * The share of the tree's height below which bark turns old, fissures and plates open (unset:
   * at any height): birch's bole is white, its base "becomes black and rugged" (RHS). They fade
   * out between half this height and this height.
   */
  oldBelow?: number;
}

export const BARK_STYLES: Record<BarkPalette, BarkStyle> = {
  /**
   * Silver birch: red-brown twigs, white bark "interspersed with conspicuous black patches", and a
   * base that "becomes black and rugged" (RHS) with dark diamond fissures. Round 2's judging (the
   * user, on a phone): by age alone its fine crown drew white and vanished into the sky, and by girth
   * alone a lone birch's whole trunk turned black by 100. The twig colour now holds below 1.5–4 cm
   * (≈ 3–7 cm real, at the model's ≈ 0.55 of a real girth), and the black stays in the lowest fifth.
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
    barkFrom: 1.5,
    barkAt: 4,
    oldBelow: 0.2,
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

/** How far a stem whose base is at `h` of its tree's height (0 → 1) may age: 1 → 0 (`oldBelow`). */
export function oldReach(style: BarkStyle, h: number): number {
  const below = style.oldBelow;
  return below === undefined ? 1 : 1 - smooth(0.5 * below, below, h);
}

/**
 * A stem's step on its species' ramp (0 … BARK_STEPS − 1), from its age (seasons), its radius
 * (cells) and its base's height over its tree's (0 → 1).
 */
export function barkStep(style: BarkStyle, age: number, radius: number, h = 0): number {
  const half = BARK_STEPS / 2;
  const d = radius * 50;
  const byGirth = style.barkAt === undefined ? 1 : smooth(style.barkFrom ?? 0, style.barkAt, d);
  const young = Math.min(age / style.mature, byGirth);
  if (young < 1) return Math.floor(young * half);
  const t = smooth(style.oldFrom, style.oldAt, d) * oldReach(style, h);
  return Math.min(BARK_STEPS - 1, half + Math.floor(t * half));
}

/**
 * How open a stem's fissures are, 0 → 1, from its radius (cells) and its base's height over its
 * tree's, before the style's depth.
 */
export function fissureOpen(style: BarkStyle, radius: number, h = 0): number {
  if (style.fissure <= 0) return 0;
  return smooth(style.fissureFrom, style.fissureAt, radius * 50) * oldReach(style, h);
}
