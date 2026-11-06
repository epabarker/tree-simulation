# Hand-off: species fitting in 3D, for the targets review (2026-10-31)

Where the species re-fit stands, what the fits and the partial hold-out found, and what bears on how targets are defined. Written by the agent that ran steps 0–3. Paths are relative to the repo root.

## Where to read
- **The plan:** `docs/plans/2026-10-30-species.md`. §0 covers what 3D broke and the trial changes (§0.8 the closed stand, §0.9 the form metrics); §2 the decisions; §3 the steps.
- **The note:** `docs/experiments/2026-10-30-species-3d.md`. It has every result below, with logs in `docs/experiments/code/2026-10-30-species-3d/`.
- **The targets:** `analysis/fit/targets/<species>.toml`, one per species. Each `[[trait]]` has a target, band, weight, kind and source. `[holdout]` holds the floor, survivalLight and shadeScore. `[[param]]` holds the free parameters and their bounds. The evidence is in `docs/research/2026-10-28-species-traits.md`.
- **The trials:** `cli/trials.ts` (the worlds) and `cli/fit-eval.ts` (the evaluator protocol).
- **The fit:** `analysis/treesim/fit.py` (residuals, derived traits, survival light) and `analysis/treesim/fit_lm.py` (the search). The driver is `analysis/experiments/m27_fit.py`; the hold-out is `analysis/experiments/m27_holdout.py`.
- **Results:** `docs/experiments/fits/round3/<species>.json`, with `-lm.csv` and `-jacobian.csv` alongside. Round 2 (the 2D fits) is in `fits/round2/`.
- **Decisions:**
  - ADR 0020: fitting, hold-outs, "a bound hit is a finding";
  - ADR 0021: R1's hyperbolic hydraulic discount;
  - ADR 0023: hand overrides;
  - ADR 0027: girth units, r0 ÷ 8 in 3D.
- **Git:**
  - PR #31 (`claude/species-3d-closed`): the closed stand, the 3D form metrics, LM + CMA-ES, beech, and the overnight fits.
  - PR #32 (`claude/species-holdout`, stacked on #31): birch's re-fit and the hold-out changes.
  - Both are open into `3d-port`. Nothing is adopted: `src/core/flora-fitted.ts` is still round 2's.

## Position in the plan
| step | state |
|---|---|
| 0: the generator reproduces the file | done |
| 1: trials in 3D, least squares, beech pilot | done. Revised once: the one-row "hedgerow" stand was replaced by a closed stand, and the form metrics were made 3D-aware |
| 2: the seven garden species | done overnight; birch then re-fitted with a wider r0 bound |
| 3: the hold-out | **stopped by the user** after its first section (the floors), for this review |
| 4: hand overrides; 5: adopt (ADR 0028) | not started. They are the user's, after looking on the phone |

Fir and pine (the lab species) haven't been fitted in 3D; they sit at round 2's values with the 3D overlay.

## How a target becomes a fit (as it stands)
- **Units:** 1 cell ≈ 0.25 m, 1 season = 1 year. The woods' top is 200 cells (50 m); the slab is 64 cells deep.
- **Trials,** each a seed-mean:
  - **lone:** one tree in the open (`oakOpen`, 160 wide). Measured at 30 and 60; `earlyShare` = H30/H60. The form metrics (spread, widestAt, crownFullness, forkHeight, leaderDominance, branchAngle, limbDroop) are read at 60.
  - **stand:** a closed stand: 3 rows of 4, an 84-cell periodic ring, spacing 21, opaque faces (τ 0). The middle row's 4 trees are measured at 60: height, H/D, leaf crown ratio. `lateShare` = H100/H60. No thinning, no recruitment, no storms.
  - **shade house:** one seedling under one of 8 roofs (light 30, 21.7, 15.8, 10.9, 7.1, 4.7, 2.9, 1.8%), followed for 30 seasons. "Survival light" is continuous: on a log-light axis, each roof's interval is weighted by the share of the 30 seasons survived.
  - **wood** (hold-out only): the species' own wood planted per area at τ 0. Floor light at 100 and 150.
  - **release** (hold-out only): the old one-row stand with its middle tree felled at season 40.
- **Residuals:** r = √w·(mean − target)/band. Measured traits have weight 1; described ones 0.5 (`limbDroop` 0.25). There's a Tikhonov term toward the start (λ 0.1) and death penalties.
- **Search:**
  - screening by central differences, with the active set chosen by a noise test against seeds 1–4;
  - Levenberg–Marquardt, with r0 updated in closed form;
  - CMA-ES from LM's point: population 10, 4 seeds, 30 generations, patience 15;
  - selection on seeds 501–506; verification on fresh seeds 1001–1006.
- **Acceptance** (the user's rule): every **measured** target in band on the fresh seeds. Described targets and the loss don't decide it.
- **Free parameters:** 17 per species plus r0, with m_w derived from r0. A species patch has about 57 numbers; the rest stay at round 2's.

## Results

### Step 2 and birch's re-fit (fresh seeds; margin = distance to the band's edge, negative = outside)
| species | accepted | measured in band | loss (progress only) | wall-clock |
|---|---|---|---|---|
| beech | yes | 6 of 6 | 72.5 → 4.8 | 1 h 50 |
| birch (re-fit, r0 top 0.0125) | no | 4 of 5 | 34.2 → 3.6 | 1 h 07 |
| oak | no | 5 of 6 | 16.3 → 13.9 | 1 h 27 |
| willow | yes | 5 of 5 | 4.6 → 2.6 | 1 h 03 |
| hornbeam | no | 5 of 6 | 18.9 → 14.5 | 1 h 19 |
| rowan | yes | 2 of 2 | 7.5 → 4.8 | 1 h 04 |
| holly | yes | 2 of 2 | 41.0 → 4.5 | 53 min |
| maple | yes | 3 of 3 | 10.4 → 7.1 | 1 h 01 |

- **Birch:**
  - With r0's top at the ÷ 8 bound (0.00625), stand H/D was 86.9. The re-fit landed at r0 0.00997 and stand H/D 70.2.
  - It misses survival light by 0.004 (0.156 against 0.21 ± 0.05); see finding 5.
- **Oak and hornbeam:** both miss the stand's late share, high (oak 1.49 against 1.31 ± 0.06; hornbeam 1.37 against 1.23 ± 0.05). Both starts were already at or past the band's top. The user kept them as fitted and doesn't want `r1.hydraulic` changed.
- **Parameters at a bound** (within 2% of the range):
  - beech: `r2.aC` lo, `r6.qMin` lo;
  - birch: `r6.qMin` hi;
  - willow: `r2.levels.1.eta` lo, `r1.Lh` lo;
  - hornbeam: `r2.kappa` lo;
  - rowan: `c3.alpha` hi;
  - holly: η lo, κ lo;
  - maple: `r1.Lh` lo;
  - oak: none.

  By ADR 0020 these are findings, not bounds to tighten.
- **The noise test activated all 17 parameters for every species:** seed noise is about 0.05 of a band on most traits.

### The hold-out's floors (own wood, τ 0, seeds 1–3, at 100)
| wood | target (kind) | round 2 | round 3 |
|---|---|---|---|
| birch | 15 ± 5% (m) | 17.9% | 20.4% |
| willow | 12 ± 5% (d) | 15.1% | 16.0% |
| oak | 8.4 ± 3% (m) | 11.3% | 12.2% |
| rowan | 7.5 ± 3% (d) | 15.1% | 11.4% |
| maple | 4.5 ± 2% (d) | 7.8% | 6.7% |
| holly | 2 ± 1% (d) | 11.8% | 17.2% |
| beech | 1.5 ± 0.8% (m) | 8.1% | 7.3% |
| hornbeam | 1.5 ± 0.8% (m) | 7.2% | 8.2% |

**Not run:**
- the shade order (Spearman over the ten);
- allometry and release;
- the 400-season mixed woods. Their stop rule is oak, hornbeam or beech reaching the top, which would make R1's discount (ADR 0021) the question.

## Findings that bear on the targets
1. **The H/D targets are the same for every species.** `lone.slenderness` is 48 ± 8 (MacFarlane et al. 2017) and `stand.slenderness` 70 ± 10 (Watt et al. 2023) for all ten. These are generic ranges, not species values.
2. **Few measured targets for some species.** Rowan and holly are "accepted" on just those two generic H/D targets; everything else of theirs is described. Maple has three. Acceptance means little for them.
3. **"Measured" and "described" mix for the same trait across species.** `lateShare` is measured from yield tables for beech, hornbeam, oak, willow, fir and pine, and described for birch, holly, maple and rowan. `stand.height` is described for holly and rowan.
4. **The trial and the measurement may not be the same quantity.** These are questions, not verified errors:
   - **`stand.height` and `lateShare`:**
     - The targets come from site-index curves and yield tables: dominant or top height, in thinned, managed stands, at ages 60 and 100.
     - The trial is the mean of 4 middle-row trees in an unthinned 12-tree stand.
     - Oak's and hornbeam's late share runs high in that stand.
   - **`stand.crownRatio`:**
     - The target is a field crown ratio (to the live crown base). The trial reads the leafy crown's share of height, because the branch measure reads 0.99 in 3D.
     - The fitted values cluster at 0.31–0.44 whatever the target (holly, at 0.79, is the exception): beech is 0.315 against 0.55. The user will judge it on the phone.
   - **`shade.survivalLight`:**
     - The targets are "saplings need X% of PAR" (Hagemeier & Leuschner 2019), from overcast, diffuse PAR.
     - The trial is a seedling's 30-season survival under discrete roofs.
   - **The floors:** the targets are overcast diffuse PAR under 100–150-year stands. The trial is a 100-season wood planted per area, between opaque faces.
5. **Survival light is a step for birch.**
   - Under every roof at light ≤ 0.158, the fitted birch's seedlings die at season 4 on all six fresh seeds, whatever the light. They live all 30 seasons at 0.217 and above.
   - The band's bottom edge (0.16) falls between those two roofs, so the reading is 0.156 either way. The fit could neither see nor move it, and `r6.qMin` went to its top.
   - The death season below the cut looks like a starvation timer (`r1.reserve0`, `kStarve`) rather than a light response. That's a hypothesis I haven't checked.
6. **The floor barely depends on species: 7–20% for all eight, with either patch set.**
   - The evidence spans 1.3–15%, and the tolerant woods (beech, hornbeam, holly) are 5–9× too bright.
   - The fit never sees a wood, so nothing constrains this.
   - Whether the floor should be a fitted target, or points to something structural (leaf area per crown, `r6.leafArea`, light extinction in C2), is open.
7. **Coarse form metrics.**
   - `widestAt` is a band index (10 bands), so it moves in whole-band steps against bands of ±0.10–0.15.
   - All the form metrics were redefined for 3D in this round (x and z extent; a fork needs radius ≥ 0.7 and climb ≥ 0.7 of the trunk's). Their targets were set against 2D crowns.
8. **The r0 bounds came from 2D ÷ 8** (ADR 0027).
   - Birch's round-2 r0 (0.0071 in 3D units) was already outside them, so its first overnight fit was capped from the first step.
   - The other species' r0 values sit at 0.0025–0.0037, about half birch's.
   - Bounds derived by unit conversion can quietly bind.
9. **κ and η low recur:** κ in hornbeam and holly, η in willow and holly. The user reads this as a finding about 3D crowns.
10. **Seasons map one-to-one onto years throughout,** including targets taken at ages 30, 60 and 100. Early growth in the sim (seedling establishment) may not match a planted stand's age.

## Practical notes for whoever runs things next
- **The laptop:** i7-1260P, 12 workers. A species fit takes about 1 h (CMA-ES about 75% of it), with 300–450 evaluations. The overnight run for the seven took 7 h 53 min.
- **Re-fitting a species** from the same shifted start: `uv run --project analysis python analysis/experiments/m27_fit.py --method lm --start round2 --species beech,<sp> --skip-done --workers 12`, after removing `<sp>.json` from `round3/`. Beech is skipped, and its shift carries over.
- **The hold-out:** `m27_holdout.py --round round3 --workers 12 --origin http://<lan-ip>:<port>/`.
  - It needs `~/.cargo/bin` on PATH for its native runs.
  - Each section prints only at the end. The floors and shade take about 12 minutes; the six 400-season mixed woods are untimed in 3D.
- **The mixed wood's phone links:** `node docs/experiments/code/2026-10-30-species-3d/mixed-links.ts http://<lan-ip>:<port>/`, served by `npm run dev -- --host --port <port>`. Each link is about 12 kB.
- **Long runs** went under `setsid systemd-inhibit --what=idle:sleep … nohup … &` with the log on disk. Keep the lid open; the inhibitor doesn't cover the lid switch.
- **Spec and ADR changes, adoption and hand overrides are the user's.** Ask before diverging from `docs/spec.md` or an ADR.
