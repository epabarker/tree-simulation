# Evidence: birch-lambda0.53

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.123 (p10 0.111, p90 0.159; range 0.106-0.171) |
| H/D at 300 in 60-80 | 1 | median 44.8 (p10 31, p90 57.2; range 26.2-114) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 14 | median 75.9 (p10 69.2, p90 92.8; range 61.2-120) |
| crown base: stand LCR < lone's at 150 and 300 | 9 | stand-lone at 300: median -0.0265 (p10 -0.0973, p90 0.0603; range -0.308-0.148) |
| plateau: gain 250-300 < 2, tallest < 180 | 11 | gain median 0.0448 (p10 -5.84, p90 12.3; range -6.9-24.1); tallest median 133 (p10 93.9, p90 175; range 81.9-180) |
| floor at 150 (reported) | - | median 0.13 (p10 0.111, p90 0.244; range 0.107-0.491) |

## Survival and composition

- planted trees alive: at 150 44.2%, at 300 30.0% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.36, birch 0.02, holly 0.20, hornbeam 0.10, maple 0.19, oak 0.10, rowan 0.04, willow 0.01

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 164 | 27.6 | 0.717 |
| birch | 2 | 126 | 40.2 | 0.578 |
| holly | 6 | 64.3 | 104 | 0.992 |
| hornbeam | 4 | 116 | 44 | 0.854 |
| maple | 4 | 74.1 | 38.4 | 0.765 |
| oak | 6 | 131 | 50.4 | 0.869 |
| rowan | 5 | 79.7 | 43.5 | 0.896 |

## Budget

- metamers at 200 (sum over live trees): median 7.94e+04 (p10 3.01e+04, p90 9.13e+04; range 2.87e+04-9.41e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 1.17 (p10 0.903, p90 1.44; range 0.816-1.54); CPU s/season: median 1.04 (p10 0.791, p90 1.31; range 0.713-1.37)
