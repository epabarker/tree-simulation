# BioDiv-3DTrees, Griese et al. 2025 (audit, 2026-11-03)

- **Links:** article doi:10.1038/s41597-025-06421-7 (read via PMC12712040) and GROdata doi:10.25625/8PB1IF
  resolve. **Dataset licence CC-BY 4.0** (GROdata API).
- **Size:** `QSM.tar.zst` **108 GB**, `TLS.tar.zst` 19.9 GB, `Graphs.tar.zst` 1.8 GB, `ULS.tar.zst` 0.65 GB,
  `labels.csv` 1.1 MB (downloaded; md5 a09d1dfb… matches the API), `README.md`.
- **QSMs** (broadleaves only): TreeQSM 2.4.1 `.mat` (`all`, `raw`) and rTwig 1.4.0-corrected cylinder `.csv`
  (`corrected`). rTwig imposes twig taper, so radius descriptors read `raw`. One tarball (no member access: **unverified**).
- **Regime:** forest, the Forest Gap Experiment plots (Biodiversity Exploratories). **Leaf-off.** DBH 7–98 cm, H 7–40 m.

Counts (`labels.csv`; `QSMsuccess` / `validQSM` = True):

| species | trees | QSM ok | valid QSM | DBH cm | H m |
|---|---|---|---|---|---|
| Fagus sylvatica | 2,992 | 2,970 | 1,659 | 7–99 | 7.7–37.3 |
| Quercus spec. | 178 | 178 | 88 | 12–89 | 9.7–36.0 |
| Carpinus betulus | 66 | 65 | 38 | 11–43 | 11.3–29.8 |
| Acer pseudoplatanus | 65 | 65 | 42 | 12–58 | 9.1–31.1 |
| Betula spec. | 24 | 24 | 15 | 10–40 | 10.4–29.0 |
| Acer campestre | 1 | 1 | 0 | 39 | 25.1 |
| Pinus sylvestris / Abies alba | 512 / 5 | – | – | 24–67 | 19.2–36.0 |

Oak and birch are genus labels; the paper names sessile oak (*Q. petraea*, **unverified** per tree). Plots are a gap
experiment (`gap` column: stratify). **The best Level 1 source for beech and the largest leaf-off oak QSM set.**
