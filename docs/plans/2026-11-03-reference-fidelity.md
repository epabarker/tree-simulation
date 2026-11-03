# Reference fidelity: phase 0 (reconcile, audit, plan)

_2026-11-03. The user's change of direction: species fidelity from measured reference data and a three-level
evaluation ([the reference](../research/2026-11-03-reference-data-and-evaluation.md), kept as received). Audit:
[`reference-audit/`](reference-audit/), one file per dataset, counts by `count_species.py` from metadata in
`data/reference/` (git-ignored). [ADR 0049](../decisions/0049-reference-fidelity.md) (proposed) carries a, b and h._

## a. What this supersedes or amends (each the user's decision)
1. **ADR 0029, form by hand.** The ten form knobs become fittable again, against **measured** Level 1 descriptors
   only: 0029's own exit ("shape becomes fitted again by routes C and D"), brought before shipping. The gallery
   stays the regression set; `[form]` and `hand-overrides.toml` are the start point and the fallback.
2. **STATUS "ship, no round-5 fit".** _Ship first, with overrides:_ the site ships forms the namers read wrong
   (beech stand birch 0 of 9, oak wild cherry 0 of 27) and a second release follows; phases 1–2 change no looks
   anyway. _Pause shipping:_ the site stays on 0.14.0 (2D) for an estimated 6–9 sessions, at the risk that
   Level 1 shows the model cannot reach the data.
3. **The blind namers stop being the primary measure**: held out (h). ADR 0028 §6's panel, judged by the user, stays.
4. **Where the reference document is wrong or thin** (it stays unedited): FOR-species20K is GPL-3.0 and Weiser
   CC-BY-SA 4.0, not CC-BY; TreeML is CC0. Tallo has no open-grown trees for any garden species. TreeML's street
   trees are pruned and ≤ 41 per species. Wytham has no beech or birch, and its 37 oaks are all ≥ 39 cm.
   FOR-species20K has no QSMs and contains Wytham and Weiser. Hornbeam is missing from its list and is covered.

## b. The principle line
**In:** fitting parameters of local growth rules (form and physiology knobs per species). **Out:** envelopes,
shape targets that act as envelopes, per-species hand shapes or code paths, and any knob added to serve a fit.
- **At risk:** the crown radius profile (TreeML's 2 m steps, our 10 bands): fitted finely it is a hull, and it
  bought round 3's tiered cone. Guard: ≤ 4 bands, as a distribution with the real between-tree scatter as band,
  never fitted alone. Crown base/H, centroid height and W/H: distributions only, never per-tree.
- **Never fitted:** 3D asymmetry, projected crown area (the slab's, not the species': d). **Guards:** distributions at matched size class, never tree to tree; a third of the descriptors and one site
  per species held out (h); `shapeFlag` against the gallery, as now.

## c. Mapping: each step of the document → the code
| step | status | where |
|---|---|---|
| cylinder table, simulator | **exists** | `metamers.csv`: birthId, parentBirthId, order, axis, x0–z1, length, radius |
| cylinder table, real | new | readers for TreeQSM `.mat` (Wytham v2.0, Demol 2.3, BioDiv `raw` 2.4.1), TreeML `optcsv` |
| continuation and order | new | **both sides by geometry** (the child carrying the larger subtree continues), re-derived after the radius cut; never TreeQSM's branch order or our slot 0 |
| `describe()`, wood-only | reuse | one Python function for both sides, porting `form.rs`: angles by order, `junctionDelta` (Σr^Δ), `limbDroop`/`Upturn`/`Elevation`, `forkHeight`, profile (base = lowest first-order limb) |
| `describe()`, leaf-dependent | rewrite | `limbCrownRatio`, `leafBase`, `leafStemSlope` read leaf area; QSMs are leaf-off and keep dead limbs the model sheds. Crown base from Weiser's **field** crown base, or report-only |
| new descriptors | new | bifurcation ratio, tortuosity, length by order, pendulous fraction, taper, centroid height |
| radii | rule | BioDiv's rTwig `corrected` radii are partly rTwig's taper model: radius descriptors read `raw` |
| Level 0 | extend | `fit.py` traits: add H–DBH and CR–DBH with quantile bands |
| distance, optimiser | **exists** | `fit.py`/`fit_lm.py`: per-trait z, LM then CMA-ES (`cmaes`), Tikhonov, `shapeFlag` |
| two regimes, same params | **exists** | `cli/trials.ts`: `lone` and `stand`, one species patch |
| ABC; classifier | new | f, h |

## d. Slab compatibility (D = 64 cells = 16 m at 0.25 m a cell)
The stand's measured trees are the middle of three rows across the depth (21 cells apart); their crowns fit.
**Lone trees do not:** z extents saturate at 52–66 by season 60 (form.rs), oak at 100 is ≈ 160 cells wide in x,
and a real mature open-grown broadleaf (W/H ≈ 0.9 at 20–25 m, the traits note) is 18–22 m wide. Only TreeML's
pruned street crowns (median 8–12 m) fit.
| descriptor | stand | lone |
|---|---|---|
| branch angle by order, Δ, radius ratio, tortuosity, pendulous fraction, taper | comparable | comparable; branches near the faces cut short |
| length by order, bifurcation ratio, orders | comparable | biased: branches heading within 45° of x only |
| crown base/H, centroid height, H–DBH | comparable | comparable |
| crown radius profile, CR–DBH | comparable | **frontal only** (x extent against TreeML's E/W radii) |
| projected crown area, 3D asymmetry | not comparable (periodic x, closed faces) | not comparable; frontal asymmetry only |

## e. Species coverage (from the audit; QSM = leaf-off, flagged valid)
| species | L1 forest QSMs | forest clouds, no QSM (FOR TLS) | open-grown (TreeML) | L0 Tallo, Europe | GB photos (iNat) |
|---|---|---|---|---|---|
| oak (robur / petraea) | BioDiv 88 (genus), Wytham 37 | 185 / 24 | 4 (genus) | 2,448 / 1,310 | 8,272 / 1,277 |
| beech | **BioDiv 1,659**, Demol 15 | 1,433 | 14 | 9,470 | 11,533 |
| birch | BioDiv 15 (genus) | 171 | 12 | 785 + 471 | 2,613 |
| hornbeam | BioDiv 38 | 1,065 (one site) | 41 | 1,075 (2 sources) | 4,563 |
| field maple | Wytham 2 | 1,230 (one site) | 6 | 169 | 8,679 |
| sycamore | Wytham 541, BioDiv 42 | 530 | 33 | 689 | 16,888 |
| willow / rowan / holly | 0 | 0 | 0 | 34 / 44 / 25 (1 source) | 2,339 / 9,107 / 16,485 |
| Scots pine / silver fir | Demol 30 / 0 | 2,567 / 52 | 0 | 15,341 / 1,070 | 1,946 / 11 |
- **Hornbeam** belongs in the list (more QSMs and open-grown trees than birch). **Sycamore for field maple:** defensible for local branching descriptors (both decussate) at matched size, not
  for Level 0 or crown shape (a canopy tree for a subcanopy one). Field maple's own TLS clouds would need our QSMs.
- **Fir, pine:** Level 0 only, last. **Birch is weakest:** 15 genus-level QSMs; pendulous twigs are below QSM resolution.
- **Confounds to carry:** BioDiv is a gap experiment (stratify by `gap`); our stand is ≈ 360 stems/ha (the 10-31
  audit), sparser than most plots; oak's two sites are also two species and two size ranges (BioDiv mostly
  sessile, 12–89 cm; Wytham pedunculate, ≥ 39 cm), so holding one out tests all three at once.

## f. Compute (measured 2026-11-03, oak, seed 1, one core, WASM in Node)
Stand: 3.1 s to 60, 5.6 s to 100, **8.9 s to 150** (167 cells tall; four measured trees). Lone: 6.9, 14.9,
27.9 s, and **it reaches the world's 200-cell top by 150**, so lone Level 1 stops at 100. One candidate at 5 seeds
(stand 150 + lone 100) ≈ 120 s CPU ≈ 10 s wall on 12 workers. **CMA-ES**, 18 knobs, 1,200–2,400 candidates:
3–7 h, one night. **ABC** at 24 s a simulation: 10⁴ ≈ 6 h, 10⁵ ≈ 2.3 days: feasible on ≤ 6 knobs only. Disk 605 GB
free; BioDiv's QSMs are one 108 GB tarball (stream, keep the trees needed), Wytham's a 39.5 GB zip (range requests).
**Classifier:** DetailView falls back to CPU (`predict.py`); three DenseNet-201s on 7 views, ≈ 0.5–2 s a tree
(estimate, not run); needs CPU torch and 238 MB of weights. It also reads tree height, so it sees our scale.

## g. Phases (a session each; a deterministic gate each)
| # | phase | gate | tier |
|---|---|---|---|
| 1 | converter + `describe()`; Demol, a Wytham subset | QSM DBH and height vs `tls_summary.csv` and Demol's felled heights, ≥ 95% within 5%; the port equals `form.rs` on a simulated tree (1e-9); **a degradation test**: a simulated tree coarsened to QSM resolution moves each descriptor by less than a stated tolerance, else it is held out | Opus |
| 2 | Level 0 from Tallo, eleven species | stand trees within the 10–90% band at matched DBH, ≥ 15 of seeds 1–20 | Sonnet |
| 3 | Level 1 oak, one site held out | held-out descriptors \|z\| ≤ 2 at matched size, ≥ 15 of 20 fresh seeds; simulated between-tree SD within ×2 of the real; `shapeFlag` clear | Opus |
| 4 | beech (BioDiv; Demol held out) | as 3 | Opus |
| 5 | birch (pendulousness reported, not fitted) | as 3 | Opus |
| 6 | hornbeam; field maple via sycamore | as 3 | Sonnet |
| 7 | open-grown: TreeML, same parameters | frontal descriptors in TreeML's band, ≥ 15 of 20, no knob refitted | Opus |
| 8–9 | held-out validation (h, reported only); willow, rowan, holly (Levels 0, 2), fir, pine (Level 0) | Level 0's gate | Sonnet |

## h. Held-out tests
- **DetailView and the user's 2AFC never become targets** and never select a candidate. **The classifier's
  control first:** real QSMs sampled into point clouds by the sampler used on simulated trees must classify
  correctly before any simulated label is read.
- **The namers are recalibrated before any use:** a pinned model id, a calibration set of real silhouettes and
  decoys with known answers, a stated pass rate (v3's namers read the beech stand beech 9 of 15, the stems-bark
  set 0 of 9).
- **Within Level 1:** a third of the descriptors (named in the targets file before the first fit, with the
  resolution-sensitive ones until phase 1 clears them) and one site per species stay out of the loss.

## i. Decisions for the user (recommendation in each)
1. **Ordering:** ship first with overrides, or pause shipping? _Ship first:_ phases 1–2 change no looks.
2. **Re-open the form knobs to the fit (amends ADR 0029)**, against measured Level 1 descriptors only? _Yes._
3. **The namers move to the held-out set**, recalibrated before use? _Yes._
4. **The principle line (b)**: ≤ 4 profile bands, the held-out third and sites? _Yes._
5. **Metres per cell:** Tallo cannot identify it (no ages; it trades against r0). _Keep 0.25 m fixed;_ test it
   only against the existing height-at-age targets, never fit it to Tallo.
6. **Sycamore as field maple's Level 1 proxy**, local descriptors only? _Yes, labelled a proxy._
7. **Hornbeam in; fir and pine at Level 0 only?** _Yes._
8. **Phase 1 downloads:** Demol (16 MB), Wytham (39.5 GB), BioDiv (108 GB, streamed)? _Yes._
9. **Licences:** commit summary statistics only, never per-tree tables from Weiser (CC-BY-SA) or FOR (GPL); ATI not used? _Yes._
10. **CMA-ES as the fitter;** ABC deferred to a ≤ 6-knob posterior check after phase 4? _Yes._
11. **Lone trees:** frontal-only comparison, or a deeper slab for the lone trial (a core change, ADR 0024)? _Frontal-only for now._
