# Status

_Last updated: 2026-11-09; feature playbook assembled (docs PR); day3 step8 frozen, no adoption._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Feature playbook (wayfinder map #73)
- docs/features/: rounded crown, bare bole, stand density; ADRs 0062 (light entry), 0063 (demography); GLOSSARY.md.
- Handoff in docs/features/README.md: builds a→b→c→d merged in sequence into 3d-port.
- (a) open-grown lone-tree box; (b) periodic depth + demography; (c) oak's early λ fall only; (d) bole T_rel+c5.kRel.
- One /implement-principle PR each: default-off bit-identical commit, then preset commit with ≥20 seeds.
- Goldens and regressions updated once per build, in the preset commit, reasons in the devlog.
- Bole probe is build (d)'s first acceptance check; its early look: lowest limbs lit 0.4–0.6 Q_top.
- Probe branches wayfinder/* never merged; cherry-pick c5.kRel; feature-probe tool lands with (a).
- Maple's length cap, C5/R1 shedding, d(L), crown shyness: follow-ups opened after their build.
## Step8 (frozen by the map; no adoption, nothing deleted)
- Branch codex/day3-species-programme, base470aa3c; steps1–7 merged by user.
- Beech: retain current; candidates failed spread/≥15-of-20 bars; G-forest/budget unrun.
- Sycamore/ash: 160-stand grid, no qualifying candidate (every bar15); 0/20 standard allometry.
- Fresh confirmation seeds 22021–22040/23021–23040 untouched. No garden/FLORA changes.
- Full evidence docs/experiments/2026-11-08-day3-step8.md; aggregate figure inspected.
## Next
1. User merges the playbook docs PR; then the four build issues (ready-for-agent) are opened.
2. Build (a), the open-grown box; then (b), (c), (d) in order.
3. Phone soak remains a separate deferred release gate; no tag/deploy/production push.
## Gotchas
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
- Same-skeleton mw*r0² normalisation is NOT behaviour/bit invariance; R3/topology change.
- Beech screen prose100 corrected: existing evaluator lone60, no lone100 scored term.
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
