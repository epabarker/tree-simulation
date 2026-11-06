# Evidence: r-set1

Worktree `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/i0/wt`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"beech": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "birch": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "holly": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "hornbeam": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "maple": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "oak": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "rowan": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "willow": {"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 3 | median 0.108 (p10 0.0987, p90 0.126; range 0.0929-0.16) |
| H/D at 300 in 60-80 | 0 | median 42.2 (p10 33.3, p90 68.5; range 22-102) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 18 | median 72.7 (p10 68.8, p90 79.5; range 67.4-84.3) |
| crown base: stand LCR < lone's at 150 and 300 | 13 | stand-lone at 300: median -0.0496 (p10 -0.189, p90 0.0101; range -0.328-0.126) |
| plateau: gain 250-300 < 2, tallest < 180 | 12 | gain median 0.315 (p10 -3.52, p90 5.31; range -10.1-27); tallest median 152 (p10 84.9, p90 173; range 77.8-180) |
| floor at 150 (reported) | - | median 0.108 (p10 0.0967, p90 0.187; range 0.0782-0.244) |

## Survival and composition

- planted trees alive: at 150 43.3%, at 300 28.3% (count at 300 per seed: median 2 (p10 0, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 229 (p10 229, p90 229; range 229-229); at 300 median 229 (p10 229, p90 229; range 229-229)
- composition at 300 (mean share of live trees per species): beech 0.31, birch 0.00, holly 0.07, hornbeam 0.31, maple 0.20, oak 0.01, rowan 0.10, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 158 | 25.8 | 0.709 |
| birch | 1 | 153 | 56.4 | 0.537 |
| holly | 6 | 73.4 | 103 | 0.991 |
| hornbeam | 4 | 134 | 36.5 | 0.843 |
| maple | 4 | 62.5 | 37 | 0.649 |
| oak | 5 | 125 | 59.6 | 0.819 |
| rowan | 5 | 80.3 | 45.3 | 0.821 |

## Budget

- metamers at 200 (sum over live trees): median 7.33e+04 (p10 3.3e+04, p90 9.38e+04; range 3.07e+04-9.99e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 1.02 (p10 0.726, p90 1.33; range 0.606-1.45); CPU s/season: median 0.996 (p10 0.714, p90 1.24; range 0.596-1.35)
