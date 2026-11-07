# Status

_Last updated: 2026-11-07; day-3 step 3 implemented, PR awaiting user merge._

**Live:** garden 0.16.0; 0.17.0 remains unreleased.
**Direction:** species chosen by data; looks are not biological validation.

## Day 3
- Steps 1 (#65) and 2 (#66) merged; all eight rulings approved.
- Step 3: codex/day3-beech-lifespan, base 2c1a2cb; gates 8a04b10, transport correction 72d5ad5.
- Beech lifespan removed; R6 enabled, leaf/light settings, R4 dormancy and shedding unchanged (ADR 0060).
- Layered survival 27/40 vs control6/40 (bar≥20/40); lone H15042.622m and D1500.238928 pass.
- D is near its lower edge. Seeds1–20 are previously examined confirmation, not held-out validation.
- G-forest vs B0: 0/0/14/12 against bars0/1/13/9: **FAIL hd300**, the known interim miss.
- Floor at its limit; metamer budget0.954×≤1.25×. No B1 yet.
- Soft cbG remains low (.0422/.0350 at100/150); residual starvation-consistent death1/40.
- Initial40 native lone trials invalid (preset leaked periodic width); discarded and fully rerun via original WASM path.
- Checks:176 analysis tests; stamped Rust/static/103 Vitest tests green; build passes; regressions unchanged.
- Two intended beech goldens updated with devlog reason; historical prototype-off fixture pins its original age20.
- Checkpoint v3 retains v1/v2 readers; crown v2 default; holly dead keys removed (step2).

## Next, serially, user merges each PR
1. Merge step3; step4 register B1 ADR, measure B1, run B0 at recruits0.25 control.
2. Step5 oak N3: fresh gates and user sheet preference.
3. Step6 layered wood/E2: fixed gates then user adoption decision.
4. Step7 RC: fresh-process budget, notes and user phone soak.
5. Step8 beech held-out programme; gated sycamore/ash adoption at unchanged planting density.

## Gotchas
- Keep b0 worktree through B1. Full records: docs/experiments/2026-11-07-day3-step3.md.
- CLI params are patches: omitted optional fields do not clear inherited preset values.
- Before runs commit gates/cards; check DAG/sweep before tuning; ≥20 seeds per effect claim.
- Foreground check:stamp before commits; regressions after behaviour changes; intentional goldens need reasons.
- No agent merge/tag/deploy or site-main push; never merge preview-3d. Next step waits for user merge.
