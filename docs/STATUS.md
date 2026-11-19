# Status

_Last updated: 2026-11-19; #132 and #135 closed as built, off; M (stubs s3d + memory τ 2.5) the candidate._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Crown extent and girth (#129's chain; order agreed 2026-11-16)
- Order: #132 → #135 → #138 → one adoption → hornbeam girth (ADR 0011 §3) → #124.
- ADR 0067: the lone triad (W at DBH, W/H, H/D) a guard; the stand against Tallo the gate.
- ADR 0068: #132's `topLight` ramp; the band counts stems ≥ 7 cm DBH in 200–400/ha.
- #133 closed (wind load built, off). ADR 0071 (shade apical control, #138) deferred: δλ 0.40
  floods stems ≥ 7 cm (852/ha).
- #134: only the leader's λ₀ moves W/H. Beech stays as it is; B2 (beech λ₀ 0.6708) makes beech
  take ~0.89 of the canopy (recruits, seasons 100–200). A beech-side cost is the user's call.
- #135 closed (user, 2026-11-19; PR #157, ADR 0074 accepted as a build, off): the floored
  height rule fails lone E and H/D (narrower crowns, thinner trunks), passes every stand bar.
  Lone H/D blocks every crown-narrowing arm: #134's slenderness or R3, not a crown rule.
## Understorey and the cap (#137, #132)
- ADR 0072 seedling stubs (`o4.stubs`, proposed, off): s3d cuts cap seasons 235 → 79.5
  (phone 186.5 → 11).
- ADR 0073 light memory (`o4.lightMemory`, off): with M2 read paired by seed (user,
  2026-11-19), τ 2.5 passes; τ 10 fails.
- #132 probe phase closed (user, 2026-11-19; PR #155): no ramp arm passes; the ramp stays built,
  off. M without the ramp is the best garden: head's cohort survival, +22% canopy trees, phone
  season 0.96× head's. The band stays open (M overshoots it by season 300).
## Feature playbook (spec #111, merged to 3d-port as #128)
- Garden: round 6 (r6), periodic depth, two-part demography; ADR 0065 targets reported, not gated.
- #124 held: d16a13 + crowd gate (`r2.dLambdaCrowd`, built, off; ADR 0069) fails bare bole at 66.
- No 3D shipped forests (ADR 0046). Still fog: maple's length cap, C5/R1 shedding, d(L).
## Next
1. #138: per-species δλ on the new stand (M).
2. One adoption (M, plus #138 if it passes): goldens re-baselined, phone look (user).
## Gotchas
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
- A world-level r3 patch misses fields species set (sigmaTarget/Break): patch per species.
- A new param needs a row in analysis/treesim/build_dag.py (CI's test_day3_instruments).
- Garden WASM budget 200 kB gzip (cli/garden-size.ts): avoid BTreeMap/sort_by in the core.
- Never edit rust/ while a sweep is queued (run.ts rebuilds treesim; the Stop hook's check
  would run beside the simulators). A lone-only probe call clears its label's garden runs.
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
