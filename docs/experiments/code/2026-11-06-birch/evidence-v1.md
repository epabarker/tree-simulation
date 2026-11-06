# Evidence: v1

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"birch": {"r2.levels.2.lateralEvery": 2}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.128 (p10 0.111, p90 0.154; range 0.109-0.176) |
| H/D at 300 in 60-80 | 3 | median 44.2 (p10 34.4, p90 64.7; range 22.5-96) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 13 | median 72.4 (p10 64.5, p90 105; range 62.6-138) |
| crown base: stand LCR < lone's at 150 and 300 | 6 | stand-lone at 300: median -0.0187 (p10 -0.077, p90 0.0951; range -0.318-0.163) |
| plateau: gain 250-300 < 2, tallest < 180 | 13 | gain median 0.392 (p10 -3.39, p90 7.09; range -7.79-22.3); tallest median 140 (p10 85.7, p90 181; range 83.4-186) |
| floor at 150 (reported) | - | median 0.139 (p10 0.114, p90 0.281; range 0.111-0.313) |

## Survival and composition

- planted trees alive: at 150 46.7%, at 300 30.8% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.30, birch 0.02, holly 0.17, hornbeam 0.13, maple 0.18, oak 0.14, rowan 0.05, willow 0.01

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 172 | 31.5 | 0.715 |
| birch | 2 | 129 | 57 | 0.557 |
| holly | 6 | 71.1 | 97.6 | 0.993 |
| hornbeam | 4 | 115 | 49.8 | 0.854 |
| maple | 4 | 71.2 | 36.9 | 0.784 |
| oak | 7 | 130 | 54.7 | 0.907 |
| rowan | 5 | 80.6 | 51.8 | 0.894 |

## Budget

- metamers at 200 (sum over live trees): median 7.79e+04 (p10 3.48e+04, p90 9.32e+04; range 2.55e+04-9.67e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.823 (p10 0.59, p90 1.21; range 0.456-1.3); CPU s/season: median 0.812 (p10 0.583, p90 1.19; range 0.451-1.28)
