/** Colour ramps for data-driven colouring. Mid-tone, so they read on light and dark backgrounds. */

/** Sequential ramp (viridis-like), 16 steps from low to high. */
export const SEQUENTIAL = [
  "#440154",
  "#481a6c",
  "#472f7d",
  "#414487",
  "#39568c",
  "#31688e",
  "#2a788e",
  "#23888e",
  "#1f988b",
  "#22a884",
  "#35b779",
  "#54c568",
  "#7ad151",
  "#a5db36",
  "#d2e21b",
  "#fde725",
];

/** Categorical colours for branching order and tree identity. */
export const CATEGORICAL = [
  "#7a5230", // bark brown: trunk
  "#3b7d3a",
  "#c1832e",
  "#2f6c9a",
  "#a8433a",
  "#6b5b9a",
  "#3d9a8b",
  "#9a7a2f",
  "#8a4f7d",
  "#5a6b2f",
];

export const BUD_ACTIVE = "#4caf50";
export const BUD_DORMANT = "#d08a2e";

/** RGB triples of the shadow heatmap ramp (transparent at zero shade). */
export function shadowRgb(t: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, t));
  // pale yellow → orange → deep purple
  const r = Math.round(255 * (1 - 0.55 * u * u));
  const g = Math.round(220 * (1 - u) + 20 * u);
  const b = Math.round(120 * (1 - u) + 120 * u);
  return [r, g, b];
}

/**
 * The shade overlay as RGBA pixels, row 0 at the ground (as the field is stored). Transparent
 * where there is no shade; otherwise the shadowRgb ramp scaled to the darkest cell.
 */
export function shadeImage(
  field: Float32Array,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  const img = new Uint8ClampedArray(width * height * 4);
  let max = 0;
  for (let i = 0; i < field.length; i++) if (field[i] > max) max = field[i];
  if (max <= 0) return img;
  for (let i = 0; i < width * height; i++) {
    const v = field[i];
    if (v <= 0) continue;
    const [r, g, b] = shadowRgb(v / max);
    img[i * 4] = r;
    img[i * 4 + 1] = g;
    img[i * 4 + 2] = b;
    img[i * 4 + 3] = Math.round(60 + 180 * Math.min(1, v / max));
  }
  return img;
}

/** "#rrggbb", "#rgb", "rgb(r, g, b)" or "rgba(r, g, b, a)" as bytes [r, g, b, a]. */
export function parseColor(css: string): [number, number, number, number] {
  const c = css.trim();
  if (c.startsWith("#")) {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join("") : c.slice(1, 7);
    const n = Number.parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = (m[1] as string).split(",").map((x) => Number.parseFloat(x));
    const a = parts.length > 3 ? Math.round((parts[3] as number) * 255) : 255;
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, a];
  }
  return [0, 0, 0, 255];
}
