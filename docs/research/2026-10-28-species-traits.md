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

- **Measured, weight 1** (tightened 2026-10-28; see "Sources found" below):
  - **Height at 60 seasons:**
    - oak, pine and fir from yield tables;
    - field maple from Germany's national forest inventory;
    - hornbeam, holly, rowan and willow still from the field guides' mature heights (M25 note), converted to age 60. That conversion is a judgement: a small tree is near its mature height at 60, a big one well short of it.
  - **Height at 30 over height at 60:** for oak, pine and fir, from the same yield tables.
  - **Floor light:** oak and hornbeam (Hagemeier & Leuschner 2019).
  - **H/D:** open-grown 48 ± 8 (MacFarlane et al. 2017), stand-grown 70 ± 10 (Watt et al. 2023), for every species as for the pilot. Field maple's measured canopy trees agree: H/D 64 and 73 in two Bavarian stands (LWF Wissen 77).
- **Described, weight 0.5:**
  - **Floor light** for fir, maple, holly, rowan, willow and pine. These are bands set by the M25 ordering and by which canopies are known to transmit more light: pine more than oak (Pérot et al. 2017; Hale et al. 2009), birch more than pine at a given leaf area (Lintunen et al. 2013).
  - **Height at 30 over height at 60** for the small trees, from growth descriptions: willow reaches its ultimate height in 10–20 years; rowan grows fast while young and slows after about 25; field maple's height growth is largely done by about 25; holly keeps growing at accelerating rates.
  - **Form,** as the user specified: fir and holly cones; oak, maple and hornbeam rounded and forking low; willow broad and low; rowan's limbs steep (35°); pine excurrent.

| Trait | Oak | Fir | Hornbeam | Maple | Holly | Rowan | Willow | Pine |
|---|---|---|---|---|---|---|---|---|
| Stand height, cells | 78 ± 13 | 80 ± 14 | 68 ± 16 | 64 ± 11 | 44 ± 12 | 48 ± 12 | 40 ± 10 | 84 ± 14 |
| H30 / H60 | 0.62 ± 0.05 | 0.42 ± 0.06 | 0.6 | 0.7 | 0.55 | 0.78 | 0.9 | 0.6 ± 0.05 |
| Open W/H | 1.3 | 0.4 | 1.0 | 1.0 | 0.5 | 0.6 | 1.6 | 0.6 |
| Stand crown ratio | 0.4 | 0.6 | 0.55 | 0.5 | 0.75 | 0.45 | 0.45 | 0.35 |
| Floor light | 8.4% ± 3 | 4% | 2% ± 1 | 5% | 3% | 12% | 12% | 20% |
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
- **Canopy transmittance** (Hagemeier & Leuschner 2019, *Forests* 10:925, abstract and search excerpts):
  - PAR reaching the floor falls from ≈ 15% under birch to 1–3% under hornbeam, lime and beech;
  - sessile oak transmits a median 8.4% (4.9–12.8%).
  - **Saplings' minimum light demand,** a check on the held-out survival bands:
    - birch 21%, against the band's 10–15%: the model's birch is more tolerant than measured here;
    - oak 6.3%, inside its 5–10% band;
    - hornbeam 2.5%, inside its 1–4% band.
- **Scots pine floor:** PAR transmittance ranges 2–59% across the growth stages of Alsatian pine stands (Walter & Himmler 1996). That is too wide to tighten the band.
- **Not found** (searches in English and German):
  - yield tables or site-index curves for hornbeam, rowan, goat willow and holly;
  - per-species transmittance numbers for maple, holly, rowan, willow and fir;
  - Hagemeier & Leuschner's full tables. MDPI refuses automated downloads, so their Fig. or Table values beyond the abstract were not read.

**How far the hand-tuned species are from the tightened targets** (10 seeds; (value − target) / band):
- **Height at 30 over height at 60 is the largest miss.**
  - It is 0.64–1.03 for every species: oak 0.83, fir 0.64, pine 0.80 against the yield tables' 0.62, 0.42 and 0.60. That is 3.6–4.1 bands for those three.
  - Height growth levels off too early across the board, through R1's hydraulic plateau.
  - **A caveat on the comparison:** the yield tables give the top height of stands, and the trait measures a lone tree. Open-grown trees are shorter but follow a similar curve.
- **Willow** scores worst after them: it is squat open-grown and in a stand (H/D 26 and 41).
  - Watt et al.'s 60–80 is for conifer stands, so for a multi-stemmed willow the band may be wrong rather than the tree.
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
- **Still described for the eight newer species:** floor light for fir, maple, holly, rowan, willow and pine, and growth-curve shape for hornbeam, maple, holly, rowan and willow. Hagemeier & Leuschner's full tables, and a hornbeam yield table (perhaps among the Czech or Polish tables), would be the next to find.
