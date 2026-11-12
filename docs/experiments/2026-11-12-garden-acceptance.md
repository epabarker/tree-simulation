# The garden's 20-seed acceptance: round 6 against d1 (2026-11-12)

**Ticket:** [#122](https://github.com/epabarker/tree-simulation/issues/122), spec [#111](https://github.com/epabarker/tree-simulation/issues/111). Its acceptance is the user's amendment of 2026-11-12 ([ADR 0065](../decisions/0065-garden-demography-reported-targets.md), the issue's last comment).

**Question.** On seeds 1–20, does the garden as #121 landed it (round 6, **r6**) hold a canopy at both widths, and is the named patch **d1** better by the pre-registered rule below? Spec §O4 (the garden's demography), §C2.13 (the light entry); ADRs 0063 and 0065.

## Bars, fixed before the run

Written and committed before any run of this note. Nothing below this section changes them.

### Conditions
- **r6:** HEAD's garden, `forestParams(width, seed)` at `spec/111-feature-playbook` dc4f944 (the #121 merge): round 6's rates, the `carbon` suppression signal.
- **d1:** the same with [`code/2026-11-10-garden-schedule/d1.patch.json`](code/2026-11-10-garden-schedule/d1.patch.json) merged as the feature probe and `sweep.ts` merge it (`mergeParams`, then `patchSpecies`): hornbeam `o4.cSeed` 300 and `o4.suppressionSignal: "topLight"` with θ_q (`topLightThreshold`) 0.15.
- **Widths 160 and 66**, seeds 1–20, 300 seasons, natively. 2 conditions × 2 widths × 20 seeds = 80 runs.
- **Frames:** seasons 100, 200 and 300, so 60 per condition × width.

### Hard gates (each ≥ 18 of seeds 1–20, per condition × width)
1. **A canopy tree at every season after 50:** stand.csv's `canopy` ≥ 1 in every season 51–300. Canopy is ADR 0065's: a drawn stem strictly over half the top height (`topHeight100`, the mean of the 100 tallest drawn stems per hectare; 6 stems at 160 cells, 3 at 66).
   - Under that definition the tallest drawn stem is always over half the mean of the tallest few, so `canopy` ≥ 1 exactly when at least one stem is drawn. The gate reads "no season after 50 without a drawn stem". This is stated, not changed.
2. **At 66 cells, at least one canopy tree at every season from 100** (`canopy` ≥ 1 in seasons 100–300). It is implied by gate 1, so its count is at least gate 1's. Both counts are reported; they differ only if gate 1 fails in seasons 51–99 alone.
3. **For the condition's flora, a checkpoint saved before the change still loads.** A test, not a count:
   - r6 is HEAD, so its checkpoint tests are the suite's (`tests/checkpoint*.test.ts`: the frozen v2 and v3 fixtures and garden 0.14.0's shipped forest).
   - d1 changes params only, no code. Its test: a garden world (`forestParams(66, 1)`, 30 seasons) saved by HEAD's build loads with `RustWorld.load`, takes d1's params by `setParams` (params and hornbeam's species patch), and steps 10 seasons with live trees; two loads stepped alike give the same hash. The frozen fixtures load under the same build.
4. **The lone open-grown tree is bit-identical to before #121.** A test, not a count: `loneTreeParams(species, seed)` for oak and hornbeam (the species d1 patches), seeds 1–3, to season 100. Its state hash under each condition equals the hash of the build before #121 (46f3cf4, its own `loneTreeParams`). The goldens `oakOpen:seed1:s15` and `beechOpen:seed1:s40` (unchanged by #121) are the standing check.

A gate × width passes at ≥ 18 of 20; the count is written beside it either way.

### Reported with counts, not gated
- **Drawn stems/ha in 200–400** at seasons 100/200/300 (per ha = `Math.round(drawn / ha)`, ha = width × 64 × 0.0625 m² / 10⁴). In whole stems that is **13–25 drawn at 160 cells** (0.064 ha: 13 is 203/ha, 26 is 406) and **6–10 at 66 cells** (0.0264 ha: 5 is 189/ha, 11 is 417). Counted as frames in the band, of 60 per condition × width.
- **The canopy share** of drawn stems per frame: its median, and frames at ≥ 0.6.
- **Seasons at the cap:** `meta.capSeasons` in run.json (cross-checked against stand.csv's `capReached`), summed over the 20 seeds; also the cap-free runs and the median.
- **The top species' share** per frame (stand-species.csv `share`). The 70% bar is read only in frames with **≥ 8 drawn stems** (ADR 0065 decision 4): frames judged, frames passing (share ≤ 0.70), and the pass fraction. Frames with fewer than 8 drawn stems are not judged.
- **The oak, for #124:** at seasons 150 and 300, the runs with a live oak (any height, metrics.csv `alive` 1), a drawn oak (height ≥ 5.2 cells), and a seeding oak (a live oak with `seeds` > 0 in that season, and in the ten seasons s−9…s); and the oaks recruited after the planting (tree ids past the planted count) over the run.
- The wall time of the whole run and the median per run.

### The pre-registered choice
- **d1 is recommended only if both hold:**
  1. it passes every hard gate at both widths (≥ 18 of 20 each, and both tests), and its count is no lower than r6's on any hard gate × width;
  2. it is **better** than r6 on at least two of these three, each pooled over both widths (120 frames or 40 runs per condition), a tie counting as not better:
     - **frames in the band:** more frames;
     - **seasons at the cap:** fewer seasons, summed over the 40 runs;
     - **the 70% bar:** a higher pass fraction among judged frames (≥ 8 drawn stems). If either condition has fewer than 10 judged frames, compare failing frames instead: fewer is better.
- **Otherwise r6 is recommended.**
- **If a hard gate fails in both conditions** (fewer than 18 of 20 at either width, or a test fails), the ticket's fail path applies: stop and report, and recommend neither.
- Per-width counts, the canopy share and the oak are reported beside the rule and do not enter it.
