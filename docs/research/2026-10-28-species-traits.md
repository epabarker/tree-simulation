# Species trait targets for fitting (M27 pilot: birch, beech)

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

## Held out (never in the loss)
- **Shade survival:** the lowest light at which every seedling lives through 30 seasons. Birch 10–15%, beech 1–3%, in the order of Niinemets & Valladares's tolerance scores (2.03 and 4.56; M25 note).
- **The mixed wood:** birch leads for about a century and fades; beech ends with the most canopy trees (M25 note).
- **§10 allometry:** Δ within 1.8–2.3; the l–d and leaf–section slopes no worse than the hand-tuned species' (M26 note).
- **Release:** epicormic shoots and lean into a felled neighbour's gap, of the hand-tuned size (M10).

## Gaps
- **Branch angles:** no per-species numbers for birch's or beech's first-order angles came back. Yun et al. 2025 (literature review) is the lead to follow.
- **Crown shape:** taken from descriptions. Open-grown profiles from terrestrial laser scans (Bayer et al. 2013 for beech) would make the shape targets measured.
