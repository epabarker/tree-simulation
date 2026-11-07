# 0060: Remove beech's configured spur lifespan, retaining the optional rule

- **Status:** accepted (the user, day-3 ruling 1, 2026-11-07); adoption through step-3 gates
- **Date:** 2026-11-07
- **Spec:** §R6, §R4, §C5; amends ADR 0044 for beech

## Context

ADR 0044 added an optional wood-age cap to short shoots and adopted age 20 for
beech to clear its bole. The night2 diagnosis found a different failure in shade:
suppressed saplings stop extending, their spurs share early-born wood, and the
wood-age clock removes their remaining foliage. Raising the finite age delayed
that failure. This clock is an approximation to shoot-chain age, not a measured
shoot demography model.

Night2's registered 20-seed comparison reported 6/40 planted beech surviving at
150 with the cap and 27/40 without it; fresh seeds 21–40 were 7/40 and 26/40.
Its lone D read was near the lower bar and its G-forest hd300 missed B0 by one.
The user approved removing the cap, crown v2, and the separate B1 baseline
transition. Step 3 confirms the fixed N1 gates on the merged current source;
step 4 creates B1. The result note records all current counts and misses.

## Decision

Remove only beech's `r6.lifespan` value from hand overrides, generated species
params and their exported copies. Make the adopter preserve that absence when
amending an existing whole patch. Keep R6 enabled, its leaf-area/light settings,
R4's independent dormant-bud clock and all branch/light/carbon shedding rules.

Retain the optional general lifespan mechanism, its parameter and its tests.
No finite high-age sentinel, new spur renewal rule or sub-metamer growth mechanism
is introduced. Ruling 8 parks those mechanisms. No other species is changed.

## Consequences

Suppressed beech can retain sufficiently lit short shoots on old wood. The
existing R6 base rule still loses short shoots with their branches or insufficient
light; it does not promise indefinite survival. Dominant and suppressed trees
must be distinguished when interpreting bole foliage.

This intentionally changes beech trajectories and its post-age-20 golden cases.
The experiment note records the independent limits: previously examined seeds,
D near its lower edge, residual deaths, and G-forest against B0 during the approved
baseline transition. A look is not biological validation. Reconsidering the age
rule requires new measured evidence and gates, not restoring a stale generated key.
