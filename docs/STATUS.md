# Status

_Last updated: 2026-11-10; #103's 72 m open-grown box on branch build/103-open-box-72, not yet pushed._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Feature playbook (wayfinder map #73; handoff docs/features/README.md)
- Builds a→b→c→d merged in sequence into 3d-port, one /implement-principle PR each.
- (a) open-grown lone box: merged (#102). (b) periodic depth + demography (#99) next, after #103.
- (c) oak's early λ fall only; (d) bole T_rel + c5.kRel (bole probe first: lowest limbs 0.4–0.6 Q_top).
- Each PR: default-off bit-identical commit, then preset commit with ≥20 seeds; goldens/regressions once.
## #104 as built (merged, #105; ADR 0011's 2026-11-10 addendum)
- A tree with r3.enabled and r3.ground (`R3::rests`) has tips below 0 read and deposited at y = 0.
- `light::rest_height`, at every tip the season loop takes to the light. No param, no threshold.
- Goldens moved: mixedWood, oakOpen, beechOpen, beechWood, and golden.rs's historical beechOpen.
- Regression phoneSeed3 moved (one more canopy tree at 100 and 150); forestRegeneration did not.
- 20 seeds, holly/beech/oak: every resting bud-season was dark before, and reads the bottom row now.
- Lowest live limb unchanged (0.25 m). Crowns wider at s100: beech +2.7 m, oak +1.3 m (paired medians).
- Evidence docs/experiments/2026-11-10-ground-rest-light.md.
## Build (a) as built
- oakOpen/beechOpen: openGrown, τ1 all sides, 288×288 cells (72 m since #103), tree at centre.
- WALLED_LONE pins trialBase/loneParams (fits), specimenParams (garden) and fixture oakOpenWalled.
- Hard check `budsOutside` at 72 m: 0 every season in beech 20/20, oak 20/20; reach ≤ 31.4 m of 36.
- Not sized for birch: its runaway leaders/limbs are #106 (bug, needs-triage, parked until after (c)).
- Cost WASM: beech 0.85 s/season, 934 MB; oak 0.84 s, 733 MB. Note 2026-11-10-open-box-72.md.
- Feature probe: `node cli/probe.ts --species sp --patch p.json` → runs/probe/<label>/sheet.html.
## Next
1. User reviews #103's branch (push + PR into 3d-port on their word); then build (b) (#99).
2. #106 (birch runaways) needs a diagnosis before a brief.
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
