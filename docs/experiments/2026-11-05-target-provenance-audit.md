# Provenance of the Level 0 targets: LAI, the shade house and the rest (2026-11-05)

The user's ruling 3 on ADR 0051 (2026-11-04; the plan's "rulings on ADR 0051"): audit the LAI and shade-house targets and
bands before any limb-loss ADR, as lateShare was audited. Described numbers become reported; measured ones stay scored,
with their source. **Read-only:** no simulation, no probe, and no targets file or source changed. Pilot v4 was running
throughout. Every proposal below is for the user to rule on; none is applied.

**Method.**
- **What is scored** comes from the code, not the toml files. `fit.load_spec(s, level=0)` keeps a trait only if it is
  in `LEVEL0_SCORED` (`analysis/treesim/fit.py:66`: height at 60, lateShare, LAI, survival light) *and* in that
  species' file, minus its `[level0] reported`, plus its `[[level0.trait]]` and Tallo's two (`fit.py:107–130`).
  Printed for every species. Willow and holly raise "not gated at Level 0", so nothing of theirs is scored.
- **Provenance** is read from each `source` string and the research note it cites. The `kind` field was not taken on
  trust.
- **Seed noise** comes only from outputs already on disk:
  - `docs/experiments/fits/level0/S.gate.json`: night 1's fits for beech, oak and birch, 20 seeds, stand traits only;
  - `runs/level1-sensitivity/raw/main-hand.json`: beech, Level 0 fit with the hand form, seeds 101–110, every trait;
  - `runs/crown-competition/levers.csv`: the dump's LAI at 60, oak and beech, hand and fit, seeds 1–5.
- **Not measured:** hornbeam, maple, pine, fir and rowan. No per-seed record exists on their current params (night 2
  has not run), so these are marked "not measured" rather than borrowing another species' SD.

## Where each trait is scored now
- **Level 0** (`fit_level0.py`, the night-1 fits): the traits in the table below, each at its weight, plus death
  penalties.
- **Level 1 pilot, beech** (registration v5, `level1_targets.py:194–198, 216–218`):
  - kept at their Level 0 weights: height at 60, talloH, talloCR, LAI, survival light and the death penalties;
  - lateShare at a band of 0.10, in this loss only;
  - height at 100 reported.
- **The retired round loss** (`load_spec(s)` with no level: `m27_fit.py`, `m27_rescore.py`, `m27_gallery.py`) scores
  everything else, including `lone.earlyShare`, `lone.slenderness`, `stand.slenderness` and `stand.crownRatio`. Under
  "no round-5 fit" (STATUS, Next 1) nothing runs it, so these traits are not live. Level 0 reports them.
- **Held out, never in a loss:** each file's `[holdout]` (the floor and the survival-light range), read by
  `m27_holdout.py`, also retired.

## The table
- **Provenance classes:**
  - **M-study:** a number read from a study's table;
  - **M-yield:** a yield table or site-index curve;
  - **M-inventory:** a national inventory's mean;
  - **E:** an estimate (a fitted curve, a regression on tolerance score, an extrapolation, a proxy species);
  - **D:** described (a field guide).
- **"Band from"** is the band's own provenance, separate from the target's. "Convention" means a number chosen
  without a stated derivation from the source's spread.
- **Seed SD** is the per-seed standard deviation of the trait, on the params that were being fitted or probed. The
  last column says whether the band was ever set against it.
- **Lines:** the targets file is `analysis/fit/targets/S.toml` (the trait's `name` line). The research note is
  `docs/research/2026-10-28-species-traits.md` ("traits").

### LAI (`stand.lai`, closed stand at 60)
| species | target ± band, w | where | provenance (read) | band from | seed SD | ever against noise |
|---|---|---|---|---|---|---|
| beech | 8.4 ± 1.5, 1 | `beech.toml:79`; traits:184, :120 | **M-study.** Hagemeier & Leuschner 2019 (H&L) Table 5, litter-trap LAI, mean of two stands | convention: "Measured, ± 1.5" (traits:184), no derivation. The file's own source cites Černý et al. 2020's litter-trap maxima of 4.5–5.1, a method spread wider than the band | 0.36–0.45 (fit, hand; 5 seeds, dump's); 0.61 (hand form, 10 seeds) | no |
| birch | 4.6 ± 1.5, 1 | `birch.toml:79`; traits:184 | M-study, H&L Table 5 | convention | not measured (the gate dumps no LAI) | no |
| hornbeam | 8.3 ± 1.5, 1 | `hornbeam.toml:79`; traits:184 | M-study, H&L Table 5 (stands 68–77% hornbeam) | convention | not measured | no |
| oak | 5.5 ± 1.5, 1 | `oak.toml:79`; traits:184 | M-study, H&L Table 5 (sessile oak) | convention | 0.09 (hand), 0.15 (fit); 5 seeds | no |
| **maple** | 4.0 ± 1.5, **0.5** | `maple.toml:79`; traits:184 | **E: a proxy.** One sycamore stand's maximum (Černý et al. 2020, read from the abstract); field maple not found. Already `kind = "described"` | convention | not measured | no |
| pine, fir, rowan, willow, holly | none | — | none found (traits:184, :202) | — | — | — |

### Shade house (`shade.survivalLight`, the lowest light a seedling lives through 30 seasons under)
| species | target ± band, w | where | provenance (read) | band from | seed SD | ever against noise |
|---|---|---|---|---|---|---|
| beech | 0.034 ± 0.01, 1 | `beech.toml:124`; traits:80, :112–119, :153 | **M-study.** H&L 2019's saplings' minimum light demand, a median of 120–150 measurements per species ("treat as approximate floors", traits:119) | convention: half the held-out range 2.5–4.5% (`beech.toml:272`), itself drawn around the median (traits:80) | **0** (hand form, 10 seeds) | no |
| birch | 0.21 ± 0.05, 1 | `birch.toml:124`; same | M-study, H&L | convention | not measured | no |
| hornbeam | 0.033 ± 0.01, 1 | `hornbeam.toml:124`; same | M-study, H&L | convention | not measured | no |
| oak | 0.114 ± 0.03, 1 | `oak.toml:124`; same | M-study, H&L (sessile oak) | convention | 0 in effect: 0.11 in every base and lever cell (crown note §5) | no |
| maple, rowan, willow, holly, fir, pine | held out only | `S.toml` `[holdout]` (`maple.toml:265`, `rowan.toml:256`, `willow.toml:256`, `holly.toml:256`, `fir.toml:209`, `pine.toml:209`) | **E.** Placed by Niinemets & Valladares' tolerance score (traits:80; `analysis/fit/sources/floor_light_targets.csv`); holly from Valladares et al. 2005 | — | — | not scored |

**The shade house's zero SD is quantisation, not precision.** Its roofs are a fixed ladder (`cli/trials.ts:53`), giving
survival lights in steps of about 2–19% (traits:153). The continuous statistic (`fit.py:243–265`) credits partial
survival under the next darker roof, but on these params every seed lands on the same value. A ±0.01 band (beech,
hornbeam) is narrower than the ladder's step near it. This is a caveat on resolution, not a seed-noise flag.

### The other Level 0 traits scored somewhere
| trait | species (w) | target ± band | where | provenance (read) | band from | seed SD | ever against noise |
|---|---|---|---|---|---|---|---|
| height at 60 | beech (1) | 84 ± 18 | `beech.toml:12` | M-yield: site-index curves (Nord-Larsen 2009; Bončina 2021; Stajić 2021), "commonly reported ranges" from abstracts (traits:9–10) | convention: covers the ±20% cell scale (traits:6) | 5.5 (fit, 20); 6.6 (hand form, 10) | no |
| | oak (1) | 78 ± 13 | `oak.toml:12` | M-yield, NW-FVA classes 1–2 | convention, as beech | 1.0 (fit, 20) | no |
| | birch (1) | 95 ± 20 | `birch.toml:12` | M-yield: Lee 2024; Jansen 2018 | convention | 0.5 (fit, 20) | no |
| | hornbeam (1) | 84 ± 13 | `hornbeam.toml:12` | M-yield, Lockow & Lockow 2009 (in repo: `hornbeam_yield_table_lockow2009.csv`) | convention | not measured | no |
| | pine (1) | 84 ± 14 | `pine.toml:12` | M-yield, NW-FVA | convention | not measured | no |
| | fir (1) | 80 ± 14 | `fir.toml:12` | M-yield, Tirol fir tables 2004 | convention | not measured | no |
| | **maple (1)** | 64 ± 11 | `maple.toml:12` | **M-inventory, not a top height:** BWI 2012's *mean* height at *mean* age 63 (LWF Wissen 77). Labelled "measured" like the top heights | convention | not measured | no |
| | **rowan (0.5)** | 60 ± 14 | `rowan.toml:12` | **D/E:** a fitted curve (`minor_species_growth_curves.csv`) and field guides. `kind = "described"` | convention | not measured | no |
| lateShare (H100/H60) | **beech (1)** | 1.43 ± 0.06 | `beech.toml:116` | M-yield, NW-FVA classes 1–2 (1.41–1.45) | convention, wider than the classes' ±0.02 | **0.161 (fit, 20); 0.137 (hand form, 10)** | Level 0: no. Level 1 v5: yes (band 0.10; see the flags) |
| | oak (1) | 1.31 ± 0.06 | `oak.toml:116` | M-yield, NW-FVA (1.29–1.33) | convention | 0.044 (fit, 20) | no |
| | hornbeam (1) | 1.23 ± 0.05 | `hornbeam.toml:116` | M-yield, Lockow | convention | not measured | no |
| | pine (1) | 1.28 ± 0.06 | `pine.toml:109` | M-yield, NW-FVA (1.27–1.29) | convention | not measured | no |
| | fir (0.5) | 1.53 ± 0.08 | `fir.toml:109` | M-yield, Tirol (1.48–1.59); mountain stands, hence half weight | ≈ the range | not measured | no |
| | **maple (0.5)** | 1.30 ± 0.10 | `maple.toml:116` | **E:** canopy maples at 88–102 years over the inventory mean at 63 ("an estimate"); `kind = "described"` | convention | not measured | no |
| | **rowan (0.5)** | 1.09 ± 0.08 | `rowan.toml:106` | **E:** the fitted curve; `kind = "described"` | convention | not measured | no |
| | birch | 1.12 ± 0.08 | `birch.toml:116` | E (Zeoli 2025, curve shape) | — | 0.009 (fit, 20) | reported since v2 (`birch.toml:282`) |
| height at 100 | beech (1) | 122 ± 26 | `beech.toml:330` | M-yield, NW-FVA (`nwfva_h100.csv:212, :234`) | convention: height at 60's share (18/84), stated in the file | 11.4 (fit, 20); 12.9 (hand form, 10) | no |
| | oak (1) | 102 ± 17 | `oak.toml:317` | M-yield, NW-FVA (`:83, :114`) | convention, the same share | 4.0 (fit, 20) | no |
| | pine (1) | 108 ± 18 | `pine.toml:221` | M-yield, NW-FVA (`:318, :337`) | convention, a sixth | not measured | no |
| height at 150 | oak (1) | 119 ± 20 | `oak.toml:325` | M-yield, NW-FVA (`:93, :124`) | convention, the same share | 7.2 (fit, 20) | no |
| talloH, talloCR | the gated eight (rowan by the borrowed rule) | median z ≤ T at 60, 100 and 150 | `tallo-level0.json` | M-study: Tallo trees in 45–58° N (level0-targets note, v2) | **the real trees' spread:** z is per tree; T (0.99–1.09) is a control drawn from real trees | z SD 0.04–0.74 across seeds (beech, oak, birch, 20) | yes, against the reference's sampling noise, not the model's seeds |

Willow's height (`willow.toml:12`, "measured") mixes British field guides with taiga stands, and its lateShare
(`willow.toml:106`) is extrapolated past age 45–65. Holly's both are described. All four are moot while willow and
holly are not gated at Level 0.

## Flags (band narrower than the trait's measured per-seed SD)
1. **Beech lateShare at Level 0:** band 0.06 against a per-seed SD of 0.161 (fit, 20 seeds) and 0.137 (hand form,
   10). Already known from the sensitivity note. It is the only flag at Level 0.
2. **Beech lateShare in the Level 1 loss (v5):** band 0.10 against the same SD of 0.137. v5 set it against the
   standard error on ten seeds (0.043), not the per-seed SD (`level1_targets.py:216–225`, `beech.toml:318`). By the
   rule as the user wrote it ("narrower than the trait's measured per-seed SD"), it is flagged too. Pilot v4 is
   running under it, unchanged.
3. **Close, not flagged:** oak lateShare (band 0.06, SD 0.044, ratio 0.73).
4. **Caveat, not a flag:** the shade house (above).

No LAI or height band is narrower than its measured SD. Wherever the band is wider than the SD, a seed mean over
4–10 seeds is far inside it.

## What the lever probes were judged against (crown note §5, 2026-11-04)
The "collapsed canopy" verdicts read LAI and the shade house. Re-read against the **measured** targets' bands, not
against the model's base:
- **LAI z** = (value − target) / 1.5: oak 5.5; beech 8.4. The values are the fitter's LAI from the crown note's
  tables.

| cell | oak hand | oak fit | beech hand | beech fit |
|---|---|---|---|---|
| base | 3.81 (−1.13) | 5.19 (−0.21) | 10.33 (+1.29) | 10.15 (+1.17) |
| Trel×3 | 3.44 (−1.37) | 4.73 (−0.51) | 10.38 (+1.32) | 10.05 (+1.10) |
| **Trel×10** | 1.52 (−2.65) | **3.30 (−1.47)** | 10.20 (+1.20) | 9.91 (+1.01) |
| qMin 0.3 | 1.65 (−2.57) | **2.83 (−1.78)** | 2.61 (−3.86) | 3.52 (−3.25) |
| qMin 0.5 | 0.62 (−3.25) | 1.61 (−2.59) | 1.56 (−4.56) | 1.71 (−4.46) |

**The shade house's failures are solid.** Past qMin's bound, survival light is 0.26 and 0.68:
- against oak's 0.114 ± 0.03: z +4.9 and +18.9;
- against beech's 0.034 ± 0.01: z +22.6 and +64.6.

Trees die as well (beech 8–10 of 12). The qMin verdict stands on the shade house and the deaths. Both measured
targets carry a conventional band.

**Finding, for the user (not a correction applied to the crown note).**
- The nearest lever, oak fit's Trel×10, was ruled out for "collapsing LAI": 5.2 → 3.3. Against the measured target
  that is z −1.47: outside one band, inside two, on a ±1.5 band that is a convention.
- Oak fit's qMin 0.3 is −1.78 on LAI, but fails the shade house anyway.
- So "no probed lever passes oak without collapsing the canopy" rested, for Trel×10, partly on the distance from
  the model's base rather than from the band.
- Trel×10 still does not pass oak's gate: its z_CR at 60 is above T (1.04). The crown note's text
  (`2026-11-04-crown-competition.md:319`) says +1.24 and z_H at 150 +1.42. Its table (`:273`) says +1.34 and +1.56.
  The text and the table disagree; this audit did not re-derive which is right.
- **The verdict "no lever passes" stands.** The word "collapse" for Trel×10 does not, on this reading.

**A measurement mismatch under all of it.** H&L's LAI is litter-trap leaf area per ground area. The model's is its
leaf area per ground cell over the stand's ring. Beech's base already reads +1.2 bands over 8.4, and traits:184
records that the floor does not follow from LAI in this model (effective extinction ≈ 0.35, not 0.5). LAI is a
measured number scored against a reading that is not the same measurement.

## Proposals (not applied; for the user to rule)
1. **Described traits become reported** at Level 0 and in any Level 1 loss that keeps Level 0's terms. Rows:
   - maple LAI;
   - maple lateShare;
   - rowan height at 60;
   - rowan lateShare.

   This **extends** ADR 0049 §1, which covers described *shape* targets. `fit.py:61–62` already calls the time
   anchors an exception to it. It folds in the plan's open point 2 (maple, rowan and holly lateShare; holly is moot,
   not gated). Rowan would then have no scored trait besides Tallo's. Its time anchor goes, which matters only if
   rowan is ever run.
2. **Measured traits stay scored, with their source recorded:**
   - LAI and the shade house for beech, birch, hornbeam and oak;
   - every M-yield height and lateShare;
   - maple's inventory height, relabelled "M-inventory (mean height, not top height)".

   A `band_source` line beside each `source` would record where the band came from: "convention" for every band
   above, except Tallo's.
3. **Flags for a ruling:** beech lateShare's Level 0 band (0.06) and its Level 1 band (0.10) are both under its
   per-seed SD (0.137–0.161). The choice (widen to the SD, or keep it and rely on the seed mean's SE) is the user's.
   Pilot v4's registration is not touched.
4. **The LAI band and the lever verdicts:**
   - LAI's ±1.5 is a convention. Beech's own cited source spread (4.5–5.1 against 8.4) is wider.
   - Should the lever note's "collapse" be read against the band (z ≤ −2, say) rather than against the base? Should
     LAI stay scored at all, given the measurement mismatch?

   Both are questions for the user before ADR 0052's probe, which reports LAI rather than targeting it (ruling 4).
5. **Before any band is set against noise for the unmeasured species,** their per-seed SDs come from night 2's gates
   (the gate rows give height, height at 100 and lateShare). LAI needs the fitter's per-seed traits, which the gate
   does not dump.
