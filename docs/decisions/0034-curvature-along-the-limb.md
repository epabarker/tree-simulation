# 0034: Curvature along the limb: a set point that changes with the node

- **Status:** accepted for beech and maple, the species that use it, in `docs/experiments/code/2026-11-01-atlas/picks.toml` (the user, 2026-11-01); off by default; adoption into the species patches is track D's at the next fit.
- **Date:** 2026-11-01
- **Related:** spec §C4.4 (t(A_set) per physiological age), §R3.4 (posture set point per pa), §R2; ADR 0009, ADR 0011 (posture), ADR 0029 (form by hand), ADR 0033 (the relay). Track A's identity card (`docs/research/2026-11-01-species-identity.md`, on `claude/research`) ranks this the first missing feature at 20 m: birch's arch, beech's fan-and-arch, oak's spread, hornbeam's bow.
- **Sheet:** `docs/experiments/figures/2026-11-01-atlas-curve-{60,100}.png`, from `uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py curve`.

## Context
A level has one growth set point (C4) and one posture set point (R3), so every limb of a level holds one angle along its whole length; the only bend is R3's sag under load. The form sweep found set point, posture and η move a limb's elevation but not the outline (`2026-10-31-form-sweep-review.md`). Trees whose limbs rise and then arch over, or level out and sweep up, carry an angle that changes along the limb: Weber & Penn (1995) give each level `nCurve`, the angle a stem turns over its length (and `nCurveBack` for an S). Botanically the arch is a gradient of gravitropic set point along the axis (the GSA of older, more distal parts differs; Roychoudhry et al. 2013) together with reaction-wood posture that holds it (Alméras & Fournier 2009).

## Decision
1. **Per level, `curve` (degrees) and `curveLength` (nodes, default 20):** at node k of an axis (its `axisNode`) the level's set points are moved by curve·min(1, k/curveLength), clamped to 0–180°. Positive arches a limb out and down; negative sweeps it up. Absent or 0 is the ablation.
2. **Both set points move:** C4's growth direction for new metamers and R3's posture target for old wood. If only growth moved, posture would straighten the arch back to the level's one angle within a few seasons.
3. **The trunk (order 0) is exempt;** every other axis curves by its level, including a relay at pa 0 (ADR 0033), so relays can ascend and then arch.
4. `nCurveBack` (an S-bend) is left out until a sheet asks for it.

## What the sheet shows (seed 1; the user judges)
- **Beech:** `levels.1.curve` lowers the limbs (elevation 60° at −30 to 36° at 60) without changing the outline: a cone at 60 and a column against the 200 ceiling at 100. With the relay on, `levels.0.curve` 40–60 broadens the top at 60 (W/H 0.64 → 0.74, H 147 → 127), the roundest beech so far. At 90 the top is flagged to one side. By 100 the ceiling again dominates.
- **Oak:** the limbs' outer ends arch down. `curve` 60, or `curveLength` 10–20, gives a fringe of hanging limb tips at the crown's sides (elevation 31° → 5–13°). The vase stays a vase.
- **Birch:** level limbs and a broader skirt at 60 (W/H 0.73 → 0.85 at curve 30). At 100 a conifer-like cone with drooping lower limbs. The pendulous look belongs to the twigs (rule 3), not the limbs.

## Consequences
- The vocabulary gains the arch at the limb's end. It does not on its own turn a cone or a vase into a dome. Beech's dome needs the relay plus `levels.0.curve`, under a lower height than the woods' top.
- If accepted, `curve` and `curveLength` per level join the form knobs (ADR 0029).
- At adoption, whoever adopts updates `docs/architecture.md`'s season-loop mapping, the ROADMAP tracing row, STATUS and the lab panel (`src/web/ui/panel.ts`); a proposal leaves them alone.
