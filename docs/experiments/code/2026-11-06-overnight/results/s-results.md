# S: beech, oak and birch as departures from the generic irregularity base (overnight agent S, 2026-11-06)

**Status: DONE (03:12).** 24 candidates in all (beech 9, oak 12, birch 3), plus diagnostics and confirmation runs.

## Method
- **Build:** `scratchpad/i0/wt` at f6dda9d (R's rules; WASM built there once with `npm ci && npm run build:wasm`), used read-only. Scripts and outputs in `scratchpad/s/` (`run.py`, `score.py`, `table.py`, `boot.py`, `height.ts`, `hrun.py`; per-tree descriptors `out/`).
- **Runs:** `analysis/experiments/crownbase_dump.ts` (the trials' `standParams` / `loneParams`, species patch via `cli/trials.ts`'s `withAssign`, a dotted-path amend of the shipped species, verified on oak: `c1.betaSD`, `c4.axisSD`, `c1.budBreak` and `r1.Lh` reach `speciesParams`). Seeds 101–108; confirmation on fresh seeds 109–116 (`@B` rows). Descriptors: R's `desc.py` (A11's `reg.py`, A9/A11 coarsening at d_min 8.62 mm).
- **Start (S0):** shipped species + the generic base `{"c1.shootLengthSD": 0.5, "c4.axisSD": 50, "c1.betaSD": 60, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}`. **No height patch** (the overseer withdrew Y's L_h patches mid-run; oak was never scored with L_h 15). `SHIP` = shipped species alone (no base), for reference.
- **Targets:** T's pools, recomputed from `t/real_desc.json` (medians reproduce `t/targets.json` exactly): lone TreeML beech n 9 (H 18.2 m), oak TreeML + Belgian hedgerows n 25 (H 16.6 m), birch TreeML + Belgian n 17 (H 15.9 m); stand BioDiv + DEMOL beech n 66, Wytham oak n 37; no stand birch. `s/targets_s.json`.
- **Score:** lone at the season (of a 5-season grid) whose median coarsened height is nearest the real lone median H; stand at 70, survivors of the 4 measured trees per seed (32). z = (sim median − real median) / real SD; **loss = Σ|z| over spacingCV, attachPerM, insertSD, elevSD**, lone + stand. In band = real p10–p90 widened by A14's noise (spacingCV ±0.05, insertSD ±6°, elevSD ±5°, attachPerM ±0). earlyFork shown as a check only; curvPersist not used.
- **Noise:** loss SD by bootstrapping seeds (200×): beech S0 0.9, oak S0 1.0, birch S0 0.6. A candidate counts only if it beats S0 by > 1 SD and holds on seeds 109–116.
- **Search:** knobs shootLengthSD, axisSD, betaSD only, directions taken from R's hornbeam grid (s ↑ → spacingCV ↑, attachPerM ↓; betaSD ↑ → insertSD ↑; axisSD ↑ → elevSD ↑). `DIAG-` rows are diagnostics outside the 3 knobs, not candidates.

## Beech (9 candidates + 3 confirmation runs)
**Final patch:**
```json
{"c1.shootLengthSD": 0.35, "c4.axisSD": 50, "c1.betaSD": 70, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}
```
- **Loss:** start (S0) 5.20 → best 3.14 (seeds 101–108); on fresh seeds 109–116, 6.28 → 3.44. SHIP (no base) 18.4.
- **In band:** 4/4 lone, 4/4 stand (S0 was already 4/4 and 4/4; the gain is in centring, mainly lone insertSD −1.1 → −0.3 z and lone/stand spacingCV).
- The plateau is flat: s 0.35–0.4 with betaSD 60–75 all score 3.1–3.3 (s0.4 confirms at 3.91). Candidates: s0.4, b75, s0.4-b75, a65, s0.35, s0.3, s0.4-a40, s0.35-b70 (+ S0).
- **Check (not gated): lone earlyFork 0.47–0.54 against real 0.30** (band ±0.09): the lone sim still forks early; stand 0.31–0.34 against 0.24 is fine.
- **Stand survival at 70 fails R's constraint (≥ 28 of 32) on the fresh seeds:** SHIP 32/32, S0 23/32 (both seed sets), final 28/32 on 101–108 but **26/32 on 109–116**. The generic base costs beech stand trees; the final patch recovers some but not all. G-forest at integration is the real gate.
- **Caveat:** the simulated stand at 70 is 28–33 m against the real pool's 24 m (and the lone trees 17–19 m against 18.2 m are matched). elevSD depends on limb position along the trunk; not tuned for.

| cond | loss | lone season, H | stand surv | stand H | lone spacingCV | lone attachPerM | lone insertSD | lone elevSD | stand spacingCV | stand attachPerM | stand insertSD | stand elevSD | lone earlyFork | stand earlyFork | in band (lone/stand) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **real** (median [band]) | | 18.2 m (n 9) | | 24.0 m (n 66) | 0.47 [0.38–0.55] | 1.49 [1.27–1.72] | 37.00 [26.46–48.42] | 29.03 [21.81–46.58] | 0.41 [0.28–0.57] | 1.52 [1.02–1.96] | 24.95 [11.43–45.41] | 24.82 [13.62–42.33] | 0.30 | 0.24 | |
| SHIP | 18.43 | 45, 17.7 m | 32/32 | 36.5 m | 0.33 (-2.8) ✗ | 2.18 (+3.0) ✗ | 12.32 (-4.3) ✗ | 14.66 (-2.2) ✗ | 0.25 (-2.3) ✗ | 2.21 (+1.8) ✗ | 9.77 (-1.5) ✗ | 21.05 (-0.5) ✓ | 0.48 | 0.50 | 0/1 |
| S0 | 5.20 | 40, 17.7 m | 23/32 | 31.3 m | 0.51 (+0.9) ✓ | 1.44 (-0.2) ✓ | 30.76 (-1.1) ✓ | 24.97 (-0.6) ✓ | 0.47 (+0.8) ✓ | 1.32 (-0.5) ✓ | 32.20 (+0.7) ✓ | 27.21 (+0.3) ✓ | 0.48 | 0.40 | 4/4 |
| s0.4 | 3.25 | 45, 19.0 m | 28/32 | 29.2 m | 0.48 (+0.3) ✓ | 1.54 (+0.2) ✓ | 31.24 (-1.0) ✓ | 26.13 (-0.4) ✓ | 0.41 (+0.0) ✓ | 1.37 (-0.4) ✓ | 31.18 (+0.6) ✓ | 26.77 (+0.2) ✓ | 0.47 | 0.41 | 4/4 |
| s0.35-b70 | 3.14 | 40, 17.4 m | 28/32 | 28.0 m | 0.46 (-0.2) ✓ | 1.65 (+0.7) ✓ | 35.08 (-0.3) ✓ | 25.55 (-0.5) ✓ | 0.39 (-0.3) ✓ | 1.41 (-0.3) ✓ | 31.77 (+0.7) ✓ | 25.69 (+0.1) ✓ | 0.47 | 0.31 | 4/4 |
| s0.4-b75 | 3.33 | 45, 18.7 m | 26/32 | 24.9 m | 0.47 (+0.0) ✓ | 1.55 (+0.3) ✓ | 33.36 (-0.6) ✓ | 24.94 (-0.6) ✓ | 0.42 (+0.1) ✓ | 1.35 (-0.4) ✓ | 34.58 (+1.0) ✓ | 26.92 (+0.3) ✓ | 0.51 | 0.38 | 4/4 |
| S0@B | 6.28 | 45, 18.9 m | 23/32 | 30.4 m | 0.55 (+1.7) ✓ | 1.39 (-0.4) ✓ | 32.58 (-0.8) ✓ | 23.84 (-0.8) ✓ | 0.47 (+0.8) ✓ | 1.28 (-0.6) ✓ | 30.72 (+0.6) ✓ | 29.20 (+0.5) ✓ | 0.47 | 0.39 | 4/4 |
| s0.4@B | 3.91 | 40, 17.5 m | 25/32 | 33.0 m | 0.45 (-0.4) ✓ | 1.60 (+0.5) ✓ | 30.79 (-1.1) ✓ | 25.59 (-0.5) ✓ | 0.39 (-0.3) ✓ | 1.49 (-0.1) ✓ | 33.91 (+0.9) ✓ | 24.13 (-0.1) ✓ | 0.54 | 0.38 | 4/4 |
| s0.35-b70@B | 3.44 | 45, 18.6 m | 26/32 | 27.8 m | 0.46 (-0.1) ✓ | 1.60 (+0.5) ✓ | 35.12 (-0.3) ✓ | 23.52 (-0.8) ✓ | 0.40 (-0.2) ✓ | 1.46 (-0.2) ✓ | 34.46 (+1.0) ✓ | 28.19 (+0.4) ✓ | 0.48 | 0.34 | 4/4 |

## Oak (12 candidates + 3 diagnostics + 3 confirmation runs)
**Final patch** (no `r1.Lh`: Y's patch withdrawn):
```json
{"c1.shootLengthSD": 0.3, "c4.axisSD": 35, "c1.betaSD": 40, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}
```
- **Loss:** start (S0) 9.31 → best 3.43 (seeds 101–108); fresh seeds 109–116: 9.71 → 3.20. SHIP 17.2. Over both seed sets s0.3-a35-b40 (3.32) and s0.25-a35-b45 (3.35) tie; the first is taken (better on fresh seeds). Bootstrap SD of the best 0.3.
- **In band:** lone 4/4, stand 3/4 (S0: 4/3). The generic base is too irregular for oak in the lone tree (insertSD +1.8 z, elevSD +1.3, spacingCV +1.3, attachPerM −1.3); all three knobs come down (s 0.5 → 0.3, axisSD 50 → 35, betaSD 60 → 40), which centres every lone descriptor (|z| ≤ 0.4).
- **Out of band, unreachable with the 3 knobs: stand attachPerM** 0.95–0.97 against real 1.49 [1.15–1.81] (z −1.5). Every source of irregularity lowers it: SHIP 1.43, + stochastic budBreak alone 1.27 (DIAG-bbonly), + s 0.3 with no angle noise 0.91, angle noise with s 0 1.10, deterministic budBreak with the final knobs 1.02. The best inside the knobs (s 0, 1.10) still misses the band and gives up lone centring. **Not a pick:** oak's picks (posture by age, setPoint 35 → 85; dLambda 0.04) do not touch limb density; the likelier cause is the stand itself: the simulated stand at 70 is 28 m against Wytham's 19.9 m, so its limbs are counted on a taller, more self-pruned stem. Fixing it needs a stand-specific change (a budBreak width per species, or matching the stand's age to the pool), outside S's remit.
- **Check (not gated):** stand earlyFork 0.11–0.14 against real 0.23 (at or just below the median − 0.09 edge); lone 0.31–0.35 against 0.35.
- Stand survival 32/32 throughout; lone metamers at the matched season 12.5k against S0 11.3k (1.1×).
- The lone season matched is 25 (15.7–16.3 m against 16.6 m) for every candidate.

| cond | loss | lone season, H | stand surv | stand H | lone spacingCV | lone attachPerM | lone insertSD | lone elevSD | stand spacingCV | stand attachPerM | stand insertSD | stand elevSD | lone earlyFork | stand earlyFork | in band (lone/stand) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **real** (median [band]) | | 16.6 m (n 25) | | 19.9 m (n 37) | 0.39 [0.26–0.50] | 1.86 [1.46–2.10] | 23.03 [13.68–36.50] | 25.67 [13.37–36.25] | 0.41 [0.31–0.60] | 1.49 [1.15–1.81] | 26.27 [12.97–40.96] | 23.94 [13.80–35.64] | 0.35 | 0.23 | |
| SHIP | 17.15 | 25, 14.9 m | 32/32 | 29.0 m | 0.36 (-0.6) ✓ | 2.24 (+1.4) ✗ | 4.19 (-4.3) ✗ | 7.05 (-3.4) ✗ | 0.32 (-1.1) ✓ | 1.43 (-0.2) ✓ | 4.68 (-3.4) ✗ | 9.43 (-2.7) ✗ | 0.13 | 0.06 | 1/2 |
| DIAG-bbonly | 14.92 | 30, 18.3 m | 32/32 | 29.5 m | 0.38 (-0.2) ✓ | 2.05 (+0.7) ✓ | 4.97 (-4.1) ✗ | 10.33 (-2.8) ✗ | 0.44 (+0.3) ✓ | 1.27 (-0.6) ✓ | 4.78 (-3.3) ✗ | 9.43 (-2.7) ✗ | 0.06 | 0.03 | 2/2 |
| S0 | 9.31 | 25, 17.3 m | 32/32 | 25.9 m | 0.47 (+1.3) ✓ | 1.52 (-1.3) ✓ | 30.90 (+1.8) ✓ | 32.93 (+1.3) ✓ | 0.46 (+0.6) ✓ | 0.82 (-1.9) ✗ | 28.45 (+0.3) ✓ | 27.86 (+0.7) ✓ | 0.38 | 0.17 | 4/3 |
| s0.3 | 6.32 | 25, 15.8 m | 32/32 | 28.2 m | 0.38 (-0.1) ✓ | 1.76 (-0.4) ✓ | 30.37 (+1.7) ✓ | 32.03 (+1.2) ✓ | 0.40 (-0.1) ✓ | 0.89 (-1.7) ✗ | 27.97 (+0.3) ✓ | 28.49 (+0.9) ✓ | 0.26 | 0.12 | 4/3 |
| a35-b40 | 6.55 | 25, 15.9 m | 32/32 | 25.4 m | 0.46 (+1.1) ✓ | 1.51 (-1.3) ✓ | 27.03 (+0.9) ✓ | 27.50 (+0.3) ✓ | 0.45 (+0.5) ✓ | 0.86 (-1.8) ✗ | 22.79 (-0.5) ✓ | 23.47 (-0.1) ✓ | 0.39 | 0.15 | 4/3 |
| s0.35-a40-b45 | 4.63 | 25, 15.6 m | 32/32 | 26.3 m | 0.39 (-0.0) ✓ | 1.74 (-0.4) ✓ | 26.52 (+0.8) ✓ | 27.95 (+0.4) ✓ | 0.43 (+0.2) ✓ | 0.82 (-1.9) ✗ | 23.34 (-0.5) ✓ | 25.73 (+0.3) ✓ | 0.37 | 0.13 | 4/3 |
| s0.25-a25-b30 | 5.84 | 25, 15.1 m | 32/32 | 28.3 m | 0.38 (-0.2) ✓ | 1.77 (-0.3) ✓ | 17.94 (-1.2) ✓ | 22.25 (-0.6) ✓ | 0.42 (+0.1) ✓ | 0.96 (-1.5) ✗ | 17.65 (-1.3) ✓ | 20.89 (-0.6) ✓ | 0.31 | 0.09 | 4/3 |
| s0.2-a35-b40 | 4.05 | 25, 15.3 m | 32/32 | 28.5 m | 0.36 (-0.5) ✓ | 1.79 (-0.3) ✓ | 25.90 (+0.7) ✓ | 24.97 (-0.1) ✓ | 0.43 (+0.2) ✓ | 0.92 (-1.6) ✗ | 23.70 (-0.4) ✓ | 25.66 (+0.3) ✓ | 0.26 | 0.11 | 4/3 |
| s0.3-a30-b35 | 3.71 | 25, 16.2 m | 32/32 | 27.7 m | 0.39 (+0.0) ✓ | 1.72 (-0.5) ✓ | 23.47 (+0.1) ✓ | 25.88 (+0.0) ✓ | 0.42 (+0.1) ✓ | 0.96 (-1.5) ✗ | 20.38 (-0.9) ✓ | 21.60 (-0.4) ✓ | 0.26 | 0.12 | 4/3 |
| s0.25-a20-b45 | 6.33 | 25, 15.3 m | 32/32 | 28.7 m | 0.37 (-0.4) ✓ | 1.80 (-0.2) ✓ | 20.48 (-0.6) ✓ | 19.04 (-1.2) ✓ | 0.40 (-0.2) ✓ | 1.00 (-1.4) ✗ | 19.41 (-1.1) ✓ | 17.81 (-1.2) ✓ | 0.31 | 0.10 | 4/3 |
| s0.1-a35-b45 | 3.67 | 25, 15.3 m | 32/32 | 29.1 m | 0.36 (-0.6) ✓ | 1.85 (-0.0) ✓ | 25.98 (+0.7) ✓ | 26.53 (+0.2) ✓ | 0.42 (+0.0) ✓ | 0.99 (-1.5) ✗ | 22.72 (-0.6) ✓ | 24.71 (+0.1) ✓ | 0.31 | 0.09 | 4/3 |
| s0-a35-b45 | 3.56 | 25, 15.0 m | 32/32 | 29.2 m | 0.40 (+0.1) ✓ | 1.98 (+0.5) ✓ | 24.57 (+0.3) ✓ | 28.10 (+0.5) ✓ | 0.45 (+0.5) ✓ | 1.10 (-1.1) ✗ | 23.81 (-0.4) ✓ | 24.99 (+0.2) ✓ | 0.23 | 0.09 | 4/3 |
| s0.25-a35-b45 | 3.22 | 25, 15.7 m | 32/32 | 28.5 m | 0.37 (-0.4) ✓ | 1.76 (-0.4) ✓ | 24.50 (+0.3) ✓ | 26.99 (+0.2) ✓ | 0.41 (-0.0) ✓ | 0.96 (-1.5) ✗ | 24.20 (-0.3) ✓ | 23.70 (-0.0) ✓ | 0.27 | 0.11 | 4/3 |
| s0.3-a35-b40 | 3.43 | 25, 16.3 m | 32/32 | 28.2 m | 0.39 (+0.0) ✓ | 1.75 (-0.4) ✓ | 23.11 (+0.0) ✓ | 27.63 (+0.4) ✓ | 0.40 (-0.1) ✓ | 0.95 (-1.6) ✗ | 22.52 (-0.6) ✓ | 25.83 (+0.4) ✓ | 0.31 | 0.14 | 4/3 |
| DIAG-s0.3-a0-b0 | 15.46 | 30, 18.5 m | 32/32 | 27.6 m | 0.38 (-0.2) ✓ | 1.74 (-0.4) ✓ | 6.88 (-3.7) ✗ | 9.07 (-3.1) ✗ | 0.40 (-0.2) ✓ | 0.91 (-1.7) ✗ | 4.63 (-3.4) ✗ | 8.63 (-2.9) ✗ | 0.16 | 0.10 | 2/1 |
| DIAG-bbdet-s0.3-a35-b40 | 4.83 | 25, 15.7 m | 32/32 | 27.4 m | 0.38 (-0.1) ✓ | 1.75 (-0.4) ✓ | 28.11 (+1.2) ✓ | 28.06 (+0.4) ✓ | 0.35 (-0.8) ✓ | 1.02 (-1.4) ✗ | 23.40 (-0.4) ✓ | 23.57 (-0.1) ✓ | 0.38 | 0.13 | 4/3 |
| S0@B | 9.71 | 25, 16.4 m | 32/32 | 23.7 m | 0.45 (+1.0) ✓ | 1.52 (-1.3) ✓ | 31.48 (+1.9) ✓ | 32.58 (+1.3) ✓ | 0.48 (+0.9) ✓ | 0.69 (-2.3) ✗ | 26.97 (+0.1) ✓ | 29.05 (+1.0) ✓ | 0.28 | 0.16 | 4/3 |
| s0.25-a35-b45@B | 3.48 | 25, 16.3 m | 32/32 | 28.9 m | 0.37 (-0.3) ✓ | 1.76 (-0.4) ✓ | 24.61 (+0.4) ✓ | 27.22 (+0.3) ✓ | 0.41 (+0.0) ✓ | 0.95 (-1.6) ✗ | 22.68 (-0.6) ✓ | 24.08 (+0.0) ✓ | 0.24 | 0.12 | 4/3 |
| s0.3-a35-b40@B | 3.20 | 25, 16.1 m | 32/32 | 27.8 m | 0.39 (-0.0) ✓ | 1.76 (-0.4) ✓ | 24.60 (+0.4) ✓ | 25.75 (+0.0) ✓ | 0.40 (-0.2) ✓ | 0.97 (-1.5) ✗ | 22.69 (-0.6) ✓ | 24.80 (+0.2) ✓ | 0.35 | 0.14 | 4/3 |

## Birch (3 candidates + 1 confirmation run; lone only, no stand pool)
**Final patch: the generic base unchanged:**
```json
{"c1.shootLengthSD": 0.5, "c4.axisSD": 50, "c1.betaSD": 60, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}
```
- **Loss:** S0 1.78 (fresh seeds 1.84); SHIP 12.8. No candidate beats S0 by more than its bootstrap SD (0.6): s0.4 1.40, s0.6 1.56, b45 1.85, so S0 stands (Method's acceptance rule: beat S0 by more than its bootstrap SD, then hold on 109–116).
- **In band:** lone 4/4 (all |z| ≤ 0.8). The birch bands are wide (insertSD 13–48°, n 17 mixed TreeML and hedgerow trees), so the in-band count is weak evidence here.
- The matched lone season hops between 20 (14.9 m) and 25 (17.1 m) against the real 15.9 m: the 5-season grid brackets it, adding noise to the comparison.
- **Check:** lone earlyFork 0.39 against real 0.27 (inside ±0.09 by 0.03).

| cond | loss | lone season, H | lone spacingCV | lone attachPerM | lone insertSD | lone elevSD | lone earlyFork | in band (lone/stand) |
|---|---|---|---|---|---|---|---|---|
| **real** (median [band]) | | 15.9 m (n 17) | 0.47 [0.28–0.57] | 1.60 [1.20–1.93] | 30.46 [13.06–48.34] | 30.42 [14.91–41.99] | 0.27 | |
| SHIP | 12.76 | 25, 16.9 m | 0.26 (-2.6) ✗ | 2.46 (+3.0) ✗ | 3.97 (-2.9) ✗ | 1.93 (-4.2) ✗ | 0.57 | 0 |
| S0 | 1.78 | 20, 14.9 m | 0.40 (-0.8) ✓ | 1.42 (-0.6) ✓ | 33.16 (+0.3) ✓ | 30.82 (+0.1) ✓ | 0.39 | 4 |
| s0.4 | 1.40 | 25, 17.1 m | 0.38 (-1.1) ✓ | 1.54 (-0.2) ✓ | 30.42 (-0.0) ✓ | 30.95 (+0.1) ✓ | 0.33 | 4 |
| s0.6 | 1.56 | 25, 17.4 m | 0.46 (-0.1) ✓ | 1.22 (-1.3) ✓ | 30.52 (+0.0) ✓ | 29.72 (-0.1) ✓ | 0.39 | 4 |
| b45 | 1.85 | 25, 17.2 m | 0.42 (-0.5) ✓ | 1.43 (-0.6) ✓ | 28.32 (-0.2) ✓ | 33.62 (+0.5) ✓ | 0.39 | 4 |

## G-height (report only; nothing fixed)
Lone trial (`loneParams`), seeds 1–5 as T's table, height and DBH from `cli/allometry.ts` (T's instrument; `height.ts`). Bands are T's (`t/heights.json`): the age anchor's upper value (NW-FVA H100 for beech and oak) and Tallo's q90 **at T's simulated DBH** (not re-read at ours; DBH is close: within ±15 cm). Flag at > 1.3×.

| species | patch | season | n | sim H m (T's shipped) | sim DBH (T's shipped) | age upper m | Tallo q90 m | H / age | H / Tallo | flag |
|---|---|---|---|---|---|---|---|---|---|---|
| beech | S0 | 100 | 5 | 33.7 (shipped 30.6) | 106 cm (shipped 103) | 40.5 | 46.1 | 0.83 | 0.73 |  |
| beech | S0 | 150 | 5 | 45.0 (shipped 39.0) | 122 cm (shipped 125) | 34.1 | 46.1 | 1.32 | 0.97 | FLAG |
| beech | s0.35-b70 | 100 | 5 | 32.6 (shipped 30.6) | 104 cm (shipped 103) | 40.5 | 46.1 | 0.81 | 0.71 |  |
| beech | s0.35-b70 | 150 | 5 | 40.1 (shipped 39.0) | 123 cm (shipped 125) | 34.1 | 46.1 | 1.17 | 0.87 |  |
| oak | S0 | 100 | 5 | 40.0 (shipped 44.6) | 51 cm (shipped 64) | 33.0 | 37.8 | 1.21 | 1.06 |  |
| oak | S0 | 150 | 5 | 50.4 (shipped 50.9) | 57 cm (shipped 71) | 37.2 | 38.2 | 1.35 | 1.32 | FLAG |
| oak | s0.3-a35-b40 | 100 | 5 | 44.6 (shipped 44.6) | 65 cm (shipped 64) | 33.0 | 37.8 | 1.35 | 1.18 | FLAG |
| oak | s0.3-a35-b40 | 150 | 5 | 51.0 (shipped 50.9) | 74 cm (shipped 71) | 37.2 | 38.2 | 1.37 | 1.34 | FLAG |
| birch | S0 | 100 | 5 | 43.1 (shipped 43.3) | 41 cm (shipped 45) | none | 39.3 | nan | 1.10 |  |
| birch | S0 | 150 | 5 | 48.4 (shipped 49.3) | 42 cm (shipped 55) | none | 41.6 | nan | 1.17 |  |

- **Beech:** final 32.6 m at 100 (0.81× its anchor), 40.1 m at 150 (1.17×). S0 is marginal at 150 (45.0 m, 1.32×). S0's five seeds span 38.9–46.8 m at 150, so the difference is within 5-seed noise: no flag is established either way. Shipped: 39.0 m.
- **Oak: flags at 100 and 150 (1.35× and 1.37× the NW-FVA anchor; 1.18× and 1.34× Tallo q90)**, back at shipped oak's height (44.6 / 50.9 m). **Direction: away from the band at 100:** the base alone (S0) was 40.0 m (1.21×, no flag); the final knobs return it to 44.6 m. At 150 S0 already flagged (1.35×). The fix (Y's L_h 15) was withdrawn for collapsing the crown, so oak's height stays an open outlier.
- **Birch:** 43.1 / 48.4 m, 1.10× / 1.17× Tallo q90 (no age anchor): no flag, as shipped.

## Summary
| species | final patch (dotted, on the shipped species) | loss start → best (101–108) | fresh seeds 109–116 | in band lone / stand | height flag | pick blocking a target |
|---|---|---|---|---|---|---|
| beech | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 50, "c1.betaSD": 70, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 5.20 → 3.14 | 6.28 → 3.44 | 4/4, 4/4 | none (1.17× at 150; S0 1.32×, within seed noise) | none |
| oak | `{"c1.shootLengthSD": 0.3, "c4.axisSD": 35, "c1.betaSD": 40, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 9.31 → 3.43 | 9.71 → 3.20 | 4/4, 3/4 (stand attachPerM 0.96 vs ≥ 1.15) | **1.35× / 1.37×** at 100 / 150 (away from the band at 100: S0 1.21×) | none (stand attachPerM is not a pick's; see Oak) |
| birch | base unchanged | 1.78 (no gain beyond noise) | 1.84 | 4/4, no stand pool | none | none |

- **Beech stand survival misses R's ≥ 28/32 on fresh seeds** (26/32; S0 23/32; SHIP 32/32). Beech lone earlyFork 0.47–0.54 against real 0.30 (check only).
- **The patches depend on the base.** Each is a complete, absolute dotted assign on the shipped species, ready to apply as written. They were tuned with the r-best0 base (budBreak stochastic width 1.0; budBreak alone moves oak's stand attachPerM by about 0.16). If R's final generic base differs from r-best0, beech and oak need a rescore against it (`s/run.py` + `s/score.py`, about 3 min a candidate).
