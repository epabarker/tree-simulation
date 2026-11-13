# Status

_Last updated: 2026-11-13; spec #111 built on spec/111-feature-playbook, PR #128 ready._

**Live:** garden0.16.0. RC prepared/merged#71; phone soak deferred, no release-readiness waiver.

## Feature playbook (spec #111, PR #128 → 3d-port)
- Merged: #112–#123, #125, #126, the #124 guard, a code-review fix-up. Check green, goldens unchanged.
- Garden: periodic depth + two-part demography at round 6 (r6); ADR 0065 makes the per-ha
  targets reported, not gated; canopy = over half the top height (100 tallest/ha).
- #122 (`npm run evidence:garden`): r6 passes its gates 20/20; d1 fails one (18/20 on the phone),
  so the pre-registered rule kept r6. r6 is capped and flooded (canopy share 0.14 at 160).
- The canopy gate means only "≥ 1 drawn stem" under top height; #129 owns the real target.
- #124 oak d16a13: fails its garden guard (live oak at 150: 17→8, 8→1; none seeding). Not
  adopted; ticket open until #129 changes the stand.
- #126 bare-bole probe fails: beech's low limbs stay lit (0.6–0.8 Q_top); hornbeam's scars
  re-sprout. Bole stays proposed; #127 closed as not planned; finding on map #73.
- No 3D shipped forests (ADR 0046): the garden opens on the live intro, not a settled forest.
- Still fog: maple's length cap, C5/R1 shedding, d(L), crown shyness, the lab's open-box cost.
## Step8 (frozen by the map; no adoption, nothing deleted)
- Branch codex/day3-species-programme, base470aa3c; steps1–7 merged by user.
- Beech: retain current; candidates failed spread/≥15-of-20 bars; G-forest/budget unrun.
- Sycamore/ash: 160-stand grid, no qualifying candidate (every bar15); 0/20 standard allometry.
- Fresh confirmation seeds 22021–22040/23021–23040 untouched. No garden/FLORA changes.
- Full evidence docs/experiments/2026-11-08-day3-step8.md; aggregate figure inspected.
## Next
1. PR #128 ready for the user's review; ADR 0066 keeps the review's four open choices as built.
2. #129: crown extent and girth; re-test d1 and the oak there.
3. Phone soak remains a separate deferred release gate; no tag/deploy/production push.
## Gotchas
- m27_adopt resets mw=64; any adopter extension must preserve selected coupled mw/r0.
- Same-skeleton mw*r0² normalisation is NOT behaviour/bit invariance; R3/topology change.
- Beech screen prose100 corrected: existing evaluator lone60, no lone100 scored term.
- PRs go to 3d-port, not main (main is the live site, far behind).
- Stamp foreground before commits; ≥20seeds for adoption; cap12simulators.
- Never agent merge/tag/deploy/site-main push or preview-3d merge. B1bars−2/−2/12/10 fixed.
