# Status

_Last updated: 2026-11-07; day-3 step 4 implemented, PR awaiting user merge._

**Live:** garden 0.16.0; 0.17.0 remains unreleased.
**Direction:** species chosen by data; looks are not biological validation.

## Day 3
- Steps1–3 (#65–#67) merged by user; all eight rulings approved.
- Step4: codex/day3-b1-baseline, growth source a903d11; registration8487d61, ADR0061.
- Fresh B1: actual garden width160, recruits0.25, seeds1–20, 300 seasons, crown v2.
- Frozen counts floor100/hd300/crown_v2/plateau **0/0/14/12**; future bars **−2/−2/12/10**.
- First two relative constraints are vacuous; absolute floor/H-D failures remain, not validation.
- Versus old B0 bars0/1/13/9: still FAIL hd300; floor at its limit.
- All20 executed inputs match; all20 outcomes reproduce step3 (examined seeds, not held-out).
- B1 median metamers20066,923; candidate budget≤83,653.75 (1.25×), separate from verdict.
- Historical B0 quarter-cap control20/20: live300229→57, hornbeam share42.64%→20.35%.
- B1 hornbeam12.54%; later contrast includes other changes. Planted alive30037/120→34/120→36/120.
- B1 CPU4,347.572s; E2 nine-condition proxy10.869CPUh; layered cost remains unmeasured.
- 177 analysis tests and foreground check:stamp green. No engine/params/preset/golden changes.
- Beech N1 passes27/40 survival, H15042.622m, D150.238928 near lower edge; soft crown-base gap remains.
- Checkpoint v3 retains v1/v2 readers; crown v2 default; holly dead keys removed.

## Next, serially, user merges each PR
1. Merge step4; step5 oak N3: candidate DAG, fresh gates and user sheet preference.
2. Step6 layered wood/E2: registered gates then user adoption decision.
3. Step7 RC: fresh-process budget, notes and user phone soak.
4. Step8 beech held-out programme; gated sycamore/ash adoption at unchanged planting density.

## Gotchas
- Frozen reference: analysis/treesim/baselines/B1-v2.json; ADR0061; step4 experiment note.
- Historical b0 worktree retained; raw records runs/day3-step4; no tuning in this step.
- CLI params are patches: omitted optional fields do not clear inherited preset values.
- Before runs commit gates/cards; check DAG/sweep before tuning; ≥20 seeds per effect claim.
- Foreground check:stamp before commits; regressions after behaviour changes; intended goldens need reasons.
- No agent merge/tag/deploy or site-main push; never merge preview-3d. Next step waits for user merge.
