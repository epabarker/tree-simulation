# 0006: Short shoots become refinement R6

- **Status:** accepted (user, 2026-10-27)
- **Date:** 2026-10-27
- **Spec:** new §R6; §4, §6 (bud fate), §7 (M6d), §8, §10

## Context
The spec's foliage lives only at buds, and the page draws leaves only on metamers up to 5 seasons old, so older limbs look bare and crowns look like an x-ray. Real trees keep much of their leaf area on short shoots (spurs) along older wood: in species that have them, short shoots carry most of the leaf area at 36% less biomass per leaf area (Millan et al. 2022, *New Phytologist*). Today every live bud, dormant or not, also counts as one unit of leaf area, so the model's leaves and the drawn leaves differ. See `docs/research/2026-10-27-literature-review.md` §2.1.

## Decision
Add R6, switchable, default off. At bud fate a live bud with n = 0 becomes a short shoot (`BudState.shortShoot`, appended) if Q ≥ Q_ss, otherwise a leafless dormant bud; a short shoot that receives v ≥ 1 grows a long shoot. With R6 on, active buds deposit one unit of leaf area, short shoots a_ss, dormant buds none; each bud's Q enters the basipetal sum weighted by its leaf area, while dormant buds keep their Q as the allocation signal. Short shoots are shed with their branch. The page draws a leaf rosette at each short shoot. Params `r6.enabled`, `r6.qMin` (Q_ss), `r6.leafArea` (a_ss), all calibrated in M6d.

## Consequences
Drawn and simulated foliage agree when R6 is on. Goldens are unchanged while R6 is off; enabling it in page presets regenerates them. Treating a dormant bud's Q as both signal and (zero-weighted) production is a simplification that R1 should replace by separating production from demand. Revisit a_ss and the threshold if the short-shoot leaf share is far from the > 50% target.
