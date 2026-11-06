# Species-Fidelity Reference: Datasets and Evaluation Method for a Tree Growth Simulator

> Purpose: give an agent working on a procedural / mechanistic tree growth model the reference data and the evaluation procedure needed to make simulated trees of specific (mainly British) species resemble their real-world counterparts. Written 2026-11-03. Verify links before relying on them; dataset contents may have changed.

## Target species

| Common name | Scientific name | Notes for the model |
|---|---|---|
| Silver birch / downy birch | *Betula pendula* / *B. pubescens* | Light, narrow crown; fine pendulous twigs (strong in *B. pendula*); leader often lost with age; white bark |
| Beech | *Fagus sylvatica* | Wide dome; layered, plagiotropic (horizontal) branching; fine zigzag sympodial twigs; shade-tolerant, dense; long clean trunk when forest-grown, low massive limbs when open-grown |
| Pedunculate / sessile oak | *Quercus robur* / *Q. petraea* | Broad, often wider than tall when open-grown; massive crooked limbs; rhythmic flush growth; epicormic shoots; *Q. petraea* straighter trunk, more upright |
| Field maple / sycamore | *Acer campestre* / *A. pseudoplatanus* | Opposite (decussate) branching → forked, symmetric; field maple small and rounded; sycamore large dome |
| Goat willow | *Salix caprea* | Often multi-stemmed, bushy, short, broad; sympodial |
| Rowan | *Sorbus aucuparia* | Slender, open, few branch orders, ascending branches; small tree |
| Holly | *Ilex aquifolium* | Evergreen; dense conical/pyramidal crown held to the ground; slow |

Note that no 3D (laser-scanned) dataset found covers goat willow, rowan or holly. Those three must be handled with allometry + photographs + field-guide descriptions (see Levels 0 and 2 below).

---

## Part 1 — Datasets

### 1A. 3D structure: individual tree point clouds and QSMs

These are the most valuable sources because they allow skeleton-to-skeleton comparison, not just image comparison. A QSM (Quantitative Structure Model) is a cylinder-based reconstruction of trunk and branches produced by software such as TreeQSM (https://github.com/InverseTampere/TreeQSM); it is directly comparable to a simulator's internal skeleton.

| Dataset | Contents | Species coverage relevant here | Growth context | Format | Licence | Link |
|---|---|---|---|---|---|---|
| **Wytham Woods TLS (Oxford, UK)** — Calders et al. 2022 | 876 individually segmented leaf-off trees from a 1.4 ha plot; 10 optimised TreeQSMs per tree; raw scans also archived at CEDA | 6 species, dominated by sycamore (*Acer pseudoplatanus*), oak (*Quercus robur*), ash, hazel | Forest-grown (high crown bases, competition) | Point clouds (.txt/.ply) + QSM (.mat) | CC-BY 4.0 | https://zenodo.org/record/7307956 |
| **FOR-species20K** — Puliti et al. 2025 | 20,158 single-tree point clouds (TLS/MLS/ULS), 33 species, 19 genera, ~90% European; species labels in `tree_metadata_dev.csv`; 10% test split has labels withheld | *Fagus sylvatica* (2,482), *Quercus robur* (195), *Q. petraea*, *Betula pendula*, *Acer pseudoplatanus* present. Not present: *Salix*, *Sorbus*, *Ilex* | Mixed; broad size range from saplings to mature | .laz point clouds | CC-BY 4.0 | Data: https://zenodo.org/records/13255198 · Code/models: https://github.com/stefp/FOR-species · Paper: https://doi.org/10.1111/2041-210X.14503 |
| **BioDiv-3DTrees** — Griese et al. 2025 | 4,952 leaf-off TLS+ULS tree point clouds, 19 species, German forests; 3,386 QSMs for 14 broadleaved species; each tree linked to inventory DBH and height | Beech, Norway spruce and Scots pine ≈ 81% of trees; sessile oak, ash, hornbeam also named. Full species list is in `labels.csv` in the repository | Forest-grown | Point clouds + QSM + graph | Article CC-BY 4.0; check dataset record | Data: GROdata DOI 10.25625/8PB1IF · Paper: https://doi.org/10.1038/s41597-025-06421-7 |
| **TreeML-Data (Munich street trees)** — Yazdi et al. 2024 | 3,755 leaf-off single-tree point clouds, QSMs, graph models, and a structure-measurement table: DBH, height, crown start height, max crown diameter, crown projection area, total volume, crown radius in 72 directions at 5° intervals, and crown radius at 2 m height intervals up to 30 m | 40 species; the 20 most frequent are shown in the paper's Fig. 12 (counts in figure only). Expect *Acer*, *Tilia*, *Platanus*, *Quercus*, *Betula* etc. — verify in the CSV | **Open-grown** (urban) — the complement to the forest datasets | Point clouds + QSM cylinder table (branch ID, branch order, cylinder length, radius) + CSV | Article CC-BY 4.0; check data record | Code: https://github.com/hadi-yazdi/TreeML-Data · Data: Figshare DOI 10.6084/m9.figshare.c.6788358.v1 · Paper: https://doi.org/10.1038/s41597-023-02873-x |
| **Weiser et al. 2022 / pytreedb** | 1,491 trees from 12 plots in SW Germany, ALS+ULS+TLS, species, height, DBH, crown metrics; 1,060 also field-measured; leaf-on and leaf-off | Central European species (beech, oak, spruce, pine, etc.) | Forest-grown | Point clouds + metrics; browsable web DB | CC-BY 4.0 | Data: https://doi.org/10.1594/PANGAEA.942856 · Browser: https://pytreedb.geog.uni-heidelberg.de/ · Paper: https://essd.copernicus.org/articles/14/2989/2022/ |
| **Demol et al. 2021 (Belgium)** | 65 trees with point clouds, TreeQSMs and destructively measured mass | *Fagus sylvatica*, *Fraxinus*, *Pinus sylvestris*, *Larix* | Forest-grown | Point clouds + QSM + CSV | Open (Zenodo) | https://zenodo.org/records/4557401 |

### 1B. Allometry (global shape)

| Dataset | Contents | Use | Link |
|---|---|---|---|
| **Tallo** — Jucker et al. 2022 | 498,838 georeferenced individual-tree records with stem diameter, height and/or crown radius; 5,163 species; 61,856 sites | Filter to the seven species → height–DBH and crown-radius–DBH curves with real scatter. Fit these first. | Data: https://doi.org/10.5281/zenodo.6637599 · Paper: https://doi.org/10.1111/gcb.16302 (CC-BY 4.0) |

### 1C. Photographs (whole-tree habit)

| Source | Contents | How to use | Link |
|---|---|---|---|
| **PlantCLEF / Pl@ntNet** | Western European citizen-science images; each image tagged with one of 7 view types: *Entire*, Branch, Leaf, LeafScan, Flower, Fruit, Stem. PlantCLEF 2015: 113,205 images, 1,000 species. Current Pl@ntNet open training set ≈ 1.4 M images, 7,806 species | Filter on view type **Entire** → labelled whole-plant habit photos | https://www.imageclef.org/2014/lifeclef/plant · https://www.imageclef.org/lifeclef (current editions) |
| **iNaturalist via GBIF** | Research-grade observations with image URLs, all seven species, UK coverage | Export by species + country; no "whole tree" tag, so apply a CLIP/zero-shot filter ("a photo of an entire tree") to select habit shots | https://www.gbif.org/ (dataset: iNaturalist Research-grade Observations) |
| **Woodland Trust Ancient Tree Inventory (UK)** | Citizen-recorded ancient/veteran/notable trees: species, girth, tree form (maiden, multi-stem, pollard…), condition, multiple photos per tree. Includes holly, rowan and willow records | Reference for old-growth forms of all seven species; biased to veterans | https://ati.woodlandtrust.org.uk/ |
| **StreetTree** (Feb 2026, arXiv) | Google Street View images of 3.4 M trees, 8,363 species, 133 countries, 88,666 UK samples; released as a metadata index, images fetched via the GSV API; crowns may be cut off | Monitor; not yet a dependable source | https://arxiv.org/abs/2602.19123 |

### 1D. Illustrated field guides (best single "reference image" per species)

Not downloadable datasets, but the fastest route to a per-species visual target:

- **Owen Johnson & David More, *Collins Tree Guide*** — painted whole-tree habits for every British species, often at more than one age, with winter outline.
- **Roger Phillips, *Trees in Britain, Europe and North America*** — photographs of whole trees in leaf and as winter silhouettes.
- **Alan Mitchell, *A Field Guide to the Trees of Britain and Northern Europe*** — detailed verbal descriptions of crown and branching habit.

Action: scan/photograph the pages for the seven species and store as `reference/<species>/fieldguide_*.jpg`; write a 5–10 line "visual checklist" per species from the text.

---

## Part 2 — Evaluation methodology

### Principle

Do not evaluate by rendering and inspecting. Decompose "looks like species X" into three scales, each with its own data, its own descriptors and a small, mostly separable parameter subset. Tune coarse-to-fine. Keep a held-out perceptual test that is never used as an optimisation target.

### Level 0 — Allometry (Tallo). Do first, ~1 day.

Descriptors: height vs DBH, crown radius vs DBH, crown width/height ratio, crown ratio (crown depth / height). Most of a species' distant "jizz" lives here. Fit species parameters that govern primary growth vs. secondary thickening and crown expansion until the simulator's allometric cloud overlaps the real one across the full DBH range. Do not touch branching rules until this passes.

### Level 1 — Branching statistics (QSMs). The core loop.

1. **Common representation.** Write one converter that turns (a) a TreeQSM `.mat` / TreeML cylinder CSV / BioDiv QSM and (b) the simulator's own skeleton into the same cylinder table: `tree_id, cyl_id, parent_id, branch_id, branch_order, start_xyz, axis_xyz, length, radius`.
2. **Descriptors** (compute identically on real and simulated):
   - Branching angle distribution, by branch order
   - Daughter/parent radius ratio (and the exponent in Σ r_child^k = r_parent^k)
   - Branch length by order; number of branch orders
   - Bifurcation ratio (branches at order n / order n+1)
   - Tortuosity (path length / chord length) per branch
   - Fraction of terminal segments pointing downward (pendulousness — birch signature)
   - Crown base height / tree height; crown centroid height
   - Crown radius profile vs height (TreeML gives this directly at 2 m intervals)
   - 3D asymmetry / imbalance indices (see Wytham imbalance-index study, https://arxiv.org/abs/2603.19341)
   - Stem taper
3. **Conditioning.** Compare trees of similar height / DBH class; never pool saplings with mature trees.
4. **Distance.** Per-feature z-scores against the real per-species distribution, or an energy distance / MMD on the full descriptor vector. Report per-feature so the failing feature is visible.
5. **Optimisation.** Drive the species parameter vector with CMA-ES or Bayesian optimisation on the distance; since the simulator is stochastic, prefer Approximate Bayesian Computation to obtain a posterior over parameters rather than a point estimate.
6. **Two growth regimes.** Fit against forest-grown (Wytham, BioDiv, Weiser) and open-grown (TreeML) data *with the same species parameters*, varying only the environment. Plasticity between regimes is itself a species trait and a strong test.

### Level 2 — Silhouette and perception (photographs). Validation, not objective.

- Render leaf-off simulated trees against a blank background with a matched camera (eye height, ~30–50 m distance, horizontal). Segment real whole-tree photos the same way.
- Outline descriptors: convexity / solidity, aspect ratio, fractal dimension, lacunarity, centroid height, left–right asymmetry.
- **Classifier test.** FOR-species20K publishes trained models; the top performer, DetailView, is a multi-view 2D image method with >0.8 accuracy across scanning platforms. Convert simulated trees to point clouds (sample the skeleton surface), render multi-view images, and run the published model. A simulated beech classified as beech is evidence; a simulated beech classified as oak names the problem. **Never optimise directly against this classifier** — it will produce adversarial trees that score well and look wrong.
- **Human 2AFC.** Twenty pairs per species ("which of these is the birch?") judged by a botanist or experienced tree-spotter. This is the final arbiter.

### Species without 3D data (goat willow, rowan, holly)

Use Level 0 (Tallo) + Level 2 (PlantCLEF "Entire", iNaturalist, ATI photos) + a written checklist derived from the field guides, e.g.:

- Goat willow: P(multi-stem) high; short; broad; sympodial; crown wider than tall.
- Rowan: few branch orders; ascending branches; open crown; slender; height typically < 15 m.
- Holly: evergreen; conical; branches retained to ground level; dense; slow height growth.

---

## Part 3 — Suggested working order

1. Download Tallo and the Wytham Zenodo record.
2. Write the cylinder-table converter for TreeQSM `.mat` and for the simulator's skeleton; verify by recomputing DBH/height from the real QSMs against the published `tls_summary.csv`.
3. Implement the Level 1 descriptor suite as one function `describe(tree_table) -> dict`.
4. Fit Level 0 for all seven species from Tallo.
5. Tune **oak** first (most real data, most recognisable errors), then beech, then birch (pendulousness is the differentiator), then sycamore/field maple.
6. Add TreeML open-grown comparison and check the same parameters reproduce both regimes.
7. Run the FOR-species20K classifier and a 2AFC test as held-out validation.
8. Only then handle willow, rowan, holly via Levels 0 and 2.

## Pitfalls

- Forest-grown and open-grown trees of the same species differ enormously; always know which regime a reference tree came from.
- QSM datasets are leaf-off; compare skeletons to skeletons and keep foliage evaluation separate.
- Datasets listed here were not fully enumerated by species in the summaries available; open `labels.csv` / `tree_metadata_dev.csv` / `TreeML_Dataset.csv` and count before planning around a species.
- Goodhart: any metric used as an optimisation target stops being a valid test. Keep the classifier and the human test held out.

## Source list

- FOR-species20K: https://zenodo.org/records/13255198 ; https://doi.org/10.1111/2041-210X.14503 ; https://arxiv.org/abs/2408.06507
- Wytham Woods TLS + QSMs: https://zenodo.org/record/7307956
- Wytham imbalance indices study: https://arxiv.org/abs/2603.19341
- BioDiv-3DTrees: https://doi.org/10.1038/s41597-025-06421-7
- TreeML-Data: https://doi.org/10.1038/s41597-023-02873-x ; https://github.com/hadi-yazdi/TreeML-Data
- Weiser et al. 2022: https://essd.copernicus.org/articles/14/2989/2022/ ; https://doi.org/10.1594/PANGAEA.942856
- Demol et al. 2021: https://zenodo.org/records/4557401
- Tallo: https://doi.org/10.1111/gcb.16302 ; https://doi.org/10.5281/zenodo.6637599
- PlantCLEF: https://www.imageclef.org/2014/lifeclef/plant ; https://arxiv.org/abs/2509.17602
- Ancient Tree Inventory: https://ati.woodlandtrust.org.uk/
- StreetTree: https://arxiv.org/abs/2602.19123
- TreeQSM: https://github.com/InverseTampere/TreeQSM
