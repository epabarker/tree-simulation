# Status

_Last updated: 2026-11-08; day-3 step6 complete, PR awaiting user merge._

**Live:** garden0.16.0;0.17.0 remains unreleased. Looks are not biological validation.

## Day3
- Steps1–5 (#65–#69) merged by user; current oak retained by user's look choice.
- Step6: codex/day3-layered-wood, base0ec8d6d; gates8319306; fixed A6b not adopted.
- Current garden planting remains unchanged; ADR0058 stays proposed/off by default.
- Beech crown gate2/6 eligible seeds vs≥5; hornbeam4/18 vs≥14: both FAIL.
- Height-complete denominators give the same failures; missing-beech snapshot retained/reported.
- Legacy LAI medians11.663/11.821 at100/150 vs5–9: FAIL; leaf units unverified as m²/m².
- Beech survival27/40 reproduces N1; examined seeds, not independent held-out validation.
- Floor10018/20 in2–10%,15020/20; this does not override crown/LAI failures.
- G-forest18/1/19/11 vs frozen B1 bars−2/−2/12/10 PASS; first two constraints vacuous.
- Metamer20024,476.5/66,923=.365741×≤1.25×; separate from four-check verdict.
- Birch gate19/20≥15; all19passes have no qualifying recruits. Sole tall recruit H/D193.03>120.
- Six fresh candidate worker-swap cases<230MB, max121.176; restored/specimen hashes all match.
- Six current references reused after model/WASM/protocol/parameter identity checks.
- All8species×20 lone-input pairs identical160/160; no new lone-outcome trial claim.
- E2 all9×20=180stands complete: no clean opposite-sign floor response at±10%.
- Floor median shifts+.00170–.00687 vs base spread.05750; beech survival27–28/40.
- All probes change20/20hashes: live/noisy, not dead. No variant selected or adopted.
- Batch cost30.24wallmin/5.25waited-childCPUh; scope excludes views/budget/controller analysis CPU.
- 24view worlds; laptop/phone sheets at100/150.187 analysis tests, stamped check/build green.
- Shipping regressions unchanged; candidate phone case does not improve canopy150. No goldens changed.

## Next, serially, user merges each PR
1. User merges step6 PR; then step7 RC uses the unchanged current garden.
2. Step7: fresh-process budget, release notes/sheets and user's real-phone soak; no tag/deploy.
3. Step8: beech held-out programme, then gated sycamore/ash adoption at unchanged density.
4. Post-box self-pruning: diagnose existing live levers; new mechanism requires measured mismatch/approved ADR.

## Gotchas
- Frozen baseline analysis/treesim/baselines/B1-v2.json; results docs/experiments/2026-11-07-day3-step6.md.
- Raw runs/day3-step6; candidate/current source hashes43/43 match; exact binary cache keys include unused species.
- Step5 cache explanation corrected: binary digest stayed the same; full N3 parameter JSON caused misses.
- Commit gates/cards before runs; DAG/sweep before tuning; effects≥20seeds; check:stamp before commits.
- No agent merge/tag/deploy/site-main push; never merge preview-3d. Step7 waits for user merge.
