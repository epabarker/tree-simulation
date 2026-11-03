# Tallo, Jucker et al. 2022 (audit, 2026-11-03)

- **Links:** https://doi.org/10.5281/zenodo.6637599 resolves (v1.0.0); paper via PMC9542605 (Wiley 403s).
  **Licence CC-BY 4.0** (Zenodo; the GitHub copy shows a GPL-3 badge). 49 MB, all three CSVs downloaded.
- **Columns:** species, lat/long, stem_diameter_cm (multi-stem pooled as √Σd²), height_m, crown_radius_m,
  height_outlier, crown_radius_outlier (Mahalanobis flags), reference_id. **No regime column.**
- **Regime:** every source for the garden broadleaves is a forest plot or inventory (Lines 2012, EuMIXFOR, Jucker
  2015, Schepaschenko 2017, Dalponte & Coomes 2016, Uholka, Evans 2015, BAAD, Sanasilva): forest-grown only.

Counts (`count_species.py tallo`; Europe = a lat/long box; H ok / CR ok exclude outliers and blanks):
| species | n | Europe | GB box | H ok | CR ok | DBH cm | sources |
|---|---|---|---|---|---|---|---|
| Fagus sylvatica | 9,470 | 9,470 | 20 | 8,931 | 7,082 | 2–162 | 11 |
| Quercus robur | 2,448 | 2,448 | 111 | 2,440 | 2,341 | 1–172 | 6 |
| Quercus petraea | 1,310 | 1,310 | 0 | 1,309 | 1,276 | 8–204 | 5 |
| Carpinus betulus | 2,298 | 1,075 | 0 | 2,292 | 2,293 | 1–145 | 2 |
| Betula pendula / pubescens | 1,617 / 471 | 785 / 471 | 8 / 0 | 1,608 / 466 | 737 / 470 | 1–84 / 8–31 | 6 / 2 |
| Acer campestre | 217 | 169 | 15 | 214 | 203 | 2–65 | 6 |
| Acer pseudoplatanus | 689 | 689 | 40 | 686 | 668 | 5–100 | 6 |
| Sorbus aucuparia | 54 | 44 | 0 | 54 | 39 | 1–22 | 4 |
| Salix caprea | 34 | 34 | 0 | 33 | 19 | 1–30 | 4 |
| Ilex aquifolium | 25 | 25 | 0 | 25 | 25 | 8–19 | **1** |
| Pinus sylvestris / Abies alba | 18,221 / 1,070 | 15,341 / 1,070 | 30 / 0 | 17,957 / 1,070 | 15,238 / 1,044 | 1–99 / 1–113 | 12 / 7 |

Holly (one source, DBH ≤ 19 cm), willow and rowan are too thin for a curve with scatter; hornbeam rests on two sources.
