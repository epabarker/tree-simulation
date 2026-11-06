# Evidence: v2

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"birch": {"r2.levels.0.lambda": 0.5882}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.13 (p10 0.119, p90 0.159; range 0.118-0.181) |
| H/D at 300 in 60-80 | 4 | median 42 (p10 32.2, p90 67.6; range 24.3-86.8) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 16 | median 74.2 (p10 65.1, p90 97.4; range 62-200) |
| crown base: stand LCR < lone's at 150 and 300 | 6 | stand-lone at 300: median -0.0228 (p10 -0.125, p90 0.087; range -0.419-0.162) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median -0.145 (p10 -5.31, p90 6.46; range -6.23-26.3); tallest median 149 (p10 85.6, p90 174; range 73.3-187) |
| floor at 150 (reported) | - | median 0.143 (p10 0.115, p90 0.229; range 0.112-0.29) |

## Survival and composition

- planted trees alive: at 150 47.5%, at 300 30.0% (count at 300 per seed: median 2 (p10 0, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.40, birch 0.09, holly 0.14, hornbeam 0.09, maple 0.20, oak 0.04, rowan 0.05, willow 0.01

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 162 | 30.5 | 0.721 |
| birch | 2 | 139 | 64.4 | 0.507 |
| holly | 6 | 59.3 | 82.5 | 0.993 |
| hornbeam | 4 | 114 | 37.2 | 0.85 |
| maple | 4 | 69.7 | 34.9 | 0.743 |
| oak | 6 | 127 | 63.8 | 0.882 |
| rowan | 5 | 73.3 | 53.4 | 0.912 |

## Budget

- metamers at 200 (sum over live trees): median 5.29e+04 (p10 2.91e+04, p90 8.9e+04; range 2.43e+04-9.37e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.892 (p10 0.626, p90 1.18; range 0.345-1.31); CPU s/season: median 0.877 (p10 0.618, p90 1.16; range 0.341-1.29)
