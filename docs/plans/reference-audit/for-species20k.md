# FOR-species20K, Puliti et al. 2025 (audit, 2026-11-03)

- **Links:** zenodo.org/records/13255198 and github.com/stefp/FOR-species resolve; the paper's tables **not read**
  (Wiley 403, arXiv PDF unreadable). **Licence GPL-3.0-or-later** (Zenodo API; also AGPL-3.0), **not CC-BY**.
- **Size:** `dev.zip` 25.4 GB, `test.zip` 1.8 GB (labels withheld), `tree_metadata_dev.csv` 1.2 MB (downloaded:
  treeID, species, genus, dataset, data_type, tree_H, filename). `tree_H` is a rough size per the README. No DBH.
- **Content:** point clouds (.laz), **no QSMs**; 26 sources; leaf state per source not read. Contains
  `Calders_2022` (661 Wytham trees: 506 sycamore, 29 oak) and `Weiser_2022a/b` (2,806).

Garden species, dev split (`count_species.py for_species20k`; H = tree_H, m):
| species | TLS | MLS | ULS | H m | main TLS source |
|---|---|---|---|---|---|
| Fagus sylvatica | 1,433 | 214 | 835 | 1.2–40.8 | BlueCat_b 1,315 |
| Quercus robur / petraea | 185 / 24 | 4 / 0 | 6 / 337 | 5–36 | Frey_2022 99, VanDeBerge 35, Calders 29 |
| Betula pendula | 171 | 198 | 366 | 1.5–30.0 | Liang_2018 94, Junttila 43 |
| Carpinus betulus | 1,065 | 0 | 178 | 0.4–33.5 | **BlueCat_a 1,061** |
| Acer campestre | 1,230 | 0 | 10 | 0.4–41.3 | **BlueCat_a 1,228** |
| Acer pseudoplatanus | 530 | 0 | 46 | 2.6–32.8 | Calders_2022 506 |
| Pinus sylvestris / Abies alba | 2,567 / 52 | 248 / 54 | 481 / 13 | 2–45 | many |

No willow, rowan, holly. Hornbeam's and field maple's TLS trees are **one source's** (BlueCat_a). Level 1 needs our QSMs.
**Classifier (held out):** DetailView (github.com/JulFrey/DetailView, GPL-3 code; weights on FreiData
doi:10.60493/xw42t-6mt03, CC-BY 4.0, 238 MB). PyTorch, three DenseNet-201s over 7 rendered views (4 side, top,
bottom, a 1–1.5 m detail) **plus tree height as an input**. `predict.py` picks CUDA, else MPS, **else CPU** (read,
not run). Its 33 classes (`lookup.csv`) cover all the garden's species except willow, rowan, holly.
