# Status

_Last updated: 2026-11-16; overnight: #133 closed, #138/#137 probed, stubs built off, #134 screened._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Crown extent and girth (#129: #131 → #133 → #134 → #132 re-probe → #135, user 2026-11-13)
- #129's probe (PR #130, merged to 3d-port): every arm rejected; `c1.extentLimit` an off probe param.
- Decisions (user, 2026-11-13): the lone triad (W at DBH, W/H, H/D) a guard; the stand against
  Tallo the gate; wind in R3 (#133); refit form knobs before a rule (#134); understorey #132.
- #131 done: docs/experiments/2026-11-13-triad-reread.md; its §5 holds the bars #133/#134 cite.
  - Lone trees: two D's differ 0.5–1.9×; R3 grows inverted forks. Stand gate: only hornbeam
    passes (H4k8). Floor light 3–13% of open sky at HEAD: the flood is not a bright floor.
- ADR 0067 (user, 2026-11-13) settles #131's open points: W/H 0.6–1.2 at 100 (ADR 0041's 1.50 a
  panel check); lone D at 1.3 m, forks pooled; stand gate on the tip measure; #133's wind load
  drag on leaf + stem area × height, a moment that cannot cancel (stress wood and storms only).
- ADR 0068 (user): #132's signal is `topLight`, a ramp from θ_hi down to each species' survival
  light; the band counts stems ≥ 7 cm DBH; no cap bar (mortality can't clear it: #137, the bank).
  #138: δλ 0.40 passes on 20 seeds but floods stems ≥ 7 cm (852/ha): ADR 0071 deferred (PR #147).
## Feature playbook (spec #111, merged to 3d-port as #128)
- Garden: round 6 (r6), periodic depth, two-part demography; ADR 0065 targets reported, not gated.
- #124 held: d16a13 + crowd gate (`r2.dLambdaCrowd`, built, off; ADR 0069) cures the garden oak
  but fails bare bole at 66 cells. #126 bare-bole probe failed (repeat both if the stand changes).
- No 3D shipped forests (ADR 0046). Still fog: maple's length cap, C5/R1 shedding, d(L).
## Step8 (frozen by the map; no adoption, nothing deleted)
- Branch codex/day3-species-programme; beech retained, no sycamore/ash candidate qualified.
- Confirmation seeds 22021–22040/23021–23040 untouched. docs/experiments/2026-11-08-day3-step8.md.
## Next
1. #137 stubs built, off (`o4.stubs`, ADR 0072 proposed, PR #148): s3d cuts cap seasons 235 → 79.5
   (phone 186.5 → 11), 1.24× season cost. User: adopt s3d, or first a k-dark-seasons demotion.
2. #134 screen (PR #149, 5 seeds): only the leader's λ₀ moves W/H. Beech lam0+14 → 20-seed
   confirm + stand check; taller (≈39 m). Hornbeam: no knob fits W/H and H/D (user's call).
3. #138 re-probed with #132's ramp on #134's stand (per-species δλ first). Phone soak deferred.
## Gotchas
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
- Same-skeleton mw*r0² normalisation is NOT behaviour/bit invariance; R3/topology change.
- Beech screen prose100 corrected: existing evaluator lone60, no lone100 scored term.
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
- A world-level r3 patch misses fields species set (sigmaTarget/Break): patch per species.
- Never edit rust/ while a sweep is queued (run.ts rebuilds treesim; the Stop hook's check
  would run beside the simulators). A lone-only probe call clears its label's garden runs.
