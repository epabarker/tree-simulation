/**
 * How the page draws foliage, per species (M7 follow-up; page only, like ADR 0008's depth). The
 * model's leaf area is unchanged: buds still cast the shade. A style sets the drawn leaf's size
 * and shape (its outline, `shape`, `aspect` width over length), how many leaves a young metamer
 * carries and at what angle to its shoot, its colour ramp (CSS tokens in layout.css, read by
 * theme.ts) and how many seasons foliage stays on (evergreen needles longer).
 *
 * Sizes (M23): a cell is 0.25 m and a plate draws one in 3–5 px, so a real leaf would be a pixel
 * or two. A drawn leaf therefore stands for a small spray of leaves, its length in proportion to
 * the species' real leaf (birch ≈ 5 cm, maple ≈ 6, hornbeam and holly ≈ 7, beech and goat willow
 * ≈ 8, oak ≈ 10, a rowan's compound leaf ≈ 18), and
 * the renderers keep a minimum on-screen size scaled the same way.
 */

/**
 * Leaf outlines, drawn by both renderers from the same width profile (`leafProfile`): the leaf's
 * half-width at a point a fraction t of the way from its base to its tip, as a share of its
 * full half-width. Values are stored in leaf lists: append new shapes, never reorder.
 */
export const LEAF_SHAPES = [
  "lens", // a plain lens: the generic broadleaf
  "ovate", // fuller near the base, wavy-edged: beech, hornbeam
  "deltoid", // widest near the base, pointed, toothed: birch
  "lobed", // rounded lobes, almost no stalk: oak
  "palmate", // five lobes about a centre: field maple
  "spiny", // a wavy edge of spines: holly
  "pinnate", // leaflets along a midrib: rowan
  "needle", // a thin lens: fir
] as const;
export type LeafShape = (typeof LEAF_SHAPES)[number];

/** Half-width, as a share of the full half-width, at t ∈ [0, 1] from base to tip (not palmate). */
export function leafProfile(shape: LeafShape, t: number): number {
  const s = Math.sin(Math.PI * t);
  switch (shape) {
    case "ovate":
      return s ** 0.6 * (1 - 0.25 * t) * (1 + 0.06 * Math.sin(t * 40));
    case "deltoid":
      return (
        (t < 0.3 ? (t / 0.3) ** 0.7 : ((1 - t) / 0.7) ** 1.1) *
        (1 + 0.08 * Math.abs(Math.sin(t * 30)))
      );
    case "lobed":
      return s ** 0.5 * (0.62 + 0.38 * Math.abs(Math.sin(t * Math.PI * 4.5)));
    case "spiny": {
      const tri = Math.abs(((t * 4.5) % 1) - 0.5) * 2;
      return s ** 0.6 * (0.85 + 0.25 * tri);
    }
    case "pinnate":
      return t < 0.08 ? 0.08 : Math.max(0.08, Math.sin(Math.PI * ((t * 6) % 1)) ** 0.8);
    default:
      return s;
  }
}

/** Palmate (maple) outline radius, as a share of the half-length, at angle θ about the centre. */
export function palmateRadius(theta: number): number {
  return 0.55 + 0.45 * Math.abs(Math.cos(2.5 * theta)) ** 2;
}

const outlines = new Map<LeafShape, Float32Array>();

/**
 * A shape's outline as (along, across) points of a leaf of unit length and unit width, base at
 * (0, 0), tip at (1, 0): the profile sampled up one side and down the other, or the palmate lobes
 * around the centre. Canvas 2D and the field card's study draw it; WebGL draws the same profile
 * in its fragment shader.
 */
export function leafOutline(shape: LeafShape): Float32Array {
  let out = outlines.get(shape);
  if (out) return out;
  const pts: number[] = [];
  if (shape === "palmate") {
    for (let i = 0; i < 40; i++) {
      const theta = (2 * Math.PI * i) / 40;
      const r = palmateRadius(theta);
      pts.push(0.5 + 0.5 * r * Math.cos(theta), 0.5 * r * Math.sin(theta));
    }
  } else {
    const n = shape === "lens" || shape === "needle" ? 12 : 48;
    for (let i = 0; i <= n; i++) pts.push(i / n, 0.5 * leafProfile(shape, i / n));
    for (let i = n - 1; i > 0; i--) pts.push(i / n, -0.5 * leafProfile(shape, i / n));
  }
  out = new Float32Array(pts);
  outlines.set(shape, out);
  return out;
}

/**
 * An SVG path of the style's leaf standing upright in a 100 × 100 box, tip at the top, with a
 * short stalk: a field guide's leaf study (M24).
 */
export function leafStudyPath(style: LeafStyle): string {
  const outline = leafOutline(style.shape);
  const tall = 86;
  const wide = Math.min(90, tall * style.aspect);
  const pts: string[] = [];
  for (let q = 0; q < outline.length; q += 2) {
    const x = 50 + (outline[q + 1] as number) * wide;
    const y = 92 - (outline[q] as number) * tall;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M50 99L50 92L${pts.join("L")}Z`;
}

export type LeafPalette =
  | "broadleaf"
  | "needle"
  | "birch"
  | "tropical"
  | "oak"
  | "beech"
  | "hornbeam"
  | "maple"
  | "holly"
  | "rowan"
  | "willow"
  | "pine";
/** Palette order is an index the renderers store per leaf: append, never reorder. */
export const LEAF_PALETTES: readonly LeafPalette[] = [
  "broadleaf",
  "needle",
  "birch",
  "tropical",
  "oak",
  "beech",
  "hornbeam",
  "maple",
  "holly",
  "rowan",
  "willow",
  "pine",
];

export interface LeafStyle {
  /** Full leaf length in world units (one unit = one internode), and width over length. */
  length: number;
  aspect: number;
  /** The outline (LEAF_SHAPES). */
  shape: LeafShape;
  /** A real leaf's length in cm (a compound leaf's whole length), for the field card's study. */
  cm: number;
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
  /**
   * Phenology by species (M19), shifts of the visual year τ: `flush` delays leaf-out (birch flushes
   * first, oak last), `turn` delays autumn colour and leaf fall (birch turns early, oak late).
   */
  flush?: number;
  turn?: number;
  /**
   * Marcescence: young trees, and the lower crowns of older ones, keep their dead leaves through
   * the winter until the new leaves push them off (beech, young oak). Height in cells below which
   * the leaves stay on.
   */
  marcescent?: number;
}

export const LEAF_STYLES = {
  /** The M6c lens: the generic broadleaf. */
  broadleaf: {
    length: 0.8,
    aspect: 0.41,
    shape: "lens",
    cm: 8,
    spread: 0.95,
    cluster: 5,
    xray: 1,
    palette: "broadleaf",
    leafAge: 5,
    deciduous: true,
  },
  /** Fir-like sprays: many thin, dark needles set wide on both sides, kept for years (Abies ≈ 8–10). */
  needle: {
    length: 0.7,
    aspect: 0.12,
    shape: "needle",
    cm: 2.5,
    spread: 1.25,
    cluster: 8,
    xray: 2,
    palette: "needle",
    leafAge: 8,
    deciduous: false,
  },
  /** Birch: small, triangular, toothed leaves; the first to flush and the first to turn yellow. */
  small: {
    length: 0.5,
    aspect: 0.62,
    shape: "deltoid",
    cm: 5,
    spread: 1.05,
    cluster: 8,
    xray: 1,
    palette: "birch",
    leafAge: 4,
    deciduous: true,
    flush: 0,
    turn: -0.03,
  },
  /** Oak: lobed, dark leaves that flush late and turn russet late in autumn. */
  oak: {
    length: 0.85,
    aspect: 0.55,
    shape: "lobed",
    cm: 10,
    spread: 0.9,
    cluster: 6,
    xray: 1,
    palette: "oak",
    leafAge: 5,
    deciduous: true,
    flush: 0.06,
    turn: 0.04,
  },
  /** Beech: dense, oval, wavy-edged leaves that turn copper; young beeches keep them all winter. */
  beech: {
    length: 0.7,
    aspect: 0.55,
    shape: "ovate",
    cm: 8,
    spread: 1,
    cluster: 7,
    xray: 1,
    palette: "beech",
    leafAge: 5,
    deciduous: true,
    flush: 0.03,
    turn: 0.01,
    marcescent: 30,
  },
  /** Hornbeam: oval, pleated, doubly toothed leaves that turn yellow; young trees keep them in winter. */
  hornbeam: {
    length: 0.65,
    aspect: 0.5,
    shape: "ovate",
    cm: 7,
    spread: 1,
    cluster: 7,
    xray: 1,
    palette: "hornbeam",
    leafAge: 5,
    deciduous: true,
    flush: 0.02,
    turn: 0.02,
    marcescent: 25,
  },
  /** Field maple: small five-lobed leaves, as wide as long, that turn butter-yellow. */
  maple: {
    length: 0.6,
    aspect: 1,
    shape: "palmate",
    cm: 6,
    spread: 1,
    cluster: 6,
    xray: 1,
    palette: "maple",
    leafAge: 5,
    deciduous: true,
    flush: 0.02,
    turn: 0,
  },
  /** Holly: dark, glossy, spiny evergreen leaves kept for several years. */
  holly: {
    length: 0.65,
    aspect: 0.5,
    shape: "spiny",
    cm: 7,
    spread: 1.05,
    cluster: 6,
    xray: 1,
    palette: "holly",
    leafAge: 6,
    deciduous: false,
  },
  /** Rowan: long compound leaves of paired leaflets; early to flush, early to turn scarlet. */
  rowan: {
    length: 1.1,
    aspect: 0.45,
    shape: "pinnate",
    cm: 18,
    spread: 0.85,
    cluster: 4,
    xray: 1,
    palette: "rowan",
    leafAge: 4,
    deciduous: true,
    flush: 0.01,
    turn: -0.02,
  },
  /** Goat willow: broad, oval, grey-green leaves (not a narrow willow leaf) that turn dull yellow. */
  willow: {
    length: 0.7,
    aspect: 0.55,
    shape: "lens",
    cm: 8,
    spread: 0.95,
    cluster: 6,
    xray: 1,
    palette: "willow",
    leafAge: 4,
    deciduous: true,
    flush: 0.01,
    turn: 0.02,
  },
  /** Scots pine: paired, blue-green needles, longer than a fir's, kept about three years. */
  pine: {
    length: 0.8,
    aspect: 0.1,
    shape: "needle",
    cm: 5,
    spread: 0.9,
    cluster: 7,
    xray: 2,
    palette: "pine",
    leafAge: 3,
    deciduous: false,
  },
  /** Terminalia-like: large, glossy leaves crowded at the shoot tips. */
  large: {
    length: 1.5,
    aspect: 0.46,
    shape: "lens",
    cm: 20,
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
