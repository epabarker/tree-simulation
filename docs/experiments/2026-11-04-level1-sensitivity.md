# Level 1 sensitivity: what the knobs can reach (beech, 2026-11-04)

_Reference-fidelity plan §g, phase 3, after pilot v2 (the user, 2026-11-04). A reachability experiment, not a fit:
provisional, and nothing from it is accepted into species params. No core change: nothing under `src/`, `rust/`,
`cli/`, `tests/`._

**The question.** For each Level 1 descriptor, how far can any single knob move it toward the real target, and at
what Level 0 cost? CMA-ES answers this only by failing. A one-at-a-time sweep answers it directly.

**Why now.** The user stopped [pilot v2](2026-11-04-level1-beech-pilot-v2.md) (registration v3, 81b157a) early, with
the checkpoint kept and resumable. The call came on generation 7's status, after 8 of 32 generations: the median had
fallen from 15 to 9 while the best had not moved since generation 0's candidate. That candidate's gain was lateShare
on frozen seeds, and its Level 1 location stood at 2.47 against the hand's 2.60.

## Reproduce
```
uv run --project analysis python -I analysis/experiments/level1_sensitivity.py register   # before any run (committed)
uv run --project analysis python -I analysis/experiments/level1_sensitivity.py run        # 73 conditions → runs/level1-sensitivity/main.jsonl
uv run --project analysis python -I analysis/experiments/level1_sensitivity.py pairs      # the interaction check, by the registered rule
uv run --project analysis python -I analysis/experiments/level1_sensitivity.py envelope   # pilot v2's checkpoint, read-only
uv run --project analysis python -I analysis/experiments/level1_sensitivity.py report     # tables, reach.json, heat maps
```
- **Code:** `analysis/experiments/level1_sensitivity.py`. It measures with the fit's own `Measure`
  (`treesim/fit_level1.py`) and scores with `level1.py`.
- **Tests:** `analysis/tests/test_level1_sensitivity.py`.
- **Registration:** `docs/experiments/fits/level1-sensitivity/registration.json`, committed before any simulated tree
  (hashes of the measurement files, v3's registration, the targets file, the Level 0 fit and the script).

## The registration (written before the run)
**Targets.** v3's real distributions (`analysis/fit/sources/level1-beech.json`), real data only, unchanged. All 16 tier
A/B descriptors are measured, the five held out among them.
- **Why the held-out ones are measured:** this is a reachability experiment, not a fit.
- **What does not change:** the v3 hold-out rule, and any future fit's hold-outs. The only other script that writes
  held-out values is the gate.

**Knobs: 18, in two families,** each swept alone with the others at the hand:
- **form (10):** ADR 0029's form knobs, at the bounds of `[[formRange]]`; eta is on a log scale.
- **physiology (8):** Level 0's seven, at the bounds of `[[param]]` (Lh, hJ and qMin on a log scale), and r3.c
  (0.01–0.3, log). Level 0 froze r3.c, so it counts here as an eighth physiology knob (the user).

**The hand:** the v3 registration's `start` plus `fixed`, verbatim. That is Level 0's v2 fit, with postureSetPoint
explicit at 34.32 as in v3's knob space.

**Five points per knob** on its registered scale, in the unit coordinate u of `fit.encode`: 0, u_h/2, u_h,
(u_h+1)/2 and 1, where u_h is the hand's position. Each is decoded by `fit.decode`, which rounds to 4 significant
figures. That makes 18 × 4 + 1 = 73 conditions.
- **The grid is lopsided where the hand sits near a bound** (u_h in brackets): kappa (0.108), dLambda (0.115),
  setPoint and postureSetPoint (0.205), c3.alpha (0.232), leafArea (0.708), eta (0.812), hJ (0.847).
  - **What that means:** two close points on one side, two far ones on the other.
  - **A response that turns over between the far points** is invisible (below).

**Seeds:** v3's 10 search seeds (7191, 2325, 9999, 2831, 4712, 8068, 9165, 2863, 2488, 5615), the same for every
condition. Pilot v2 grew every candidate on them, so the hand's baseline is `hand-search-seeds.json` (6.676).

**Measured per condition:** the stand at its size-matched season, by the coarsened-simulation rule. Recorded:
- the matched season, the median DBH, the tree count and the flags;
- each descriptor's z (the median of the detrended trees against the real median, in real SDs) and its spread s
  (log2 of the simulated SD over the real SD);
- every Level 0 term (the lone, stand150 and shade trials).

**The rules.** Reporting conventions, not gates, fixed in `registration.json` before the run.
- **The unit:** Δz = z_cond − z_hand, in real between-tree SDs.
  - **Its SE:** a paired bootstrap over the 10 seeds, 2,000 resamples at numpy seed 20261109, with the same draw for
    every condition.
  - **What the bootstrap recomputes:** the medians and the Level 0 sum. The matched season is held.
- **The move toward the target:** m = −sign(z_hand)·Δz, and the fraction of the gap closed is f = m/|z_hand|.
  - **f ≥ 1 is reported as a bracket:** the target is crossed between two adjacent grid points, with ΔL0 given as the
    range at those two points.
  - **Why a bracket:** a bound may be a regime change, so continuity is not assumed.
  - **Beside f:** its bootstrap 5th percentile.
- **The cost:** ΔL0 = the condition's Level 0 sum minus the hand's. The sum is the loss less the fitted location
  terms: the scored traits and the death penalties, at Level 0's weights.
  - **Beside it:** ΔL0 without lateShare, and the bootstrap SE of each.
- **Reachability per descriptor:** the largest single-knob f and the ΔL0 of that move. The verdicts:
  - **"at target within noise"** if |z_hand| < 2·SE(z_hand);
  - **"unreachable by single-knob moves"** if no condition has f > 0.5;
  - **"reachable at cost"** if the closing move raises Level 0 by more than 2. The closing move is the cheapest
    condition with f > 0.5; the largest move's cost is reported beside it.
- **Unmatched or dead conditions** contribute no descriptor values; they are counted and greyed in the heat map.
  Cells of a condition flagged "matched at the first season" or "trees outside the real DBH range" are marked.
- **Spread:** for each descriptor, the largest single-knob rise of s toward 0, and whether any condition brings it
  within ×2 (|s| ≤ 1).
- **The interaction check.** A one-at-a-time sweep misses interactions, so one check follows the main sweep:
  - **Which descriptors:** the three with the largest remaining gap, max(0, |z_hand| − m_best), held out included,
    excluding any at target within noise.
  - **Which knobs:** each descriptor's top three single-knob movers. v* is a knob's best grid value; v½ is halfway
    from the hand to v* on its scale.
  - **The conditions:** for each of the three pairs, (v*_A, v*_B), (v*_A, v½_B) and (v½_A, v*_B). That is up to 9
    per descriptor, at the same 10 seeds.
  - **Reported:** the best pair's f and ΔL0, and its departure from additivity where both singles were grid points.
- **The joint-move envelope:** a free lower bound on joint reachability. Pilot v2's 120 candidates grew on the same
  10 seeds with joint moves of the ten form knobs.
  - **Reported per fitted descriptor:** the best f, that candidate's ΔL0, and its spread, flagged when s < −1.
  - **Held-out descriptors have no pilot data.**
- **The three-source verdict:** "needs a rule rather than a knob" only where the single-knob sweep, the pair check
  (where run) and the envelope (fitted only) all fall short of f = 0.5. Otherwise:
  - "reached by a single knob";
  - "reached jointly", naming the source;
  - "not reached by the knobs tested; joint moves untested", where no joint evidence exists.
- **What is not covered:**
  - interactions outside the top-three pairs;
  - compensated reach across the physiology × form families: a move stopped by a regime boundary that a second knob
    lifts;
  - a response that turns over between the far grid points of a lopsided knob.

**ADR → evidence (fixed before the run):**

| ADR item | its evidence |
|---|---|
| 0052, limb loss / crown retreat | centroidHeight, p0, p1, profileCentre, crownFullness, widestAt (held out); Level 0's talloCR and lai beside them |
| tip upturn and tortuosity | limbUpturn (held out), tortuosity05, limbElevation05 (held out), pendulousFraction05, limbDroop |
| individual variation | the spread of all 16, chiefly leaderDominance, centroidHeight, limbDroop, tortuosity05 and limbUpturn |
| the trunk increment (ADR 0050 option C) | the matched season and DBH per condition; leaderDominance, forkHeight and length0; talloH, height, height100 |

An item ranks higher the more of its evidence is "needs a rule", the larger the gap that remains, and the more a
partial reach costs Level 0.

**The advisor's check of the design (once, at the plan; the user's two questions):**
1. **Is the five-point sweep on each knob's scale the right design?** Yes, for a reachability screen, since the
   bounds are what answer "how far". It is weak as a slope estimate, and it is lopsided for the knobs listed above.
   Applied: the bracket rule in place of continuity, u_h recorded, and unmatched and flagged cells registered.
2. **Can the rule call a descriptor unreachable when only an interaction reaches it?** The label "by single-knob
   moves" is safe by construction; the inference "needs a rule" is not. Applied: the pilot v2 envelope, the
   three-source verdict, and the statement of what the pair check does not cover.
3. **Also applied:** ΔL0 without lateShare, with bootstrap SEs, since lateShare's noise is of the order of the
   2-point threshold; the ADR → evidence table fixed now; a test that the hand round-trips through the encoding.

**Before the registration:** a smoke run (the hand at one seed) and a mini run (4 conditions × 3 seeds, in a
scratch folder) exercised every subcommand. Neither is kept.
