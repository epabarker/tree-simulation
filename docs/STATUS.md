# Status

_Last updated: 2026-11-12; #122 accepted the garden at round 6 (d1 not adopted)._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Feature playbook (spec #111, integration branch spec/111-feature-playbook)
- docs/features/: rounded crown, bare bole, stand density; ADRs 0062, 0063, 0065; GLOSSARY.md.
- Built: open-grown lone-tree box (#115); periodic depth + demography at round 6 (#121).
- #122 (ticket/122): r6 vs d1 on seeds 1–20 (`npm run evidence:garden`, 25 min on 8 sims).
  - Gate "canopy tree every season after 50": r6 20/20 both widths; d1 18/20 on the phone.
  - The rule picked r6; the user kept it. No flora/preset/golden change.
  - That gate only means "≥ 1 drawn stem" under top height; #129 owns the real canopy target.
  - r6 is capped and flooded: canopy share 0.14 (160), ~235/300 seasons at the cap.
  - d1 halved cap seasons and helped the mix: #129's first lever to re-test.
- Pre-#121 garden checkpoint loads and grows on bit-identically (tests/checkpoint-pre121).
- No 3D shipped forests exist (ADR 0046): the garden opens on the live intro, not on a
  settled forest. Opening settled would reopen ADR 0046: the user's call.
- Oak (#124): r6 desktop 4 of 1,350 recruits reach 1.3 m; none seeding at 300.
- Still fog: maple's length cap, C5/R1 shedding, d(L), crown shyness, the lab's open-box cost.
## Step8 (frozen by the map; no adoption, nothing deleted)
- Branch codex/day3-species-programme, base470aa3c; steps1–7 merged by user.
- Beech: retain current; candidates failed spread/≥15-of-20 bars; G-forest/budget unrun.
- Sycamore/ash: 160-stand grid, no qualifying candidate (every bar15); 0/20 standard allometry.
- Fresh confirmation seeds 22021–22040/23021–23040 untouched. No garden/FLORA changes.
- Full evidence docs/experiments/2026-11-08-day3-step8.md; aggregate figure inspected.
## Next
1. Merge ticket/122 into spec/111 (the user); #123 re-baselines the named regressions.
2. #129: crown extent and the per-hectare canopy gate; re-test d1 there.
3. Phone soak remains a separate deferred release gate; no tag/deploy/production push.
## Gotchas
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
- Same-skeleton mw*r0² normalisation is NOT behaviour/bit invariance; R3/topology change.
- Beech screen prose100 corrected: existing evaluator lone60, no lone100 scored term.
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
