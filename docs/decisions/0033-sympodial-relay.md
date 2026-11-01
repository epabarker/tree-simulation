# 0033: The sympodial relay: laterals under an ended leader take the trunk's level

- **Status:** proposed (track B, 2026-11-01). Off by default; no golden, preset or species changes.
- **Date:** 2026-11-01
- **Related:** spec §R2.4 ("Sympodial: terminal bud terminates with p_term(pa); distal laterals take over"), §R4.4 (the per-axis shift), §9 (beech, Troll); ADR 0009 (the pa table), ADR 0012 (R4's shift), ADR 0029 (form by hand), ADR 0031 (the flat top: "the fix is R2's reiteration").
- **Sheet:** `docs/experiments/figures/2026-11-01-atlas-relay-{60,100}.png`, from `uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py relay`.

## Context
R2 lets a terminal bud end (p_term per level), but the spec's second half, "distal laterals take over", was never built: a lateral under an ended apex stays one level younger than the axis it replaces, so an ended trunk becomes a table of limbs, and the leader can only lapse by λ falling (dLambda). ADR 0031 placed the flat top in growth and named Troll's reiteration as the fix. Botanically, the crown of an old broadleaf is built by repeated relays: the leader's module ends (by flowering, abortion or loss of apical control) and one or more of the distal laterals become orthotropic and take its place, so the crown becomes several co-dominant ascending limbs, each repeating the trunk's architecture (Hallé et al. 1978 for Troll's and Leeuwenberg's sympodial models; Barthélémy & Caraglio 2007 for sequential reiteration). In beech and oak the dome of the mature crown is a set of such reiterated complexes, not one axis.

## Decision (proposed)
1. **The relay** (`r2.relay`, a count; 0 or absent is the ablation): when the terminal bud of a pa-0 axis has ended, the lateral buds on the top `relay` nodes below the ended apex grow as pa 0. Their shoots take the trunk's row (λ, set point, η, generator, p_term) and pass it to their subtree through R4's per-axis `paShift`; with R4's juvenile shift as well, the shoot takes the younger. Only the trunk's level relays.
2. **The leader ends with age** (`r2.relayAge`, `r2.relayPTerm`): from tree age `relayAge` a pa-0 terminal ends with probability max(row p_term, `relayPTerm`), drawn from the existing sympodial-termination purpose (no new RNG purpose). Each relay is pa 0, so it may end and relay in turn.
3. **No new column.** Which buds are relays is read at the start of each season's growth from the ended (TERMINATED) main buds that already persist in the bud table: one reverse pass gives each metamer its depth below an ended apex on its own axis. The checkpoint layout and the state hash are unchanged.

## What the sheet shows (seed 1; the user judges)
- **Beech:** the relays split the leader early (fork 0.93 → 0.25 at 60) but, at pa 0, ascend side by side: at 100 a multi-stemmed column against the woods' top (W/H 0.44–0.55, H ≈ 205). At 60 `relayPTerm` 0.6–1 broadens and rounds the top (W/H 0.72–0.80, H 125–129), the nearest thing to a dome the model has made; by 100 it is a column of stems. The relays do not arch: nothing in the model bends an ascending pa-0 axis over, which is rule 2 (curvature along the limb), next.
- **Oak:** almost no change. Oak's leader already lapses by dLambda (fork 0.04–0.34), so few pa-0 apices are left to relay.
- **Birch:** a fuller, slightly broader crown with a lower fork (0.45–0.56) at the centre. `relayPTerm` 1 makes a tall spike at the top (H 169 → 203 at 100). **It is the relay working, not a bug.** The leader's path through the top 30 cells is a chain of relays of orders 40 to 52, a new pa-0 axis each season, kept vertical by level 0's set point 0. With the rule off, the monopodial leader through the same cells is order 0 and stalls (birch's "stops growing after 60", STATUS). A leader renewed every season by its most-lit lateral keeps the height growth the old leader loses. What the user sees is a straight sympodial leader, Leeuwenberg-like but with one winner.

## Consequences
- **A limit to fix before adoption:** branching order is stored as a u8 (the checkpoint layout), and every relay is one order higher than the axis it replaces. A leader that relays every season (`relayPTerm` near 1) passes order 255 after about 255 seasons, and `order − paShift` then wraps. The lone and stand trials stop at 100, but `forest` runs to 300. Adoption needs either a cap on the relay's order or pa stored without order (a checkpoint version).
- `rust/core/src/principles/c1.rs` changes by one argument: `form_terminal_bud` passes the tree's age to `r2::terminates`.
- At adoption, whoever adopts updates `docs/architecture.md`'s season-loop mapping, the ROADMAP tracing row, STATUS and the lab panel (`src/web/ui/panel.ts`); a proposal leaves them alone.
- The vocabulary gains co-dominant ascending stems. A dome needs them to arch outward as well (rule 2), so the relay is judged again with curvature on.
- If accepted, `relay`, `relayAge` and `relayPTerm` join the form knobs of ADR 0029 per species, re-authored from the atlas; physiology is re-fitted under them (track D).
