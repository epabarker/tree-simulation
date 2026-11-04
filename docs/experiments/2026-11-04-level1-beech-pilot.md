# Level 1 beech pilot: registration, control, dry run (2026-11-04)

_Reference-fidelity plan §g, phase 3, run as a **pilot** (the user, 2026-11-04). It is provisional, pending Level 0's
pass and ADR 0052. Nothing from it is accepted into species params. This session built the fit, registered its targets
before any simulated tree was scored, ran the control and a dry run, and left the overnight fit as a script for the
user to launch. No core change: nothing under `src/`, `rust/`, `cli/`, `tests/`; the files hashed by
phase1-tolerances.json are untouched._

## Reproduce
```
uv run --project analysis python -I analysis/experiments/level1_targets.py --species beech   # the registration (done: 3c64f48)
uv run --project analysis python -I analysis/experiments/level1_gate.py --species beech --control
uv run --project analysis python -I analysis/experiments/level1_fit.py --species beech --dry-run
uv run --project analysis python -I analysis/experiments/level1_gate.py --species beech --hand
analysis/experiments/level1_fit_gate.sh beech GENERATIONS HOURS                              # the overnight
```
Files:
- **Registration:** `analysis/fit/sources/level1-beech.json`, and `[level1] pilot_*` in `analysis/fit/targets/beech.toml`.
- **Code:** `analysis/treesim/level1.py` (the rules), `analysis/treesim/fit_level1.py` (the search),
  `analysis/experiments/level1_eval.ts` (the evaluator), and `level1_fit.py`, `level1_gate.py`, `level1_fit_gate.sh`.
- **Tests:** `analysis/tests/test_level1.py`, `test_level1_eval.py`.
- **Outputs:** `runs/level1-pilot/` and `runs/level1-dry/`, not committed. The overnight writes to
  `docs/experiments/fits/level1-pilot/`.

## Verdict (of this session; the fit itself has not run)
- **Registered first** (3c64f48), from real QSMs only; nothing simulated was scored before it.
- **Control:**
  - BioDiv, in sample: 20 of 20.
  - Demol, out of sample: 18 of 20, and 20 of 20 on the three held-out descriptors outside the outline.
- **The hand params** (Level 0's v2 fit with `[form]`) fail the gate on spread alone:
  - held out 20 of 20;
  - spread outside ×2 on leaderDominance (0.38) and limbUpturn (0.26);
  - shapeFlag clear.
- **The held-out rule barely discriminates.** The hand passes it 20 of 20 before any fit, as the real trees do. In this
  pilot, the gate's teeth are the spread rule and shapeFlag.
- **The dry run refutes "DBH at a season barely moves".** Generation 0's candidates matched at seasons 50 to 100. The
  matched season follows `r3.c`, which moves girth, not form alone. The two generations already traded Level 1 terms
  for Level 0's lateShare. Both points are decisions for the user (below) before the overnight run.

## Step 1: cost
- **Timing:** coarsen (inflate, prune at d_min 8.62 mm) plus describe() on gate c's beech dumps (10 live stand trees at
  70): **0.27 s a tree** (0.016–0.81 s), so ≈ 5.5 s serial for a 5-seed candidate. That is under the brief's 20 s, so
  nothing was vectorised.
- **Parallel anyway:** describe runs across a 12-process pool at the end of each generation. Serial, it would have
  idled the 12 evaluators ≈ 66 s a generation.
- **Values unchanged:** `test_level1.py` checks that the serial and pooled values equal gate c's own `inflated` rows
  exactly. The code is unchanged, so the per-tree time is the same before and after.
- **Measured in the dry run:** the simulation is 382 CPU-s a candidate (5 seeds of lone, stand150 and shade). A
  generation of 12 takes **404 s wall** on 12 workers, ≈ 34 s a candidate. Describe adds ≈ 0.5 s a candidate.

## The registration (`analysis/fit/sources/level1-beech.json`)
**Descriptors.** Gate c v3.1's 16 for beech: tier A 15, tier B 1 (limbDroop).
- **Held out:** `default_rng(20261104)` drew length0, p1, pendulousFraction05, tortuosity05 and widestAt, once; never
  redrawn.
- **Fitted:** the other 11.
- **Weights** (the user, a general rule): correlated summaries of one measurement share one unit of weight.
  - The **outline group** is centroidHeight, crownFullness, p0, p2, p3 and profileCentre. Its location term is the mean
    of their z², its spread term the mean of their s².
  - Each of forkHeight, leaderDominance, limbDroop, limbElevation05 and limbUpturn weighs 1.
- **The out-of-sample test is narrower than five.** p1 and widestAt are held out but correlate with the fitted outline
  terms (one measurement). So the out-of-sample test rests on **length0, pendulousFraction05 and tortuosity05** (the
  user). The draw stands.
- **Hidden during the fit:** the fit never writes the held-out values. A test asserts it on every row and on every
  results file. Only `level1_gate.py` computes them.

**Real.** BioDiv's 53 *Fagus sylvatica*, each the median of its 5 repeats. Per descriptor: OLS on ln dTLS, the median of
the values detrended to 0.291 m, and the residual SD (df n − 2).

| descriptor | tier | role | n | median at 0.291 m | SD [95%] | slope on ln DBH | repeat noise |
|---|---|---|---|---|---|---|---|
| centroidHeight | A | outline | 53 | 0.665 | 0.079 [0.066, 0.098] | 0.125 | 0.012 |
| crownFullness | A | outline | 53 | 0.837 | 0.077 [0.064, 0.095] | 0.003 | 0.020 |
| p0 | A | outline | 53 | 0.731 | 0.218 [0.182, 0.270] | −0.174 | 0.041 |
| p2 | A | outline | 53 | 0.955 | 0.134 [0.112, 0.166] | 0.085 | 0.037 |
| p3 | A | outline | 53 | 0.815 | 0.138 [0.116, 0.172] | 0.078 | 0.036 |
| profileCentre | A | outline | 53 | 0.512 | 0.043 [0.036, 0.053] | 0.034 | 0.011 |
| forkHeight | A | fitted | 53 | 0.785 | 0.135 [0.113, 0.167] | −0.198 | 0.041 |
| leaderDominance | A | fitted | 52 | 1.589 | 0.651 [0.545, 0.809] | 0.015 | 0.176 |
| limbDroop | B | fitted | 52 | 40.2° | 18.0 [15.0, 22.3] | 21.2 | 4.9 |
| limbElevation05 | A | fitted | 53 | 27.9° | 14.0 [11.7, 17.3] | 18.2 | 1.2 |
| limbUpturn | A | fitted | 52 | 13.7° | 10.8 [9.1, 13.4] | −0.27 | 4.3 |
| length0 | A | held out | 53 | 0.050 | 0.078 [0.065, 0.096] | −0.079 | 0.002 |
| p1 | A | held out | 53 | 0.960 | 0.166 [0.139, 0.206] | 0.027 | 0.026 |
| pendulousFraction05 | A | held out | 53 | 0.367 | 0.103 [0.086, 0.128] | 0.048 | 0.014 |
| tortuosity05 | A | held out | 52 | 1.270 | 0.138 [0.116, 0.172] | −0.020 | 0.038 |
| widestAt | A | held out | 53 | 0.578 | 0.193 [0.161, 0.239] | 0.076 | 0.049 |

- **Repeat noise:** at most 0.40 of the between-tree SD (limbUpturn), so it widens the real SD by at most 8%. The
  noise-corrected SD is stored beside the raw one; the gate reads the raw one.
- **Demol** (15 FSYL trees, DBH 0.25–0.39 m): detrended with BioDiv's slope, tier A only, reported and never fitted.

**Simulated.**
- **The trees:** the live measured trees at the size-matched season, coarsened (inflate, then prune at BioDiv's d_min),
  described, and detrended with the registered slope on the uncoarsened tree's DBH.
- **DBH range:** all 75 live trees at the hand's season 70 lie at 0.25–0.37 m, inside BioDiv's 0.11–0.67 m. Out-of-range
  trees are counted and reported, never excluded.
- **Size match:** per candidate, on its own seeds, the first of seasons 50..150 at which the median over seeds of the
  per-seed median DBH reaches 0.291 m.
  - A match at 50 counts and is flagged.
  - No match, or a match outside the 50..100 dump window, is unmatched: every Level 1 term costs 4.

**Knobs (11).** ADR 0029's ten (bounds `[[formRange]]`) and r3.c (0.01–0.3, log scale).
- **Start:** `[form]`. postureSetPoint starts at setPoint, the same tree (r3.rs `unwrap_or`).
- **Frozen:** Level 0's seven knobs at the v2 fit.

**Loss.** Level 0's contributions, exactly as at Level 0, plus 6 location and 6 spread units.
- **z** = (median of the ≤ 20 detrended trees − real median) / real SD.
- **s** = ln(sim SD / real SD) / ln 2.
- **Missing:** fewer than 10 finite trees costs 4.

**Gate** (`level1_gate.py`, seeds 1–20, size-matched over those 20):
- **Held out:** every held-out |z| ≤ 2 on the median of the seed's trees, on ≥ 15 seeds.
- **Spread:** sim SD within ×2 on every fitted descriptor.
- **shapeFlag** clear.
- **Reported beside it:** Demol's z, the gap strata, and Level 0's statistic on the same stand runs.

**Evaluator** (`level1_eval.ts`). The stand is grown once for both levels.
- **Parity:** its reply equals `cli/fit-eval.ts`'s, and its dump at 150 is byte-identical to
  `cli/dump-trees.ts --gate-c beech 1`'s stand trees (`test_level1_eval.py`).
- **Scratch:** skeletons at 50..100 go to `/dev/shm`, at most 973 MB in a generation; /dev/shm keeps ≥ 15.1 GB free and
  the machine ≥ 14.5 GB available. Scratch is cleared after every generation and on `--resume`.

**Hashes.** The registration hashes level1.py, level1_eval.ts, level1_targets.py, phase 1's describe chain,
phase1-tolerances.json, cli/trials.ts and cli/allometry.ts, beech.toml, and fits/level0/beech.json. The drivers
(`fit_level1.py`, `level1_fit.py`, `level1_gate.py`, the wrapper) are plumbing over level1.py and are not hashed. This
deviates from the plan, which listed them: it lets plumbing be fixed without re-registering.

## The control (real trees, no simulation; seed 20261105)
**BioDiv** (in sample: the targets' own trees, so it can barely fail):
- 20 of 20 pseudo-seeds pass the held-out rule. Over 2,000 draws, P(≥ 15) = 1.000 (pass counts, 5/50/95%: 19, 20, 20).
- Spread on its 80 trees: 0.79–1.37, all within ×2.

**Demol** (out of sample, the tier A held-out five):
- 18 of 20; 20 of 20 on length0, pendulousFraction05 and tortuosity05 alone.
- Over 2,000 draws, P(≥ 15) = 0.953 (15, 17, 19).

**BioDiv's gap strata** (diagnostic; all 53 stay in): the two strata sit within ±0.55 real SD of the pooled median on
every descriptor except widestAt in GD (−0.74).

## The dry run (2 generations × 12 on 5 seeds; the hand and 2 finalists on 101–110)
**Hand params on seeds 101–110:** loss **18.52**, matched at 70, median DBH 0.296 m.
- Level 0's terms total 2.17, the same as night 1's fit.
- Level 1's total 16.35. The largest:

| term | hand |
|---|---|
| l1.limbUpturn.sd | 6.07 |
| l1.leaderDominance.sd | 4.05 |
| l1.limbUpturn.loc | 1.60 |
| l1.limbElevation05.sd | 1.48 |
| l1.limbDroop.sd | 0.96 |
| l1.limbElevation05.loc | 0.71 |
| l1.outline.loc | 0.59 |
| stand.lai | 0.56 |
| stand.lateShare | 0.51 |
| stand.talloCR | 0.40 |
| l1.outline.sd | 0.35 |
| the rest | ≤ 0.27 each |

**The matched season moves with r3.c.**
- **Generation 0:** of 12 candidates, 5 matched at 50, 3 at 60, 3 at 70 and 1 at 100. The five at 50 had a median DBH of
  0.34–0.45 m already, and r3.c ≈ 0.022–0.025. The candidates at 70–100 had r3.c 0.07–0.13. The start is 0.049.
- **Generation 1:** seasons 60–100, mostly 80–100, at the edge of the dump window.

**The 2-generation "fit"** (the best of 24, re-measured on 101–110) scored **17.22** against the hand's 18.52. It bought
Level 1 terms with lateShare:
- lateShare 0.51 → **6.80** (1.39 → 1.27);
- leaderDominance spread 4.05 → 0.41;
- limbElevation05 spread 1.48 → 0.61;
- LAI 0.56 → 0.12.

Two generations prove nothing about the fit. They do show that the form knobs move Level 0's traits and that the loss
will trade between the levels.

## The hand params' gate (the baseline; seeds 1–20)
`runs/level1-pilot/hand.gate.txt`: season 70, 75 trees, median DBH 0.298 m, none outside the real DBH range.

| descriptor | role | z | sim SD / real SD | Demol z |
|---|---|---|---|---|
| centroidHeight | outline | +0.99 | 0.61 | −0.85 |
| crownFullness | outline | −0.50 | 0.96 | +0.49 |
| p0 | outline | −1.12 | 1.01 | −0.62 |
| p2 | outline | +0.02 | 0.76 | −0.33 |
| p3 | outline | +0.21 | 1.13 | −0.16 |
| profileCentre | outline | +0.61 | 1.01 | +0.03 |
| forkHeight | fitted | +0.06 | 0.97 | +0.71 |
| leaderDominance | fitted | −0.32 | **0.38** | −0.82 |
| limbDroop | fitted | −0.09 | 0.59 | — |
| limbElevation05 | fitted | +0.86 | 0.62 | −0.31 |
| limbUpturn | fitted | −1.26 | **0.26** | −1.43 |
| length0 | held out | −0.30 | 1.79 | −0.90 |
| p1 | held out (outline) | −0.07 | 0.95 | +0.73 |
| pendulousFraction05 | held out | +0.70 | 0.79 | +3.95 |
| tortuosity05 | held out | −1.10 | 0.52 | −1.72 |
| widestAt | held out (outline) | +0.21 | 0.98 | −0.01 |

- **Held out:** 20 of 20 seeds. **Spread:** outside ×2 (leaderDominance, limbUpturn). **shapeFlag:** clear (it is the
  hand). **FAIL.**
- **Level 0's statistic on the same runs:** 9 of 20, as night 1's gate found. This also checks the wiring.
- **limbUpturn:** the simulated limbs barely turn up at their tips. The median is 0.03°, against BioDiv's 13.7°, and
  the between-tree SD is a quarter of the real one.

## Checks after the dry run
**r3.c alone sets the girth.** A one-knob probe (`docs/experiments/code/2026-11-04-level1-pilot/r3c_probe.py`) at the hand params varied r3.c and nothing else: 5 seeds (2001–2005),
stand only, per-season DBH only (no describe, no z).

| r3.c | median DBH (m) at 50 / 60 / 70 / 80 / 100 | matched season | stand height at 60 (cells) |
|---|---|---|---|
| 0.022 | 0.462 / 0.521 / 0.532 / 0.541 / 0.584 | 50 (overshot by 59%) | 56.8 |
| 0.049 (the species') | 0.269 / 0.286 / 0.302 / 0.321 / 0.343 | 70 | 76.2 |
| 0.10 | 0.250 / 0.268 / 0.289 / 0.309 / 0.333 | 80 | 73.1 |

A low posture rate makes a squat, thick stem: stress wood, as ADR 0029 warned ("r3.c meeting H/D with stress wood at a
thin r0"). The dry run's seasons follow r3.c through this, not through the form knobs.

**limbUpturn is reachable; it is not a bound case.** The dry run's 24 candidates reached medians of 0–15.8° (real
13.7°), with SD up to 7.9 (real 10.8). The hand's 0.03° is where the form sits, not the edge of what the knobs can do.

**Demol's pendulousFraction05 z is +3.95 against the hand.** Demol's own trees pass against BioDiv as pseudo-seeds. Its
SD (15 trees) is narrow. The figure is reported, never gated.

**A held-out name leaked in the dry run, and is fixed.** Level 0's trials carry the simulator's own `stand.widestAt`
(form.rs, on simulator labels, uncoarsened). It is a different measurement from the held-out describe() widestAt, but it
has the same name, and it was in the dry run's rows (`runs/level1-dry/`, not committed). The fit now drops every
held-out-named trait, the simulator's included, and asserts none on every row and results file (`test_level1.py`). The
gate keeps them.

## The user's ruling (2026-11-04, after the dry run): (b), registration v2
- **r3.c is frozen at the species' value, 0.04879, as Level 0 did.** The knobs are ADR 0029's ten.
- **Registered as v2** in one commit, with hashes, before the launch. `level1_targets.py --version 2 --freeze r3.c`
  refuses unless every target comes out identical to v1's: descriptors, the draw, groups, real distributions, Demol,
  size match and start. v1's knobs, fixed assignments and hashes are kept in the file's `prior` (v1: 3c64f48). The start
  still decodes to the hand (`test_level1.py`).
- **The held-out rule does not discriminate in this pilot.** It passed the hand params 20 of 20, as it passes the real
  trees. The gate rests on the spread rule and shapeFlag.
- **The hand params' largest loss terms are spread terms:** limbUpturn at 0.26× the real between-tree SD (6.07) and
  leaderDominance at 0.38× (4.05). The simulated trees are too alike in those two, not wrong on average (z −1.26 and
  −0.32).

## Decisions for the user (before the overnight run; answered above)
1. **r3.c: launch as registered, or freeze it?** The probe above shows r3.c alone moving the matched season from 50 to
   80.
   - Nothing at Level 0 scores DBH at age. So r3.c can trade the tree's age at matching for Level 1 terms.
   - **The window edge is a cliff.** An unmatched candidate pays 6 groups × 2 terms × 4 = **48**, against the hand's
     18.5. Generation 1 already sat at 80–100, so the overnight optimum could be shaped by the dump window, an
     operational choice and not a principle.
   - **Options:**
     - **(a) Launch as registered (v1).** The window and its penalty bound r3.c. The printed command is for this.
     - **(b) Freeze r3.c at the species' 0.049, as Level 0 did:** 10 knobs. This amends the brief's "r3.c is in". It
       needs a **v2 registration commit** before launch: `level1_targets.py` refuses to rewrite, and the knobs are in
       the registration and in `pilot_knobs`.
     - **(c) Widen the seasons** (e.g. 30..150, a larger dump window). This also needs a **v2 registration**, plus more
       scratch (≈ 1.5–2 GB a generation in /dev/shm; 15 GB free).
   - **Recommendation: (b).** The probe shows r3.c is a girth knob in this model, and freezing it adds no knob.
2. **The held-out rule passes the hand 20 of 20.** In this pilot only the spread rule and shapeFlag can fail a candidate.
   Leave the rule as registered (it is ADR 0049 §4's), and read the gate knowing that.
3. **Level 0 trades.** Two generations already gave up lateShare (0.51 → 6.80). The overnight write-up gives each term's
   change from the hand. If the gains come from Level 0 terms, it says so; the loss is not changed for it.

## The overnight run (registration v2; launched 2026-11-04 11:46 UTC)
**Launched** on this machine at 11:46 UTC: tmux session `level1`, under systemd-inhibit, after the v2 commit (44a21ba).
Expected to finish around 15:30 UTC (gate included). Watch it with `tail -f runs/level1-pilot/beech.log`. The progress
file, one row a candidate with its matched season, is rewritten every generation at
`docs/experiments/fits/level1-pilot/beech-progress.csv`.

- **Budget:** 2000 evaluations fit the night. At 60 a generation plus 40 for the finalists and the hand, that is
  **32 generations = 1,960 evaluations**.
- **Time:** 32 × 404 s ≈ 3.6 h, plus ≈ 4 min of finalists and ≈ 2.5 min of gate: **≈ 3.75 h**. The safety stop is 5 h.
- **The command** (the wrapper reads whichever registration is committed; v2 now):
```
tmux new -s level1 'systemd-inhibit --what=sleep:idle --why="Level 1 beech pilot" analysis/experiments/level1_fit_gate.sh beech 32 5'
```
- **Resume:** run the same command again; the wrapper resumes from `runs/level1-pilot/beech/checkpoint.pkl`.
- **Outputs:** `docs/experiments/fits/level1-pilot/beech{.json,-best.json,-progress.csv}`; logs `runs/level1-pilot/beech.log`;
  gate `runs/level1-pilot/beech.gate.{txt,json}`.
