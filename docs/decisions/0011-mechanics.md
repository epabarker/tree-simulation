# 0011: Mechanics (R3): sag from the load increment, posture set-points, local stress wood

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** §R3, §6 (GIRTH, MECHANICS), §7 M9, §8 (R3 ablations), §9 (willow, beech), §10 (junction rule)

## Context
§R3.4 gives the rule as: moments from a basipetal pass, κ_e = M/(E·πr⁴/4), "permanent set θ += φ·κ_e·l", posture Δθ = clamp(−β_g sin(A − A_set) − γκ, ±c·Δr/r), optional breakage and stress-driven girth Δr ∝ max(0, σ/σ_target − 1). Building it raised four questions the spec leaves open.

1. **Creep or increment.** Applied each season to the whole load, θ += φ·κ_e·l is a creep law. On `skyTree` it keeps lowering limbs after growth slows (R1's plateau): they hang like a willow's by season 80, and trees collapse (height 37 instead of 70 at season 60, 13 by season 100; [M9 note](../experiments/2026-10-27-m9-mechanics.md)). In Fournier's growth-ring model, which Jirasek et al. (2000) put into L-systems and Alméras & Fournier (2009) analyse, new wood is laid down on the bent stem and locks the deflection in. So only the elastic response to the load *added* since last season becomes permanent, and a stem whose load stops growing stops bending.
2. **Posture set-point.** §R3 reuses C4's A_set. Without R2 that is 0° (vertical) for every axis, and §9's Troll model needs the trunk to *grow* plagiotropic but *straighten* to vertical.
3. **Where stress wood goes.** If stress-driven girth simply adds to the radius, C6 passes it down the pipe sums, so every junction keeps Δ = n. Minamino & Tateno (2014) find Δ > 2 at heavy, wide-angled laterals because their bases thicken locally.
4. **Breakage.** §R3.4 makes it optional and sends broken branches to R4 release, which does not exist yet (M10).

## Decision
- **Sag from the load increment** (user, 2026-10-27): Δθ = −φ·(M − M_prev)/(E·πr⁴/4)·l, with M_prev the moment stored after last season's pass (a `moment` column). A limb that loses load (a shed sub-branch) springs back up. The spec's creep law stays as `r3.sag: "creep"`. φ defaults to 1, since the new ring locks the whole increment. A single-season sag is capped at 0.2 rad per metamer (`MAX_SAG`) so a light, thin tip cannot flip over in one step.
- **Posture set-point** = the growth set-point (C4's A_set, or the R2 row's), unless the R2 row sets `postureSetPoint` (degrees from vertical, on the side the axis heads). The Troll trunk grows at 70° and sets to 0°. The weeping limbs grow at 50° and set to 140°, and the twigs to 175°.
- **Posture** follows Bastien et al. (2013)'s AC model. Every metamer senses at once from the start-of-pass geometry, so gravitropism alone can overshoot. The turn is −β_g·sin(A − A_set) − γ·kink, where kink is the angle to the previous metamer of the same axis (γκ·l), clamped to ±c·Δr/r. Δr/r is measured from before this season's girth pass, so a metamer that did not thicken cannot correct. `r3.posture: false` is the §8 ablation (sag without posture).
- **Stress-driven girth** is local: Δr = gain·r·(σ/σ_target − 1) with σ = 4|M|/(πr³), capped where σ = σ_target. It is stored in a `stressWood` column. C6 sums and remembers only the pipe radius r − stressWood, so reinforced junctions get Δ > n. Stress wood is not charged as sapwood in R1.
- **Order in §6:** after C5 shedding, C6 records the pre-girth radius. Then come C6 girth, then R3 (moments, stress wood, sag and posture), then bud commit. New wood thus both stiffens and pays for posture (§6 rule 2).
- **Units.** Weights are cells³ of wood (ρ_w = 1), so E and σ are in units of ρ_w·g·cell ≈ 2.5 kPa. Wood's real E ≈ 4·10⁶ in these units. The calibrated E = 10⁶ is lower because a 2D limb carries less foliage than the 3D limb it stands for. σ_target 3000 ≈ 7.5 MPa.
- **Breakage is deferred** to M10, where R4 can release buds near the break.
- **Presets.** The sky presets enable R3. Two demonstration presets, `weeping` (willow-like) and `troll` (beech-like), show the §9 forms. They are not calibrated species: ADR 0009 keeps willow, beech and oak for after the main milestones.
- **Hashes.** `stressWood` and `moment` are hashed only when non-zero (`hash.ts`), so R3 off reproduces every earlier golden exactly.

## Consequences
- Girth is now causal twice over: through R1's costs and through stiffness and posture.
- Geometry changes after growth, so the light field sees sagged limbs. They can sink below the ground; their buds then get no light and are shed.
- Slender, excurrent trees with low E can buckle (the trunk bends further under its own crown each season). The weeping preset uses E = 2·10⁶, thicker tips (r0 0.03) and faster reaction wood (c 0.3).
- Δ falls below 2 where a parent axis gets stress wood and its laterals do not (visible in the Troll preset's histogram).
- Revisit if wind loads (O2) arrive, since they dominate real stem design, or if breakage is needed for gap dynamics before M10.
