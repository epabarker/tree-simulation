# 0061: Freeze G-forest B1 at the current garden configuration

- **Status:** accepted (the user, day-3 ruling 2a)
- **Date:** 2026-11-07
- **Spec:** validation policy; amends the 0.17.0 box's B0-only baseline convention

## Context

B0 (d2c4f53) predates the recruit cap: recruits1 rather than today's0.25.
Beech lifespan-off and crown v2 are now merged. B0's original absolute-band counts
are retained, including the known planted-H/D miss. A baseline change does not
validate those absolute bands or the look.

## Decision, registered before measurement

Measure B1 from merged steps1–3 at a903d11: forestParams(160), its own recruit cap
0.25, seeds1–20, 300 seasons, crown v2. Retain the unchanged rule: each of floor100,
planted hd300, crown_v2 and plateau must reach its frozen B1 count minus two.
Record negative arithmetic bars explicitly rather than invent a new absolute gate;
nonnegative counts make those constraints vacuous. All-tree H/D stays diagnostic.
Report the separate metamer budget relative to B1 (median at200, candidate≤1.25×).
Freeze measured counts and provenance only after all20 runs complete, never fit
counts or knobs to results. Keep B0 and the old band results for comparison.

Run B0's build at recruits0.25 over the same20 seeds as a composition-control
finding. Compare original B0→quarter-cap B0→B1; the last contrast includes later
species changes and must not be attributed solely to the cap. No species/world
parameter is tuned in this step. Current and historical source trees stay untouched.

## Consequences

Later PRs use the actual garden's frozen B1 comparator, while reporting absolute
misses and soft/advisory limitations. The control is evidence about configuration,
not a fix. Timing is native compute cost, not a fresh-process memory or phone gate.

## Measured B1 (registered at 8487d61)

All20 fresh stands complete; executed params match all20 dumps. Counts are
floor100 **0/20**, planted hd300 **0/20**, crown_v2 **14/20**, plateau **12/20**.
Freeze bars **−2/−2/12/10** in `analysis/treesim/baselines/B1-v2.json`. The first
two constraints are vacuous; their absolute-band failures remain visible. Median
metamers at200 is **66,923**. All20 outcomes reproduce step3, which is repeatability
on examined seeds rather than independent biological validation. See the step4
experiment note for the historical cap control and native cost.
