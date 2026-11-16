# O4's light memory against s3d's churn (#137, ADR 0073, 2026-11-16)

**Tickets:** [#137](https://github.com/epabarker/tree-simulation/issues/137), [#132](https://github.com/epabarker/tree-simulation/issues/132). **ADR:** [0073](../decisions/0073-light-memory.md) (the user, 2026-11-16: "Yes, add light memory"). Spec §O4.4, §O4.11, §C2 (item 8's rotating sky). Off by default: nothing here changes a default.

**Why.** [The churn note](2026-11-16-stub-churn-and-hornbeam-ceiling.md) (B.1) found the floor's light under the canopy a fresh draw each season (rank correlation 0.02 between consecutive seasons; 0.83 with `c2.rotate: false`): ADR 0072's s3d promotes the season's luckiest cells and demotes them at the next draw (98% of promoted stubs demoted, three quarters at age 1). ADR 0073's `o4.lightMemory` τ makes O4 read running means instead: each ground cell's mean of Q/C for establishment and promotion, each tree's mean of Q_top/C for demotion and the `topLight` signal.

**Code:** `cli/seedling-stubs-probe.ts` (three new arms; a churn count per run; gate 3 expects version 6 from a memory arm's garden); [`code/2026-11-16-light-memory-probe/`](code/2026-11-16-light-memory-probe/): `bars.ts` (the bars below), `floor.ts` (the floor's rank correlations).

## Arms and bars (fixed before the runs)

Written and committed before any run of this probe. Nothing below this heading changes them.

- **Arms:** `head` and `s3d` as the stubs probe's; **`s3dT25`**, **`s3dT5`** and **`s3dT10`**: s3d with `o4.lightMemory` τ 2.5, 5 and 10 seasons (ADR 0073's τ source: a 5-year growth window, SORTIE's, has a mean reading age of about 2 seasons, an exponential τ 2.5; Wyckoff & Clark's 6 to over 12 years of decline before death bracket τ 5–10). World params.
- **Runs:** `node cli/seedling-stubs-probe.ts -j <n> --out runs/light-memory-probe --arms head,s3d,s3dT25,s3dT5,s3dT10`: widths 160 and 66, seeds 1–20, 300 seasons, natively, frames at 100, 200 and 300. At most 2 simulators while another agent's stand check runs, then at most 6.
- **Reuse:** head's and s3d's runs at 160 cells are the churn probe's (themselves the stubs probe's, made at a core whose output with `lightMemory` absent is this build's: the memory is off and bit-identical when absent, and the goldens are unchanged). They are linked in, not re-run. Head and s3d at 66 cells are re-run here, for the wall-time bars within one load and as the reuse check: each re-run's `hash.txt` must equal the churn probe's run of the same arm and seed, or the 160-cell runs are re-run too.
- **Gates:** the stubs probe's 1–4, unchanged, except that gate 3(b) expects a memory arm's garden checkpoint to be version 6 (head's 4, s3d's 5).
- **Bars**, judged by `bars.ts`. A memory arm passes only if it passes the gates and:
  - **the stubs probe's adoption bars 1–5 against head**, unchanged (cap ≤ ½ head's median and below head's in ≥ 15 of 20 at each width; canopy trees/ha ≥ head's at 160; hornbeam in the canopy in ≥ 30 of 60 frames; other-species takeover ≤ head's + 6; the median wall per run at 66 ≤ 1.25 × head's);
  - **M1, churn halves:** recruits per run ≤ ½ s3d's, at both widths;
  - **M2, the cap no worse:** median cap seasons ≤ s3d's, at both widths.
- If more than one arm passes, the pick is the one with the fewest recruits per run at 160 cells. A pass is a recommendation; adopting it is the user's call.
- **Reported, not gated:** the share of recruits that leave the stand within 2 seasons below 1.3 m (demoted, or rarely a suppression death); recruits reaching 1.3 m per run; #122's gates; canopy trees/ha; stems ≥ 7 cm DBH/ha; the bank; the stub pool; drawn stems/ha; wall per run at 66 cells.
- **The floor** (`floor.ts`, one run per arm, width 160, seed 1, N = 100; exploratory): ρ(raw N, raw N+1), ρ(mean N, mean N+1), and ρ(mean N, the raw mean over N+1..N+5), all ground cells, Spearman. For s3d the mean is the script's at τ 5, a reading of the memoryless stand.
- **Expected:** the memory cuts promotions roughly in proportion to how rarely a cell's mean reaches stubLight 0.15 under a canopy; a promoted tree, starting from its cell's mean, holds its slot until its own mean falls below 0.075, about τ·ln 2 seasons in the dark from 0.15, so long τ may hold bank trees at the cap as the age gate did (s3dk3, s3dk5), against M2. τ 10's risk is that; τ 2.5's that churn does not halve.

## Results

_Pending._
