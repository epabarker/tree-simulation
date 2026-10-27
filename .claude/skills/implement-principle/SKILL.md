---
name: implement-principle
description: Checklist for adding or changing a simulation principle (C1–C6, R1–R6, O1–O4) of the tree simulation so that it matches docs/spec.md, stays switchable for ablations, is deterministic and tested, and is visible on the page. Use whenever new growth behaviour is implemented.
---

# Implement a principle

Replace `X` with the principle id (e.g. `C2`).

1. **Read the spec.** Read the principle's section in `docs/spec.md`: the rule (item 4), the 2D translation (5), the params (6), the module boundary (8) and the cost (11). Also read the matching §7 milestone row and the §8 ablation. Note anything ambiguous and ask the user rather than guess. Agreed divergences get an ADR.
2. **Params** (`src/core/params.ts`). Add a `cX` section (or extend it):
   - names follow the spec's symbols;
   - each has a JSDoc giving its meaning, source and range;
   - defaults have a source, or are marked `calibrate` and listed in ROADMAP.
   - Add an `enabled` flag, or a `mode` whose "off" value is the §8 ablation.
   - Keep everything plain JSON.
3. **Randomness.** Any new draw uses `rng.ts`. Register a `Purpose` (the next unused number; never renumber), and key it by stable ids and season, never array indices.
4. **Code.** Write `src/core/principles/cX-<name>.ts` (or `light/` for C2-like models):
   - The header cites §X, states the rule in one paragraph and lists the params.
   - Use plain loops over typed arrays: reverse loops for basipetal passes, forward loops for acropetal.
   - Respect the invariants in AGENTS.md: append-only rows, compact plus remap, and loop bounds fixed at the start of each phase.
5. **Season loop.** Call it from `src/core/season.ts` in the §6 phase where it belongs, and update the mapping table in `docs/architecture.md`.
6. **Tests.**
   - A unit test of the local rule on a hand-built case (`src/core/**/*.test.ts`).
   - The milestone's visible test as an automated check where possible, e.g. a comparison across a few seeds.
   - Add a preset that shows it, and a golden case in `tests/golden-cases.ts`. Then run `npm run golden:update` and note the reason in the devlog.
7. **Page.**
   - Add the params to `SECTIONS` in `src/web/ui/panel.ts`, with a toggle if the principle is switchable.
   - Add a colour mode or overlay if §8 lists a diagnostic for it.
   - Expose any new per-metamer field through `snapshot.ts`.
8. **CLI and analysis.** If there are new metrics, add them to `METRIC_COLUMNS`. Add an `analysis/experiments/` script if the milestone has an analysis check.
9. **Docs.** Update the ROADMAP tracing row, then use `/wrap-up`.
