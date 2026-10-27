# 0012: Dormancy and release (R4) with a bud bank and a light trigger; shade avoidance (R5)

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** §R4, §R5, §R3.4 (breakage), §6 (BUD_FATE), §7 M10, §8 (R4 ablation)

## Context
§R4.4 gives the rule: "age++; abort if age > L_dorm; break if v ≥ v_break(1 + δ·age); continue if v ≥ v_cont < v_break; released buds get juvenile pa". Built as written, it gives no epicormic flush after a neighbour is felled (§7 M10). Two reasons, both measured on `skyStand` at season 50 ([M10 note](../experiments/2026-10-27-m10-release-shade.md)):

1. **No buds on old wood.** Each node holds one lateral bud. Once that bud has grown into a branch and the branch has been shed, the node is empty, so a stand tree's bare bole carries 0–2 dormant buds.
2. **Borchert–Honda starves single low buds.** After felling, light on a neighbour's bole rises from ≈ 0.03 to 0.10–0.20 of open sky. But BH gives a lone trunk bud a share of the flow in proportion to its light against the whole crown above it (≈ 0.3%), so its v stays ≤ 0.4, even without R1's costs. Dormant buds never break, felled neighbour or not.

Real epicormic shoots come from dormant and accessory buds at branch bases that persist in the bark, and they sprout when the stem is exposed to light (Meier, Saunders & Michler 2012, a review of epicormic bud formation and release). Bud release has two stages: a trigger (sugar or light/R:FR signalling), then sustained growth (Cao et al. 2023; Schneider et al. 2019).

## Decision
- **Bud bank** (user, 2026-10-27): with R4 on, a branch shed by C5/R1 or broken by R3 leaves a dormant bud in the slot it vacated, pointing along the slot's default direction (`r4.bank`, on by default).
- **Two release routes** for a dormant bud (user):
  - the spec's sugar route, BH v ≥ v_break·(1 + δ·age)·(1 + δ_b·s), with δ_b and s from R5;
  - a light trigger, Q ≥ Q_rel·(1 + δ·age).

  A light-released bud grows one metamer, paid as one unit from the R1 reserve (free without R1). A tree with an empty reserve cannot sprout. From then on BH feeds the new shoot, which continues while v ≥ v_cont. R5's δ_b does not scale the light trigger, because the trigger is itself the light signal.
- **Active buds and short shoots** (R6) continue at v_cont; only dormant buds use the release routes. With v_cont = 1 and R4 off, the threshold is C3's one-metamer rule (ADR 0004), so the change is invisible when R4 is off.
- **Lifespan:** a dormant bud older than L_dorm is removed. It is set `gone` rather than `aborted`, so the table does not grow.
- **Reiteration:** a released bud's shoot takes the physiological age of an axis `juvenile` levels younger. This is stored as a metamer column `paShift`, inherited by the subtree, with pa = min(order − paShift, levels − 1); it never drops below pa 0. Every R2 lookup (λ, generator, β, p_term, A_set, η, R3's posture set-point) uses order − paShift. This answers ADR 0009's "a branch that regains trunk character needs a stored pa".
- **R5** uses s = 1 − Q/C from the start-of-season light field, at each bud for elongation and set-point, and at each metamer's tip for λ. The far-red field is not built.
- **R3 breakage** (σ > σ_break, deferred from ADR 0011) is built, but stays off: stress-driven girth holds σ at or below σ_target, so no break occurred at any σ_break from 4000 upwards. Wind loads (O2) would be needed.
- **Presets:** the sky presets enable R4 and R5 (Q_rel 0.1, v_break 2, v_cont 1, δ 0.02, L_dorm 40, juvenile 1; e_s 0.1, δλ 0.02, δ_b 1, δ_A 0.5). The species presets stay pre-R1 to pre-R5.
- **Hashes:** `paShift` joins `hash.ts`'s late columns, so R4 and R5 off reproduce every M9 golden.

## Consequences
- The flush is emergent from local rules. A felled tree's neighbours sprout from their boles (64 trunk shoots against 22 in the kept stand, 5 seeds). Without the bank, or with the sugar route alone, they never do.
- Background release continues inside crowns (≈ 2.7 dormant buds per tree per season), and bank buds just under the crown base sprout and are shed again.
- R5's leader bias raises heights. The open-grown `skyTree` reaches its 100-cell ceiling by season ≈ 100.
- The light trigger and the reserve payment go beyond §R4.4. The spec is amended.
- Revisit if wind (O2) makes breakage matter, or if a far-red field (§R5 optional) is needed to separate neighbour shade from self-shade.
