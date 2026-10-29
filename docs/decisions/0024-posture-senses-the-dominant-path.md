# 0024: Posture senses the dominant path; limbs are fitted to laser-scanned oaks

- **Status:** accepted (user, 2026-10-29)
- **Date:** 2026-10-29
- **Spec:** §R3 (posture), §R2.4 (relays), §10 (validation targets); amends ADR 0011; extends ADR 0020

## Context
- **The fault:** the realism 2×2 ([note](../experiments/2026-10-29-structure-vs-drawing.md)) found oak limbs that run straight and then kink sharply. Along the thickest path of the open oak's limbs, half the steps are a lateral taking over the lead, turning 36° on average, against 3° for steps along an axis.
- **Why it persists:** ADR 0011's proprioception (the γ term of Bastien et al. 2013's AC model) senses "the angle to the previous metamer of the same axis". A lateral that takes over a limb is a new axis, so the corner it made is never sensed and never straightens. Real relays straighten as the new leader thickens.
- **Two rules that did not help:**
  - **Giving the relay its parent's physiological age** (§R2.4's position-dependent Δpa): it barely moves the target angle, since oak's pa 1 and pa 2 set-points differ by 9°.
  - **A larger posture limit c alone:** this leaves the kinks too.
- **Measured targets:** the Wytham Woods plot has TreeQSM models of all 35 live *Quercus robur* (Calders et al. 2022, CC BY 4.0), 10.8–24.4 m tall. Measured as `form.ts` measures the model (mean ± SD over trees):
  - limb straightness over 3 m: 0.922 ± 0.040;
  - median turn: 20.2 ± 5.5° per m;
  - 90th-percentile turn: 48.9 ± 19.4° per m;
  - trunk fork height: 0.45 ± 0.15 of height.

  Real limbs wander steadily. Today's stand oak at season 100 turns only 3–5° per m, with occasional sharp kinks.

## Decision
The user agreed (2026-10-29) to adopt the change, add the scanned oaks' targets to the fit and refit oak.
- **`r3.proprioception`:**
  - "axis" (absent) keeps ADR 0011.
  - **"dominant"** makes the organ the dominant path: a metamer senses its kink to its parent wherever it is the parent's thickest child (this season's radii, after girth), whichever slot it grew from. A lateral that has taken over straightens its corner, and the axis it overtook stops sensing one. The clamp ±c·Δr/r and everything else in ADR 0011 are unchanged.
- **Default:** the world's default stays "axis", so goldens and unfitted species are unchanged. Oak's fit fixes "dominant". Other species move to it when they are refitted.
- **Form gains limb shape** (`limbCurves`): `limbStraightness`, `limbTurn`, `limbTurnP90`, along thick wood (radius ≥ 5 cm), following each node's thickest child.
  - Limbs are resampled every 0.5 m. Straightness is chord over path of 3 m windows; turn is between successive 1 m chords.
  - `analysis/experiments/structure_vs_drawing/wytham_targets.py` measures QSMs identically. Its turn is in 3D, and the model's is in its plane.
- **The stand trial run to season 100** reports fork height and limb shape as means over the interior trees. Its oaks are about the scanned trees' height.
- **Oak's targets** add these four at full weight, with the SD over trees as the band.
- **New free parameters for oak:**
  - γ: 0.02–1, log;
  - β_g: 0.02–0.5, log;
  - c4.sigma: 5–60°;
  - r3.c: its upper bound widened from 0.3 to 0.6.

## Consequences
- **Kinks:** with "dominant" and γ = 0.5, c = 0.5, sharp bends along the open oak's limbs fall from 114 to 4 (seed 3) and from 84 to 1 (seed 4). Strong straightening alone, though, makes rods: 1.00 straightness, 1° per m. The targets need both: few kinks *and* steady wander.
- **Wander may be out of reach in 2D.** A probe of noise, β_g, γ and c reached about 12° per m at best, against the scans' 20 (whose 3D turning a planar limb cannot fully have). The fit trades this off within the bands. A shortfall that remains is a finding about the model, not a reason to tighten bounds (ADR 0020).
- **Fork height in the woodland is already on target** (0.50 against 0.45 ± 0.15). The open oak's low fork (0.04–0.14) is a lone-tree fault, with only a described target (0.3).
- **Revisit** if another species' refit cannot use "dominant" without losing its §9 habit (willow's weeping limbs, beech's staircase), or when the model goes 3D.
- **Outcome of the oak refit** ([note](../experiments/2026-10-29-oak-limbs.md)):
  - the fit kept γ small (0.034), weakened β_g (0.13) and doubled direction noise (σ 38°), buying steady wander rather than straightening corners;
  - the open oak's limbs now turn like the scans' at 0.5, 1 and 2 m, and its zigzag and V are gone;
  - woodland limbs still turn about a third as much as real ones.

  "dominant" stays oak's mode, but it does little at that γ.
