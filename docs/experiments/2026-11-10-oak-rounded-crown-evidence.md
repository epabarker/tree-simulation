# Does the oak's early fall of λ (`d12a13`) round the open-grown oak on 20 seeds? (#124, evidence only)

_2026-11-10. Ticket [#124](https://github.com/epabarker/tree-simulation/issues/124), spec [#111](https://github.com/epabarker/tree-simulation/issues/111) (stories 36–45), page [rounded crown](../features/rounded-crown.md). Code at `spec/111-feature-playbook` 2e77315 plus this note's command (`ticket/124`). Nothing in the core, the flora, the presets or the goldens changes. **This is the evidence for the user's decision. No ADR is written and the oak's params are not changed until the user approves.**_

## Answer

**The patch fails its bars on 20 seeds.** The exploratory pass (seeds 1–3) does not hold at 20. It meets the upper-flank bar on 13 seeds and the w90 band on 14, against a bar of 15. By the agent's eye it gives a dome on about 12 of 20 seeds and a box-like crown (flat top, straight sides) on 6. The box is the page's named defect. Birch is bit-identical under the patch on 20 of 20 seeds. The patch rounds the oak in plan on 20 of 20 seeds (HEAD: 15 of 19).

**Recommendation: do not adopt `d12a13` as it stands.** Reasons and the open questions are under [Recommendation](#recommendation).

## Bars, fixed before the run

These are written in the header of `cli/oak-crown-score.ts` and were not changed after the run.

- **Upper flank.** The mean over seasons 60–100 of `upperFlankNew`, the share of the season's new metamers in the upper flank, must be ≥ 5%. Seasons with NaN are skipped. The 60–100 window is the oak-λ note's; the page gives the 5% but no window. This is a mean of seasonal shares, not the note's share pooled over all new metamers 60–100, because metrics.csv has no per-season count of new metamers.
- **w90** at season 100 must be in the divided-crown band 0.38–0.85. NaN fails.
- **The box.** A seed with `budsOutside` > 0 in any season is named and excluded (ADR 0062's amendment).
- **Pass rate.** Each bar must hold on ≥ 15 of seeds 1–20, scaled to the held seeds (⌈0.75 × held⌉). A verdict needs ≥ 15 held seeds.
- **Birch** under the same patch file must have the same `hash.txt` as birch at HEAD on every seed.
- **Reported, not bars:** roundness in plan (min ÷ max of crownWidth and crownDepth ≥ 0.75, as `cli/open-grown.ts` reports it), and height, reach and W/H at seasons 30/60/100.

## Counts against the bars

Lone open-grown oak in `loneTreeParams` (the 60 m square box), seeds 1–20, season 100.

| arm | held | bar | flank ≥ 5% | w90 0.38–0.85 | both | round ≥ 0.75 (reported) | verdict |
|---|---|---|---|---|---|---|---|
| HEAD | 19 of 20 | 15 | 0 | 1 | 0 | 15 | FAIL (the defect, as expected) |
| `d12a13` | 20 of 20 | 15 | **13** | **14** | **11** | **20** | **FAIL** |
| birch, patch vs HEAD | — | 20 | — | — | — | — | **PASS**: hash identical on 20 of 20 |

- **Excluded:** at HEAD, seed 15 (12 buds outside, in season 81 only). This is the seed ADR 0062's recorded rate already names. Under the patch no seed is excluded.
- **Patch, flank fails:** seeds 4 (3.8%), 5 (3.4), 6 (2.6), 7 (2.4), 8 (2.1), 17 (3.8), 18 (4.8). The range over all seeds is 2.1–11.9%, mean 6.1%. Seeds 1–3 give 7.7, 7.5 and 10.5, so the exploratory note's 5.5–7.3% holds on its own seeds.
- **Patch, w90 fails:** above the band on seeds 1 (0.91) and 10 (0.87); below it on 5 (0.36), 7 (0.13), 8 (0.29) and 18 (0.24). The range is 0.13–0.91, mean 0.55. HEAD's range is 0.10–0.49, mean 0.18: the spire.
- **Plan roundness** (the open-grown note's finding, 15 of 19 at 0.75). HEAD reproduces it exactly: the same 15, with seeds 1, 5, 6 and 17 not round. The patch makes all 20 round (0.77–0.99).

The per-seed table is in `runs/oak-crown/report.txt`.

## The by-eye verdict (season-100 contact sheet)

**Sheet:** `runs/probe/oak124-sheet/sheet.html` (119 MB; HEAD beside patch, seeds 1–20, at 30/60/100; not committed). Row crops: `runs/probe/oak124-sheet/png/rows-{01,05,09,13,17}.png`. In each crop the top of the first HEAD row is cut off. The other HEAD rows show the same spire. The sheet's runs are the scored runs: their `hash.txt` matches `runs/oak-crown/` (checked for seeds 1, 7 and 15, in both arms).

**This is the agent's reading. The user should confirm it.**

- **HEAD, all seeds:** a spire over wide low limbs, as in the open-box note.
- **Patch, season 100:**

| reading | seeds |
|---|---|
| dome (rounded or ovoid top) | 2, 3, 4, 5, 7, 8, 11, 13, 14, 15, 17, 20 (12) |
| broad dome, flattish top (borderline) | 12, 19 (2) |
| box-leaning (flat top, near-vertical sides) | 1, 6, 9, 10, 16, 18 (6) |
| spire | none |

- **w90 and the eye disagree.** Seeds 5, 7 and 8 look like domes, with a peaked or ogival top, but fail w90 low (0.13–0.36). Seeds 6, 9 and 16 look box-like but pass w90 (0.52–0.65). Seed 18 looks box-like but fails low (0.24); its top is ragged, which may be the reason. Seeds 1 and 10, the clearest boxes, are the two above 0.85. So w90 rejects some domes and passes some boxes. The page warns of this, and it is why the sheet decides.
- **The dome counts reach the bar only by a lenient reading.** Domes alone are 12 of 20. With the two borderline seeds they are 14, still under 15. A box is not passed as a dome (story 45), so the eye does not rescue the bar.

## Accepted cost (young form and low reach)

Means over held seeds, with [min–max]. Reach is half the crown's width (the extent of all tips in x), in metres. A cell is 0.25 m.

| season | arm | height, m | reach, m | W/H |
|---|---|---|---|---|
| 30 | HEAD | 20.0 [18.4–21.9] | 13.9 [10.4–16.1] | 1.39 |
| 30 | `d12a13` | 15.5 [13.8–16.6] | 11.2 [9.0–13.1] | 1.44 |
| 60 | HEAD | 33.1 [30.8–33.9] | 19.8 [13.9–23.8] | 1.20 |
| 60 | `d12a13` | 24.8 [20.9–26.9] | 17.2 [15.1–19.9] | 1.39 |
| 100 | HEAD | 33.5 [32.9–34.6] | 20.5 [15.5–25.7] | 1.23 |
| 100 | `d12a13` | 33.0 [32.6–33.6] | 19.9 [17.9–23.8] | 1.21 |

- **The cost is as the page says.** At 30 the oak is about 4.5 m shorter, a squat bush with no spire. At 60 it is still 8 m shorter, because its stall is delayed rather than avoided. Its reach is about 2.7 m shorter at 30 and 2.6 m shorter at 60.
- **By 100 height and reach are back to HEAD's.** The patch's crown is narrower in its widest seeds (HEAD reaches 25.7 m) but wider in its narrowest.
- **W/H here is crownWidth/height over all tips.** The oak-λ note's W/H was a leafy 2–98% width (0.87–0.89), so the two are not comparable.

## Garden guard: garden at 2e77315

This guard ran against the garden as it stands on this base, the pre-#121 garden. **Repeat it after #121/#122 land.** It used the probe (`--species oak --patch runs/oak-d12a13.json`, seeds 1–3, widths 160 and 66, seasons 50/100/150; `runs/probe/oak124-guard/sheet.html`). Like everything the probe writes, it is exploratory.

- **Oak grows only in seed 1.** Seeds 2 and 3 plant no oak at either width, and their runs are bit-identical (same `hash.txt`). The probe flags them.
- **Seed 1, 160 cells.** Beech and hornbeam ≥ 10 m keep their crowns. Live crown base (beech / hornbeam) is 0.011 / 0.012 (HEAD) against 0.011 / 0.011 (patch) at 50, and hornbeam 0.009 against 0.009 at 100. Crown ratio is 0.95–0.99 in both arms. So they stay clothed to the ground, which is the bare-bole page's known defect; the patch neither causes nor worsens it. At 150 the stand has rearranged. Beech ≥ 10 m number 10 against 2, with live crown base 0.047 against 0.033 and crown ratio 0.95 against 0.97. Drawn stems are 41 against 44 and canopy stems 17 against 10. The cap is reached in both arms.
- **Seed 1, 66 cells (the phone).** There are no beech or hornbeam ≥ 10 m in either arm. **The stand changes a lot.** At 150 HEAD has 23 live trees, 20 of them oak recruits, and the patch has 7: one birch and six willows, with no oak left. The bushier oak changes this seed's phone garden. It is one seed of a garden that #121 is replacing, so it is a flag to re-check, not a verdict.
- **Named regressions.** `cli/regressions.ts` takes no patch, so the tool could not run with the patch. Instead, the two regression worlds were run directly (`forestParams(66, 3)` to 150, and `forest` seed 1 to 300), HEAD against the patch. **Their hashes are identical:** 597e91e4 and 106dd111. Neither world ever grows an oak, so the patch cannot move either vector.
- **The regressions tool on this base, unpatched:** `forestRegeneration` is unchanged. **`phoneSeed3` already differs from `tests/regressions.json`** at 2e77315: metamers100 16923 → 18109, canopy150 2 → 5, metamers150 12423 → 13525, among others. This is not from this ticket, which changes nothing the core runs. It is the integration branch's garden work, still to be re-baselined there.

## Recommendation

**Do not adopt `d12a13` as it stands.**

1. **The ≥ 20-seed bars fail.** Flank 13 of 20, w90 14 of 20, both 11, against 15. The seeds 1–3 that the page decided on are three of the best.
2. **The eye agrees.** About 6 of 20 seeds are box-leaning at season 100 while the tree is still growing taller, and the page names that as the defect. Domes are 12 to 14 of 20.
3. **What it does win, consistently.** No seed keeps the spire. The flank fills (mean 6.1%, against HEAD's 0.07%). The crown is round in plan on every seed. Birch is untouched. So the mechanism is right in direction but not reliable enough to clear the bar.

**Unclear, and for the user to weigh:**

- **The flank's aggregation.** A mean of seasonal shares counts the stall seasons, which have few new metamers and flank shares near 0 (every patch seed shows 0.00 at season 100), as much as the vigorous ones. A pooled share, like the note's, would weight the vigorous seasons instead. The direction of that difference is not known. On seeds 1–3, the only comparison there is, this mean (7.7, 7.5, 10.5%) came out *higher* than the note's pooled 5.5–7.3%, though on a different build. So there is no evidence that pooling would rescue the near misses (seeds 4, 17 and 18 at 3.8–4.8%). Computing it needs a per-season count of new metamers in metrics.csv. The bar was fixed before the run and is not re-scored here.
- **w90 is a weak judge of dome against box.** It fails peaked domes and passes some boxes. If the user reads the sheet differently, the eye's count, not w90's, is the one to weigh.
- **The phone garden's seed 1** loses its oak recruits under the patch. Re-check it in the 0062/0063 garden.

## Reproduce

```
npm run evidence:oak-crown            # node cli/oak-crown.ts: 80 runs, about 75 min on 6 simulators → runs/oak-crown/
npm run probe -- --patch runs/oak-d12a13.json --species oak --label oak124-sheet \
  --seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20 --widths "" --jobs 4   # the sheet (lone only)
npm run probe -- --patch runs/oak-d12a13.json --species oak --label oak124-guard --jobs 2   # garden guard
```

The patch file is `{ "species": { "oak": { "r2": { "dLambda": 0.12, "aC": 13.5 } } } }`. HEAD's oak is `dLambda` 0.04 from `aC` 13.51. The scoring is unit-tested in `tests/oak-crown.test.ts`.

## Round two: neighbouring schedules

_2026-11-11. The user asked for another round: neighbours of `d12a13` aimed at the box-leaning and thin-flank seeds. **Evidence only**: no flora, params, presets, goldens or ADR change. The bars in `cli/oak-crown-score.ts` are unchanged. The screen, its seeds and its ranking rule were committed (458488a, `docs/experiments/code/2026-11-10-oak-round2/conditions.py`) before the first screening run. The garden guard was skipped this round, since the garden is being changed by #121/#122; it must be run before any adoption._

### Answer

**`d16a13` (`r2.dLambda` 0.16 from `aC` 13.5) passes every bar, on seeds 1–20 and on fresh seeds 21–40. It passes by one seed, and only at the bar.** Birch is bit-identical under it. By the agent's eye it still leaves about 4 of 20 crowns flat-topped, about as many as `d12a13` drawn the same way. It costs about 2 m more young height than `d12a13` at season 60.

**Recommendation: unclear, with `d16a13` as the candidate to put to the user.** The measured bars are now met, which round one's setting failed. The box, the page's named defect, is not visibly reduced, and the margin is the smallest possible. Adopt it only if the user's own reading of the sheet accepts its flat-topped seeds (4, 16, 17, 19). Otherwise the result is "still not": no neighbour in this screen fixes the box.

### 1. What separates the failing seeds (round one's `d12a13` arm)

The analysis is `diagnose.py`, reading round one's runs: metrics every season, snapshots at 30/60/100. Medians by group:

| group (round one's eye) | seeds | stall season | flank 30–59 | flank 60–100 | top tips ≥ 0.9 H | spread of the top tips / crown width | top3 |
|---|---|---|---|---|---|---|---|
| box-leaning | 1, 6, 9, 10, 16, 18 | 90 | 8% | 6% | 168 | 0.65 | 0.66 |
| thin-flank dome | 4, 5, 7, 8, 17 | 76 | 9% | 3% | 73 | 0.33 | 0.47 |
| clean dome | 2, 3, 11, 13, 14, 15, 20 | 83 | 11% | 8% | 143 | 0.40 | 0.56 |
| HEAD (spire) | all | 52 | 1% | 0% | 107 | 0.18 | 0.17 |

The stall season is the first season within 1 m of final height. Medians are over seeds.

- **When and where the crown divides does not separate the groups.** Under the patch the leader leaves the trunk's axis low (0.5–12 m) on every seed, and the leader path changes axis 58–79 times by 100. Every seed divides early. Top-fifth leaf (0.01–0.09) and crown length / width (0.76–0.92 at 100) overlap across the groups.
- **The stall separates them.** Thin-flank seeds reach the 33 m ceiling (R1's reproductive sink) earliest, at seasons 74–79. They fill the flank before 60 (8–11%, as the domes do), but after the stall their new growth leaves the top, so the 60–100 mean falls to 2–4%. Their tops are narrow and peaked: few top tips, top3 0.17–0.53. The boxes 1, 9, 10 and 16 are still climbing at 89–94 (6 and 18, which top3 does not call boxes, stall at 79 and 82). Their divided top spreads level as it climbs: many top tips, wide spread (0.6–1.1 on seeds 1, 9, 10 and 16).
- **The two failures sit at opposite ends of one axis, the stall's timing.** Fixing a box needs the climb to end sooner relative to the division, which means an earlier or deeper fall: the 2026-11-08 notes found later and slower falls give boxes. Fixing a thin flank needs the top to keep taking new metamers after 60, which means a deeper fall (lower λ, more lateral share) or a later stall. **On timing they pull in opposite directions. On depth they agree.** A deeper fall is the lever both could share, so the screen leaned deeper and earlier, with a faster ramp and one shallower control.

### 3. A reported shape measure: top3

top3 is the mean width of the leafy crown's slices 16–18 (0.80–0.95 of its depth, in w90's 20 slices) over its widest slice. It is w90 averaged over three slices, which damps one slice's noise. It is reported, never a bar.

- **On round one's `d12a13` arm, against round one's eye:**
  - top3 ≥ 0.64 catches the boxes 1 (0.88), 9 (0.67), 10 (0.82) and 16 (0.65), and no dome (domes are 0.17–0.62).
  - It misses seeds 6 (0.42) and 18 (0.33). A second look at their leaf mass, not the probe's drawn outline polygon, reads them as ragged domes; the outline line made them look square.
  - Borderline 12 scores 0.82 and borderline 19 scores 0.57.
- **For the screen it is read from shoot tips**, because `oak-crown.ts` snapshots have no buds.csv. On round one's arm the tips' top3 is the leafy buds' plus 0.00–0.05, with the same split at 0.64 (`runs/oak-round2/tipcheck.py`).
- **Its limit.** The round-two sheet draws all shoot tips and the wood, with no outline polygon. On it the agent's reading of `d12a13` itself changes: seeds 1, 6, 10 and 18 no longer read as boxes; 9, 12, 13 and 16 do. top3 agrees with that reading on 9, 12 and 16 only. **The eye depends on the drawing, and top3 is a rough guide, not a judge.**

### 2. The screen (8 seeds, 60–100 season means; fixed before running)

The screening set was **1, 10, 16** (the worst boxes), **8, 7, 6** (the worst flanks; 6 also read as a box) and **2, 13** (clean domes).

These neighbours were already tried on seeds 1–3 in the 2026-11-08 notes and were not repeated: `d08a13`, `d08a30`, `d12a30`, `aC` 18 and 22, ramp 40, and the per-level shares. The page rules out a later schedule adopted to keep the young spire.

Rank: seeds of 8 passing both bars, then seeds with no box by top3, then height at season 30.

| candidate | r2 (dLambda / aC / ramp) | flank ≥ 5% | w90 band | both | no box by top3 | flank mean | H30 m | H60 m | reach30 m | reach60 m |
|---|---|---|---|---|---|---|---|---|---|---|
| **d16a13** | 0.16 / 13.5 / 15 | 7 | 7 | **6** | **7** | 8.5% | 14.5 | 22.7 | 10.7 | 16.2 |
| **d12a9** | 0.12 / 9 / 15 | 7 | 7 | **6** | 4 | 7.2% | 14.0 | 24.7 | 10.8 | 16.4 |
| d12a11 | 0.12 / 11 / 15 | 7 | 7 | 6 | 2 | 9.3% | 14.4 | 24.2 | 10.5 | 16.8 |
| d14a13 | 0.14 / 13.5 / 15 | 8 | 6 | 6 | 1 | 11.2% | 14.9 | 23.6 | 11.6 | 17.2 |
| d14a11 | 0.14 / 11 / 15 | 7 | 6 | 5 | 4 | 9.8% | 14.1 | 23.8 | 10.6 | 17.3 |
| d12a13r8 | 0.12 / 13.5 / 8 | 4 | 7 | 4 | 6 | 6.1% | 14.4 | 24.3 | 10.5 | 16.8 |
| d10a13 | 0.10 / 13.5 / 15 | 4 | 7 | 3 | 5 | 5.6% | 16.3 | 25.6 | 11.6 | 17.0 |
| d12a13 (round one) | 0.12 / 13.5 / 15 | 5 | 4 | 3 | 5 | 6.2% | 15.3 | 24.7 | 11.5 | 16.9 |

- **Every deeper or earlier fall fills the flank** (7 or 8 of 8 against 5). The shallower control `d10a13` is worse than `d12a13`, which confirms the direction.
- **Several of them widen the top** (top3 high: `d14a13`, `d12a11`). `d16a13` is the exception, so the box does not track depth monotonically.
- **Finalists by the rule:** `d16a13` and `d12a9`. Per-seed values are in `runs/oak-round2/screen.csv`.

### 4. The finalists on seeds 1–20, unchanged command and bars

Run with `node cli/oak-crown.ts --patch runs/oak-round2/<name>.json …`. The oak runs keep season-100 snapshots, and birch was run against HEAD's birch.

| arm | held | bar | flank ≥ 5% | w90 0.38–0.85 | both | verdict | round ≥ 0.75 (reported) | top3 ≥ 0.64 (reported) | birch hash |
|---|---|---|---|---|---|---|---|---|---|
| HEAD (round one) | 19 | 15 | 0 | 1 | 0 | FAIL | 15 | — | — |
| d12a13 (round one) | 20 | 15 | 13 | 14 | 11 | FAIL | 20 | 5 (1, 9, 10, 12, 16) | identical 20/20 |
| **d16a13** | 20 | 15 | **19** | **17** | **16** | **PASS** | 20 | 5 (4, 7, 15, 19, 20) | identical 20/20 |
| d12a9 | 20 | 15 | 17 | 17 | 15 | PASS (at the bar) | 20 | 11 | identical 20/20 |
| **d16a13, fresh seeds 21–40** | 20 | 15 | **19** | **16** | **15** | **PASS (at the bar)** | 20 | — | not run |

- **Excluded seeds:** none in any round-two arm. No bud went outside the box on any seed, in any season, in 1–20 or 21–40.
- **d16a13's fails on seeds 1–20:**
  - flank: seed 16 (4.0%);
  - w90: seeds 10 (0.25), 18 (0.33) and 19 (0.90).
- **d16a13's fails on seeds 21–40:**
  - flank: seed 33 (4.6%);
  - w90: seeds 23 (0.93), 24 (0.87), 26 (just under 0.38) and 29 (0.31).
- **d12a9's fails on seeds 1–20:**
  - flank: seeds 5, 7 and 20;
  - w90: seeds 2, 14 and 20.
- **The fresh seeds.** The finalists were chosen on 8 of seeds 1–20, so the 1–20 count is not independent of the selection. Seeds 21–40 were run for `d16a13` only, after the choice, and it passes there too, exactly at the bar.

**Sheets** (season 100, front view, HEAD | d12a13 | d16a13 | d12a9, drawn from metamers.csv: wood plus every shoot tip):

- `runs/oak-round2/sheet/seeds-01-04.png`
- `runs/oak-round2/sheet/seeds-05-08.png`
- `runs/oak-round2/sheet/seeds-09-12.png`
- `runs/oak-round2/sheet/seeds-13-16.png`
- `runs/oak-round2/sheet/seeds-17-20.png`
- the full sheet: `runs/oak-round2/sheet/all-20.png`

Not committed. Round one's HTML sheet (`runs/probe/oak124-sheet/sheet.html`) remains HEAD and d12a13 at 30/60/100.

**The agent's reading of the round-two sheet, season 100. The user should confirm it.** HEAD is a spire over low limbs on all 20 seeds. No patched seed is a spire.

| reading | d12a13 | d16a13 | d12a9 |
|---|---|---|---|
| dome | 1, 2, 3, 4, 6, 7, 8, 10, 11, 14, 15, 17, 18 (13) | 3, 6, 8, 10, 11, 13, 14, 18, 20 (9) | 3, 5, 6, 7, 8, 10, 12, 14, 16, 18, 19, 20 (12) |
| broad dome, flattish top (borderline) | 19 | 1, 5, 9, 12, 15 (5) | 15, 17 |
| split top (two lobes with a notch) | 5, 20 | 2, 7 | — |
| box-leaning (flat top, steep sides) | 9, 12, 13, 16 (4) | 4, 16, 17, 19 (4) | 1, 2, 4, 9, 11, 13 (6) |

- **`d16a13` makes broader, flatter domes than `d12a13`.** It has as many box-leaning seeds and more borderline ones.
- **`d12a9` has the most box-leaning seeds** (vase-shaped, flat-topped), matching its top3.
- **On this reading neither neighbour reduces the box.** The bars pass because the flank fills and w90 moves into its band, and w90 does not separate dome from box.

### 5. Cost at seasons 30 and 60 (seeds 1–20, means [min–max])

| arm | H30 m | reach30 m | H60 m | reach60 m |
|---|---|---|---|---|
| HEAD | 20.0 [18.4–21.9] | 13.9 [10.4–16.1] | 33.1 [30.8–33.9] | 19.8 [13.9–23.8] |
| d12a13 | 15.5 [13.8–16.6] | 11.2 [9.0–13.1] | 24.8 [20.9–26.9] | 17.2 [15.1–19.9] |
| d16a13 | 14.7 [13.3–16.1] | 10.7 [8.9–12.9] | 22.6 [21.5–23.9] | 15.6 [12.2–18.8] |
| d12a9 | 14.5 [13.0–16.0] | 10.4 [8.6–11.5] | 25.2 [22.9–28.3] | 16.3 [14.7–18.3] |

- **`d16a13` is the squattest young oak:** 5.3 m below HEAD at 30 and 10.5 m below at 60, with 3.2 / 4.2 m less reach.
- By season 100 all arms are at 31–34 m. Two `d16a13` seeds end lower, 30.8 and 31.4 m (seeds 20 and 1).

### Limits

- **The garden guard was not run this round**, which round one's note asks for after #121/#122.
- The w90 and flank bars pass at or one seed above the rate, so they are fragile to one seed.
- The eye verdict depends on how the sheet is drawn (outline polygon or tips), as shown above.
- top3 is a rough guide, not a judge.

### Reproduce (round two)

```
uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/diagnose.py      # step 1, round one's runs
uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/conditions.py    # patches → runs/oak-round2/
node cli/oak-crown.ts --patch runs/oak-round2/<name>.json --seeds 1,2,6,7,8,10,13,16 --no-head --species oak --snapshots 100   # screen
uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/screen.py
node cli/oak-crown.ts --patch runs/oak-round2/d16a13.json --seeds 1-20 --no-head --species oak --snapshots 100
node cli/oak-crown.ts --patch runs/oak-round2/d16a13.json --seeds 1-20 --species birch      # birch identity (HEAD reused)
node cli/oak-crown.ts --patch runs/oak-round2/d16a13.json --seeds 21-40 --no-head --species oak --out runs/oak-crown-fresh
uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/sheet100.py d16a13 d12a9
```

## Garden guard for `d16a13` (the adoption gate)

_2026-11-11. The user approved `d16a13` on the round-two sheets ("it actually looks like a split fork happens fairly often. I approve it"), with adoption gated on this guard. It ran against the garden as it stands on `spec/111-feature-playbook` at a9b71fa. **Nothing is adopted: no flora, params, presets, goldens or ADR change.**_

### Answer

**The ticket's two written criteria pass. The item round one flagged does not: the patched oak often fails to regenerate in the garden, and that is systematic, not one seed.** In 12 gardens that plant an oak, the oak is gone by season 150 in 4 under the patch and in none unpatched. Adoption stopped here for the user to decide.

| check | result |
|---|---|
| Bare-bole species keep their lid and crown depth | **pass**: beech and hornbeam ≥ 10 m are unchanged within the stand's rearrangement (below) |
| Named regressions no worse than unpatched | **pass**: both worlds are bit-identical with and without the patch (`phoneSeed3` 597e91e4, `forestRegeneration` 106dd111). Neither ever grows an oak |
| The phone garden's seed 1 (round one's flag) | **worse**: 23 live trees with 20 oak recruits unpatched; 6 willows and no oak under the patch |
| The same question on more gardens | **worse**: oak present at 150 in 12 of 12 unpatched, 8 of 12 patched; oak sets seed by 150 in 10 of 12 unpatched, 5 of 12 patched |

### The probe (seeds 1–3, widths 160 and 66; exploratory)

`runs/probe/oak124-guard-d16/sheet.html`. As in round one, only seed 1 plants an oak. Seeds 2 and 3 are bit-identical at both widths.

- **Seed 1, 160 cells.** Beech and hornbeam ≥ 10 m, unpatched against patched:
  - at 50, live crown base 0.011 / 0.012 against 0.012 / 0.012, crown ratio 0.99 in both;
  - at 100, hornbeam 0.009 against 0.009, crown ratio 0.99 in both;
  - at 150, beech ≥ 10 m number 2 against 6, live crown base 0.033 against 0.033, crown ratio 0.97 in both.
  - Top-fifth leaf (the lid) is 0.22 / 0.35 against 0.36 / 0.45 at 50 and hornbeam 0.55 against 0.48 at 100: kept.
  - Drawn stems at 150 are 44 against 39 and canopy stems 10 against 8. The cap is reached in both.
- **Seed 1, 66 cells.** No beech or hornbeam ≥ 10 m in either arm. At 150 the unpatched garden has 23 live trees (20 oaks, 1 birch, 2 willows) and the patched one has 6 willows.

### Why the oak is lost

The planted oak dies in season 114 in both arms, at both widths. R1 feeds the seed pool only above the maturity height (`r1.maturity` 130 cells, 32.5 m).

| seed 1 | arm | height at 60 / 90 / final, m | seeds set | oak recruits |
|---|---|---|---|---|
| 66 cells | unpatched | 25.8 / 28.6 / 33.0 | 1693 | 23 |
| 66 cells | `d16a13` | 19.2 / 25.6 / 29.0 | 0 | 0 |
| 160 cells | unpatched | 22.9 / 26.3 / 32.4 | 164 | 1 |
| 160 cells | `d16a13` | 17.4 / 19.6 / 22.4 | 0 | 0 |

The squat young oak is the accepted cost. In the garden that cost also delays the oak's first seed, and an oak that dies before it reaches 32.5 m leaves no offspring.

### More gardens that plant an oak (to 150, unpatched against `d16a13`)

Seven more phone seeds and three more desktop seeds, chosen only because `forestParams` plants an oak there. Not the probe: metrics only.

| garden | planted oak's first seed season | seeds set by 150 | oaks alive at 150 |
|---|---|---|---|
| 66, seed 10 | 65 → 147 | 7447 → 801 | 4 → 17 |
| 66, seed 11 | 74 → 114 | 15017 → 4022 | 20 → 22 |
| 66, seed 20 | 91 → 122 | 11485 → 4552 | 18 → 19 |
| 66, seed 21 | 94 → 115 | 15530 → 1850 | 14 → 5 |
| 66, seed 30 | 81 → never | 9738 → 0 | 18 → **0** |
| 66, seed 31 | never → never | 0 → 0 | 1 → 1 |
| 66, seed 40 | 52 → never | 2654 → 0 | 5 → **0** |
| 160, seed 6 | 83 → 136 | 24332 → 1017 | 12 → 2 |
| 160, seed 7 | never → never | 0 → 0 | 1 → 1 |
| 160, seed 8 | 87 → never | 18510 → 0 | 2 → 1 |

- **With seed 1 at both widths, that is 12 gardens.** The oak is alive at 150 in 12 unpatched and 8 patched (lost: 66 cells seeds 1, 30 and 40; 160 cells seed 1). It has set seed by 150 in 10 unpatched and 5 patched.
- **Where the patched oak does set seed, it starts 21–82 seasons later** and sets 4–40% of the unpatched seed by 150.
- **It is not uniformly worse.** Seeds 10, 11 and 20 end with as many oaks or more: in seed 10 the unpatched planted oak dies at 92 and the patched one survives to 150.
- **Bare-bole species in the three extra desktop gardens:** only seed 8 has a beech ≥ 10 m. Its live crown base is 0.024 against 0.017 at 150, crown ratio 0.98 in both, top-fifth leaf 0.49 against 0.54. Kept.

### Limits

- These are 12 gardens to season 150 in the pre-#121 garden (no ADR 0063 demography flip). It is not a ≥ 20-seed claim with a bar fixed beforehand; the counts are reported as found.
- By 300 some late-seeding oaks would have recruited. That was not run.
- `npm run regressions` itself takes no patch. The two regression worlds were run directly, unpatched and patched, and compared by `hash.txt`. Their unpatched hashes equal round one's, so `phoneSeed3` still differs from `tests/regressions.json` as round one recorded; it was not re-baselined.

### For the user to decide

1. Accept the oak's weaker regeneration in the garden as part of the cost, and adopt `d16a13` as approved.
2. Adopt `d16a13` together with a lower oak `r1.maturity`. That is a second change with its own evidence: `maturity` is also where R1's reproductive sink caps the oak's height.
3. Hold adoption until the 0063 garden (#121) is in, and re-run this guard there.

### Reproduce (the guard)

```
npm run probe -- --patch runs/oak124-adopt/d16a13.json --species oak --label oak124-guard-d16 --jobs 4
```

The patch file is `{"species": {"oak": {"r2": {"dLambda": 0.16, "aC": 13.5}}}}`. The regression worlds and the ten extra gardens were scratch scripts under `runs/oak124-adopt/` (`regress-patch.ts`, `more-gardens.ts`; not committed): each writes `forestParams(width, seed)` or `presetParams("forest", 1)`, with and without `patchSpecies(p, "oak", …)`, as a replay record for `cli/run.ts`.

## Garden guard in the 0062/0063 garden

_2026-11-12. The re-run that #124's hold asked for, now that #121's garden has landed. Code at `ticket/124-guard`, from `spec/111-feature-playbook` dc4f944: #121's 0062/0063 garden at round 6's rates (r6), which #122's 20-seed acceptance kept. **Nothing is adopted: no flora, params, presets, goldens or ADR change.** The bars below were committed with the script before any run._

### Bars, fixed before the run

**What runs.** Two arms on the same worlds: HEAD, and HEAD with the patch `{"oak": {"r2": {"dLambda": 0.16, "aC": 13.5}}}` (HEAD's oak: 0.04 from 13.51). The worlds are `forestParams(width, seed)` at widths 160 and 66, 300 seasons, natively, on 4 simulators. One kept command runs both arms, the two regression worlds and the summary: `npm run evidence:oak-garden-guard` ([`cli/oak-garden-guard.ts`](../../cli/oak-garden-guard.ts)).

**Which gardens.** `forestParams` no longer lists trees: O4 plants 400/ha at the start from its species list, so which gardens hold an oak is known only once the core has planted them. A one-season screen of HEAD's garden decides it. At each width the seeds are 1..N, with N the smallest number ≥ 20 such that seeds 1..N hold **≥ 20 gardens that plant an oak**. The regeneration counts are taken over those oak-planting gardens. The patch changes only the oak's R2, so both arms plant the same trees; the summary checks this (same planted tree ids and species at season 1).

**1. Regeneration (pre-registered, the bar #124's hold asked for).** Counts are runs (gardens), not trees, as in #122's oak table. At each width separately:
- **alive:** the gardens with a live oak at season 150 (any height, metrics.csv `alive` 1). d16a13 must reach at least HEAD's count − 2;
- **seeding:** the gardens with a seeding oak at season 150 (a live oak with `seeds` > 0 in season 150). d16a13 must reach at least HEAD's count − 2.

d16a13 passes regeneration only if both hold at both widths.
- The thresholds are as given. One weakness is stated now rather than adjusted. #122 found only 4 (desktop) and 3 (phone) of seeds 1–20 seeding at 150 under r6. At that level, "− 2" lets the patch halve the seeding gardens or more. The thresholds stay unchanged, because a tighter one would be chosen after seeing #122's numbers.
- **Reported beside it, not gated:**
  - oak at 300 (live, drawn ≥ 1.3 m, seeding);
  - seeding in any of seasons 141–150;
  - gardens whose oaks set any seed by 150 (the measure the last guard showed falling, 10 → 5 of 12);
  - the planted oak's first seeding season per garden;
  - oak recruits over the run, and those reaching 1.3 m (5.2 cells).
- If the gardens that set seed by 150 fall by more than 2 at a width, the write-up flags it for the user even if the gate passes.

**2. Bare-bole species keep their lid and crown depth** (the ticket's first written criterion). Measured on beech and hornbeam stand trees ≥ 10 m (40 cells), alive, at seasons 100, 150 and 300. Pooled over all the seeds run at a width (1..N, oak-planting or not), per species × width × season:
- **crown depth:** the median `liveCrownBase` (the lowest living limb ÷ height; the crown's length is 1 minus it) under the patch is within **±0.05** of HEAD's. The tolerance is absolute, not relative: HEAD's stand beech and hornbeam are clothed nearly to the ground (live crown base 0.01–0.05 in the last guard), and there a relative band would only measure noise;
- **lid:** the median `topFifthLeaf` under the patch is within **±25%** of HEAD's (the bare-bole page's tolerance for the same measure).

A cell is judged only when both arms have ≥ 5 such trees; the others are reported as not judged. The criterion passes if every judged cell passes. This replaces the last guard's by-eye reading of seed 1.

**3. The named regressions get no worse** (the ticket's second written criterion). The two worlds of `cli/regressions.ts` are run under each arm with that tool's own commands, the patch through `--species-patch`:
- `phoneSeed3`: `--preset mixedWood --params forestParams(66, 3)` to 150;
- `forestRegeneration`: `--preset forest --seed 1` to 300.

Their vectors are computed as that tool computes them. **#123 is re-baselining `tests/regressions.json` in parallel, so the comparison is d16a13 against HEAD, both run here, not against the stored baselines.**
- **Pass** if the two `hash.txt` files are identical.
- **Otherwise** the defect's own counts may not fall under the patch: `phoneSeed3`'s `live150`, `planted150` and `canopy150`, and `forestRegeneration`'s `recruitsReaching20` and `live300`. The full vectors are reported.

**Self-check.** HEAD here is #122's r6 (same core and params), so HEAD's oak counts on seeds 1–20 over all gardens must reproduce #122's table:
- live at 150: 17 (160) and 8 (66);
- seeding at 150: 4 and 3;
- live at 300: 7 and 4;
- seeding at 300: 0 and 4;
- recruits: 1,350 (4 reaching 1.3 m) and 700 (13).

A mismatch means a wrong build or wrong params, and the run is not used.
