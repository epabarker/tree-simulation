# Status

_Last updated: 2026-11-09; build (a) (#98), the open-grown lone box, in a PR into 3d-port._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Feature playbook (wayfinder map #73; handoff docs/features/README.md)
- Builds a→b→c→d merged in sequence into 3d-port, one /implement-principle PR each.
- (a) open-grown lone box: PR open (branch build/a-open-box). (b) periodic depth + demography next.
- (c) oak's early λ fall only; (d) bole T_rel + c5.kRel (bole probe first: lowest limbs 0.4–0.6 Q_top).
- Each PR: default-off bit-identical commit, then preset commit with ≥20 seeds; goldens/regressions once.
## Build (a) as built
- oakOpen/beechOpen: openGrown, τ1 all sides, 240×240 cells (60 m), tree at centre.
- WALLED_LONE pins trialBase/loneParams (fits), specimenParams (garden) and fixture oakOpenWalled.
- Hard check `budsOutside` (metrics): 113/120 every season, 116/120 at s100. Acceptance fails.
- User kept 60 m: beech/oak press on the 30 m half-side; birch runaways leave even 80 m×65 m.
- Cost WASM: beech 0.79–1.44 s/season, 749 MB; oak 1.0–1.2 s, 546 MB (laptop heat varies it).
- Feature probe: `node cli/probe.ts --species sp --patch p.json` → runs/probe/<label>/sheet.html.
- Evidence docs/experiments/2026-11-09-open-box-build.md.
## Next
1. User reviews/merges build (a)'s PR; then build (b).
2. Follow-ups #103 (box resize, birch runaways) and #104 (ground-resting buds get Q=0), needs-triage.
3. Phone soak remains a separate deferred release gate; no tag/deploy/production push.
## Step8 (frozen; no adoption, nothing deleted)
- Branch codex/day3-species-programme; evidence docs/experiments/2026-11-08-day3-step8.md.
## Gotchas
- A preset's world merges one level deep: patching oakOpen's width keeps the open box's depth/faces.
- Under 12 simulators the check's tests time out (30 s): run the check with the machine idle.
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
- Same-skeleton mw*r0² normalisation is NOT behaviour/bit invariance; R3/topology change.
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
