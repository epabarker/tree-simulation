# 0019: Retire the pre-R1 species presets to test fixtures

- **Status:** accepted
- **Date:** 2026-10-28
- **Spec:** §9 (species character); revisits ADR 0009 (physiological age and species) and ADR 0011 (mechanics)

## Context
- **What they are:** M7's species types (`conifer`, `coniferStand`, `birch`, `birchStand`, `tropical`) and M9's mechanics demonstrations (`weeping`, `troll`). They were the lab's first species.
- **They have been overtaken.** The M7 types run without the carbon balance, mechanics, release and shade avoidance (R1, R3–R5). The calibrated flora of M19 and M25 (`flora.ts`) now cover fir, birch, beech and pine with every principle on.
- **They mislead in the lab.** A visitor who picks "birch" there gets an uncalibrated type, not the home forest's birch.
- **But they still carry evidence.** The R2 and R3 tests grow them (`species.test.ts`, `r2-physiological-age.test.ts`, `mechanics.test.ts`, `storms.test.ts`). No calibrated species has Aubréville's tiers, a weeping habit, or Troll's straightening shown this plainly.

## Decision
The user chose (2026-10-28, M26 planning) to retire them:
- **Out of the lab:** they leave `presets` and its menu.
- **Kept as fixtures:** their patches move unchanged into `src/core/fixtures.ts` (`fixtures`, `fixtureParams`).
  - The evidence tests read them from there.
  - The golden cases keep their keys and hashes (`conifer:seed1:s30`, …).
  - The CLI still accepts their names, so the M7 and M9 experiment scripts reproduce.
- **Bench:** `npm run bench` and `scene.bench.ts` measure `firWood` instead of `coniferStand`.
- **Leaf style:** the lab's `large` style stays in the leaf menu.

## Consequences
- **The lab's species are the calibrated ones only.** The legacy forms remain reachable from the CLI and the tests.
- **Bench history:** results before and after this change measure different worlds for the conifer case, so a new baseline is recorded.
- **Revisit** if a calibrated weeping willow or *Terminalia* joins `flora.ts`. Its evidence could then replace the fixture.
