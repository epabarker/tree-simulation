# Y: age and height of lone hornbeam (and rowan, oak); params only (2026-11-06)

Heights in m (cells x 0.25). Lone = cli/trials.ts `lone` (oakOpen rules, 160 wide, species patch via withAssign). Lone tree seeds differ by <3%.
Raw: lone-results.jsonl (juvenile search), lh-results.jsonl (Lh search, 1 seed), final.jsonl (5 seeds), rowan-oak*.jsonl, g/ (garden runs), ana.py.

## Targets
- Hornbeam stand (Lockow 2009, top height HO, site index SI): age 20 / 40 / 60 / 100:
  SI 22: 8.3/14.1/17.8/22; SI 24: 9.4/15.6/19.5/24; SI 28: 11.4/18.5/22.9/28; SI 30: 12.2/19.8/24.6/30; SI 32: 12.9/21.2/26.3/32.
  Wide band (SI 22-32): 8.3-12.9 / 14.1-21.2 / 17.8-26.3 / 22-32. Central (SI 26-30): 10.4-12.2 / 17-19.8 / 21.2-24.6 / 26-30.
- Lone hornbeam age curve: none exists (Tallo has height by DBH only: q50 27 m, q90 31 m at DBH 39 cm; no ages). The stand top height is used as an upper
  bound for height at age. Coordinator's lone mature target: 20-25 m at 100-150 (real lone hornbeams <= 22 m in TreeML).
- Oak (NW-FVA h100, table 110, yield class -1/0/3): 20: 13.6/11.3; 40: 21.8/19.0/10.9; 60: 26.9/24.0/15.2; 100: 33.0/30.0/21.0.
- Beech (table 211, yc -1/0/3): 40: 21.5/18.3; 60: 30.1/26.6/16.0; 100: 40.5/36.5/24.5 (no age-20 value).
- Rowan (Sorbus aucuparia Chapman-Richards, A 17.3 k .042 p 1.251): 20: 8.5; 40: ~13.4; 60: ~15.6; 100: ~17.

## Baseline (HEAD, lone, seeds 1-5)
Hornbeam 6.2@10, 13.4@20, 20.7@40, 26.8@60, 37@100, 48.8@150. It sits at the top of the SI-32 curve to age 40, then overshoots (100: +5 m over SI 32).
So the juvenile rate is at the stand ceiling, not far above it; the real excess is late growth (plateau). Rowan 29.8@100, oak 44@100, 50.9@150.

## Settings tried (hornbeam lone, median of seeds 1,2; heights @20/40/60/100)
| patch | 20 | 40 | 60 | 100 |
|---|---|---|---|---|
| none | 13.4 | 20.7 | 26.8 | 37.0 |
| c1.mmps 2 | 9.3 | 17.5 | 24.0 | 35.2 |
| r2.hJ 30 | 10.0 | 17.8 | 24.2 | 35.0 |
| mmps 2, hJ 30 | 7.1 | 14.4 | 20.7 | 33.0 |
| dLambda 0.12 | 11.6 | 17.5 | 23.1 | 34.0 |
| dLambda 0.2 | 9.9 | 16.1 | 23.7 | 36.4 |
| dLambda 0.3 | 8.3 | 14.7 | 20.5 | 34.2 |
| dLambda 0.2, ramp 10 | 8.2 | 15.6 | 23.3 | 35.6 |
| aC 10, dLambda 0.12, ramp 40 | 13.7 | 25.1 | 31.1 | 40.7 (faster) |
| mmps 2, dLambda 0.12 | 8.9 | 14.4 | 20.0 | 30.7 |
| mmps 2, dLambda 0.16, hJ 4 | 8.8 | 13.5 | 19.6 | 30.6 |
| mmps 2.5, dLambda 0.16 | 9.6 | 15.3 | 21.9 | 33.1 |
| mmps 2, dLambda 0.16, aC 10 | 9.3 | 14.5 | 19.3 | 30.4 |
| mmps 2, dLambda 0.3 | 6.4 | 11.5 | 16.2 | 26.5 |
| mmps 2, dLambda 0.2, ramp 10 | 6.4 | 12.1 | 17.6 | 28.7 |
Juvenile-only params (mmps, hJ, dLambda, ramp) lower 20-60 but cannot bring 100 below ~30 m. Best juvenile-only: mmps 2 + dLambda 0.12 (8.9/14.4/20.0/30.7: inside the wide band at all four ages).

## Plateau: r1.Lh (seed 1; @20/40/60/100/150). Baseline hornbeam Lh 92.4, dLambda 0.0788
| patch | 20 | 40 | 60 | 100 | 150 |
|---|---|---|---|---|---|
| Lh 60 | 13.3 | 19.8 | 25.3 | 34.7 | 42.5 |
| Lh 45 | 12.9 | 18.2 | 23.5 | 31.5 | 41.2 |
| Lh 30 | 12.5 | 17.3 | 22.1 | 29.1 | 37.4 |
| Lh 15 | 11.4 | 14.8 | 18.1 | 25.3 | 32.4 |
| Lh 12 | 11.2 | 13.9 | 15.2 | 19.0 | 23.8 |
| Lh 11 | 10.9 | 13.7 | 15.5 | 21.4 | 27.3 |
| Lh 10 | 10.8 | 13.3 | 15.7 | 21.4 | 25.5 |
| Lh 8 | 10.4 | 12.5 | 15.1 | 19.5 | 21.4 |
| Lh 12, dLambda 0.1 | 10.3 | 13.7 | 15.7 | 21.0 | 26.6 |
| Lh 10, dLambda 0.06 | 11.5 | 15.3 | 17.9 | 20.7 | 24.9 |
| Lh 10, dLambda 0.02 | 13.4 | 24.2 | 30.6 | 39.9 | 50.0 (dLambda is a strong lever) |
| Lh 9, mmps 4 | 11.3 | 13.6 | 15.5 | 17.6 | 20.7 |
| Lh 45, mmps 2 | 9.3 | 15.6 | 20.7 | 29.3 | 38.0 |
| Lh 20, mmps 2, dLambda 0.12 | 7.9 | 12.6 | 15.8 | 24.8 | 33.0 |
| Lh 12, mmps 2 | 8.6 | 11.6 | 14.8 | 20.6 | 26.9 |
Response is not monotone (noise of a few m between neighbouring Lh); the seed-to-seed spread is small, so the setting needs a check on the final seeds.

## Best patches (5 seeds for hornbeam, 3 for rowan and oak; @20/40/60/100/150)
- Hornbeam {"r1.Lh":10,"r2.dLambda":0.06}: 11.6 / 15.1 / 17.9 / 20.6 / 23.8 (baseline 13.4/20.7/26.8/37.0/48.8). In the wide band at 20, 40, 60 (60 at its floor); 100 is 1.4 m under the SI 22 floor, i.e. a lone mature 21-24 m as the coordinator's target asks.
- Rowan {"r1.Lh":8}: 8.8 / 13.9 / 15.1 / 16.5 / 17.8 (baseline 11.5/22.5/25.3/29.8/32.8); matches the Chapman-Richards curve (8.5/13.4/15.6/17.0). Lh 14: 11.2/17.5/19.7/21.5/22.5.
- Oak {"r1.Lh":15}: 11.5 / 19.8 / 23.8 / 29.7 / 37.8 (baseline 11.5/25.2/34.4/44/50.9); sits on NW-FVA yield class 0 (11.3/19/24/30) to age 100. Lh 25: 11.6/21.9/27.7/37.7/46.1.
- Not done: D (dome index) at 100.

## Garden cost (forestParams(160, seed), seeds 1-5, native CLI, 150 seasons)
The 90th percentile of all live heights is dominated by the ~230 recruits (p90 2-5 m) and is not informative; top-5 mean and max live height are given too.
| config | p90 20/40/80/150 | top-5 mean 20/40/80/150 | max 40 | metamers @40 | metamers @150 |
|---|---|---|---|---|---|
| base | 2.06/2.79/3.83/4.27 | 11.5/16.9/17.7/17.7 | 24.0 | 49.1k | 50.1k |
| G1 species patches (hornbeam Lh10+dL.06, rowan Lh8, oak Lh15) | 3.13/4.06/5.04/6.25 | 10.7/15.8/16.4/19.9 | 23.3 | 37.2k | 52.0k (+4%) |
| G2 c1.mmps 2 for all eight species | 6.25/2.37/3.44/4.32 | 8.2/14.2/15.9/15.0 | 17.3 | 59.5k | 51.1k (+2%) |
Canopy at 40 vs base (top-5 mean): G1 -6%, G2 -16%; p90: G1 +46%, G2 -15%. Neither reaches -20%. G2 is -29% at season 20 (top-5), -10% at 80.
Lh is species-specific, so G1 uses per-species values, not one patch for every broadleaf. G1 reaches 150 with metamers within +4%.

## Verdict
G1 (Lh patches on hornbeam, rowan, oak): adopt in RC (canopy at 40 -6%, metamers +4%). The mmps-2 juvenile setting (G2): age-matching only (opening time-lapse emptier: -29% at 20, -16% at 40).
