# Species targets: an audit before step 3 (brief for the overseer)

_Written 2026-10-31 by a reviewer who read the repo at `claude/species-3d-closed` (2cce967) but did not run anything. For the overseer to weave into the species plan ([plan](../plans/2026-10-30-species.md)) before step 3; the implementer should not act on this directly. Birch is being worked on now: §1.3 and §3 bear on it today._

**The question asked:** will the targets in `analysis/fit/targets/*.toml` make each tree look like its species? **The short answer:** the size and growth targets are well sourced; the shape targets, which are what decides whether a tree reads as its species, are described, half-weight scalars that the fit can satisfy with the wrong architecture, and beech already shows it. The acceptance rule ("measured targets in band on fresh seeds") passes exactly the failure the user is worried about.

What was read: `docs/research/2026-10-28-species-traits.md`, ADR 0020 and 0023, `docs/experiments/2026-10-30-species-3d.md` and its figure, the overnight log (`code/2026-10-30-species-3d/garden.log`), `fits/round3/*`, `rust/core/src/form.rs`, `rust/core/src/metrics.rs`, `cli/trials.ts`, the targets files.

## 1. Findings

### 1.1 The fitted beech meets six measured targets and reads as a conifer
- Figure `figures/2026-10-30-species-lone-beech.png`: round 3's lone beech at 60 and 100 is widest at the base, tiered, and pointed at the top. It reads as a young spruce or fir, not a beech dome.
- How the fit got there (species-3d note, "the fitted parameters"): `r2.levels.1.eta` 0.57 → 1.18 (the plagiotropic pull on first-order limbs; the fir/pine bound is 1.5–2, and beech's box allowed up to 1.5), `r2.aC` 14.4 → 0.60 (at its lower bound), `c5.Trel` 0.045 → 0.25. Tiers are the cheapest way to raise `lone.spread` to 0.95 and lower H/D, and nothing in the loss penalises tiers.
- The user accepted this fit by eye on 2026-10-30. This audit disagrees with that reading, and says so because the same rule is about to pass seven more species.

### 1.2 The shape targets are the weak link, and two of their metrics are not the field quantity
- Of fourteen traits, eight are **described** (W/H, crown ratio, widestAt, fullness, fork, dominance, angle, droop), at weight 0.5 or 0.25. ADR 0020 already says a fit is only as good as its weakest target and that laser-scanned crown profiles would be worth more than compute. Nothing has been done about it since.
- `stand.crownRatio` is now the **leaf** measure (`metrics.rs`: `leaf_base` is the height below which 5% of leaf area lies). The field quantity the targets were written from (Pretzsch, Dieler, the yield literature) is the height of the lowest live branch, or the lowest contiguous whorl. The two can differ by a lot in a tree that keeps a few lit low limbs, so a 0.315-against-0.55 miss is partly a definition mismatch, not only the model. `boleCrownRatio` (0.99 in 3D "whatever the crown does") is the other extreme: one surviving twig holds it down.
- `lone.widestAt` is an index into 10 bands (steps of 0.1 = 0.47 band units), which is why the noise test keeps everything active (STATUS, open questions). A profile target (§2, route C/D) replaces `widestAt` and `crownFullness` with one vector and removes the step.
- `lone.forkHeight` (FORK_RATIO 0.7 on radius **and** climb) is a reasonable definition, but its targets (0.3 oak, 0.4 hornbeam, 0.7 beech, 0.15 willow) come from field-guide prose. Oak read 0.025 against 0.3 and hornbeam 0.124 against 0.4 in round 3: either the targets or the model's ability to divide a trunk is wrong, and nothing in the box lifts a fork (species-3d note, "why it stopped", 3).

### 1.3 Two targets are generic across species, and birch's "failure" is probably the target
- `lone.slenderness` 48 ± 8 (MacFarlane et al. 2017) and `stand.slenderness` 70 ± 10 (Watt et al. 2023, conifer stands) are the same number for all ten species. Real stands differ by species: birch stands are slender (an H/D of 80–110 is ordinary for *Betula pendula* in closed stands), oak and beech sit lower. **Birch's round-3 verification failed on `stand.slenderness` (86.9 against 70).** Before anyone re-fits birch toward 70, the target needs a birch source. The same applies to willow (the traits note already suspects the band, not the tree).
- `shade.survivalLight` for birch failed by 0.004 (0.156 against 0.21 ± 0.05). That is a model-side miss (birch's seedlings too tolerant, noted since round 1), not a target problem.

### 1.4 Growth targets: sound sources, three caveats worth stating in the plan
- **Scale.** 1 cell = 0.25 m is uncertain by ±20% (traits note). `stand.height` carries that; `lone.earlyShare` and `stand.lateShare` are scale-free and carry the information. The plan could weight accordingly, or treat the scale as one shared nuisance parameter rather than fitting absolute heights per species.
- **Lone against stand.** `lone.earlyShare` (a lone tree) is scored against yield-table top heights (closed stands). The traits note says open-grown trees follow a similar curve; that is an assumption, and open-grown height curves run lower and flatter.
- **Stand density.** The closed stand is 3 rows of 4 at spacing 21 cells ≈ 5.25 m, about 360 stems/ha, measured at 60 and 100. Yield-table beech at 60 (class 0–I) carries roughly twice that; 360/ha is nearer an age-100 density. So the stand traits at 60 are read in a stand sparser than the one the targets describe, which pushes H/D down and crown ratio up relative to the tables. It does not explain the misses' direction (crown ratio came out too *low*), but it should be in the note when the fits are judged.

### 1.5 Misses that repeat across species point at the model, not the targets
From `garden.log` (verification on fresh seeds, margins negative = outside):
- `stand.lateShare` too high: oak 1.49 against 1.31, hornbeam 1.37 against 1.23, beech's first pilot 1.65 (round 3 reached 1.45). Height keeps rising after 60 more than the tables say. This is R1's hyperbolic discount (ADR 0021), and the plan's step-3 stop rule already names it.
- `stand.crownRatio` (leaf) too low: beech 0.315 against 0.55, hornbeam 0.346 against 0.55, maple 0.339 against 0.5. Low branches go too readily in the closed stand, or the metric is the wrong one (§1.2).
- `lone.forkHeight` far too low in oak and hornbeam (§1.2).
- `lone.widestAt` too high (0.78–0.82) in oak and maple: crowns widest near the top, a sign of the same leader-dominated architecture as beech's tiers.
- `r2.aC` at its lower bound for beech; check the other seven's results files for the same (the plan's step 3 already asks this). If several species want apical control to lapse from season 0, the mechanism for losing a leader (R2's λ drop after a_C, κ) is being pushed to its edge to buy width, which is the model-level version of §1.1.

### 1.6 The parameter box lets a broadleaf become a conifer
`r2.levels.1.eta` up to 1.5 and `setPoint` 20–90 for beech, oak, hornbeam, maple; with η near 1 and a set point near 90°, first-order limbs become flat tiers. Either bound η for broadleaves well below the fir/pine range, or add a target that tiers fail (a profile target does this: a tiered crown's band widths are not a dome's). AGENTS.md says bounds come from the literature review §4: tightening one is a decision for the user, not the implementer.

## 2. Ways to derive the targets another way, ranked by value for cost

### A. A line-up panel, now (hours)
For each fitted species: lone at 60 and 100, the closed stand at 100, at one scale, beside one or two reference photographs of an open-grown and a forest-grown specimen (not in the repo: link, don't copy). Judged by the user before adoption. `lone-figure.py` and `lone-links.ts` in `code/2026-10-30-species-3d/` already do most of this for beech. This is the cheapest guard against §1.1 and costs no compute. **Recommended as a step-3 deliverable regardless of the rest.**

### B. Open-grown allometry from the literature (a day of reading)
Turns `lone.spread`, the lone crown ratio and `lone.slenderness` from described into measured, per species, for the lone tree:
- **Hasenauer 1997,** *Dimensional relationships of open-grown trees in Austria*, For. Ecol. Manag. 96:197–206: height, crown width and crown ratio as functions of DBH for open-grown trees by species (spruce, fir, pine, larch, beech, oak and more). Paywalled; the equations are widely reproduced (e.g. in the Austrian crown-width models, Forests 2020, 11:114).
- **Pretzsch et al. 2015,** *Crown size and growing space requirement of common tree species in urban centres, parks, and forests*, Urban For. Urban Greening 14:466–479, open access: species-specific crown radius–stem diameter relationships for open-grown conditions across 22 common urban species, with five crown-extension types and height, crown radius, crown projection area and crown volume as functions of diameter for each type. Check which of the ten garden species are among the 22.
- **Franceschi et al. 2022,** *Crown shapes of urban trees*, Forests 13:748, open access: crown shape classes (ovoid, spherical, half-ellipsoid, …) by species and age for seven urban species, from 3852 trees. Field maple and sycamore are the overlap; the shape-class method is the useful part.
- **Schmucker et al. 2022,** *Crown allometry and growing space requirements of four rare domestic tree species compared to oak and beech*, Eur. J. For. Res.: crown projection area and height against diameter for hornbeam, field maple, oak and beech in south-eastern Germany. Measured stand crown allometry for four of the garden species.
- **Pretzsch 2019,** *The effect of tree crown allometry on community dynamics*, Forests 10:810, open access review: species-specific cpa–d and h–d allometries in monocultures; a source for species-specific stand H/D in place of the flat 70.
- **Birch stand H/D:** needs its own source (Finnish or Baltic birch yield models); not found in this pass.

### C. Compute the model's own form metrics on laser-scanned trees (the substantive upgrade; days)
The gap ADR 0020 named. Two open datasets cover five of the ten species in closed stands:
- **Wytham Woods TLS** (Calders et al. 2022; Zenodo record 7307956, CC-BY 4.0): 876 individually segmented leaf-off tree point clouds (txt/ply) and optimised TreeQSM v2.0 cylinder models (.mat), from a 1.4 ha plot near Oxford, with a census that gives species. Wytham is sycamore, ash, oak and hazel with some beech: check the species counts in `trees_summary.csv` before committing to it. A British wood, which suits the garden.
- **Weiser et al. 2022** (ESSD 14:2989; PANGAEA 10.1594/PANGAEA.942856, CC-BY 4.0): 1491 trees from 12 plots in south-west Germany, ALS, ULS and TLS point clouds per tree with species, height, DBH and crown metrics derived from the point clouds and, for half the plots, field-measured. Species include beech, pedunculate and sessile oak, hornbeam, Scots pine, Norway spruce and Douglas fir. TLS point clouds but no QSMs: the implementer would run TreeQSM (MATLAB) or a Python alternative (e.g. `pyqsm`/AdTree) on the trees wanted.
- **What to compute, in `form.rs`'s definitions:** a QSM is a cylinder tree (parent, radius, start, axis, length, branch order). From it: first-order branch angle from the vertical (`lone.branchAngle`'s definition is order-2-off-order-1; both can be read), fork height by the same FORK_RATIO rule on radius and climb, leader dominance as the trunk's radius over the thickest lateral per node, droop and upturn per limb, and the 10-band crown profile from cylinder end points (leaf-off, so a wood envelope: the model can report the same from its metamers). A Python port of `form_metrics` over cylinders is a few hundred lines; put it beside `analysis/fit/sources/` with the per-tree table it produces.
- **Caveats:** forest-grown, so these fix the **stand** shape targets, not the lone ones; no ages, so no growth curves; QSM branch order is topological, not physiological age; fine branches are lost beyond ≈ 20 m from the scanner (Disney et al. 2023 report heavy branch-length underestimation at distance), so trust first- and second-order geometry and the envelope, not twig counts. Birch, rowan, holly and willow are in neither dataset.

### D. Silhouettes for the lone tree, from photographs or airborne lidar (days; the novel route)
The garden is a frontal 2D picture, so compare pictures:
- **Photographs:** trace 5–10 open-grown specimens per species, leaf-on for the outline and leaf-off for the scaffold, normalise to height, and take the mean and spread of a 10-band width profile. One profile target per species replaces `widestAt` and `crownFullness`, and its spread sets the band. The rendered lone tree's silhouette is read from the plate the lab already produces (`?bench&seasons=N`). Bias to watch: photographers pick handsome trees, and perspective widens the near side. Mitigate with numbers and by preferring side-on photographs of isolated trees. Photographs are compared, not stored in the repo.
- **Airborne lidar:** the Environment Agency's National LIDAR Programme publishes point clouds for England under the Open Government Licence (Defra Survey Data Download). Parkland trees around Bristol (Ashton Court, Blaise) are open-grown, large, and the user can identify them on the ground. A point cloud at 1–2 points/m² gives the crown envelope's vertical profile and W/H, not branches: enough for the profile target, not for angles or forks. Optional; the photographs do the same job with less tooling.

### E. Model-side, once the targets are trustworthy
- Bound `r2.levels.1.eta` (and perhaps `setPoint`) for broadleaves, or add the profile target (§1.6).
- The late-growth miss (§1.5) is R1's; the plan's step-3 stop rule covers it.
- Decide which crown-base definition the stand targets mean and make the metric match it (a "lowest live first-order limb carrying at least k% of leaf area" would sit between the two current measures and match field practice better than either).

## 3. Proposed disposition per trait (for the overseer to accept, amend or reject)

| Trait | Now | Proposed |
|---|---|---|
| `stand.height` | measured, yield tables | keep; note the scale caveat; consider lower weight than the two ratios |
| `lone.earlyShare`, `stand.lateShare` | measured | keep; state the lone-against-stand assumption in the file |
| `lone.slenderness` 48 ± 8 (all) | measured, one number | re-source per species from Hasenauer 1997 / Pretzsch 2015 (route B) |
| `stand.slenderness` 70 ± 10 (all) | measured, conifer stands | **re-source per species** (Pretzsch 2019, yield tables); birch first, before its re-fit |
| `lone.spread` | described | measured from route B (open-grown crown width over height per species) |
| `stand.crownRatio` | described, leaf measure | re-define the metric to match the source's crown base (§2E), then measure from route C (Weiser's crown metrics; Wytham QSMs) and Schmucker 2022 |
| `lone.widestAt`, `lone.crownFullness` | described, half weight; band index | **replace with one 10-band profile target** per species (route D for lone, route C for stand), weight 1 once measured |
| `lone.forkHeight`, `lone.leaderDominance` | described | measure on QSMs with the same rules (route C) for oak, beech, hornbeam, pine; keep described for the rest with the caveat that the model may not be able to fork (§1.2) |
| `lone.branchAngle`, `lone.limbDroop` | described | measure on QSMs (route C) where a species is covered; the traits note's "no per-species angles" gap closes for four species |
| `shade.survivalLight`, floor, survival bands | measured | keep |

## 4. Decisions that are the user's, not the implementer's
1. **Sequencing:** pause step 3 (the hold-out) until the shape targets are revised, or run step 3 now on round 3 and re-fit afterwards? A re-fit is ≈ 10–12 h overnight per round, so the targets should be right before the next one. The hold-out's behavioural checks (succession, release, allometry) are independent of the shape targets and could run now.
2. **Accept a profile target as a new trait kind** (a vector with a per-band band), which touches `fit.py`'s loss and the targets schema.
3. **Which data routes to fund:** A and B are cheap and should happen; C is the real upgrade and the one ADR 0020 asked for; D is the novel one and the only route to measured lone-tree shape.
4. **The η bound for broadleaves** (a bounds change: ADR territory under AGENTS.md's "ask before diverging").
5. **Whether round 3's beech stays accepted** given §1.1, or is re-judged on the line-up panel.
6. **The crown-base definition** the stand crown-ratio targets mean.

## 5. A sketch of steps for the implementer (for the overseer to turn into the plan's form)
1. **Line-up panels** for the eight round-3 species (route A), from the existing `lone-figure.py` / `lone-links.ts`, plus the closed stand at 100. Deliverable: one figure per species in `figures/`, a short note, no judgement in it.
2. **Target re-sourcing from the literature** (route B): a new section in the traits note per species, the targets files updated with `kind = "measured"` and sources; birch's `stand.slenderness` first. Deliverable: the diff of the targets files and the round-3 fits re-scored against the new targets without re-fitting (`fit-eval` at the fitted points).
3. **QSM metrics** (route C): fetch Wytham (and Weiser for beech, oak, hornbeam, pine), a Python `form_metrics` over cylinders with a unit test that reproduces `form.rs` on a hand-built tree, a per-tree table per species in `analysis/fit/sources/`, and the derived stand targets with their spread as the band. Deliverable: the table and a note, before any target changes from it.
4. **Profile target** (route D): the trait kind in `fit.py`, the band profile read from the lone trial and the plate, and the reference profiles from traced photographs in a CSV with the photograph URLs and who traced them. Deliverable: the targets with the profile and a dry re-score of round 3.
5. **Then** the re-fit (step 2 again) with the revised targets and any bound change the user agreed, and step 3 as planned.

Step 1 and 2 can start today and do not wait on each other; 3 and 4 are independent of each other; 5 waits on all four and on the user's decisions in §4.

## Sources
- Repo: `docs/research/2026-10-28-species-traits.md`; `docs/decisions/0020-fitting-species.md`; `docs/experiments/2026-10-30-species-3d.md` and `figures/2026-10-30-species-lone-beech.png`; `docs/experiments/code/2026-10-30-species-3d/garden.log`; `rust/core/src/form.rs`, `rust/core/src/metrics.rs`; `analysis/fit/targets/*.toml`.
- Calders et al. 2022, *Terrestrial laser scanning data Wytham Woods: individual trees and quantitative structure models (QSMs)*, Zenodo, https://zenodo.org/record/7307956 (paper: Ecological Solutions and Evidence; raw scans at CEDA, doi 10.5285/ed9156e1697343e4ad82e83ed550e345).
- Weiser et al. 2022, *Individual tree point clouds and tree measurements from multi-platform laser scanning in German forests*, ESSD 14:2989, https://essd.copernicus.org/articles/14/2989/2022/ (data: doi 10.1594/PANGAEA.942856).
- Hasenauer 1997, *Dimensional relationships of open-grown trees in Austria*, For. Ecol. Manag. 96:197–206.
- Pretzsch et al. 2015, *Crown size and growing space requirement of common tree species in urban centres, parks, and forests*, Urban For. Urban Greening 14:466–479, open access.
- Franceschi et al. 2022, *Crown shapes of urban trees*, Forests 13:748, https://doi.org/10.3390/f13050748.
- Schmucker et al. 2022, *Crown allometry and growing space requirements of four rare domestic tree species compared to oak and beech*, Eur. J. For. Res.
- Pretzsch 2019, *The effect of tree crown allometry on community dynamics in mixed-species stands versus monocultures*, Forests 10:810.
- Disney et al. 2023, *Limitations of estimating branch volume from terrestrial laser scanning*, Eur. J. For. Res., https://doi.org/10.1007/s10342-023-01651-z.
- Environment Agency National LIDAR Programme point clouds, Defra Survey Data Download, https://environment.data.gov.uk/DefraDataDownload/?Mode=survey.
