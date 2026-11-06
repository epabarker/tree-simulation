# Evidence: a4-narrow28-wood1

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 18 | median 0.0626 (p10 0.0484, p90 0.0946; range 0.0473-0.122) |
| H/D at 300 in 60-80 | 9 | median 68.3 (p10 36.7, p90 80.2; range 28.9-112) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 7 | median 88.1 (p10 71.3, p90 161; range 60.2-161) |
| crown base: stand LCR < lone's at 150 and 300 | 9 | stand-lone at 300: median -0.153 (p10 -0.365, p90 0.0559; range -0.395-0.153) |
| plateau: gain 250-300 < 2, tallest < 180 | 11 | gain median 0.878 (p10 -1.18, p90 7.72; range -9.06-36.6); tallest median 118 (p10 82.9, p90 144; range 62.5-165) |
| floor at 150 (reported) | - | median 0.102 (p10 0.0562, p90 0.268; range 0.0369-0.731) |

## Survival and composition

- planted trees alive: at 150 38.3%, at 300 22.5% (count at 300 per seed: median 1 (p10 0, p90 2.1; range 0-3))
- all live trees (with recruits): at 150 median 57 (p10 50.3, p90 57; range 17-57); at 300 median 57 (p10 34.5, p90 57; range 24-57)
- composition at 300 (mean share of live trees per species): beech 0.35, birch 0.01, holly 0.08, hornbeam 0.35, maple 0.11, oak 0.08, rowan 0.02

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 8 | 142 | 43.8 | 0.304 |
| birch | 1 | 115 | 72.5 | 0.51 |
| holly | 5 | 60.4 | 111 | 0.893 |
| hornbeam | 4 | 117 | 57.5 | 0.311 |
| maple | 2 | 70.4 | 49.9 | 0.487 |
| oak | 3 | 131 | 73.8 | 0.721 |
| rowan | 4 | 68.2 | 68.9 | 0.463 |

## Budget

- metamers at 200 (sum over live trees): median 1.03e+04 (p10 7.31e+03, p90 2.05e+04; range 5.34e+03-2.21e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.28 (p10 0.213, p90 0.326; range 0.179-0.346); CPU s/season: median 0.275 (p10 0.21, p90 0.32; range 0.177-0.341)
