# Status

_Last updated: 2026-11-13; #132's ramp built, off by default (`o4.survivalLight`); probe next._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Crown extent and girth (#129 → #131–#135, a blocking chain)
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
  #138: saplings at P/M 4–5 barely grow (untraced).
## Feature playbook (spec #111, merged to 3d-port as #128)
- Garden: round 6 (r6), periodic depth, two-part demography; ADR 0065 targets reported, not gated.
- #124 oak d16a13 not adopted; #126 bare-bole probe failed (repeat if the stand changes).
- No 3D shipped forests (ADR 0046). Still fog: maple's length cap, C5/R1 shedding, d(L).
## Step8 (frozen by the map; no adoption, nothing deleted)
- Branch codex/day3-species-programme; beech retained, no sycamore/ash candidate qualified.
- Confirmation seeds 22021–22040/23021–23040 untouched. docs/experiments/2026-11-08-day3-step8.md.
## Next
1. #132: the rule is built (off, bit-identical); next its probe (pilot 1–3, then 20 seeds; the
   7 cm DBH band in the scorer). Then #133 (wind in R3), #134.
2. #134 carries ADR 0067's fit change (breast-height slenderness, pooled forks).
3. Phone soak remains a separate deferred release gate; no tag/deploy/production push.
## Gotchas
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
- Same-skeleton mw*r0² normalisation is NOT behaviour/bit invariance; R3/topology change.
- Beech screen prose100 corrected: existing evaluator lone60, no lone100 scored term.
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
- Never edit rust/ while a sweep is queued (run.ts rebuilds treesim; the Stop hook's check
  would run beside the simulators). A lone-only probe call clears its label's garden runs.
