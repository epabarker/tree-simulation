/**
 * Colours of the natural view, read from CSS custom properties on the canvas so light and dark
 * modes live in one place (scene.css, which a host page may override). Re-read whenever the
 * colour scheme changes.
 */

import { LEAF_PALETTES, type LeafPalette } from "./leaf-styles.ts";

export interface Theme {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundDeep: string;
  wall: string;
  ghost: string;
  /** `--ground-hatch: 1` draws the ground as ink hatching (an engraved plate) instead of a fill. */
  groundHatch: boolean;
  /** Young twig → old bark. */
  bark: string[];
  /** Deep shade → full sun, one ramp per leaf palette (leaf-styles.ts). */
  leaf: Record<LeafPalette, string[]>;
  /** The same in autumn colour (M17): shaded leaves turn darker, sunlit ones brighter. */
  autumn: Record<LeafPalette, string[]>;
}

export const RAMP_STEPS = 12;

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `steps` colours from `from` to `to`, interpolated in RGB. */
export function ramp(from: string, to: string, steps = RAMP_STEPS): string[] {
  const a = parseHex(from);
  const b = parseHex(to);
  return Array.from({ length: steps }, (_, i) => {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const c = a.map((v, k) => Math.round(v + ((b[k] as number) - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  });
}

let probe: CanvasRenderingContext2D | null = null;

/**
 * A token's value as "#rrggbb", or as given if it is already hex or rgb()/rgba(). A custom
 * property's computed value is its raw text, so a host page may hand over oklch(), a named colour
 * or anything else CSS knows; the browser converts it by painting one pixel.
 */
export function toHexColor(css: string): string {
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(css) || /^rgba?\(/i.test(css)) return css;
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return css;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000";
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((c) => (c as number).toString(16).padStart(2, "0")).join("")}`;
}

export function readTheme(el: Element): Theme {
  const style = getComputedStyle(el);
  const v = (name: string, fallback: string) =>
    toHexColor(style.getPropertyValue(name).trim() || fallback);
  return {
    skyTop: v("--sky-top", "#cfe2ee"),
    skyBottom: v("--sky-bottom", "#f4efe2"),
    ground: v("--ground", "#8a7a5a"),
    groundDeep: v("--ground-deep", "#6c5e45"),
    wall: v("--wall", "rgba(90, 90, 100, 0.35)"),
    ghost: v("--ghost", "#9a8f80"),
    groundHatch: style.getPropertyValue("--ground-hatch").trim() === "1",
    bark: ramp(v("--bark-young", "#8c7b4f"), v("--bark-old", "#4c3d31")),
    leaf: leafRamps(v),
    autumn: autumnRamps(v),
  };
}

/** Fallbacks for each palette's tokens (`--leaf-shade`/`--leaf-sun`, `--needle-…`, …). */
const LEAF_FALLBACK: Record<LeafPalette, [string, string, string]> = {
  broadleaf: ["--leaf", "#35502a", "#a3cf5b"],
  needle: ["--needle", "#1f3b2c", "#5d8a5a"],
  birch: ["--birch-leaf", "#4a6a2a", "#c3dc6a"],
  tropical: ["--tropical-leaf", "#1d4a26", "#6fb04a"],
  oak: ["--oak-leaf", "#2f4a26", "#8bb44e"],
  beech: ["--beech-leaf", "#2c4a22", "#9ccc4e"],
};

/** Autumn fallbacks per palette (`--leaf-autumn-shade`/`-sun`, …); needles barely change. */
const AUTUMN_FALLBACK: Record<LeafPalette, [string, string, string]> = {
  broadleaf: ["--leaf-autumn", "#8a3b16", "#e3a43a"],
  needle: ["--needle-autumn", "#1c3527", "#4f7a4c"],
  birch: ["--birch-leaf-autumn", "#9a6b17", "#f1d14f"],
  tropical: ["--tropical-leaf-autumn", "#7a1e14", "#d8572e"],
  oak: ["--oak-leaf-autumn", "#6b3a17", "#c98a3a"],
  beech: ["--beech-leaf-autumn", "#7a3412", "#d9772b"],
};

function autumnRamps(v: (name: string, fallback: string) => string): Record<LeafPalette, string[]> {
  const out = {} as Record<LeafPalette, string[]>;
  for (const p of LEAF_PALETTES) {
    const [token, shade, sun] = AUTUMN_FALLBACK[p];
    out[p] = ramp(v(`${token}-shade`, shade), v(`${token}-sun`, sun));
  }
  return out;
}

function leafRamps(v: (name: string, fallback: string) => string): Record<LeafPalette, string[]> {
  const out = {} as Record<LeafPalette, string[]>;
  for (const p of LEAF_PALETTES) {
    const [token, shade, sun] = LEAF_FALLBACK[p];
    out[p] = ramp(v(`${token}-shade`, shade), v(`${token}-sun`, sun));
  }
  return out;
}
