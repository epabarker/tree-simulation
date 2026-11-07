# Evidence: v2-birch-every

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"birch": {"r2.levels.2.lateralEvery": 1}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.128 (p10 0.117, p90 0.157; range 0.113-0.2) |
| H/D at 300 in 60-80 | 1 | median 47.1 (p10 36.2, p90 58.1; range 22-149) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 10 | median 70.4 (p10 57.9, p90 112; range 57.5-154) |
| crown base: stand LCR < lone's at 150 and 300 | 6 | stand-lone at 300: median -0.00319 (p10 -0.0988, p90 0.107; range -0.198-0.167) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median 0.198 (p10 -0.484, p90 8.19; range -6.16-29.3); tallest median 134 (p10 84.3, p90 169; range 62-182) |
| floor at 150 (reported) | - | median 0.132 (p10 0.118, p90 0.22; range 0.11-0.34) |

## Survival and composition

- planted trees alive: at 150 47.5%, at 300 30.8% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.29, birch 0.03, holly 0.04, hornbeam 0.14, maple 0.25, oak 0.16, rowan 0.08, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 156 | 26.5 | 0.742 |
| birch | 2 | 130 | 60.8 | 0.617 |
| holly | 6 | 47.5 | 81 | 0.993 |
| hornbeam | 4 | 116 | 49.4 | 0.83 |
| maple | 4 | 66 | 38.9 | 0.74 |
| oak | 7 | 132 | 56.1 | 0.84 |
| rowan | 5 | 85.6 | 55.2 | 0.921 |

## Budget

- metamers at 200 (sum over live trees): median 6.12e+04 (p10 3.1e+04, p90 8.55e+04; range 2.75e+04-9.11e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.394 (p10 0.329, p90 0.498; range 0.274-0.529); CPU s/season: median 0.391 (p10 0.326, p90 0.493; range 0.272-0.523)

