# Wytham Woods TLS, Calders et al. 2022 (audit, 2026-11-03)

- **Link:** https://zenodo.org/record/7307956 resolves (v1.0, 2022-11-16). **Licence CC-BY 4.0** (Zenodo API).
- **Size:** 42.8 GB. `DATA_QSM_opt.zip` **39.5 GB** (TreeQSM v2.0 `.mat`, 10 optimised QSMs per tree; no
  cylinder CSV); `DATA_clouds_ply.zip` 1.5 GB; `DATA_clouds_txt.zip` 1.8 GB; `analysis_and_figures.zip` 25.7 MB.
- **Metadata downloaded:** `analysis_and_figures.zip` → `tls_summary.csv` (876 trees: DBH from points and QSM,
  height, crown projection area, volume by diameter class) and `trees_summary.csv` (835 linked to the census,
  with species codes). Both in `data/reference/wytham/`.
- **Regime:** forest, a 1.4 ha plot in a 6 ha scan; **leaf-off** (Nov 2015 – Jan 2016), RIEGL VZ-400.
- **Raw scans** at CEDA (149 GB, .rxp); unavailable Dec 2025, restored 2026-04-01 (the agent's fetch).

Counts (`count_species.py wytham`; census codes, all 835): ACERPS 541, FRAXEX 85, Unknown 77, CORYAV 67,
QUERRO 37, CRATMO 26, ACERCA 2.

| species | n | DBH cm | H m |
|---|---|---|---|
| Quercus robur | 37 | 39–103 | 10.9–24.4 |
| Acer pseudoplatanus | 541 | 3.5–127 | 2.6–30.6 |
| Acer campestre | 2 | 6.9–8.6 | 6.7–8.2 |

No beech, birch, hornbeam, holly, rowan, willow, pine, fir. **Oak is 37 mature trees only** (no DBH < 39 cm), so
no size classes to condition on. Sycamore is the rich class. Its 661 trees are also in FOR-species20K
(`Calders_2022`). `tls_summary.csv` is the converter's gate (the document's step 2): DBH_QSM_avg and Hgt_pts.
**Unverified:** the .mat field layout (TreeQSM v2.0 vs 2.3/2.4 differ); reading it needs scipy or MATLAB v7.3 (HDF5).
