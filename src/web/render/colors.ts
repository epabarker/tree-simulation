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
