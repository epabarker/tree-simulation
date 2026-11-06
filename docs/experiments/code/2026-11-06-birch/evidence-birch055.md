# Evidence: birch-lambda0.55

Worktree `/home/edbarker/Documents/Projects/tree-simulation`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"birch": {"r2.levels.0.lambda": 0.55}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 0 | median 0.123 (p10 0.111, p90 0.169; range 0.107-0.185) |
| H/D at 300 in 60-80 | 1 | median 44.2 (p10 27.6, p90 61.1; range 21.5-111) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 11 | median 77.3 (p10 65.6, p90 139; range 62.5-149) |
| crown base: stand LCR < lone's at 150 and 300 | 6 | stand-lone at 300: median -0.00431 (p10 -0.127, p90 0.0536; range -0.282-0.163) |
| plateau: gain 250-300 < 2, tallest < 180 | 14 | gain median -0.00494 (p10 -7.03, p90 14.2; range -9.38-24); tallest median 136 (p10 90.1, p90 172; range 79.4-179) |
| floor at 150 (reported) | - | median 0.136 (p10 0.112, p90 0.256; range 0.105-0.46) |

## Survival and composition

- planted trees alive: at 150 43.3%, at 300 30.0% (count at 300 per seed: median 1.5 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 57 (p10 57, p90 57; range 57-57); at 300 median 57 (p10 57, p90 57; range 57-57)
- composition at 300 (mean share of live trees per species): beech 0.30, birch 0.03, holly 0.21, hornbeam 0.10, maple 0.17, oak 0.15, rowan 0.04, willow 0.01

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 153 | 28.7 | 0.724 |
| birch | 2 | 134 | 52.2 | 0.578 |
| holly | 6 | 42.4 | 72.6 | 0.993 |
| hornbeam | 4 | 115 | 41.8 | 0.843 |
| maple | 4 | 67.3 | 40.9 | 0.792 |
| oak | 6 | 131 | 57.8 | 0.868 |
| rowan | 5 | 79.4 | 47.4 | 0.908 |

## Budget

- metamers at 200 (sum over live trees): median 6.79e+04 (p10 2.97e+04, p90 8.66e+04; range 2.76e+04-8.77e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.704 (p10 0.523, p90 0.997; range 0.401-1.15); CPU s/season: median 0.693 (p10 0.517, p90 0.98; range 0.396-1.13)
