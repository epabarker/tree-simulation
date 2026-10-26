# Devlog

Newest first. One entry per session or milestone: what changed, why, surprises, and any golden-hash updates with their reason.

## 2026-10-26: M1, the C2 shadow triangle

- **`ShadowTriangle`** implements the spec rule: deposits a·b^(−q) in a triangle below each bud; Q = max(C − s + a, 0); V points at the least-shaded cell in the wedge. Toggle it with `c2.enabled`; the panel has a C2 folder. Colouring by light now covers buds too.
- **Calibration** ([experiment note](experiments/2026-10-26-m1-shadow-calibration.md)). a = 1 stops all growth, because a node's two buds share a cell (Q = C − a). The new defaults are a = 0.2, b = 2, C = 1.
- **Decision (no ADR needed): the world is a closed box,** opaque outside on every side. The page showed shoots past the grid's edges growing exponentially in "open sky" (531k metamers by season 69). The M0 goldens were unchanged; shadow goldens were added.
- **Colour scaling.** Light and resource colours now use √(value / max), because a few bright tips otherwise make everything else dark.
- **Measurement.** A single tree filling the 100×70 box (about 13k metamers) takes about 6–13 ms per season in the worker.

## 2026-10-26: Repository skeleton and M0

- **Environment.** Moved from the VSCodium Flatpak (a sandbox with no Node) to native VS Code on Fedora, with Node 24, gh and uv via dnf (ADR 0003).
- **Repo layout and docs.**
  - Moved the spec to `docs/spec.md` and the stack brief to `docs/background/`.
  - Recorded ADRs 0001 (stack), 0002 (keyed-hash RNG) and 0003 (dev environment).
- **Core.** SoA `Table`; trees as metamer and bud tables with parent and slot topology (no child pointers); keyed-hash RNG with a Purpose registry; C1 distichous buds; the §6 season loop with the C3 basipetal pass and the `none` scaffold mode.
- **Page.** A Comlink worker, a Canvas 2D renderer (tweening, ghosts, colour modes, auto-fit), Tweakpane, and Observable Plot loaded after first paint.
- **CLI and analysis.** CLI writing CSV, and an analysis project (uv, polars, plotnine).
- **Shadow constants.** Palubicki et al. (2009) give no numbers for the shadow constants a, b and C, and Guerra (2026) gives none either. They are placeholders marked `calibrate` (ROADMAP).
- **Decision (no ADR needed): the ground is opaque in every light model.** Without that rule, M0 laterals of laterals grow underground. Goldens were regenerated before the first commit.
