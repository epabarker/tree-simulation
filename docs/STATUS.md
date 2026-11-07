# Status

_Last updated: 2026-11-07, day-3 step 1 implemented; PR awaiting the user's merge into `3d-port`._

**Live:** garden **0.16.0** on edbarker.dev (garden-v0.16.0). The 0.17.0 changes remain unreleased.
**Direction:** trees look like trees and their species; data choose species. Looks are never biological validation.

## Day 3: durable instruments first
- The user approved all eight [rulings](plans/2026-11-07-day3.md); #64 merged, #52 closed.
- Step 1: `codex/day3-instruments`, based on merged `3d-port` 1272203. Gates committed before runs (4c0be28).
- Maintained G-forest/DAG/sweep/E3 tools: [usage](../analysis/treesim/INSTRUMENTS.md).
- G-forest verdict uses exactly four checks. All-tree H/D is diagnostic; budget is separate.
- Crown v1 remains the default until step 2; `--crown-version 2` is available. No B1 exists yet.
- DAG dumps actual garden stand and lone params, with provenance; lexical coverage guard added.
- E3 preparation enumerated 179 perturbations × 2 contexts × 20 seeds; **no E3 simulations run**.
- Six named stale worktrees removed after remote/cleanliness audit; sheet diff archived in `runs/day3-step1/sheet.patch`.
- Keep `.claude/worktrees/b0` until B1. Unrelated sibling worktrees retained; detached sibling oak lacks remote coverage.
- Simulation source, presets and goldens unchanged. Step 1 changes tools and docs only.

## Next, serially (the user merges each PR)
1. Merge step 1, then step 2: crown v2 authoritative; checkpoint v3 with v1/v2 readers; remove holly's dead keys.
2. Step 3: beech lifespan off, ADR 0044 amendment, registered N1 gates; record interim B0 hd300 miss honestly.
3. Step 4: register B1 ADR, measure at recruits 0.25; B0-at-quarter composition control.
4. Step 5: N3 oak DAG and fresh gates, then user's fan-versus-spire look decision.
5. Step 6: layered wood and E2, then user's adoption decision; step 7 RC and user phone soak.

**After RC (step 8):** beech first, re-register its superseded instrument; full gated sycamore and ash adoption,
adding them to the canopy rotation at unchanged planting density. Self-pruning only if the wood is rejected.

## Rules and gotchas
- Register gates and knob cards before runs; foreground `npm run check:stamp` before every commit.
- DAG dead-lever check and sweep sign/size before tuning; ≥20 seeds per effect claim; fresh held-out seeds.
- Behaviour changes require regressions; intentional golden updates need devlog reasons. Memory: fresh process per run.
- At most 12 simulations at once; bulky output in `runs/`. E3 is explicit/on-demand, never a normal check.
- No merges, tags, site-main pushes or `preview-3d` merge by the agent. Each next step waits for the user's merge.
