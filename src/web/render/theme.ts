/**
 * Colours of the natural view, read from CSS custom properties on the canvas so light and dark
 * modes live in one place (layout.css). Re-read whenever the colour scheme changes.
 */

export interface Theme {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundDeep: string;
  wall: string;
  ghost: string;
  /** Young twig → old bark. */
  bark: string[];
  /** Deep shade → full sun. */
  leaf: string[];
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

export function readTheme(el: Element): Theme {
  const style = getComputedStyle(el);
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    skyTop: v("--sky-top", "#cfe2ee"),
    skyBottom: v("--sky-bottom", "#f4efe2"),
    ground: v("--ground", "#8a7a5a"),
    groundDeep: v("--ground-deep", "#6c5e45"),
    wall: v("--wall", "rgba(90, 90, 100, 0.35)"),
    ghost: v("--ghost", "#9a8f80"),
    bark: ramp(v("--bark-young", "#8c7b4f"), v("--bark-old", "#4c3d31")),
    leaf: ramp(v("--leaf-shade", "#35502a"), v("--leaf-sun", "#a3cf5b")),
  };
}
