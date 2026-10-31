# Species trait targets for fitting (M27: the pilot birch and beech, then all ten)

The targets `analysis/fit/targets/<species>.toml` fits against, and where each comes from.

## Scale and conventions
- **Units:** 1 cell ≈ 0.25 m and 1 season = 1 year (ROADMAP: trees grow ≈ 2 cells a season). The cell scale is uncertain (0.2–0.3 m), so absolute heights get wide bands and the shape of the height curve gets its own, scale-free trait (height at 30 over height at 60).
- **Measured** targets come from a study's numbers and carry weight 1.
- **Described** targets turn a field-guide description or a qualitative finding into a wide band, at weight 0.5 (droop 0.25). A fit that misses them is reported, not forced.
- **The source of these numbers:**
  - The searches (Consensus, 2026-10-28) returned abstracts only, so the site-index numbers below are the commonly reported ranges for these species, with the studies as pointers. They were not read from the papers' tables.
  - Revise them if a table is to hand.

## Targets

| Trait | Birch | Beech | Kind | Source |
|---|---|---|---|---|
| Stand (dominant) height at 60 seasons, cells | 95 ± 20 (≈ 24 m) | 84 ± 18 (≈ 21 m) | measured | Site-index and yield models: birch, [Lee et al. 2024](https://consensus.app/papers/details/90902275b404504aaf45e70e6353e439/?utm_source=claude_desktop), [Jansen et al. 2018](https://consensus.app/papers/details/8c6c64fc82c6503686c42ec49965d158/?utm_source=claude_desktop), [Zeoli et al. 2025](https://consensus.app/papers/details/fdf9a3c81caa50deab8f93e8bb77f0c6/?utm_source=claude_desktop); beech (site index ≈ 27–33 m at 100 years), [Nord-Larsen et al. 2009](https://consensus.app/papers/details/1125627e7c055acfb74cccf5a26a218a/?utm_source=claude_desktop), [Bončina et al. 2021](https://consensus.app/papers/details/37719fa228c456ec8b45a4c28c0082f0/?utm_source=claude_desktop) |
| Height at 30 over height at 60 (lone) | 0.72 ± 0.08 | 0.50 ± 0.08 | measured | Birch's height increment culminates early; beech's late ([Stajić et al. 2021](https://consensus.app/papers/details/d007eed16f445aaeb8b7373f9ca9d8b2/?utm_source=claude_desktop); [Matisons et al. 2018](https://consensus.app/papers/details/4e72f137176b58858cad03114b9d9085/?utm_source=claude_desktop): slower early growth) |
| Open-grown W/H | 0.45 ± 0.12 | 0.9 ± 0.2 | described | Birch narrow and open (M19 note); an open-grown crown about as wide as it is long (Hein et al. 2008, M19 note); open-grown maxima ([Hasenauer 1997](https://consensus.app/papers/details/0a23d1523fca5add92ded1d6f4ac9587/?utm_source=claude_desktop)) |
| Open-grown H/D | 48 ± 8 | 48 ± 8 | measured | MacFarlane et al. 2017 (M19 note) |
| Stand H/D | 70 ± 10 | 70 ± 10 | measured | Watt et al. 2023 (M19 note) |
| Stand crown ratio | 0.38 ± 0.1 | 0.55 ± 0.1 | described | Light-demanders lift their crowns fast, shade-tolerant species keep them deep (Kothari et al. 2025); beech crowns respond to competition ([Dieler et al. 2013](https://consensus.app/papers/details/70289f5dd2c051c0b1b7de15bf1d454f/?utm_source=claude_desktop); [del Río et al. 2018](https://consensus.app/papers/details/5a823d3b799052ff98f4497a163771da/?utm_source=claude_desktop)) |
| Floor light under a pure stand | 0.15 ± 0.05 | 0.015 ± 0.008 | measured | Hagemeier & Leuschner 2019, overcast PAR: birch median 14.8% (6.4–19.8%), beech 1.3% (0.9–2.1% in 100–150-year stands). Revised from M19's 0.18 and 0.03 |
| Widest band (open) | 0.4 ± 0.15 | 0.4 ± 0.15 | described | Birch ovoid; beech a broad dome. M26 measured birch as an hourglass and beech as widest at the base |
| Crown fullness (open) | 0.7 ± 0.1 | 0.75 ± 0.1 | described | Ovoid and dome outlines; an ellipse is 0.79 |
| Fork height (open) | 0.9 ± 0.1 | 0.7 ± 0.2 | described | Birch excurrent (§9); open-grown beech often divides into a few big limbs |
| Leader dominance (open) | 3 ± 1 | 2 ± 0.8 | described | Strong against moderate apical control |
| First-order branch angle (open) | 45° ± 10° | 55° ± 10° | described | Fine, ascending birch branches (§9); beech's angles flatten where competition is low ([Bayer et al. 2013](https://consensus.app/papers/details/176674b35836593087078d8a7f3c1d7d/?utm_source=claude_desktop)); measurement methods: [Peng et al. 2024](https://consensus.app/papers/details/d47154ea7e5c57cb868184d524097fc6/?utm_source=claude_desktop) |
| Limb droop (open) | 15° ± 10° | 10° ± 10° | described | Birch's arching limbs and hanging twigs |

## The other eight species (2026-10-28)

The same 13 traits and 17 parameters for oak, fir, hornbeam, field maple, holly, rowan, goat willow and Scots pine. Each `source` line in the targets file says where its number comes from.

- **Measured, weight 1** (tightened 2026-10-28; see "Sources found" below):
  - **Height at 60 seasons:**
    - oak, pine, fir and hornbeam from yield tables;
    - field maple from Germany's national forest inventory;
    - willow between the field guides' ≈ 10 m and taiga willow stands' 16.6–18 m (Paramonov et al. 2021): 52 ± 14 cells.
    - Rowan and holly are now estimates at half weight (below).
  - **Height at 30 over height at 60:** for oak, pine, fir and hornbeam from the same yield tables, and for willow from the Arkhangelsk tree-willow yield tables.
  - **Floor light:** oak and hornbeam, and the pilot's birch and beech (Hagemeier & Leuschner 2019).
  - **H/D:** open-grown 48 ± 8 (MacFarlane et al. 2017), stand-grown 70 ± 10 (Watt et al. 2023), for every species as for the pilot. Field maple's measured canopy trees agree: H/D 64 and 73 in two Bavarian stands (LWF Wissen 77).
- **Described, weight 0.5:**
  - **Floor light** for fir, maple, holly, rowan and willow (`analysis/fit/sources/floor_light_targets.csv`, the user's research). These are estimates from Hagemeier & Leuschner's five measured species:
    - log floor light falls linearly with Niinemets & Valladares's tolerance score: ln(floor %) = 4.92 − 1.08 × score;
    - leaving each species out and predicting it from the other four errs within a factor of ≈ 1.6;
    - a second estimate, from leaf area index and Beer–Lambert extinction, agrees within ≈ 1.5;
    - the same fit gives 22% for pine, inside its band, so pine keeps its scaled 17%.
    - **A caveat:** these floors carry the tolerance score into the fit, which the hold-out compares against. Half weight limits that, but the Spearman check is a little less independent for these five species.
  - **Growth curves for rowan and holly:** Chapman–Richards curves fitted through the few published facts (`minor_species_growth_curves.csv`), giving height at 60 and H30/H60:
    - **Rowan:** fast young growth, slowing after about 20, level with spruce to 45, mature 15–20 m.
    - **Holly:** maximum heights, a 260-year-old tree of 12 m, and young forest holly. It is open or edge growth: shaded holly grows only 20–30% as much (Peterken & Newbould 1966), and the model's light response should carry that.
  - **Maple's H30/H60** is still from growth descriptions.
  - **Form,** as the user specified: fir and holly cones; oak, maple and hornbeam rounded and forking low; willow broad and low; rowan's limbs steep (35°); pine excurrent.

| Trait | Oak | Fir | Hornbeam | Maple | Holly | Rowan | Willow | Pine |
|---|---|---|---|---|---|---|---|---|
| Stand height, cells | 78 ± 13 | 80 ± 14 | 84 ± 13 | 64 ± 11 | 41 ± 12 (est.) | 60 ± 14 (est.) | 52 ± 14 | 84 ± 14 |
| H30 / H60 | 0.62 ± 0.05 | 0.42 ± 0.06 | 0.67 ± 0.05 | 0.7 | 0.63 (est.) | 0.74 (est.) | 0.73 ± 0.06 | 0.6 ± 0.05 |
| Open W/H | 1.3 | 0.4 | 1.0 | 1.0 | 0.5 | 0.6 | 1.6 | 0.6 |
| Stand crown ratio | 0.4 | 0.6 | 0.55 | 0.5 | 0.75 | 0.45 | 0.45 | 0.35 |
| Floor light | 8.4% ± 3 | 1.3% (est.) | 1.5% ± 0.8 | 4.5% (est.) | 2% (est.) | 7.5% (est.) | 12% (est.) | 17% |
| Widest band | 0.5 | 0.1 | 0.45 | 0.45 | 0.15 | 0.5 | 0.5 | 0.3 |
| Fork height | 0.3 | 0.92 | 0.4 | 0.35 | 0.9 | 0.6 | 0.15 | 0.9 |
| Leader dominance | 1.3 | 4 | 1.6 | 1.6 | 3 | 2 | 1.1 | 3 |
| Branch angle | 55° | 75° | 50° | 45° | 60° | 35° | 45° | 70° |

**Bounds** are birch's, with these changes:
- **Fir and pine:** level 1's η stays within 1.5–2, the strong plagiotropic pull that makes their tiers, and their branch angle within 50–90°.
- **L_h, every species:** 10–200 on a log scale, since the fits use the hyperbolic discount (ADR 0021). That form needs larger values than the exponential for the same height. This supersedes the earlier 25–100, and 12–70 for the small trees.
- **Fixed in every fit:** `r1.hydraulic = "hyperbolic"` (`[fixed]` in each targets file).
- **Holly:** α 1.8–4.5 and branch angle 35–80°.
- **Rowan:** branch angle 20–60°.
- **Willow:** α 3–7.

Every hand-tuned value lies inside its bounds.

**Held out:**
- **Survival light bands:** birch 15–25%, oak 8–14%, beech and hornbeam 2.5–4.5% (saplings' measured minimum light demand, Hagemeier & Leuschner 2019); the rest placed by tolerance score: pine 20–30%, willow 12–20%, rowan 8–14% (oak's: the same score), maple 5–10%, holly 2–5% (Valladares et al. 2005), fir 1.5–4%. The score regression puts these species' saplings at fir 2.6%, maple 8%, holly 4.7%, rowan 11.4%, willow 17.8% and pine 26.1%.
- **Shade scores** (`shadeScore`, Niinemets & Valladares 2006) for all ten species, for the Spearman check.

### Sources found (2026-10-28)
- **Yield tables (oak, pine, beech):** the NW-FVA tables (Albert et al. 2021, after Schober), read from the data in the CRAN package `et.nwfva` 0.2.0. Top height H100 at 60 years and the ratio H30/H60:

  | Species | Yield class | H100 at 60 | H30 / H60 |
  |---|---|---|---|
  | Oak | 1–2 | 18.1–21.0 m | 0.59–0.62 (0.59–0.68 over classes −1 to 2) |
  | Pine | 1–2 | 19.4–22.8 m | 0.59–0.61 |
  | Beech | 0–1 | 23.1–26.6 m | 0.48–0.52 |

  Beech's curve shape confirms the pilot's 0.5. Its top height at 60 (≈ 92–106 cells) is above the pilot's 84; the pilot targets were left unchanged.
- **Fir:** the Tirol yield tables (Amt der Tiroler Landesregierung 2004), derived from the Baden-Württemberg fir yield table:
  - site index 28–34 m gives a top height of 17.6–23.0 m at 60 years;
  - H30/H60 is 0.35–0.47 for site index 28–38.
  - These are mountain tables, with 10–20 years to breast height.
- **Field maple** (LWF Wissen 77, Bavaria; data from the 2012 national forest inventory, BWI):
  - 782 trees, with a mean height of 16.1 m at a mean age of 63;
  - in two stands it shares the canopy with sessile oak and beech: 24.6–26.4 m at 88–102 years.
- **Hornbeam** (`analysis/fit/sources/hornbeam_yield_table_lockow2009.csv`): Lockow & Lockow 2009, *Die Hainbuche im nordostdeutschen Tiefland* (Eberswalder Forstliche Schriftenreihe 41), the hornbeam yield table for the north-east German lowlands.
  - It rests on 124 plots aged 5–132 years, with stem analyses. The user extracted all 15 site classes (H100 = 18–32 m), every 5 years from 10 to 160.
  - Site index 25–27 m, around class II.0: top height 20.3–22.0 m at 60 years, H30/H60 0.665–0.673. Over all classes H30/H60 is 0.60–0.68.
  - Hornbeam's curve is earlier than beech's (0.5) and close to oak's: it slows sooner, as the field guides say.
  - **A caveat:** stand age here is a volume-weighted mean, since these naturally regenerated stands are uneven-aged.
  - The 68 cells used before, from field guides, was too low: the table gives 84.
- **Canopy transmittance and light demand** (Hagemeier & Leuschner 2019, *Forests* 10:925, from the open-access full text, read by the user's research agent):
  - **Measurement conditions:** overcast sky, 11:00–14:00, June–July. These are diffuse values with no sunflecks, the right comparison for the sky sweep.
  - **PAR on the floor under a closed canopy:** birch median 14.8% (6.4–19.8%); sessile oak 8.4% (4.9–12.8%); hornbeam 1.3%, beech 1.3% and lime 1.4% (the three together 0.6–2.8%). Beech gives 0.9–2.1% in 100–150-year stands and 0.7% in a 26-year stand.
  - **Minimum light demand** (% of incident PAR):

    | Species | Lowest shade leaves | Saplings (50–90 cm) |
    |---|---|---|
    | Birch | 21.0 | 21.0 |
    | Sessile oak | 6.3 | 11.4 |
    | Hornbeam | 2.5 | 3.3 |
    | Lime | 3.0 | 3.6 |
    | Beech | 0.8 | 3.4 |

    The sapling column sets the held-out survival bands for birch, oak, beech and hornbeam. An earlier draft of this note quoted the shade-leaf column (oak 6.3%, hornbeam 2.5%) as if it were saplings'. The paper calls these medians of 120–150 measurements, so treat them as approximate floors.
  - **Leaf area index, K_PAR and clumping Ω:** birch 4.6, 0.37, 0.42; sessile oak 5.5, 0.48, 0.51; hornbeam 8.3, 0.51, 0.55; lime 7.1, 0.48, 0.51; beech 8.4, 0.51, 0.55. These are not fit targets yet; they are a lead for checking R6's leaf area.
- **Light under pine** (Dobrowolska 2008, *J. For. Sci.* 54:398, Karkonosze): all-day relative light under pine 12.8% (up to 53.9%), birch 11.1%, spruce 7.0%, beech 4.2%.
  - All-day values run about three times the overcast ones for beech, so only the ratio is used: pine over birch, 1.15.
  - Walter & Himmler 1996 give 2–59% across the growth stages of Alsatian pine stands.
- **Rowan** (LWF Nr. 17, *Beiträge zur Vogelbeere*): no growth table.
  - It grows up to 25 m; Mayer gives 15–22 m as typical. It lives about 150 years in the mountains, 60–80 in the lowlands.
  - It keeps pace with spruce to age 45 in the Thuringian uplands.
  - Saplings at 34–44% light grew about 23 cm a year; young rowan in the open up to 80 cm.
- **Goat willow** (`minor_species_growth_curves.csv`): Paramonov, Tretyakov & Koptev 2021, yield tables for tree-willow stands in Arkhangelsk.
  - 42 plots and 53 sample trees, mostly goat willow and its hybrids.
  - Mean height × 1.10 gives top height (the hornbeam table's ratio at 40–100). Chapman–Richards fits per class, with the asymptote capped at 19 m (uncapped fits climb to 23–29 m; the capped ones stay within 0.4 m of the data).
  - Data end at 45–65 years, where stand volume starts to fall, so heights at 60 are partly extrapolated.
  - **Class I:** 13.9 m at 30 and 18.0 m at 60, ratio 0.77. **Class II:** 11.5 and 16.6 m, ratio 0.69. For a British lowland site, the user's research suggests class I as the middle.
  - The "ultimate height in 10–20 years" of the horticultural profiles (previous entry) was wrong for stands: willow keeps growing to 40–50.
- **Light by method:** hemispherical photographs give far higher values than quantum sensors under overcast sky (a Belgian study: 14.6% under beech, against 1.3%). Every floor target here is on the quantum-sensor scale (pine's only as a ratio), so don't mix in photograph-based numbers.
- **Not found:** measured growth curves for holly and rowan; measured transmittance under fir, field maple, holly, rowan and willow; Hale et al. 2009's curve (paywalled).

**How far the hand-tuned species are from the tightened targets** (10 seeds; (value − target) / band):
- **Height at 30 over height at 60 is the largest miss.**
  - It is 0.64–1.03 for every species: oak 0.83, fir 0.64, pine 0.80 against the yield tables' 0.62, 0.42 and 0.60. That is 3.6–4.1 bands for those three.
  - Height growth levels off too early across the board, through R1's hydraulic plateau.
  - **A caveat on the comparison:** the yield tables give the top height of stands, and the trait measures a lone tree. Open-grown trees are shorter but follow a similar curve.
- **Willow** scores worst after them: it is squat open-grown and in a stand (H/D 26 and 41).
  - Watt et al.'s 60–80 is for conifer stands, so for a multi-stemmed willow the band may be wrong rather than the tree.
  - Revisit it if the fit strains for willow's H/D.
- **Hornbeam's** stand crowns are shallow (0.28 against 0.55), and its stands short (63 cells against the table's 84).
- **The measured floors are darker than the model's:** beech casts 3.3% against 1.3–1.5% (2.2 bands), hornbeam 2.6% against 1.5%.
- **Willow is now the worst:** its lone tree is shorter at 60 than at 30 (H30/H60 1.03 against 0.73, 5.1 bands). Its height falls after season 30, through dieback, shedding or sag (not yet diagnosed). The fit can only change that through its free parameters (L_h, m_f, Q_ss, …).
- **Fir's floor** is 6% against an estimated 1.3% (5.9 bands, at half weight).
- **Birch's seedlings are too tolerant** for the measured survival band: the model's birch survives 13%, Hagemeier & Leuschner's saplings need 21%. That is a hold-out, so the fit will not see it.
- **Rowan's** open-grown stem is slender (H/D 68).

### Added after round 1 (2026-10-28)
- **`shade.survivalLight`** (fitted, weight 1): birch 0.21 ± 0.05, oak 0.114 ± 0.03, beech 0.034 ± 0.01, hornbeam 0.033 ± 0.01. These are the saplings' minimum light demand (Hagemeier & Leuschner 2019). The shade house's roofs give survival lights in steps of about 2–19%, which the seed mean smooths.
- **`stand.lateShare`** (stand height at 100 over that at 60):
  - **Measured:** oak 1.31 ± 0.06, pine 1.28 ± 0.06 and beech 1.43 ± 0.06 (NW-FVA classes 1–2); hornbeam 1.23 ± 0.05 (Lockow, SI 25–27).
  - **Measured, half weight:** fir 1.53 ± 0.08 (Tirol, mountain); willow 1.08 ± 0.06 (Paramonov, extrapolated).
  - **Estimated, half weight:** rowan 1.09 and holly 1.22 (fitted curves); birch 1.12 (early culmination); maple 1.3 ± 0.1 (canopy maples against the inventory mean, LWF Wissen 77).
- **Fir's H30/H60** goes to half weight (a mountain table).
- **`r2.hJ`,** the juvenile height (ADR 0022), is free on 2–150 cells, log scale, for every species.

## Round 4: re-sourced for 3D (2026-10-31)

From the [targets audit](../reviews/2026-10-31-species-target-audit.md) and the [round-4 plan](../plans/2026-10-31-species-round4.md), step C. The targets files hold each number with its source line; this section says what was read and how. "Read": in the source's text or tables; "computed": by us from coefficients or columns read there; "second-hand": an abstract or a co-author's table. ADR 0028 records the decisions.

**Stand H/D (`stand.slenderness`), per species** (was 70 ± 10 for all ten). Top height over a top diameter as the target (the closed stand's trees, at ≈ 360 stems/ha, are nearer the dominant collective than the mean tree), the mean tree's ratio as the band's top:

| species | target | kind | read |
|---|---|---|---|
| birch | 95 ± 12 | measured | 105 at 45 and 100 at 67 years (Hagemeier & Leuschner 2019, Table 2); ≈ 100 in Moravian stands (Martiník & Mauer 2012) |
| oak | 75 ± 10 | measured | NW-FVA (Albert et al. 2021, the et.nwfva data) at 60, classes 1–2: H100/Dw 74–76, Hg/Dg 85–88 (computed) |
| beech | 82 ± 12 | measured | NW-FVA at 60, classes 0–1: H100/Dw 78–83, Hg/Dg 107–108 (computed) |
| hornbeam | 86 ± 12 | measured | Lockow 2009 at 60, SI 25–27: HO/DO 84–87, HDG/DG 106–113 (computed from the repo's CSV) |
| maple | 68 ± 12 | measured, ½ | the German inventory's mean 65 and canopy maples 64–73 (Klemmt et al. 2015, LWF Wissen 77) |
| rowan, holly, willow | 70 ± 10 | described, ½ | nothing found: the generic range stays, at half weight |

The audit's 80–110 for birch is confirmed: round 3's birch "failed" at 86.9 against a target that was not birch's, and was "fixed" toward it.

**Lone H/D and W/H (`lone.slenderness`, `lone.spread`).** The plan's source, Pretzsch et al. 2015 (UFUG 14:466; read in full), fits crown radius at the 95% quantile and height at the 5% quantile, on different trees and mostly on forest plots: an envelope, not a solitary tree's mean. It covers birch, beech, hornbeam, oak, rowan and sycamore of the garden's species (not holly, willow or field maple), and its Q. robur height relation is unusable (≈ 6 m at d 25 cm). So, the user's decision of 2026-10-31: both traits stay **described at half weight**, moved per species where the envelope moves them, with its W/H as a lower bound; beech's lone H/D 48 becomes measured, since the envelope (51, 48, 47 at d 25, 40, 50 cm) and the generic 40–55 agree. Hein & Spiecker 2008, which round 3's beech spread leaned on, is open-grown ash and sycamore (Agroforestry Systems 73:205; closed access), not beech. No directly measured open-grown beech or oak allometry was reached (Hasenauer 1997 is paywalled and its equations not reproduced where we could read them).

**`lone.spread` is set at the trial's age.** At about 60 years and 0.5 m DBH (the lone beech and oak at 60), Hemery et al. 2005's open-grown crown diameters (second-hand) give W/H 0.35–0.38 for beech and 0.43 for oak with the sim's heights, and the envelope 0.51–0.52; the 0.9 and 1.3 of round 3 are parkland trees of 120 years and more. Round 4: beech 0.6 ± 0.2, oak 0.75 ± 0.25, hornbeam 0.7 ± 0.2, maple 0.7 ± 0.2 (proxies: sycamore 0.40 in the envelope, urban sycamore 0.55 and Norway maple 0.65, Franceschi et al. 2022), birch 0.55 ± 0.12 and rowan 0.4 ± 0.12 (the envelope); willow and holly unchanged. W/H is read against the sim's own lone height, which is tall for an open-grown tree at 60; the lone tree's spread at 100, unfitted, is the parkland check on the panel.

**Stand crown ratio** (`stand.crownRatio`, now the limb measure: where the first-order limbs, from the bottom up, first hold 5% of the leaf area). Pretzsch 2019 (Forests 10:810, read in full), Table 1 model 3, crown base against height at the 25% quantile in monocultures, gives CR 0.66, 0.63, 0.60 for beech and 0.47, 0.45, 0.44 for sessile oak at h 20, 25, 30 m (computed); the median crown is ≈ 0.05 shorter. Beech 0.57 ± 0.08 (measured), oak 0.42 ± 0.08 (measured, half weight: sessile for pedunculate). Schmucker et al. 2022 was not read (a bot check), and its abstract reports crown projection area and height, not crown length; Dieler & Pretzsch 2013 was not reached. The rest stay described.

**Stand LAI** (`stand.lai`, new, read in the closed stand at 60). Hagemeier & Leuschner 2019 (Forests 10:925, Table 5, read): birch 4.6, sessile oak 5.5, hornbeam 8.3, beech 8.4, with K_PAR 0.37, 0.48, 0.51, 0.51; exp(−K·LAI) gives their measured floors (18, 7.1, 1.45, 1.38%). Measured, ± 1.5, weight 1. Maple 4.0 ± 1.5, described at half weight (a sycamore stand's maximum, Černý et al. 2020, from the abstract; a proxy and one stand). Willow, rowan, holly: none found. **The floor stays a hold-out, and it will not follow from LAI in this model:** round 3's closed stands already read beech LAI 8.3–9.1 and hornbeam ≈ 8.0 with floors of 4–7% (`code/2026-10-31-species-round4/crown-base.txt`). The effective extinction through the slab at a given LAI is ≈ 0.35, not 0.5 (C1 round 3: the floor tracked the gap fraction, not the LAI above it), and the shortfall is the sky's oblique rays through gaps (C2), which no species parameter closes.

**The crown profile** (`lone.profile`, replacing `lone.widestAt` and `lone.crownFullness`): ten band widths, base to top, over the widest, from a two-parameter shape 1 − |u|^q (u the distance from the widest point c over the distance to the nearer end; q = p/(1 − p), so the mean width is the fullness p), with c and p the old described targets; band ± 0.1, the ten sharing weight 0.5, described. Franceschi et al. 2022 (Forests 13:748, read) classified shapes for five urban species only; of the garden's, none (Norway maple, the nearest, is spherical 44%, ovoid 38%, half-ellipsoid 15%), so maple keeps widest at 0.45. No source gives where an open-grown crown is widest for any species. Fir and pine: a cone (c 0.05, p 0.5).

**Kept, with their caveats in the files:** `stand.height` (the cell's scale, ±20%); `lone.earlyShare` (a lone tree against yield-table top heights) and `stand.lateShare` (scale-free); the stand density (≈ 360 stems/ha against 420–1000 in the tables at 60) beside every stand trait; the `[holdout]` floors; `shade.survivalLight`.

**What this leaves for acceptance:** rowan and holly now have no measured target (their two were the generic H/D), maple two (one at half weight), willow three. For them acceptance rests on the line-up panel (ADR 0028).

## Held out (never in the loss)
- **Shade survival:** the lowest light at which every seedling lives through 30 seasons. Birch 15–25%, beech 2.5–4.5% (saplings' minimum light demand, Hagemeier & Leuschner 2019; revised from 10–15% and 1–3%), in the order of Niinemets & Valladares's tolerance scores (2.03 and 4.56; M25 note).
- **The mixed wood:** birch leads for about a century and fades; beech ends with the most canopy trees (M25 note).
- **§10 allometry:** Δ within 1.8–2.3; the l–d and leaf–section slopes no worse than the hand-tuned species' (M26 note).
- **Release:** epicormic shoots and lean into a felled neighbour's gap, of the hand-tuned size (M10).

## Gaps
- **Branch angles:** no per-species numbers for birch's or beech's first-order angles came back. Yun et al. 2025 (literature review) is the lead to follow.
- **Crown shape:** taken from descriptions. Open-grown profiles from terrestrial laser scans (Bayer et al. 2013 for beech) would make the shape targets measured. Round 4 defers the audit's routes C (QSMs from the Wytham Woods and Weiser et al. 2022 scans: the stand shape targets) and D (traced photographs or airborne lidar of parkland trees: the lone profile) to after shipping (ADR 0028).
- **Open-grown allometry for beech and oak at the trial's age:** Hasenauer 1997's equations, or a solitary-tree study measured directly; Hein & Spiecker 2008 (sycamore, maple's proxy) if its full text is to hand.
- **Stand H/D, LAI and crown ratio** for rowan, holly and willow: none found in round 4; Hynynen et al. 2010 (Finnish birch models) and Schmucker et al. 2022 were not reached.
- **Still estimates for the eight newer species:** floor light for fir, maple, holly, rowan, willow and pine; growth curves for maple, holly and rowan. The next to find: holly's growth (Peterken & Tubbs 1965; Peterken 1966), Hale et al. 2009's pine curve, and any quantum-sensor light measured under fir.
