# 0031: The flat cap and the stand's lid are a limitation of the shedding rules; round 5 proceeds on the picks

- **Status:** proposed (2026-10-31, drafted for the user).
- **Date:** 2026-10-31
- **Related:** ADR 0029 (form by hand), ADR 0030 (rejected), spec §R1, §C5, §R4.
- **Note:** [the species note](../experiments/2026-10-30-species-3d.md), round 5, from "The cap: hornbeam at ramp 25" to "R1's acclimated leaf cost". Code and outputs in `experiments/code/2026-10-31-species-round5/`.

## Context
No broadleaf in round 5 grows a dome. Beech's grids gave spires, cones and stacked level tables. Hornbeam, oak and maple carry a flat cap: a dense leaf layer at the top of an inverted cone. The form grids and the dome sweep (r2.ramp, levels.0.pTerm, the level-0 generator, the twig set point) found no form knob that rounds a top. In the closed stand the same species carry a thin lid: the top fifth of the height holds 86–94% of the leaf.

## The diagnostics (so they are not repeated): which rule, then the four the user named
All are on hornbeam (lone at seed 1 unless stated; the closed stand at 100; `forest` at τ 0 to 300 on seeds 1–3), and all are in the species note with their tables.

1. **Which rule makes the cap (`cap.py`).** With one rule relaxed at a time, Q_ss 0.01, k_ext 0.25 and L_h doubled all leave the cap. "C5 off" is the same run, since R1's `shed` "carbon" sheds regardless of C5's flag. **With no shedding at all the cap goes**: a dense rounded crown, top fifth 22–24% of the leaf, W/H 0.72 and fork 0.32 at 100 against the brief's 0.7 and 0.4. The stand's lid is different: below 0.7 of the height the light is 0.03–0.07, and 15–80% of a band's buds die per decade. It is crown recession under neighbours.
2. **The shed branches, decomposed (`rust/core/examples/shed_log.rs`).** About 26,000 branches by season 100, almost all one leafy short shoot. 80% are shed for P_b < M_b. Sapwood is under 1% of M_b, so the test is α·Q·d(L) < m_f: a compensation light of 0.04–0.08 that rises with path length, against 0.042 at the shed twigs' buds.
3. **A saturating light response (ADR 0030, rejected).** f(Q) = Q·(1 + q_half)/(Q + q_half). At q_half 0.2 the lone crown is a dome at 60 and against the woods' top by 100 (H 205). The stand's limb crown ratio falls from 0.39 to 0.33, and forest's plateau holds on 1 of 3 seeds.
4. **k_shed, consecutive deficit seasons before shedding (`r1.kShed`).** At 3 the twigs shed for P < M fall from 17,621 to 2,304, but the same twigs go by C5's relative-light test instead (785 → 17,423). The cap gets stronger (top fifth 45% against 38%). The plateau holds on 3 of 3, forest keeps nearly twice the metamers at 300, and the fitted stand keeps a tree alive at 100.
5. **An acclimated leaf cost (`r1.leafCost`, c 0.3 and 0.5).** m_f·(c + (1 − c)·Q) cuts the compensation light by up to two-thirds (0.033 → 0.010 at the base, 0.059 → 0.019 at path 100). Again the twigs go by the relative test instead (light-only sheds 785 → 17,069 at c 0.3). The top fifth holds 44–46% of the leaf. At c 0.3 the stand keeps 8 of 12 against 6, with shallower crowns (0.28–0.37 against 0.52–0.54). The plateau holds on 3 of 3.

Also found on the way: R4 aged leafy short shoots toward L_dorm (fixed and adopted, goldens updated). The fit's stand deaths after 60 were unseen: the harness now penalises `stand.alive100` as it does `stand.alive`, and under it the hornbeam pilot's step loses to its start (24.7 against 8.3).

## Decision
1. **The cap is the shedding rules together**: R1's P < M at foliage cost and C5's relative-light test, Q_b/n_b < T_rel·Q_top. Each relaxation tried, of the response, the cost, or the patience, hands the same dim interior twigs to the other rule. Only removing shedding altogether rounds the lone crown, and that was not tested in the stand or forest. No single-principle candidate meets all three tests (dome, stand crown, plateau).
2. **This is recorded as a limitation of the core.** Broadleaf crowns are flat-topped, and beech has no dome. Round 5 proceeds on the current picks (`[form]`, dated 2026-10-31) with the physiology fit and the harness as they stand.
3. **The ablations stay, all off by default, goldens unchanged:** `r1.response` (ADR 0030), `r1.kShed`, `r1.leafCost`/`r1.leafCostShade`. They are for the next attempt, not for any species.

## Consequences
- The garden's broadleaves read as flat-topped crowns. The species briefs' "dome" and "egg" are reported (ADR 0029), not met.
- The next attempt, after shipping, would relax both rules at once: no shedding, or `kShed` with T_rel refitted down, tested on the stand and on forest's plateau, not on the lone tree only. None of the five diagnostics needs rerunning.
- The stand's lid is light recession under neighbours. It was never the lone cap, and it moves only with how much light reaches the lower crown.
