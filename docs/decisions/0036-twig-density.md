# 0036: Twig density: per-level acrotony and lateral spacing as form knobs

- **Status:** proposed (track B, 2026-11-01). Off by default; no golden, preset or species changes.
- **Date:** 2026-11-01
- **Related:** spec §R2.4 (acrotony κ, the pa table), §C1.4 (phyllotaxis), §9 (birch: "fine sparse laterals"); ADR 0009, ADR 0025 (generators), ADR 0029 (form by hand), ADR 0035 (pendulous twigs, which need long thin shoots to show).
- **Sheet:** `docs/experiments/figures/2026-11-01-atlas-twigs-{60,100}.png`, from `uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py twigs`.

## Context
How many fine shoots a limb carries, and where along it, is half of a crown's texture at distance: oak's clots at the shoot ends, birch's fine sparse shoots, beech's dense tracery (track A's identity card). Today it is set by one tree-wide κ, the twig level's λ (`levels.2.lambda`, which exists but was never a form knob), and the generator, which puts a lateral at every node.

## Decision (proposed)
1. **`levels[i].kappa`:** acrotony at that level's nodes, in place of `r2.kappa` (absent: `r2.kappa`), so a limb's shoots can gather at its shoot ends (tufts) while the trunk's do not, or the reverse.
2. **`levels[i].lateralEvery`:** that level's axes form laterals only at every k-th node (absent or ≤ 1: every node). Whorled levels keep `tierEvery`. The phyllotactic azimuths are unchanged; only the nodes without buds are skipped.
3. **`levels.2.lambda` joins the form knobs** for the atlas.

## What the sheet shows at 60 (seed 1, each row one knob from the species as it is; the 100 sheet not yet read; the user judges)
- **`levels.2.lateralEvery`** changes the texture most. With fewer twig laterals the twig axes run long, and the crown becomes a brush of long fine shoots. Birch at 3–4 is open, lacy and fine, the nearest thing to a birch's texture on any sheet (W/H 0.73 → 0.84). Beech at 2 throws long level skirts (W/H 1.11). Oak's fan fills with fine shoots. Every 1 reproduces today exactly (a check).
- **`levels.1.kappa`** 3–6 opens and tufts the limbs and broadens birch (W/H 0.73 → 0.93) and oak (1.19 → 1.47). At 0 birch narrows (0.55).
- **`levels.1.lateralEvery`** thins the scaffold: beech at 4 is open and irregular, while oak and birch change little.
- **`levels.2.lambda`** 0.55 makes beech a pagoda of long level tiers (W/H 1.14) and shrinks oak.

## Consequences
- With `pendulous` (ADR 0035), long fine twig axes from `levels.2.lateralEvery` are what could hang as birch's curtains; the two should be judged together.
- If accepted, the three join the form knobs (ADR 0029), re-authored per species from the atlas.
- At adoption, whoever adopts updates `docs/architecture.md`'s season-loop mapping, the ROADMAP tracing row, STATUS and the lab panel (`src/web/ui/panel.ts`); a proposal leaves them alone.
