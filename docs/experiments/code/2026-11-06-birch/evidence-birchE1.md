# Evidence: birch-l053-every1

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.13 (p10 0.116, p90 0.16; range 0.113-0.17) |
| H/D at 300 in 60-80 | 2 | median 44.1 (p10 34.5, p90 66; range 24.5-84.5) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 12 | median 70.4 (p10 64.6, p90 115; range 60.2-157) |
| crown base: stand LCR < lone's at 150 and 300 | 5 | stand-lone at 300: median -0.0288 (p10 -0.103, p90 0.0408; range -0.235-0.156) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median 1.48 (p10 -1.72, p90 13.5; range -5.48-25.3); tallest median 133 (p10 92.3, p90 174; range 82.2-179) |
| floor at 150 (reported) | - | median 0.135 (p10 0.119, p90 0.267; range 0.117-0.37) |

## Survival and composition

- planted trees alive: at 150 47.5%, at 300 30.0% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.29, birch 0.02, holly 0.14, hornbeam 0.09, maple 0.20, oak 0.17, rowan 0.07, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 165 | 32.9 | 0.753 |
| birch | 2 | 109 | 48.7 | 0.499 |
| holly | 5 | 51.2 | 84.5 | 0.992 |
| hornbeam | 4 | 114 | 44.2 | 0.831 |
| maple | 4 | 67.9 | 36 | 0.731 |
| oak | 7 | 131 | 57.8 | 0.855 |
| rowan | 5 | 83.3 | 56.7 | 0.843 |

## Budget

- metamers at 200 (sum over live trees): median 5.91e+04 (p10 3.39e+04, p90 8.75e+04; range 2.41e+04-9.29e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.748 (p10 0.504, p90 1.07; range 0.501-1.2); CPU s/season: median 0.734 (p10 0.496, p90 1.05; range 0.493-1.18)
