# Evidence: r-best0

Worktree `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/i0/wt`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"beech": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "birch": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "holly": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "hornbeam": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "maple": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "oak": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "rowan": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "willow": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 2 | median 0.11 (p10 0.102, p90 0.133; range 0.0973-0.151) |
| H/D at 300 in 60-80 | 2 | median 49.7 (p10 34, p90 73.6; range 27.9-120) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 16 | median 73.8 (p10 69.1, p90 84.5; range 65.8-85.6) |
| crown base: stand LCR < lone's at 150 and 300 | 10 | stand-lone at 300: median -0.0669 (p10 -0.174, p90 0.0274; range -0.236-0.11) |
| plateau: gain 250-300 < 2, tallest < 180 | 10 | gain median 0.0733 (p10 -4.7, p90 16.5; range -8.83-24); tallest median 159 (p10 88, p90 171; range 74.3-190) |
| floor at 150 (reported) | - | median 0.113 (p10 0.0866, p90 0.163; range 0.0806-0.37) |

## Survival and composition

- planted trees alive: at 150 43.3%, at 300 29.2% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 229 (p10 229, p90 229; range 229-229); at 300 median 229 (p10 229, p90 229; range 229-229)
- composition at 300 (mean share of live trees per species): beech 0.33, birch 0.00, holly 0.07, hornbeam 0.33, maple 0.19, oak 0.01, rowan 0.06, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 161 | 31.3 | 0.732 |
| birch | 1 | 155 | 86.5 | 0.638 |
| holly | 6 | 52.5 | 94.4 | 0.99 |
| hornbeam | 4 | 128 | 52.4 | 0.842 |
| maple | 4 | 62.8 | 34.7 | 0.7 |
| oak | 6 | 161 | 69.2 | 0.883 |
| rowan | 5 | 74.3 | 50.6 | 0.799 |

## Budget

- metamers at 200 (sum over live trees): median 7.33e+04 (p10 3.51e+04, p90 8.68e+04; range 3.43e+04-9.76e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.767 (p10 0.631, p90 0.885; range 0.511-0.914); CPU s/season: median 0.748 (p10 0.623, p90 0.864; range 0.501-0.894)
