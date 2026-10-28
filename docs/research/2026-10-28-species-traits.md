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
| Floor light under a pure stand | 0.18 ± 0.06 | 0.03 ± 0.015 | measured | M19's targets: a light shade under birch, 2–5% under beech (literature review §4) |
| Widest band (open) | 0.4 ± 0.15 | 0.4 ± 0.15 | described | Birch ovoid; beech a broad dome. M26 measured birch as an hourglass and beech as widest at the base |
| Crown fullness (open) | 0.7 ± 0.1 | 0.75 ± 0.1 | described | Ovoid and dome outlines; an ellipse is 0.79 |
| Fork height (open) | 0.9 ± 0.1 | 0.7 ± 0.2 | described | Birch excurrent (§9); open-grown beech often divides into a few big limbs |
| Leader dominance (open) | 3 ± 1 | 2 ± 0.8 | described | Strong against moderate apical control |
| First-order branch angle (open) | 45° ± 10° | 55° ± 10° | described | Fine, ascending birch branches (§9); beech's angles flatten where competition is low ([Bayer et al. 2013](https://consensus.app/papers/details/176674b35836593087078d8a7f3c1d7d/?utm_source=claude_desktop)); measurement methods: [Peng et al. 2024](https://consensus.app/papers/details/d47154ea7e5c57cb868184d524097fc6/?utm_source=claude_desktop) |
| Limb droop (open) | 15° ± 10° | 10° ± 10° | described | Birch's arching limbs and hanging twigs |

## The other eight species (2026-10-28)

The same 13 traits and 17 parameters for oak, fir, hornbeam, field maple, holly, rowan, goat willow and Scots pine. Each `source` line in the targets file says where its number comes from.

- **Measured, weight 1:**
  - **Height at 60 seasons:** from yield-model top heights (oak, pine, fir) or the field guides' mature heights (M25 note), converted to age 60. The bands are ≈ ±22%. That conversion is a judgement: a small tree (willow, rowan, holly) is near its mature height at 60, while a big one (fir, oak) is well short of it.
  - **H/D:** open-grown 48 ± 8 (MacFarlane et al. 2017), stand-grown 70 ± 10 (Watt et al. 2023), for every species as for the pilot.
- **Described, weight 0.5:**
  - **Floor light:** only beech's is a measured range. The rest are bands set by the M25 ordering and by which canopies are known to transmit more light: pine more than oak (Pérot et al. 2017; Hale et al. 2009), birch more than pine at a given leaf area (Lintunen et al. 2013). The searches returned abstracts only, with no per-species percentages.
  - **Height at 30 over height at 60:** the shape of each species' growth curve: early for pioneers (willow 0.8, rowan 0.72), late for the shade-tolerant fir (0.45).
  - **Form,** as the user specified: fir and holly cones; oak, maple and hornbeam rounded and forking low; willow broad and low; rowan's limbs steep (35°); pine excurrent.

| Trait | Oak | Fir | Hornbeam | Maple | Holly | Rowan | Willow | Pine |
|---|---|---|---|---|---|---|---|---|
| Stand height, cells | 72 ± 16 | 80 ± 18 | 68 ± 16 | 56 ± 14 | 44 ± 12 | 48 ± 12 | 40 ± 10 | 80 ± 18 |
| H30 / H60 | 0.6 | 0.45 | 0.6 | 0.62 | 0.55 | 0.72 | 0.8 | 0.65 |
| Open W/H | 1.3 | 0.4 | 1.0 | 1.0 | 0.5 | 0.6 | 1.6 | 0.6 |
| Stand crown ratio | 0.4 | 0.6 | 0.55 | 0.5 | 0.75 | 0.45 | 0.45 | 0.35 |
| Floor light | 8% | 4% | 3% | 5% | 3% | 12% | 12% | 20% |
| Widest band | 0.5 | 0.1 | 0.45 | 0.45 | 0.15 | 0.5 | 0.5 | 0.3 |
| Fork height | 0.3 | 0.92 | 0.4 | 0.35 | 0.9 | 0.6 | 0.15 | 0.9 |
| Leader dominance | 1.3 | 4 | 1.6 | 1.6 | 3 | 2 | 1.1 | 3 |
| Branch angle | 55° | 75° | 50° | 45° | 60° | 35° | 45° | 70° |

**Bounds** are birch's, with these changes:
- **Fir and pine:** level 1's η stays within 1.5–2, the strong plagiotropic pull that makes their tiers, and their branch angle within 50–90°.
- **Maple, holly, rowan and willow:** L_h can go down to 12, since these are small trees.
- **Holly:** α 1.8–4.5 and branch angle 35–80°.
- **Rowan:** branch angle 20–60°.
- **Willow:** α 3–7.

Every hand-tuned value lies inside its bounds.

**Held out:**
- **Survival light bands:** pine 15–25%, willow 10–15%, oak and rowan 5–10%, maple 3–8%, holly 2–5%, hornbeam 1–4% and fir 1–3%.
- **Shade scores** (`shadeScore`, Niinemets & Valladares 2006) for all ten species, for the Spearman check.

**How far the hand-tuned species are from these targets** (10 seeds; (value − target) / band):
- The model's height at 30 over height at 60 is 0.64–1.03 for every species, 1.5–2.3 bands above each target, the pilot's included. Height growth levels off too early across the board. That is a finding about R1's hydraulic plateau, not about any one species.
- **Willow** scores worst (22): it is squat open-grown and in a stand (H/D 26 and 41).
  - Watt et al.'s 60–80 is for conifer stands. For a multi-stemmed willow the band may be wrong, not the tree.
  - Revisit it if the fit strains for willow's H/D.
- **Hornbeam's** stand crowns are shallow (0.28 against 0.55).
- **Rowan's** open-grown stem is slender (H/D 68).

## Held out (never in the loss)
- **Shade survival:** the lowest light at which every seedling lives through 30 seasons. Birch 10–15%, beech 1–3%, in the order of Niinemets & Valladares's tolerance scores (2.03 and 4.56; M25 note).
- **The mixed wood:** birch leads for about a century and fades; beech ends with the most canopy trees (M25 note).
- **§10 allometry:** Δ within 1.8–2.3; the l–d and leaf–section slopes no worse than the hand-tuned species' (M26 note).
- **Release:** epicormic shoots and lean into a felled neighbour's gap, of the hand-tuned size (M10).

## Gaps
- **Branch angles:** no per-species numbers for birch's or beech's first-order angles came back. Yun et al. 2025 (literature review) is the lead to follow.
- **Crown shape:** taken from descriptions. Open-grown profiles from terrestrial laser scans (Bayer et al. 2013 for beech) would make the shape targets measured.
- **Floor light and growth-curve shape for the eight new species** are descriptions. Measured canopy transmittance per species (e.g. Sercu et al. 2017, Pérot et al. 2017, Hale et al. 2009, whose tables the searches did not reach) and site-index curves for hornbeam, maple, rowan, willow and holly would make them measured.
