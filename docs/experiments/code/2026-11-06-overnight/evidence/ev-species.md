# Evidence: species

Worktree `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/i0/wt`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{"birch": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "holly": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "hornbeam": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "maple": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "rowan": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "willow": {"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "beech": {"c1.shootLengthSD": 0.35, "c4.axisSD": 50.0, "c1.betaSD": 70.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}, "oak": {"c1.shootLengthSD": 0.3, "c4.axisSD": 35.0, "c1.betaSD": 40.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 2 | median 0.108 (p10 0.102, p90 0.129; range 0.0931-0.151) |
| H/D at 300 in 60-80 | 3 | median 45.5 (p10 33.2, p90 83.6; range 25.3-147) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 16 | median 72.8 (p10 68.5, p90 80.9; range 65.8-88.9) |
| crown base: stand LCR < lone's at 150 and 300 | 13 | stand-lone at 300: median -0.102 (p10 -0.231, p90 0.0109; range -0.297-0.115) |
| plateau: gain 250-300 < 2, tallest < 180 | 11 | gain median 0.0232 (p10 -3.63, p90 15.8; range -8.83-28.7); tallest median 155 (p10 74.1, p90 181; range 52.4-205) |
| floor at 150 (reported) | - | median 0.116 (p10 0.0865, p90 0.193; range 0.0753-0.347) |

## Survival and composition

- planted trees alive: at 150 41.7%, at 300 28.3% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-3))
- all live trees (with recruits): at 150 median 229 (p10 229, p90 229; range 229-229); at 300 median 229 (p10 229, p90 229; range 229-229)
- composition at 300 (mean share of live trees per species): beech 0.29, birch 0.00, holly 0.08, hornbeam 0.36, maple 0.19, oak 0.01, rowan 0.06, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 158 | 31.8 | 0.683 |
| birch | 1 | 155 | 86.5 | 0.638 |
| holly | 6 | 37.6 | 64.8 | 0.99 |
| hornbeam | 4 | 149 | 43.1 | 0.828 |
| maple | 4 | 59.4 | 33.5 | 0.7 |
| oak | 5 | 155 | 70 | 0.844 |
| rowan | 5 | 74.4 | 47.4 | 0.659 |

## Budget

- metamers at 200 (sum over live trees): median 6.49e+04 (p10 3.47e+04, p90 9.16e+04; range 2.78e+04-1.01e+05)
- native wall s/season (machine was loaded, 3 parallel runs): median 0.865 (p10 0.574, p90 1.06; range 0.543-1.1); CPU s/season: median 0.85 (p10 0.565, p90 1.04; range 0.535-1.07)
