/**
 * How the page draws foliage, per species (M7 follow-up; page only, like ADR 0008's depth). The
 * model's leaf area is unchanged: buds still cast the shade. A style sets the drawn leaf's size
 * and shape (a lens of `aspect` width over length, so a needle is a thin lens), how many leaves a
 * young metamer carries and at what angle to its shoot, its colour ramp (CSS tokens in
 * layout.css, read by theme.ts) and how many seasons foliage stays on (evergreen needles longer).
 */

export type LeafPalette = "broadleaf" | "needle" | "birch" | "tropical";
export const LEAF_PALETTES: readonly LeafPalette[] = ["broadleaf", "needle", "birch", "tropical"];

export interface LeafStyle {
  /** Full leaf length in world units (one unit = one internode), and width over length. */
  length: number;
  aspect: number;
  /** Angle between a leaf and its shoot, radians. */
  spread: number;
  /** Leaves per young metamer in the pseudo-depth view, spaced evenly around the shoot. */
  cluster: number;
  /** Leaves per young metamer in the x-ray view: 1 alternates sides, 2 takes both. */
  xray: 1 | 2;
  palette: LeafPalette;
  /** Seasons a metamer keeps its foliage; the page's default for View → leaf age. */
  leafAge: number;
  /**
   * Drops its leaves each autumn (M17): with seasons on, they flush in spring, turn and fall in
   * autumn, and the crown stands bare in winter. Evergreen foliage stays.
   */
  deciduous: boolean;
}

export const LEAF_STYLES = {
  /** The M6c lens: mid-sized, three to a cluster. */
  broadleaf: {
    length: 1.1,
    aspect: 0.41,
    spread: 0.95,
    cluster: 3,
    xray: 1,
    palette: "broadleaf",
    leafAge: 5,
    deciduous: true,
  },
  /** Fir-like sprays: many thin, dark needles set wide on both sides, kept for years (Abies ≈ 8–10). */
  needle: {
    length: 0.9,
    aspect: 0.12,
    spread: 1.25,
    cluster: 6,
    xray: 2,
    palette: "needle",
    leafAge: 8,
    deciduous: false,
  },
  /** Birch-like: small, broad, light leaves. */
  small: {
    length: 0.75,
    aspect: 0.6,
    spread: 1.05,
    cluster: 3,
    xray: 1,
    palette: "birch",
    leafAge: 4,
    deciduous: true,
  },
  /** Terminalia-like: large, glossy leaves crowded at the shoot tips. */
  large: {
    length: 1.9,
    aspect: 0.46,
    spread: 0.8,
    cluster: 4,
    xray: 2,
    palette: "tropical",
    leafAge: 3,
    deciduous: true, // Terminalia catappa reddens and drops its leaves
  },
} as const satisfies Record<string, LeafStyle>;

export type LeafStyleName = keyof typeof LEAF_STYLES;

export function isLeafStyleName(name: string): name is LeafStyleName {
  return Object.hasOwn(LEAF_STYLES, name);
}
