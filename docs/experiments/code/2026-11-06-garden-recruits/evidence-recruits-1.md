# Evidence: recruits-1

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 1 | median 0.111 (p10 0.102, p90 0.139; range 0.0994-0.152) |
| H/D at 300 in 60-80 | 1 | median 46.8 (p10 32.5, p90 58.6; range 21.2-110) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 16 | median 75.7 (p10 71, p90 85.1; range 70.2-130) |
| crown base: stand LCR < lone's at 150 and 300 | 12 | stand-lone at 300: median -0.0528 (p10 -0.14, p90 0.0411; range -0.396-0.11) |
| plateau: gain 250-300 < 2, tallest < 180 | 13 | gain median 0.0968 (p10 -1.96, p90 14.7; range -6.22-25.7); tallest median 134 (p10 94.1, p90 162; range 83.3-167) |
| floor at 150 (reported) | - | median 0.118 (p10 0.0986, p90 0.189; range 0.0895-0.251) |

## Survival and composition

- planted trees alive: at 150 41.7%, at 300 30.0% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 229 (p10 229, p90 229; range 229-229); at 300 median 229 (p10 229, p90 229; range 229-229)
- composition at 300 (mean share of live trees per species): beech 0.37, birch 0.00, holly 0.09, hornbeam 0.20, maple 0.21, oak 0.06, rowan 0.06, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 150 | 25.8 | 0.7 |
| birch | 1 | 157 | 53.9 | 0.477 |
| holly | 6 | 40.8 | 63.8 | 0.99 |
| hornbeam | 4 | 115 | 35.5 | 0.82 |
| maple | 4 | 64 | 33.4 | 0.724 |
| oak | 7 | 131 | 60 | 0.87 |
| rowan | 5 | 80.2 | 47.1 | 0.807 |

## Budget

- metamers at 200 (sum over live trees): median 6.73e+04 (p10 3.61e+04, p90 8.88e+04; range 3.07e+04-9.72e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.953 (p10 0.739, p90 1.06; range 0.686-1.22); CPU s/season: median 0.932 (p10 0.722, p90 1.04; range 0.675-1.19)
