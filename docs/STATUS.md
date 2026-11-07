# Status

_Last updated: 2026-11-07; day-3 step5 complete; PR #69 awaiting user merge._

**Live:** garden0.16.0;0.17.0 unreleased. Looks are not biological validation.

## Day3
- Steps1–4 (#65–#68) merged by user; all eight rulings approved conditionally as recorded.
- Step5 branch codex/day3-oak-n3, basefe1c049; gates7e08e75; fixed T55p25, no tuning.
- User chose **retain current oak** on the fixed sheets; N3 is not adopted. This is a look decision.
- Fresh lone10001–10020: N3 D medians.219915/.174370 at100/150, bar.16–.59.
- Age150 D near lower edge; per-seed D coverage14/20 and11/20, not held-out descriptor validation.
- W/H.723886/.731511 in.55–.82; H33.024/33.184m≤42.9/48.4; all20 survive.
- Lone kink medians2.5/3.0≤3: age150 **at its limit**. Examined31–50 remains separate evidence.
- Garden150 kinks2.5≤4 among10/12 planted oaks,10/20 eligible seeds; current1.5, worst34 vs N3 6.
- G-forest vs B1:0/1/14/12 vs bars−2/−2/12/10 PASS; first two constraints remain vacuous.
- Separate metamers20063,852.5/66,923=.954119×≤1.25×. Absolute floor band still0/20.
- Corrected worker-swap memory12/12<230MB; N3 max224.920MB, current225.837MB; all restored hashes match.
- Two invalid coexistence readings retained; actual save-free/swap/restore protocol registeredb83eb59 before reruns.
- Specimen cost flags+21.8%/28.7% metamers on canonical seeds2/9; fresh20 lone median+18% at150.
- Phone garden timing+27.5% did not repeat (1.020×/.920×); no phone-soak/performance validation claim.
- Four fixed shared-scale sheets at100/150 leaf-on/off; all8 rendering repeat hashes match.
- 180 analysis tests, foreground stamped check green; named regressions unchanged; no goldens changed.

## Next, serially, user merges each PR
1. User merges step5 PR #69; then step6 starts with current oak.
2. Step6 layered wood/E2: registered gates, then user adoption decision.
3. Step7 RC: fresh-process budget, release notes and user's phone soak; no tag/deploy.
4. Step8 beech held-out programme; gated sycamore/ash adoption at unchanged density.

## Gotchas
- Fixed reference analysis/treesim/baselines/B1-v2.json (ADR0061); never fit/rebaseline to a candidate.
- Results docs/experiments/2026-11-07-day3-step5.md; raw records runs/day3-step5; b0 retained.
- Use worker intoCheckpoint/free before specimen; two live worlds mismeasure ADR0026's budget.
- CLI params are patches; missing optional keys do not clear inherited preset values.
- Commit gates/cards before runs; candidate DAG before tuning; effect claims≥20seeds.
- Foreground check:stamp before every commit; regressions after behaviour changes; intended goldens need reasons.
- No agent merge/tag/deploy/site-main push; never merge preview-3d. Step6 waits for user merge.
