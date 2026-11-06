# Evidence: v3

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"birch": {"r2.levels.0.lambda": 0.55}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.128 (p10 0.114, p90 0.156; range 0.109-0.195) |
| H/D at 300 in 60-80 | 1 | median 44.9 (p10 34.4, p90 59.1; range 29.7-162) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 10 | median 75.9 (p10 65.7, p90 102; range 63.9-157) |
| crown base: stand LCR < lone's at 150 and 300 | 6 | stand-lone at 300: median -0.0255 (p10 -0.0983, p90 0.0801; range -0.352-0.159) |
| plateau: gain 250-300 < 2, tallest < 180 | 11 | gain median 0.392 (p10 -2.51, p90 8.71; range -7.82-35.8); tallest median 141 (p10 83.4, p90 173; range 75-176) |
| floor at 150 (reported) | - | median 0.135 (p10 0.117, p90 0.253; range 0.116-0.331) |

## Survival and composition

- planted trees alive: at 150 47.5%, at 300 30.0% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.31, birch 0.03, holly 0.13, hornbeam 0.13, maple 0.20, oak 0.14, rowan 0.06, willow 0.01

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 168 | 31.4 | 0.742 |
| birch | 2 | 116 | 50.2 | 0.429 |
| holly | 5 | 44.5 | 80.1 | 0.993 |
| hornbeam | 4 | 114 | 45.5 | 0.839 |
| maple | 4 | 70.3 | 41.5 | 0.756 |
| oak | 7 | 130 | 50.3 | 0.835 |
| rowan | 5 | 79.3 | 48.3 | 0.902 |

## Budget

- metamers at 200 (sum over live trees): median 6.17e+04 (p10 3.12e+04, p90 8.69e+04; range 2.23e+04-8.92e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.765 (p10 0.57, p90 1.11; range 0.524-1.27); CPU s/season: median 0.749 (p10 0.563, p90 1.09; range 0.516-1.25)
