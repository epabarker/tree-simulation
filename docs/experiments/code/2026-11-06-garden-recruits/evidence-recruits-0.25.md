# Evidence: recruits-0.25

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.126 (p10 0.111, p90 0.161; range 0.104-0.205) |
| H/D at 300 in 60-80 | 3 | median 45.3 (p10 33.6, p90 64.5; range 28.5-145) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 12 | median 74.9 (p10 66, p90 119; range 62.5-170) |
| crown base: stand LCR < lone's at 150 and 300 | 12 | stand-lone at 300: median -0.0451 (p10 -0.134, p90 0.0507; range -0.376-0.115) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median 0.88 (p10 -5.4, p90 11.4; range -20.7-28.7); tallest median 139 (p10 89.1, p90 168; range 82.3-175) |
| floor at 150 (reported) | - | median 0.137 (p10 0.113, p90 0.276; range 0.109-0.321) |

## Survival and composition

- planted trees alive: at 150 43.3%, at 300 30.8% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.29, birch 0.03, holly 0.17, hornbeam 0.13, maple 0.18, oak 0.14, rowan 0.05, willow 0.01

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 153 | 29.3 | 0.705 |
| birch | 2 | 141 | 70.4 | 0.591 |
| holly | 6 | 52 | 95.5 | 0.992 |
| hornbeam | 4 | 116 | 45.4 | 0.845 |
| maple | 4 | 73.8 | 39.3 | 0.788 |
| oak | 7 | 130 | 62.4 | 0.884 |
| rowan | 5 | 82.3 | 45.7 | 0.869 |

## Budget

- metamers at 200 (sum over live trees): median 6.62e+04 (p10 2.79e+04, p90 8.91e+04; range 2.65e+04-9.09e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.857 (p10 0.686, p90 0.981; range 0.598-1.07); CPU s/season: median 0.84 (p10 0.673, p90 0.959; range 0.584-1.05)
