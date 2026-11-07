# Evidence: v2-oak-cand

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"oak": {"r2.relay": 2, "r2.relayAge": 25, "r2.relayPTerm": 0.3, "r2.relayCrowd": 10, "r2.forkAt": 1.3, "r2.forkAngle": 35, "r2.levels.0.curve": 30, "r2.levels.0.curveLength": 30, "r2.levels.1.agedSetPoint": 55}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.12 (p10 0.112, p90 0.168; range 0.105-0.172) |
| H/D at 300 in 60-80 | 1 | median 47.9 (p10 33.9, p90 86.2; range 18.4-105) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 15 | median 71.9 (p10 62.9, p90 86.5; range 56.5-147) |
| crown base: stand LCR < lone's at 150 and 300 | 12 | stand-lone at 300: median -0.0544 (p10 -0.123, p90 0.0365; range -0.273-0.136) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median 0.214 (p10 -2.1, p90 8.35; range -11.5-23.9); tallest median 142 (p10 82.7, p90 170; range 60.9-178) |
| floor at 150 (reported) | - | median 0.13 (p10 0.112, p90 0.236; range 0.0972-0.523) |

## Survival and composition

- planted trees alive: at 150 45.0%, at 300 30.0% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 55-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.37, birch 0.02, holly 0.10, hornbeam 0.15, maple 0.23, oak 0.08, rowan 0.06, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 166 | 32 | 0.75 |
| birch | 1 | 150 | 105 | 0.607 |
| holly | 6 | 59 | 97.7 | 0.991 |
| hornbeam | 4 | 114 | 46.1 | 0.843 |
| maple | 4 | 64.4 | 41.9 | 0.738 |
| oak | 7 | 130 | 55.3 | 0.822 |
| rowan | 5 | 82.4 | 54.1 | 0.885 |

## Budget

- metamers at 200 (sum over live trees): median 7.41e+04 (p10 3.24e+04, p90 8.9e+04; range 2.73e+04-8.93e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.446 (p10 0.322, p90 0.513; range 0.273-0.545); CPU s/season: median 0.442 (p10 0.318, p90 0.509; range 0.27-0.539)

