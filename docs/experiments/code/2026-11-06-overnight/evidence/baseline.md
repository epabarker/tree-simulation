# Evidence: base-d2c4f53

Worktree `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/b0/wt`, width 160, seeds 1-20 (N=20), 300 seasons. Patch: `{}`

| check | pass (of N) | distribution |
|---|---|---|
| floor at 100 in 2-10% (faces 0.2: out of band by construction) | 2 | median 0.109 (p10 0.1, p90 0.125; range 0.0933-0.139) |
| H/D at 300 in 60-80 | 3 | median 39.2 (p10 24, p90 69.5; range 19.7-95.1) |
| H/D at 300 over ALL live trees incl. recruits (extra) | 20 | median 71 (p10 69.1, p90 73.4; range 68.1-77.2) |
| crown base: stand LCR < lone's at 150 and 300 | 11 | stand-lone at 300: median -0.0926 (p10 -0.266, p90 0.0282; range -0.379-0.131) |
| plateau: gain 250-300 < 2, tallest < 180 | 11 | gain median 0.00178 (p10 -3.49, p90 6.05; range -5.48-28.1); tallest median 146 (p10 78.7, p90 191; range 58.9-204) |
| floor at 150 (reported) | - | median 0.111 (p10 0.0981, p90 0.175; range 0.086-0.357) |

## Survival and composition

- planted trees alive: at 150 44.2%, at 300 30.8% (count at 300 per seed: median 2 (p10 0.9, p90 3; range 0-4))
- all live trees (with recruits): at 150 median 229 (p10 229, p90 229; range 229-229); at 300 median 229 (p10 229, p90 229; range 229-229)
- composition at 300 (mean share of live trees per species): beech 0.25, birch 0.00, holly 0.08, hornbeam 0.43, maple 0.16, oak 0.01, rowan 0.07, willow 0.00

| species | planted trees alive at 300 | median height | median H/D | median LCR |
|---|---|---|---|---|
| beech | 9 | 133 | 21.5 | 0.664 |
| birch | 2 | 145 | 64.5 | 0.55 |
| holly | 6 | 42.5 | 73.7 | 0.99 |
| hornbeam | 4 | 192 | 30.8 | 0.81 |
| maple | 4 | 50.8 | 36.9 | 0.614 |
| oak | 7 | 137 | 64.4 | 0.833 |
| rowan | 5 | 75.3 | 53.1 | 0.611 |

## Budget

- metamers at 200 (sum over live trees): median 7.01e+04 (p10 3.94e+04, p90 8.27e+04; range 3.81e+04-8.58e+04)
- native wall s/season (machine was loaded, 3 parallel runs): median 1.29 (p10 0.848, p90 1.49; range 0.715-1.54); CPU s/season: median 1.16 (p10 0.819, p90 1.33; range 0.697-1.36)

## Notes (B0)
- Base: origin/claude/garden-0.16.0 d2c4f53. World: forestParams(160, seed): ONE planted row of 6 trees (species rotate with seed through MIXED), O4 recruits capped at maxTrees 229 (reached by 150 in every seed), faces 0.2, periodic sides. At 300 the stand is ~229 live trees of which only ~2 are planted, so "stand" measures are dominated by recruits (hornbeam 43%, beech 25%, maple 16%).
- Original measures (planted trees only) transfer badly: floor100 is out of band by construction at faces 0.2 (2026-11-02 record: 0/20 at tau 0.2); planted H/D is over only 0-4 survivors per seed (seeds 1 and 3 have none, counted as failures). The "H/D over all live trees" row is the sensible mixed-wood analogue (20/20, median 71).
- Crown base: lone comparator is one lone tree per species run once on seed 1 (a lone oak is ~5 CPU-min), not per seed; compared with the median of planted-alive stand LCR at 150 and 300.
- Species patch verified (seed 1, 150 seasons, hornbeam r2.levels.1.setPoint 38.73 -> 58.73): hornbeam (tree 4) differs from season 1; the other planted trees differ from seasons 5-13 only through the shared light field (rowan h150 55.9 -> 54.8, willow 41.6 -> 43.6). Species not in the patch have identical params, so any later difference is competition, not a leak.
- Timing: wall/CPU per season measured with 3 parallel runs on a machine at load 16-21 (inflated; use only as a ratio against another run under similar load).
