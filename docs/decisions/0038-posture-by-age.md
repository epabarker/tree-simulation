# 0038: Posture by age: a level's set point moves with the wood's age or the tree's

- **Status:** accepted for beech/birch as authored in `docs/experiments/code/2026-11-01-atlas/picks.toml` (the user, 2026-11-01); off by default; adoption into the species patches is track D's at the next fit.
- **Date:** 2026-11-01
- **Related:** spec §R2.4 (ontogeny: today only λ ages, by a_c and Δλ), §R3.4 (the posture set point per pa), §C4.4; ADR 0009, ADR 0011, ADR 0029, ADR 0034 (curvature, by position along the limb rather than by age). Track A's simulator survey (`docs/research/2026-11-01-simulators.md` on `claude/research`) ranks a phase change at maturity (Makowski et al. 2019's mature parameters) and gravimorphism (TreeSketch's epitony and hypotony) for this track; its fir card adds limbs that go erect, then level, then descending with age.
- **Sheet:** `docs/experiments/figures/2026-11-01-atlas-aged-{60,100}.png`, from `uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py aged`.

## Context
A level's set point is fixed for life. Trees change posture with age in two ways the model cannot express. **Gravimorphism:** a limb that grows out ascending is lowered by its own ageing, through reaction wood that no longer holds it and through the set point itself (old fir and spruce limbs descend while their young tips turn up). **Phase change:** at maturity a tree's new axes change habit (Makowski et al. 2019 change set point, branching and termination at a size or age; the spec's R2 ages only λ). Both are a set point that changes with age; they differ in whose age.

## Decision
1. **Per level, `agedSetPoint` (degrees) and `agedOver` (seasons, default 50):** the level's set points (C4's growth and R3's posture) move from `setPoint` toward `agedSetPoint` by min(1, age/agedOver). Absent is the ablation.
2. **Whose age, `agedBy`:** "wood" (the default) is the metamer's own age, so posture alone acts and a limb's old base descends while its young tips stay at the level's angle. "tree" is the tree's age, so new growth changes too: a phase change.
3. **R2 holds the rule and R3 follows it,** as with curvature (ADR 0034): the offset is added where both read a level's set point. The trunk itself (order 0) is exempt.
4. Only the set point ages here. Makowski's generator and p_term at maturity are left for a sheet that asks for them (R2's `relayAge` already ends the leader by age, ADR 0033).

## What the sheet shows (seed 1, centre levels.1 agedSetPoint 100 over 40 seasons of wood age; the user judges)
- **The strongest form knob on any sheet.** Limb elevation moves across nearly its whole range (oak 69° → −27°, beech 59° → −18°), where the plain set point moved it ≈ 70° → 0° without changing the outline (the form-sweep review).
- **Birch:** 100–130 makes a fir-like cone at 100 (W/H 0.60 → 0.70): the lower limbs descend, and the upper ones are still young and erect. At 20 it is a narrow, upright, fastigiate crown (W/H 0.27).
- **Oak:** 20 makes a narrow upright broom (W/H 0.78). At 100–130 the old limbs descend and hang at the crown's sides.
- **Beech:** at 100 still a column against the ceiling; `agedOver` 10 lays the limbs level along the trunk (elevation 10°).
- **By the tree's age** ("tree age" row) the result is close to the wood-age row at 100, because by then every limb is old.

## Consequences
- With curvature (ADR 0034) a limb can be shaped by position along it and by age; together they are Weber–Penn's curve and the fir's descending limbs.
- If accepted, `agedSetPoint`, `agedOver` and `agedBy` per level join the form knobs (ADR 0029).
- At adoption, whoever adopts updates `docs/architecture.md`'s season-loop mapping, the ROADMAP tracing row, STATUS and the lab panel (`src/web/ui/panel.ts`); a proposal leaves them alone.
