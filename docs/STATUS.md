# Status

_Last updated: 2026-11-10; #104's fix (the light serves a resting limb) in a PR into 3d-port._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Feature playbook (wayfinder map #73; handoff docs/features/README.md)
- Builds a→b→c→d merged in sequence into 3d-port, one /implement-principle PR each.
- (a) open-grown lone box: merged (#102). (b) periodic depth + demography (#99) next, after #104.
- (c) oak's early λ fall only; (d) bole T_rel + c5.kRel (bole probe first: lowest limbs 0.4–0.6 Q_top).
- Each PR: default-off bit-identical commit, then preset commit with ≥20 seeds; goldens/regressions once.
## #104 as built (branch fix/104-ground-rest-light; ADR 0011's 2026-11-10 addendum)
- A tree with r3.enabled and r3.ground (`R3::rests`) has tips below 0 read and deposited at y = 0.
- `light::rest_height`, at every tip the season loop takes to the light. No param, no threshold.
- Goldens moved: mixedWood, oakOpen, beechOpen, beechWood, and golden.rs's historical beechOpen.
- Regression phoneSeed3 moved (one more canopy tree at 100 and 150); forestRegeneration did not.
- 20 seeds, holly/beech/oak: every resting bud-season was dark before, and reads the bottom row now.
- Lowest live limb unchanged (0.25 m). Crowns wider at s100: beech +2.7 m, oak +1.3 m (paired medians).
- Evidence docs/experiments/2026-11-10-ground-rest-light.md.
## Build (a) as built
- oakOpen/beechOpen: openGrown, τ1 all sides, 240×240 cells (60 m), tree at centre.
- WALLED_LONE pins trialBase/loneParams (fits), specimenParams (garden) and fixture oakOpenWalled.
- Hard check `budsOutside`: 113/120 every season before #104. After it, at s100: beech 18/20, oak 19/20.
- Cost WASM: beech 0.79–1.44 s/season, 749 MB; oak 1.0–1.2 s, 546 MB (laptop heat varies it).
- Feature probe: `node cli/probe.ts --species sp --patch p.json` → runs/probe/<label>/sheet.html.
## Next
1. User reviews/merges #104's PR; then build (b) (#99).
2. #103 (box resize, birch runaways) needs-triage; #104 widened crowns, so re-count buds outside there.
3. Phone soak remains a separate deferred release gate; no tag/deploy/production push.
## Open question
- A tip sunk while ground contact was off is lit for one light phase when it is switched on. Accept?
## Gotchas
- `npm run golden:update` does not rebuild the WASM: run `npm run build:wasm` first.
- A preset's world merges one level deep: patching oakOpen's width keeps the open box's depth/faces.
- Under 12 simulators the check's tests time out (30 s): run the check with the machine idle.
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
- Step8 frozen on codex/day3-species-programme (docs/experiments/2026-11-08-day3-step8.md).
