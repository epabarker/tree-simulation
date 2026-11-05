# 0052: A limb-loss rule (self-pruning) under sustained low light or a negative limb carbon balance, judged against crownBase80

- **Status:** accepted (the user, 2026-11-05) as **"no rule for beech; open for oak's crown radius"** (option A).
  Created 2026-11-05: ADR 0050 (ruling 2) and ADR 0051 (ruling 4) named it before any file existed. No rule is
  implemented.
- **Spec:** §C5 (shedding), §R1 (carbon; k_shed), §O2 (abrasion). ADR 0007 (relative shedding), 0013 (O2 off), 0032
  (T_rel fixed from shade leaves), 0049 (the principle line), 0050, 0051.
- **Evidence:** [the crown base and bole note](../experiments/2026-11-05-crown-base-and-bole.md) (the descriptor,
  gate c v3.2, the probe, the contact sheet); [the crown-competition note](../experiments/2026-11-04-crown-competition.md);
  [the provenance audit](../experiments/2026-11-05-target-provenance-audit.md) (the band rule).

## Context
- **ADR 0051's ruling 4 (the user, 2026-11-04):** the missing piece behind oak's crown reach is a loss process for
  unproductive limbs. It is to be judged against a measured crown base over H, with z_CR, LAI and height reported, not
  targeted.
- **The measured target named then** was Weiser's field crown base/H. Weiser has no QSMs, its TLS is leaf-on, and
  its crown base is a field first-live-branch reading: 0.07 of H for beech at BioDiv's sizes, in two multi-layered
  mixed stands. It is not the wood's crown base.
- **The render (2026-11-05)** suggested that the fitted beech's crowns start low against BioDiv's.

## The measured target: crownBase80 (replaces Weiser's as the target; Weiser reported only)
- **Definition** (`analysis/treesim/describe.py`): the height, over H, above which 80% of the non-trunk wood length
  lies (a length-weighted quantile). 80% is a convention; 70% and 90% are read beside it. A dead stub counts by its
  length, unlike `crownBase` (the lowest limb).
- **Gate c v3.2** (v3.1's rules, d_min frozen): **tier A**, 19 of 20 seeds at every point; control neutral at d_min.
- **BioDiv beech** (53 trees, median over repeats, detrended to 0.291 m DBH): **0.50 ± 0.138**.

## What the probe found (beech, seeds 1–5)
- **The simulated crown base is already too high:** at the shipped T_rel, the pilots' hand reads z +1.32 and pilot
  v4's finalist +0.58; on 101–110, +1.31 and +1.03.
- **More loss raises it further:** T_rel ×3 and ×10 and O2 at pAbr 0.5 leave the hand at +1.28 to +1.45, and move v4
  from +0.58 to +0.75–0.85.
- **LAI stays within one band** of the measured 8.4 in every cell, z_CR stays under 1, and deaths at 150 sit at
  3.6–4.6 of 12.
- **The contact sheet agrees** with the numbers. The visible gap between the simulated and real beech is crown width,
  density and bole sway, not crown base.

## Options
**A. No limb-loss rule for beech's sake (recommended).**
- Judged against crownBase80, beech has no case: its lower crown edge is above the real, and loss moves it up.
- ADR 0052 stays open only for **oak's CR** (ADR 0051): a rule must then be judged against oak's own crownBase80,
  which needs an oak QSM set and gate c for oak. Oak's stand does not reach Wytham's DBH by 300, so gate c was not run
  for oak.

**B. A limb-loss rule anyway (C5: sustained low light over k seasons; or R1: a deficit over k_shed seasons with k > 1
as a memory).**
- It is a core change with goldens, and its parameters must come from the literature (branch autonomy, shedding
  delays), never fitted to CR or to crownBase80.
- On this evidence it would move beech's crown base the wrong way. It needs its own case: oak, or a species whose
  simulated crown base sits below its measured one.

**C. Nothing in shedding; the lower crown edge through form.**
- If v6 fits crownBase80 (proposed in the note), the fit has to lower it with form knobs, against the probe's
  direction for loss. That is a Level 1 question, not this ADR's.

## Constraints recorded
- **c5.Trel is not a knob:** beech's 0.008 is measured (ADR 0032). A change is a revision of ADR 0032 with its
  evidence, never an entry in the knob list (ADR 0029's ten).
- **O2** is world-level, at ADR 0013's settings only, and its parameters are never fitted (ADR 0051, ruling 2).
- **kShed's default of 1** is already the strictest carbon rule. A longer memory is option B's.

## Consequences (if A)
- No code, goldens or params change.
- ADR 0050's option C (the trunk) no longer waits on this ADR for beech.
- Oak's Level 0 stays failed on CR until an oak-side case is made (ADR 0051).

## The user's ruling (2026-11-05)
Option A: no limb-loss rule for beech; the ADR stays open for oak's crown radius (ADR 0051), to be judged against oak's
own measured crown base when an oak case exists. c5.Trel stays beech's measured 0.008 (ADR 0032).
