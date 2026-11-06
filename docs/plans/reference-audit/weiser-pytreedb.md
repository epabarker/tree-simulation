# Weiser et al. 2022 / pytreedb (audit, 2026-11-03)

- **Links:** ESSD article (CC-BY 4.0), PANGAEA doi:10.1594/PANGAEA.942856 (v2, 2022-03-31), the pytreedb browser
  and GitHub (GPL-3.0/LGPL-3.0 code) all resolve.
- **Licence of the data: CC-BY-SA 4.0** (PANGAEA's text export), not CC-BY as the reference document says.
- **Size:** 12 plot zips, 5.2–18.4 GB each, ≈ 130 GB; ALS clouds not included. Metadata: pytreedb's
  `data/test/geojsons.zip` (1.4 MB), all 1,491 trees' GeoJSON, downloaded to `data/reference/weiser/`.
- **Content:** point clouds (ALS/ULS/TLS) and per-tree field DBH, crown base height, crown diameter, ALS height.
  **No QSMs.** TLS is **leaf-on** (June 2019). **Regime:** forest, two mixed multi-layered stands near Karlsruhe
  and Bretten. Its trees are in FOR-species20K as `Weiser_2022a` (TLS) and `Weiser_2022b` (ULS).

Counts (`count_species.py weiser`; per tree the smallest DBH and the largest height recorded):

| species | trees | with a TLS cloud | DBH cm | H m |
|---|---|---|---|---|
| Fagus sylvatica | 398 | 46 | 5.1–91.3 | 4.0–38.0 |
| Quercus petraea / robur | 156 / 7 | 33 / 4 | 6.9–96.7 | 8.3–36.0 |
| Carpinus betulus | 94 | 6 | 5.0–57.8 | 5.5–32.3 |
| Acer pseudoplatanus / campestre | 39 / 7 | 28 / 0 | 3.9–64.7 | 5.1–32.8 |
| Betula pendula / Salix caprea | 6 / 1 | 0 | 9.2–24.6 | 13.0–26.0 |
| Pinus sylvestris / Abies alba | 158 / 25 | 36 / 9 | 6.0–79.0 | 5.8–41.3 |

No rowan or holly. **Use:** field crown base heights (395 beech, 156 sessile oak, 94 hornbeam) as Level 0 / stand
crown-base references, from the field, not from wood. Level 1 only through QSMs built from leaf-on TLS: weak.
