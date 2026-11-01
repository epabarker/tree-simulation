# 0037: Elbows: a limb relays its own ended axis

- **Status:** proposed (track B, 2026-11-01). Off by default; no golden, preset or species changes. Oak holds at today's form until the elbows persist (the user, 2026-11-01).
- **Date:** 2026-11-01
- **Related:** spec §R2.4 (p_term, "distal laterals take over"); ADR 0033 (the relay, which this generalises past the trunk), ADR 0029. Track A's identity card (`claude/research`) ranks oak's elbowed sinuosity fourth among the missing features: "a subapical takeover at a lost tip, not random noise".
- **Sheet:** `docs/experiments/figures/2026-11-01-atlas-elbows-{60,100}.png`, from `uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py elbows`.

## Context
An oak limb is sinuous and elbowed because its tips are lost often (to frost, insects, flowering or abortion), and a bud just below takes over, setting off from its own angle. In the model a limb's terminal can end (its row's p_term), but only the trunk relays (ADR 0033). An ended limb leaves its laterals as twigs, one level younger, and the limb stops instead of kinking on. C4's noise (ε, σ) wanders but does not kink.

## Decision (proposed)
1. **`levels[i].relay`:** when an axis of level i ends, the laterals on its top `relay` nodes continue it at level i (paShift = the bud's order − i). Each starts at the angle its bud left at, level i+1's branch angle, so the limb kinks at every takeover; level i's tropism then carries it on. For level 0 the level's own `relay` overrides `r2.relay`. Absent is the ablation for levels ≥ 1.
2. **The frequency of elbows is the level's existing `pTerm`;** their sharpness is the next level's `branchAngle`. No new RNG purpose, no new column (ADR 0033's depth pass already finds every ended apex).

## What the sheet shows (seed 1, centre levels.1 pTerm 0.3, relay 1; the user judges)
- **The kinks do not read at the atlas's scale.** A takeover's kink is one internode, and the limb's set point straightens it again within a few. What does show is the crown's habit.
- **Oak:** a high limb `pTerm` (0.6–1) makes a narrower, denser crown of steeper limbs (W/H 1.10 → 0.74–0.84 at 100, fork 0.04 → 0.23–0.30). It is not the broad, heavy-limbed oak; the kinks may need a weaker tropism on the relays to persist.
- **Birch:** `pTerm` 1 gives a wandering, sinuous top (H 169 → 197), the one cell where the zig-zag reads.
- **Beech:** little change, except `levels.2.branchAngle` 20–35, which leans or throws the whole tree: seed-1 realisations, judged as noise until more seeds are drawn.

## Consequences
- The mechanism is in place; making the elbows visible probably needs the relay to keep its kink, for example a lower η on a relay's first shoot, or a relay that takes the next level's set point for its first season. That is the follow-up before oak takes this rule (the user, 2026-11-01: oak holds at today's form until the elbows persist). A relay of a limb keeps the limb's order (ADR 0033, fix A).
- At adoption, whoever adopts updates `docs/architecture.md`'s season-loop mapping, the ROADMAP tracing row, STATUS and the lab panel (`src/web/ui/panel.ts`); a proposal leaves them alone.
