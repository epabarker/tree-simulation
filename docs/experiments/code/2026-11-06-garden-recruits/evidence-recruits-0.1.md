# Evidence: recruits-0.1

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.135 (p10 0.114, p90 0.179; range 0.109-0.209) |
| H/D at 300 in 60-80 | 2 | median 47.4 (p10 34.3, p90 67.1; range 20.5-98.8) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 10 | median 73.6 (p10 62.4, p90 121; range 48.2-173) |
| crown base: stand LCR < lone's at 150 and 300 | 10 | stand-lone at 300: median -0.00536 (p10 -0.0955, p90 0.0665; range -0.25-0.104) |
| plateau: gain 250-300 < 2, tallest < 180 | 10 | gain median 0.9 (p10 -1.61, p90 5.81; range -14.8-33.4); tallest median 142 (p10 94.8, p90 168; range 83.9-173) |
| floor at 150 (reported) | - | median 0.152 (p10 0.117, p90 0.326; range 0.109-0.363) |

## Survival and composition

- planted trees alive: at 150 43.3%, at 300 29.2% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 23 (p10 23, p90 23; range 23-23); at 300 median 23 (p10 23, p90 23; range 23-23)
- composition at 300 (mean share of live trees per species): beech 0.31, birch 0.08, holly 0.20, hornbeam 0.12, maple 0.14, oak 0.12, rowan 0.03, willow 0.01

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 163 | 28.3 | 0.753 |
| birch | 1 | 153 | 98.8 | 0.623 |
| holly | 5 | 98.9 | 106 | 0.994 |
| hornbeam | 4 | 112 | 39.2 | 0.829 |
| maple | 4 | 65.3 | 35.5 | 0.779 |
| oak | 7 | 131 | 59.3 | 0.892 |
| rowan | 5 | 82 | 50.7 | 0.897 |

## Budget

- metamers at 200 (sum over live trees): median 6.36e+04 (p10 2.17e+04, p90 8.67e+04; range 1.85e+04-9.96e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.865 (p10 0.664, p90 1.12; range 0.526-1.18); CPU s/season: median 0.844 (p10 0.652, p90 1.09; range 0.515-1.16)
