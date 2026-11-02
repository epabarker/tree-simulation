import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FLORA } from "../../core/flora.ts";
import { BARK_PALETTES, BARK_STEPS, BARK_STYLES, barkStep, fissureOpen } from "./bark-styles.ts";
import { LEAF_STYLES } from "./leaf-styles.ts";

const css = readFileSync(new URL("./scene.css", import.meta.url), "utf8");

describe("bark styles (track C)", () => {
  it("gives every calibrated species a bark of its own", () => {
    const barks = Object.values(FLORA).map((sp) => LEAF_STYLES[sp.leaf as "oak"].bark);
    for (const b of barks) expect(BARK_PALETTES).toContain(b);
    expect(new Set(barks).size).toBe(barks.length);
  });

  it("declares each bark's three tokens in light and both dark blocks of scene.css", () => {
    // The base blocks come before the optional overrides (round 2's `data-bark`).
    const base = css.slice(0, css.indexOf(":root[data-bark"));
    for (const p of BARK_PALETTES) {
      for (const suffix of ["-twig", "", "-old"]) {
        const n = base.split(`--${p}-bark${suffix}:`).length - 1;
        expect(n, `--${p}-bark${suffix}`).toBe(3);
      }
    }
    // Each override (beech's former pale grey, bark by light's base) sets beech's bark and old bark
    // in the same three places.
    const over = css.slice(base.length);
    const modes = ["pale", "lit"];
    for (const mode of modes)
      expect(over.split(`[data-bark="${mode}"]`).length - 1, `data-bark="${mode}"`).toBe(3);
    for (const suffix of ["", "-old"])
      expect(over.split(`--beech-bark${suffix}:`).length - 1, `--beech-bark${suffix}`).toBe(
        3 * modes.length,
      );
  });

  it("moves a stem from twig to bark by age, then to old bark by girth", () => {
    for (const style of Object.values(BARK_STYLES)) {
      expect(barkStep(style, 0, 0.01)).toBe(0);
      // A stem past both of its twig thresholds (birch's girth one is 4 cm: radius 0.08 cells).
      expect(barkStep(style, style.mature, 0.1)).toBe(BARK_STEPS / 2);
      let last = 0;
      for (let r = 0; r <= 3; r += 0.05) {
        const k = barkStep(style, 100, r);
        expect(k).toBeGreaterThanOrEqual(last);
        expect(k).toBeLessThan(BARK_STEPS);
        last = k;
      }
      expect(last).toBe(BARK_STEPS - 1);
    }
    // Birch's base turns black, beech stays smooth into old age.
    expect(fissureOpen(BARK_STYLES.birch, 1)).toBe(1);
    expect(fissureOpen(BARK_STYLES.beech, 2)).toBe(0);
  });

  it("keeps birch's thin wood red-brown however old, and its black bark low (round 2)", () => {
    const birch = BARK_STYLES.birch;
    // A 1 cm twig 30 seasons old keeps its twig colour; a 6 cm limb of the same age is white.
    expect(barkStep(birch, 30, 0.02)).toBe(0);
    expect(barkStep(birch, 30, 0.12)).toBe(BARK_STEPS / 2);
    // A 60 cm trunk is black at its base and white above a fifth of the tree's height.
    expect(barkStep(birch, 100, 1.2, 0)).toBe(BARK_STEPS - 1);
    expect(barkStep(birch, 100, 1.2, 0.2)).toBe(BARK_STEPS / 2);
    expect(fissureOpen(birch, 1.2, 0.2)).toBe(0);
    // Every other species ages at any height, as before.
    expect(barkStep(BARK_STYLES.oak, 100, 1.2, 0.9)).toBe(BARK_STEPS - 1);
  });
});
