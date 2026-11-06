# 0027: Girth in 3D: scars record the pipe radius; r0 and m_w rescaled; storms recalibrated

- **Status:** accepted (the user, 2026-10-30).
- **Date:** 2026-10-30
- **Spec:** §R3 (stress wood is local), §C6 (pipe girth with memory), §10 (H/D: stand-grown 60–80, risky above 80, slender above 100). ADR 0010 (R1), 0011 (R3's units), 0024 (the slab).
- **Plan and note:** [the form plan](../plans/2026-10-30-form.md) §0.4, §2; [C1 round 3](../experiments/2026-10-30-c1-round3-form.md).

## Context
In 3D the stand's H/D was 10–12 against 60–80. Each trunk's pipe sum was 92–97% scars, and `c5.rs` recorded a shed branch's scar at its **full** radius, stress wood included, while C6 passes children's pipe part only. With thin tips every twig reaches R3's mechanical radius in its first season, so the trunk became the sum of shed branches' mechanical areas, independent of r0. Spec §R3 says stress wood is local and not passed on in the pipe sums: the scar carrying it was an inconsistency.

With the scar fixed, r0 sets H/D again. But mechanics then sets every twig's radius, so two M16 calibrations made under fat 2D-era pipes stopped holding:
- **Breakage.** Stress wood holds each branch near σ_target (3000); σ_break was 4500 (1.5×), and a storm loads a branch by 1 + 1.5·y/H (2.5× at the top). At k = 8 every storm broke 82–95% of the stand's metamers; heights swung between 30 and 75 and never levelled off.
- **Windthrow.** The throw chance's slenderness factor ramped from H/D 40, calling a normal stand at 78 two-thirds of the way to maximum risk. It never bit in 3D while H/D was 10. With crowns no longer breaking it threw 46 of 90 planted trees by 300.

## Decision
1. **A shed branch's scar is its pipe radius**, `radius − stressWood` (`c5.rs`, `remove_branches`: shedding, breakage, obstacle clearance).
2. **r0 ÷ 8 and m_w × 64**: world r0 0.02 → 0.0025, m_w 1 → 64; every species' and fixture's r0 ÷ 8 (four significant figures), m_w 64. R1's sapwood cost is m_w·π·r0²·Σ(path length to each live tip) at n = 2, so m_w·r0² keeps it. k = 8 is exact in binary: with R3 off the lone oak's production, maintenance, height and counts were bit-identical over 60 seasons, and its trunk ÷ 8.000. E, σ_target and ρ keep ADR 0011's physical units.
3. **σ_break 4500 → 7000** (≈ 2.3 × σ_target) in the forest presets and the fitted species. It acts as a safety factor on σ_target, not as a free number. Swept at 6000, 7000 and 8000 (`forest`, storms on, 3 seeds, 300 seasons):

   | σ_break | median share of the stand's metamers broken per storm | storms over 10% |
   |---|---|---|
   | 6000 | 38–61% | every one |
   | 7000 | 3.1–6.0% (max 28–40%) | 2–8 of 11–19 per seed |
   | 8000 | none broke | – |

   7000 is the trickle M16's visible test wants (a storm drops some limbs). Per storm at 7000 the median loss is 3–6% of the stand's metamers, the worst 10–40%. Storm severity is C5's calibration.
4. **Windthrow's slenderness ramp starts at H/D 80**, the top of §10's stand-grown band: `clamp((H/D − 80)/30, 0, 2)` (`r3.rs`, `slenderness_risk`), zero to 80, 1 at 110, 2 from 140. THROW stays 0.06 (M16). This brings the code to §10; the spec does not change.

## Evidence (20 seeds, 300 seasons, τ 0; [the note](../experiments/2026-10-30-c1-round3-form.md), step 5)
Each measure is read at the season where it measures what it names (decided with the user, 2026-10-30):

| measure | criterion | passing |
|---|---|---|
| floor | at 100 in 2–10% (median 7.9%) | 20 of 20 |
| stand H/D | at 300 in 60–80 (median 70.6) | 19 of 20 |
| crown base | stand `leafCrownRatio` below the lone tree's at 150 and 300 | 20 of 20 |
| plateau | same trees' median gain over 250–300 < 2 cells, tallest < 180 | 17 of 20 |

- **Why the floor is read at 100.** The stand closes by 100, then opens at O4's background rate with no regeneration at τ 0, so from 150 on the floor measures ageing (at 150: median 10.4%, 8 of 20 in the band). A floor that holds to 300 needs regeneration under the canopy: C5's.
- **Why H/D is read at 300.** The trunk thickens after height levels off: 82 at 150, 70 at 300.
- **Why the plateau is read on the same trees.** The stand median's gain (13 of 20) rises as short trees die, which measures composition, not growth. Trees climbing ≥ 10 cells beside gaps (0–3 a seed) are release.

## Consequences
- **`forest` at 300 seasons** (k = 8, σ_break 7000, 3 seeds): stand H/D 70 at τ 0.2 and τ 0; height levels off at 77 (gain −0.1 and +1.1 cells over 250–300); windthrow 2 and 0 of 90 planted trees. With storms off: H/D 78 and 73, height 81–83.
- **The stand's own lone tree** (`forest`'s params, open sides, O4 off): H/D 40–42 at 300 (open-grown 48 ± 8 in the species review); height levels off at 87–89.
- **`oakOpen`'s top is the woods' (200)**: at 120 the fitted oak was clipped flat. It is still pinned at 200 by season 150, which is track 3's re-fit.
- **Metamers:** `forest` 68k per seed at 300 (τ 0.2), against 105k before. Crowns are sparser with thin twigs, and the picture changes.
- **The mixed wood** (3 seeds, 300 seasons): windthrow takes 11% of planted trees, nine of them birch at a median H/D of 128. Reported, not limited: the species' heights are track 3's re-fit.
- **The species' r0** are the 2D fits ÷ 8, pending the 3D re-fit (track 3). `analysis/experiments/m27_adopt.py` applies this ADR's scale and σ_break, but regenerating `flora-fitted.ts` also brings unrelated drift (phyllotaxis generators, E), so the file was edited by hand.
- **Goldens** changed: every case for the rescale (radius is in the hashed tables), then `forest` for σ_break.
- **Revisit** if R3's storm load changes (O2), or if a species' fitted r0 puts its stand H/D outside 60–80.
