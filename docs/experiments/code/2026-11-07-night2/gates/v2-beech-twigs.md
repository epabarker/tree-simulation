# Evidence: v2-beech-twigs

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"beech": {"r2.levels.2.dLambdaShare": 0}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.124 (p10 0.11, p90 0.163; range 0.109-0.216) |
| H/D at 300 in 60-80 | 1 | median 47.3 (p10 31.5, p90 77.1; range 22.1-118) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 13 | median 70.5 (p10 62.1, p90 86.7; range 56.5-136) |
| crown base: stand LCR < lone's at 150 and 300 | 6 | stand-lone at 300: median -0.0481 (p10 -0.133, p90 0.056; range -0.273-0.142) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median 0.238 (p10 -1.79, p90 4.37; range -8.31-19.4); tallest median 147 (p10 81.7, p90 175; range 61-181) |
| floor at 150 (reported) | - | median 0.13 (p10 0.112, p90 0.288; range 0.107-0.523) |

## Survival and composition

- planted trees alive: at 150 43.3%, at 300 30.0% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.35, birch 0.02, holly 0.11, hornbeam 0.13, maple 0.22, oak 0.10, rowan 0.05, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 175 | 30.4 | 0.718 |
| birch | 1 | 150 | 105 | 0.607 |
| holly | 6 | 59 | 94.9 | 0.991 |
| hornbeam | 4 | 113 | 47.2 | 0.851 |
| maple | 4 | 64.1 | 29.9 | 0.738 |
| oak | 7 | 130 | 52.2 | 0.869 |
| rowan | 5 | 77.6 | 54.3 | 0.891 |

## Budget

- metamers at 200 (sum over live trees): median 7.79e+04 (p10 3.11e+04, p90 9.25e+04; range 2.73e+04-1.02e+05)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.439 (p10 0.324, p90 0.522; range 0.267-0.542); CPU s/season: median 0.434 (p10 0.322, p90 0.516; range 0.265-0.537)

