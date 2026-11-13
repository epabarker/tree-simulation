# Status

_Last updated: 2026-11-13; #129 criterion 1 probed on probe/129-crown-extent: every arm rejected._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Crown extent and girth (#129, criterion 1; PR to 3d-port, not merged)
- Note: docs/experiments/2026-11-13-crown-extent-probe.md (exploratory, seeds 1–3; bars fixed first).
- `c1.extentLimit` (reach | height | path, + `extentSpare`): probe param, off, bit-identical. Not
  an ADR; no preset, species, golden or regression changed.
- Verdict: all arms rejected on the lone bar (beech, hornbeam ≤ 1.2× Pretzsch's edge at matched DBH).
- Closest, `H4k8` (level shoots barely extend; upright spared): lone crowns halve, height kept;
  ≥ 120 canopy trees/ha at 160 in 3 of 3 runs (HEAD 1 of 3). Costs: cap 284 of 300 seasons,
  R3 throws 26 of 79 planted (HEAD 8), holly gutted, no low limbs.
- Girth is R3's stress wood (63% of the bole), not C6's pipe sum: halving `c6.r0` thins nothing;
  `r3.sigmaTarget` ×4 collapses the tree. With narrow crowns stems are in range or too thin.
- A size signal at Choi's rates fails: crowns are too wide by season 25, before it acts.
- 1,000/ha on `H4k8`: more canopy trees at 100, no more at 300.
- Open for the user (the note's §9): the lone bar against DBH alone; wind in R3; a rule or a
  refit of λ and set points; the understorey next; keep the code?
## Feature playbook (spec #111, merged to 3d-port as #128)
- Garden: round 6 (r6), periodic depth, two-part demography; ADR 0065 targets reported, not gated.
- #124 oak d16a13 not adopted; #126 bare-bole probe failed (repeat if the stand changes).
- No 3D shipped forests (ADR 0046). Still fog: maple's length cap, C5/R1 shedding, d(L).
## Step8 (frozen by the map; no adoption, nothing deleted)
- Branch codex/day3-species-programme; beech retained, no sycamore/ash candidate qualified.
- Confirmation seeds 22021–22040/23021–23040 untouched. docs/experiments/2026-11-08-day3-step8.md.
## Next
1. The user reads the note's §9 and decides the direction for #129's criteria 2–3.
2. The understorey at the cap is the first thing in the way of the band and share targets.
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
