# 0035: Pendulous twigs: thin axes hang, limbs keep their level's angle

- **Status:** proposed (track B, 2026-11-01). Off by default; no golden, preset or species changes.
- **Date:** 2026-11-01
- **Related:** spec §C4.4 (A_set > 90° pendulous), §R3.4 (posture), §9 (weeping willow: "pendulous higher-order axes"; birch: "pendulous old twigs"); ADR 0009, ADR 0011, ADR 0029, ADR 0034. The form-sweep review: `levels.2.setPoint` ≥ 80 collapses every broadleaf (STATUS, open question). Track A's identity card ranks "pendulous twigs that do not take the limbs with them" second.
- **Sheet:** `docs/experiments/figures/2026-11-01-atlas-pendulous-{60,100}.png`, from `uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py pendulous`.

## Context
The last row of the pa table serves every axis of order ≥ 2, the secondary scaffold as well as the twigs. A pendulous set point there lowers the scaffold too, and the crown falls into a parasol, mound or column. In birch and weeping trees the hanging shoots are the thin ones: long, flexible, low-stiffness shoots that hang by their own weight, while the limbs that bear them ascend. Thinness (girth) separates the two, so it should decide which set point an axis follows.

## Decision (proposed)
1. **Per level, `pendulous` (degrees) and `pendulousRadius` (cells, default 0.01):** an axis of that level takes, in growth (C4) and posture (R3), a set point blended from its level's toward `pendulous` by its thinness. The blend is fully pendulous at pipe radius ≤ `pendulousRadius` and back to the level's own at twice that. A twig that thickens into a limb rises back to the level's angle. Absent is the ablation.
2. **Growth weighs the wood a shoot grows from:** a new lateral axis is as thin as can be (it hangs), and a continuation shoot is weighed by its host metamer's radius. The trunk (order 0) never hangs.
3. **Only when on** does R3 convert the set point to degrees and back, so the posture target stays bit-for-bit identical with the rule off.

## What the sheet shows (seed 1, level 2's growth set point at 45 in every cell but "today"; the user judges)
- **At small radii (0.005–0.01) the twigs hang and the crown keeps its kind:** oak stays a vase, birch and beech keep their outlines. The collapse `levels.2.setPoint` ≥ 80 caused does not happen. At 0.02–0.04 too many axes count as thin, and oak falls into drooping mounds at 100: the old collapse again.
- **The hanging is hard to see at the atlas's scale.** The thin axes are a few short metamers, drawn as fine lines with their leaves as points. Birch's curtains need long thin shoots (twig length and vigour, rule 4), not only their angle.
- **`levels.1.pendulous`** (the scaffold's thin ends) lowers beech's limb elevation sharply (51° → 8° at 170), with a narrow column at 100. On oak and birch it changes little.
- Birch's "today" has level 2 at 145, so it already hangs its twigs (and is a cone). Every other cell has level 2 at 45 and reads as a fuller column. Compare within the rows, not against "today".

## Consequences
- **Not for judging yet.** The hang needs long thin shoots to read at phone scale: twig length from twig density (ADR 0036, `levels.2.lateralEvery`) and drawn twigs from track C. Until both are in, this sheet only shows that the crown no longer collapses; it is not a picture of a weeping birch.
- `pendulous` replaces a high `levels.2.setPoint` as the way to hang twigs, keeping the scaffold. Whether the hang is visible depends on twig length and on the renderer (track C's drawn twig density).
- If accepted, `pendulous` and `pendulousRadius` per level join the form knobs (ADR 0029).
- At adoption, whoever adopts updates `docs/architecture.md`'s season-loop mapping, the ROADMAP tracing row, STATUS and the lab panel (`src/web/ui/panel.ts`); a proposal leaves them alone.
