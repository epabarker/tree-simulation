# Status

_Last updated: 2026-11-07, day-3 step 2 implemented; PR awaiting the user's merge into `3d-port`._

**Live:** garden **0.16.0** on edbarker.dev (garden-v0.16.0); 0.17.0 is unreleased.
**Direction:** trees look like trees and their species; data choose species. A look is never biological validation.

## Day 3
- All eight [rulings](plans/2026-11-07-day3.md) approved. #64 and step-1 #65 merged; #52 closed.
- Step 2: `codex/day3-checkpoints`, based on merged `3d-port` 8995f73; gates registered at 7c66114 before runs.
- G-forest crown v2 is now authoritative by default; explicit v1 and both raw counts remain. No B1 exists yet.
- Checkpoint v3 (ADR 0059) persists per-metamer deficit streaks, including the worker's freeing swap.
- Existing v1 planar and v2 readers remain; their missing history starts at zero. Frozen pre-change v2 fixture retained.
- Holly's unread keys removed; 20/20 hashes identical (bar 20/20). Generator preserves deletion; goldens unchanged.
- Checks: 170 Python tests pass; named regressions unchanged; full stamped check recorded in devlog/PR.
- Maintained G-forest/DAG/sweep/E3 tools: [usage](../analysis/treesim/INSTRUMENTS.md).
- Step-1 cleanup archive: `runs/day3-step1/sheet.patch` and inventory. Keep `.claude/worktrees/b0` through B1.
- Unrelated sibling worktrees retained; detached sibling oak lacks remote coverage.

## Next, serially (the user merges each PR)
1. Merge step 2, then step 3: beech lifespan off, ADR 0044 amendment, N1 gates; record interim B0 hd300 miss.
2. Step 4: register B1 ADR, measure at recruits 0.25; B0-at-quarter composition control.
3. Step 5: N3 oak DAG and fresh gates, then user's fan-versus-spire decision.
4. Step 6: layered wood and E2, then user's adoption decision.
5. Step 7: RC budget smoke, notes and user phone soak.

**After RC (step 8):** beech first with a fresh instrument registration; full gated sycamore and ash adoption
in the canopy rotation at unchanged density. Self-pruning only if the wood is rejected.

## Rules and gotchas
- Register gates/knob cards before runs; foreground `npm run check:stamp` before every commit.
- Check DAG gates and sweep sign/size before tuning; ≥20 seeds per effect claim, fresh held-out seeds.
- Behaviour changes need regressions; intended golden changes need devlog reasons. Memory: fresh process per run.
- At most 12 simulations concurrently; bulky output in `runs/`. E3 remains explicit/on-demand.
- State hashes exclude deficit counters: checkpoint tests compare full saved state and future shedding too.
- No agent merges, tags, site-main pushes or `preview-3d` merge. Every next step waits for the user's merge.
