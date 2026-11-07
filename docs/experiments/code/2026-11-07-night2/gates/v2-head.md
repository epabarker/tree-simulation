# Evidence: v2-head

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.119 (p10 0.108, p90 0.163; range 0.106-0.172) |
| H/D at 300 in 60-80 | 1 | median 48.1 (p10 32, p90 78.9; range 18.4-118) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 10 | median 73.5 (p10 62.4, p90 87.6; range 55-136) |
| crown base: stand LCR < lone's at 150 and 300 | 9 | stand-lone at 300: median -0.0453 (p10 -0.13, p90 0.0629; range -0.273-0.108) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median 0.238 (p10 -1.22, p90 7.19; range -6.33-21.5); tallest median 142 (p10 82.7, p90 174; range 61-178) |
| floor at 150 (reported) | - | median 0.13 (p10 0.107, p90 0.291; range 0.0972-0.523) |

## Survival and composition

- planted trees alive: at 150 44.2%, at 300 30.0% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.33, birch 0.02, holly 0.13, hornbeam 0.13, maple 0.22, oak 0.12, rowan 0.05, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 164 | 27.6 | 0.659 |
| birch | 1 | 150 | 105 | 0.607 |
| holly | 6 | 59 | 94.9 | 0.991 |
| hornbeam | 4 | 114 | 42.8 | 0.846 |
| maple | 4 | 63 | 29.8 | 0.738 |
| oak | 7 | 131 | 52.2 | 0.869 |
| rowan | 5 | 82.4 | 54.1 | 0.901 |

## Budget

- metamers at 200 (sum over live trees): median 7.5e+04 (p10 3.11e+04, p90 8.99e+04; range 2.73e+04-9.27e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.776 (p10 0.529, p90 0.966; range 0.507-1.05); CPU s/season: median 0.763 (p10 0.521, p90 0.949; range 0.499-1.04)

