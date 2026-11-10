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

**Sheet:** `runs/probe/oak124-sheet/sheet.html` (119 MB; HEAD beside patch, seeds 1–20, at 30/60/100; not committed). Row crops: `runs/probe/oak124-sheet/png/rows-{01,05,09,13,17}.png`. In each crop the top of the first HEAD row is cut off. The other HEAD rows show the same spire.

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

- **The flank's aggregation.** A mean of seasonal shares counts the stall seasons, which have few new metamers and flank shares near 0 (every patch seed shows 0.00 at season 100), as much as the vigorous ones. A pooled share, like the note's, would weight the vigorous seasons and could lift the near misses (seeds 4, 17 and 18 at 3.8–4.8%). Computing it needs a per-season count of new metamers in metrics.csv. The bar was fixed before the run and is not re-scored here.
- **w90 is a weak judge of dome against box.** It fails peaked domes and passes some boxes. If the user reads the sheet differently, the eye's count, not w90's, is the one to weigh.
- **The phone garden's seed 1** loses its oak recruits under the patch. Re-check it in the 0062/0063 garden.

## Reproduce

```
npm run evidence:oak-crown            # node cli/oak-crown.ts: 80 runs, about 75 min on 6 simulators → runs/oak-crown/
npm run probe -- --patch runs/oak-d12a13.json --species oak --label oak124-sheet \
  --seeds 1,2,...,20 --widths "" --jobs 4          # the season-100 contact sheet (lone only)
npm run probe -- --patch runs/oak-d12a13.json --species oak --label oak124-guard --jobs 2   # garden guard
```

The patch file is `{ "species": { "oak": { "r2": { "dLambda": 0.12, "aC": 13.5 } } } }`. HEAD's oak is `dLambda` 0.04 from `aC` 13.51. The scoring is unit-tested in `tests/oak-crown.test.ts`.
