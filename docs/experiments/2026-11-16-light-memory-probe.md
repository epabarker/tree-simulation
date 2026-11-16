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

## Results (seeds 1–20)

160 new runs at 6a1bd67. s3dT5 ran first, on 2 simulators beside another agent's 10 (66 min). The other two arms, and head and s3d at 66 cells, ran next on 4 simulators. The summary and the tests ran last on 6. **The reuse holds:** all 40 re-runs at 66 cells have the churn probe's hashes. Gates 1–4 pass in every arm: 35 of 35 tests, including the lone hornbeam's hashes equal to head's, the fixtures loading and growing on alike, and a memory arm's garden checkpoint round-tripping as version 6. Output: [`bars.txt`](code/2026-11-16-light-memory-probe/bars.txt), [`bars.json`](code/2026-11-16-light-memory-probe/bars.json), [`floor.txt`](code/2026-11-16-light-memory-probe/floor.txt). The full summaries are in `runs/light-memory-probe/` (generated).

| arm | gates | stubs bars 1–5 | M1 recruits/run, 160 / 66 (÷ s3d) | left within 2, 160 / 66 | M2 cap median, 160 / 66 | below head | reach 1.3 m/run, 160 / 66 | canopy/ha, 160 | ≥ 7 cm/ha, 160 / 66 | bank, 160 / 66 | wall/run, 66 (÷ head) | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| head | – | – | 1,016 / 737 | 6% / 5% | 235 / 186.5 | – | 162 / 54 | 109 | 266 / 114 | 68 / 55 | 61 s (1.00) | – |
| s3d | – | – | 7,756 / 3,511 | 84% / 90% | 79.5 / 11 | 20 / 20 | 140 / 36 | 109 | 258 / 114 | 50 / 20.5 | 68 s (1.13) | reference |
| s3dT25 | ✓ | ✓✓✓✓✓ | 777 / 298 (0.10, 0.08) ✓ | 3% / 3% | 62.5 / 14.5 ✗ | 20 / 20 | 161 / 35 | 133 | 297 / 114 | 7.5 / 0 | 58 s (0.95) | fail (M2, 66) |
| s3dT5 | ✓ | ✓✓✓✓✗ | 441 / 166 (0.06, 0.05) ✓ | 5% / 6% | 65 / 17 ✗ | 20 / 20 | 165 / 41 | 133 | 297 / 114 | 1 / 0 | 85 s (1.40)* | fail (M2, 66; bar 5*) |
| s3dT10 | ✓ | ✓✓✓✓✓ | 543 / 191 (0.07, 0.05) ✓ | 9% / 11% | 61 / 17.5 ✗ | 20 / 20 | 156 / 36 | 141 | 281 / 76 | 1 / 0 | 55 s (0.90) | fail (M2, 66) |

\* s3dT5's runs at 66 cells shared the machine with the other agent's 10 simulators, while head's ran beside 3 of this probe's. Its bar-5 failure is a load artefact, not a cost; it fails M2 in any case. #122's gates: 20/20 at 160 cells for every arm; at 66 cells 19/20 for s3dT25 and s3dT5 (s3d's), and 18/20 for s3dT10, the gate's floor. Drawn stems/ha at 160: head 1,297, s3d 657, s3dT25 1,344, s3dT5 1,438, s3dT10 680. The pool is 4.7–4.8·10⁴/ha at 160 and 6.7–7.0·10⁴ at 66 in every stubs arm.

**No arm passes.** Every memory arm passes the gates and the stubs bars (s3dT5's bar 5 aside), and M1 by a wide margin. Every one fails M2 at 66 cells:
- **The churn is gone.** Recruits fall to 5–10% of s3d's, below head's own at both widths. The share of recruits that leave within 2 seasons falls from 84–90% to 3–11%, which is head's level. s3dT25 and s3dT10 run the phone's season at 0.90–0.95 × head's (s3d's was 1.13).
- **The desktop cap improves; the phone's does not.** At 160 cells the median cap seasons fall from s3d's 79.5 to 61–65. At 66 cells they rise from 11 to 14.5 (τ 2.5), 17 (τ 5) and 17.5 (τ 10). That is 3.5–6.5 seasons of 300, against head's 186.5. The bar was "no worse", so all three fail it.
- **The full-tree bank all but vanishes** (frame median 50 → 1–7.5 at 160, 20.5 → 0 at 66). Seedlings stay stubs until their cell's mean light reaches 0.15. Recruits that reach 1.3 m are head's (156–165 a run at 160, against s3d's 140). Stems ≥ 7 cm/ha are 281–297 (band 200–400), and canopy trees/ha rise from 109 to 133–141 at 160.
- τ 10 is the first arm to cost the phone canopy (56.8/ha against 75.8) and #122's gate margin (18/20).

**The floor** (`floor.ts`, seed 1, 160 cells, N = 100):

| arm | ρ(raw N, raw N+1) | ρ(mean N, mean N+1) | ρ(mean N, raw mean N+1..N+5) | cells ≥ 0.15, raw / mean |
|---|---|---|---|---|
| s3d (mean at τ 5, read only) | 0.02 | 0.80 | −0.03 | 2.3% / 0.0% |
| s3dT25 | 0.02 | 0.71 | −0.01 | 1.9% / 0.0% |
| s3dT5 | −0.03 | 0.81 | −0.03 | 1.3% / 0.0% |
| s3dT10 | −0.01 | 0.89 | −0.03 | 1.8% / 0.0% |

- The mean is persistent by construction (0.71–0.89 from one season to the next), but it does not predict the next five seasons' light any better than one season does (ρ ≈ 0).
- Under the canopy the floor's light has no cell-to-cell structure for a mean to find. Every cell's mean regresses to the same value, below stubLight: no cell's mean reaches 0.15 at season 100.
- So the memory does not make the floor predictable. It makes promotion need light that lasts, which under a closed canopy only a real gap gives. That is "until lit" read as integrated light, and it is why the churn ends rather than moves.

## Conclusions and recommendation

- **Against the pre-registered bars, no τ passes.** The only miss is M2 at the phone's width: 3.5 (τ 2.5) to 6.5 (τ 10) more cap seasons than s3d's 11, against head's 186.5. Everything else improves on s3d:
  - churn ÷ 10–20, to below head's;
  - the phone's season cheaper than head's;
  - more recruits reaching 1.3 m;
  - more canopy trees on the desktop.
- **If a τ is adopted despite M2, take τ 2.5.** It is the shortest memory and the nearest to SORTIE's five-year window. It has the smallest phone cap regression (14.5) and keeps the phone's canopy and gates at s3d's. τ 10 begins to cost the phone canopy.
- Whether M2's 3.5 seasons matter is the user's call. The bar was set as "no worse" before the runs and stands as written. Re-running s3dT25 against a looser bar would be a new probe.
- **#132** should be re-probed with `lightMemory` on. The `topLight` ramp then reads each tree's running mean through `memory::top`, and on the floor's evidence one season's top light is as much noise as one season's ground light.
