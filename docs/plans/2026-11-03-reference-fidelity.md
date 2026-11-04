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

## g. Phases (a session each; a deterministic gate each; reordered 2026-11-03, the user: beech 3, oak 4)
| # | phase | gate | tier |
|---|---|---|---|
| 1 | converter + `describe()`; Demol, a Wytham subset | QSM DBH and height vs `tls_summary.csv` and Demol's felled heights, ≥ 95% within 5%; the port equals `form.rs` on a simulated tree (1e-9); **a degradation test**: a simulated tree coarsened to QSM resolution moves each descriptor by less than a stated tolerance, else it is held out | Opus |
| 2 | Level 0 from Tallo, eleven species | stand trees within the 10–90% band at matched DBH, ≥ 15 of seeds 1–20 | Sonnet |
| 3 | Level 1 beech (BioDiv; Demol held out) | held-out descriptors \|z\| ≤ 2 at matched size, ≥ 15 of 20 fresh seeds; simulated between-tree SD within ×2 of the real; `shapeFlag` clear | Opus |
| 4 | oak, one site held out (its two sites confound species, size and site) | as 3 | Opus |
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

**Decided (the user, 2026-11-03):** 1 ship first with overrides. 2 yes: form knobs fittable against measured Level 1
descriptors only; phase 7's rule (same parameters, no refit, TreeML judges) binds even if it fails. 3 yes. 4 yes.
5 keep 0.25 m fixed. 6 yes, labelled a proxy. 7 yes. 8 yes, but QSM files only (no point clouds), only the species
the phases need; stream and filter, never mirror whole archives. 9 yes. 10 yes. 11 frontal only. **Reorder:** beech
is phase 3 (BioDiv; Demol held out), oak phase 4 (its two sites confound species, size and site). ADR 0049 records
these and goes to accepted in session 1c.

## j. Phase 1 (approved 2026-11-03): three sessions sharing this file
Each session ends by rewriting **State** below and stops at ≈ 200k context. Nothing in `src/`, `rust/`, presets or
species params changes. Python in `analysis/`; data under `data/reference/` (git-ignored), each source in its own
fresh directory, read with `python -I`.

**Decisions on the phase-1 plan:**
1. **Gate a** compares recomputed values against the publishers' own QSM-derived values, the same kind of
   comparison per dataset (B). Felled height and Demol's `PC_treeheight` are reported as ceilings, never gated
   (Demol's own point-cloud height is within 5% of felled height for 91% of trees; its QSM DBH within 5% of field
   DBH for 68%).
2. **`cli/dump-trees.ts`** is allowed: gate b only, out of anything shipped (not in the site build, not in
   `npm run build`).
3. **BioDiv:** option A: valid beech from the head of the stream's `QSM/all/` (the tarball is one zstd frame;
   `all/` streams first; `raw/` is ≈ 7 h away at 3.9 MB/s). Each tree's model by Wytham's rule (median-size
   model), not `select_optimum`. Take 50–100 valid beech. **Label "Phase 1 only"**: the head of the stream is one
   plot and one gap treatment, so never a source of beech tolerances or phase-4 targets. (The user may run option
   B, the full stream to `raw/`, as a detached job.)
4. **TreeML:** three real `optcsv` files by range request from `Dataset_QSM.zip`, and a synthetic fixture.

**Amendments:**
- **A. One implementation.** `describe()` calls the same function as the literal `form.rs` port, parameterised by
  (topology labels, limb-length threshold). Gate b runs that code path with the simulator's labels and the
  10-metamer rule. Reported, not gated: form_py(simulator labels) vs form_py(geometric labels) on gate b's 30
  trees (`forkHeight` and `leaderDominance` depend on what "main child" means).
- **B. Gate a per dataset, same kind of comparison.** Height against the `.mat`'s own `TreeHeight` where the
  layout carries it (Demol 2.3: `qsm.treedata.TreeHeight`; check Wytham 2.0's `TreeData` vector and BioDiv 2.4.1).
  Where it does not, `Hgt_pts` is a ceiling, not a gate, and height is covered by internal checks: top z − base z
  > 0, the trunk's base is the lowest cylinder, parent-before-child. DBH: Wytham's `DBH_QSM_avg` is a mean over 10
  models and we read one (noted). BioDiv: establish whether `labels.csv`'s `dTLS`/`hTLS` are point- or
  QSM-derived before gating on them (the `.mat`'s own `treedata` is the like-for-like comparison).
- **C.** `test_readers.py` asserts the up axis for every format (QSMs z-up metres; the simulator y-up cells).
- **D.** A committed manifest of every Wytham and BioDiv member fetched (member name, model index, bytes), for
  reproducibility and CC-BY attribution: `analysis/fit/sources/reference-manifest.csv`.
- **E.** Gate c's table shows pass/fail beside the noise floor and the tolerance (so a held-out descriptor reads as
  "tolerance tight" or "resolution-sensitive"). If fewer than half the descriptors survive: stop and report;
  never loosen the tolerance.

**Fixed choices (the approved plan):**
- **Common cylinder table** (`analysis/treesim/cylinders.py`): per cylinder start (x, y, z), unit axis, length,
  radius (QSM `UnmodRadius`/raw where present), parent (−1 root, parent before child), metres, **z up**. The
  simulator converts: cells × 0.25 m, (x, y, z)sim → (x, z, y). Continuation by geometry: at each node the child
  with the larger subtree wood volume Σπr²l continues (ties: the smaller turn from the parent's axis); order +1 on
  every other child. Never TreeQSM's `BranchOrder`/`BoC` or our slot 0.
- **DBH:** the trunk (continuation from the root) cylinder spanning 1.3 m of stem length, ×2 (TreeQSM's
  `DBHqsm`, which equals Demol's CSV `qsm_DBHqsm`). **H:** top z − base z.
- **Wytham subset:** all 37 oaks; 40 sycamores DBH ≥ 10 cm stratified by DBH; all 10 models for 8 mid-sized
  sycamores (the noise floor, 1c). One model per tree: the median-size member of its 10 (never the smallest:
  that picks the coarsest reconstruction; never "closest to `DBH_QSM_avg`"). The zip is zip64; its central
  directory sits at 39,472,397,759 (1.36 MB). Zenodo serves ranges on `…/files/DATA_QSM_opt.zip?download=1`.
- **Coarsening (1c):** (1) prune simulated subtrees whose base diameter < d_min, the median terminal-cylinder
  diameter of that dataset's QSMs (per dataset); (2) re-cut each continuation axis to the dataset's median
  length/radius ratio by radius class: chord from first base to last tip, r = √(Σr²l / L); (3) then re-derive
  continuation and order. Bracket: d_min × 0.5 and × 2, and a small-branch inflation variant from Demol et al.
  2022 (*Silva Fennica* 56(1) 10550, doi 10.14214/sf.10550: in leaf-off *Fraxinus*, branches < 5 cm caused
  80–83% of the volume overestimate; diameters < 10 cm read larger than measured), dropped if the paper gives no
  error by diameter class.
- **Tolerance (1c):** 0.5 × the size-detrended real between-tree SD (residual on log DBH, per species). Noise
  floor: between-model SD over Wytham's 10 models; ≥ 0.5 × between-tree SD → held out regardless. Pass: the
  per-seed shift (median of the four measured trees) within tolerance on ≥ 15 of seeds 1–20, at every bracket
  point and each dataset's resolution. Simulated: oak, beech, field maple (sycamore proxy), stand to 150,
  DBH-matched; lone at 100 reported only.
- **Gate b:** oak, beech, birch × seeds 1, 2; lone at 60 and stand at 100 (30 trees); 12 values + 10 bands;
  |a − b| ≤ 1e-9·max(1, |b|), NaN = NaN.
- **Tests** skip with a reason when `data/reference/` or the WASM build is missing, and never touch the network.

### Session briefs
- **1a (readers, gate a):** `analysis/treesim/fetch.py` (Wytham range reads, Demol unzip, BioDiv head-of-stream,
  TreeML range reads), `analysis/treesim/cylinders.py` (the table, validation, continuation/order, DBH, H),
  `analysis/treesim/qsm.py` (TreeQSM 2.0, 2.3, 2.4.1, TreeML `optcsv`), `analysis/tests/test_readers.py` (field
  maps on synthetic `.mat`/`optcsv`, up axis, C), `analysis/tests/test_qsm_gate.py` (gate a, B), the manifest (D).
  Done: gate a ≥ 95% within 5% per dataset on the gated columns; numbers in State.
- **1b (describe, gate b):** `analysis/treesim/form.py` (the one implementation, A), `analysis/treesim/simtree.py`,
  `cli/dump-trees.ts`, `analysis/treesim/describe.py` (ported wood-only descriptors with geometric labels and a
  2.5 m limb threshold; 4-band profile; new: Horton–Strahler bifurcation ratio, tortuosity, length fraction by
  order, pendulous fraction, taper d(0.5 H)/DBH, length-weighted centroid height/H; report-only `leafStemSlope`,
  crown base/H), `test_form_parity.py` (gate b), `test_topology.py`, `test_describe.py`, the relabelling table;
  the simulator's case in `test_readers.py`'s up-axis test (C: y-up cells → z-up metres). **First**, ruling R1
  (BioDiv's model choice, gate a re-run). **Below-ground subtrees (R4):** drop subtrees whose start lies below the
  root cylinder's base z, counted and reported per tree as orphan fragments are; run the internal checks on every
  dataset, reported, not gated.
- **1c (coarsening, gate c, wrap):** `coarsen()`, the Wytham 10-model noise floor (8 mid-sized sycamores and 4 of
  the big oaks, all 10 models each, R3), tolerances matched on measured DBH (R2),
  `analysis/experiments/phase1_degradation.py`, `test_coarsen.py`, gate c (E),
  `docs/experiments/2026-11-03-phase1-converter.md` (gates, numbers, held-out list, BioDiv "Phase 1 only" with its
  plot mix as found: 19 plots, G and GD, R5),
  ADR 0049 to accepted with the decisions above, §g reordered (beech 3, oak 4), spec-reviewer on the diff,
  `/wrap-up`, commit, push, no PR.
- **1d (gate c v2: re-register, re-run; after phase 2, on phase 2's trees).** The user's rulings, 2026-11-03.
  - **Gate c v1 is recorded as it stands** (the note; nothing loosened):
    - oak: 5 survive;
    - beech: 0, since taper is held out by its noise floor under BioDiv's repeats (4.36 × the between-tree SD);
    - maple: 12, with H1 extended.
  - **The instrument is revised and pre-registered again** (a new commit before any run, with code hashes as v1's)
    and re-run after phase 2.
  1. **d_min, from real data only.**
     - Per dataset, d_min is the largest value at which coarsening that dataset's own QSMs stays within tolerance
       on ≥ 90% of the non-held-out descriptors, for ≥ 90% of its trees.
     - The grid is the percentiles of that dataset's terminal diameters.
     - The stress point above it is Demol 2022's ≈ 5 cm completeness threshold: reported, not gated.
     - The ×0.5 / ×2 bracket is withdrawn.
  2. **The pass rule has two tiers. Both tiers are targets;** the targets file records each descriptor's tier.
     - **Tier A**, resolution-independent: v1's criterion, the shift from fine to coarse within tolerance.
     - **Tier B**, valid at matched resolution: the simulator's coarsened value stays within tolerance across
       [d_min, 2·d_min], and the control is neutral at d_min.
     - **The fit always compares the coarsened simulator against the real QSMs.** Fine-simulator values never enter
       a loss.
  3. **H1 is extended to maple: confirmed.** It is the file format (TreeQSM 2.0, no UnmodRadius), not the species.
  4. **Beech: tolerances and the noise floor come from BioDiv's 53** (its 5 repeats of the optimum's input set as
     the floor). This amends R5's "never a source of tolerances" for this use. Demol becomes beech's held-out site
     only, as phase 3 already says.
  5. **`cli/dump-trees.ts --gate-c` is approved** (still in no build).
  6. **Size matching is required.** Each species is read at the season where the stand's measured-tree median DBH
     matches the reference median (measured DBH, R2). Report the height at that season.
  7. **`ldSlope` and `junctionDelta` are report-only.** They are not targets in phases 3–4. The dead-limb
     explanation is recorded as a hypothesis, for a later shed-limb comparison transform.
  8. **The note** (`docs/experiments/2026-11-03-phase1-converter.md`, or a v2 note linked from it) states three
     things:
     - v2 was designed after v1 failed;
     - every v2 parameter derives from real data only;
     - v1 and v2, side by side.
  - **Order:** phase 2 (Tallo, Level 0) runs next, on Sonnet. 1d then re-registers and re-runs gate c on phase 2's
    trees, at their size-matched seasons.

- **1d-ii (the user, 2026-11-03, after v3's control curves; set from real data only):**
  - **Tier B's bracket** is [d_min, the first grid point at which the control fails], not [d_min, 2·d_min]:
    Wytham [5.0, 12.1 mm] (p20 to p50), BioDiv [8.6, 11.0 mm] (p2 to p5). The evaluation points are d_min, the
    grid points strictly inside, the upper end and inflation at d_min.
  - This changes `tiers.evaluation_points` and the JSON's `rules.evaluation_points` and `rules.tier_b`, both
    hashed. So 1d-ii's first step re-registers them as v3.1: the code, the rule text, the hashes, a commit. This
    happens before `tiers.py` is wired and before any simulated tree. Tier A is unchanged.
  - **For phase 3:** Demol has no neutral d_min (p1, 13.3 mm, already fails). As beech's held-out site it serves
    tier A descriptors only.

## k. Phase 2: Level 0 from Tallo (approved 2026-11-03, with the user's rulings)
Pre-registered in `analysis/fit/sources/tallo-level0.json` (`analysis/treesim/tallo.py`) before any z of a
simulated tree is read. The parity dump (below) read simulated DBH, H and CR before this commit, as a measurement check;
no z was computed, and nothing registered changed after it.
- **Targets.** Tallo v1.0.0 (CC-BY 4.0): the species' taxa (oak = *Q. robur* + *petraea*, birch = *B. pendula* +
  *pubescens*), count_species.py's Europe box, each trait's outlier flag "N". Quantile regressions of ln H and ln CR on
  ln D at τ 0.1/0.5/0.9 (quadratic in ln D at n ≥ 300), rearranged where they cross; support DBH p2.5–p97.5.
  **Thin species** (willow, rowan, holly; the user): their own median line, the band borrowed from the well-sampled
  broadleaves' pooled ln residuals; their own 10/90 lines reported, ungated. Ten species gated; sycamore reference only.
- **Knobs** (seven, every species, bounds from the targets file's `[[param]]`; machine copy `[level0] knobs`):
  primary growth `c3.alpha`, `r1.Lh`, `r1.mf`, `r2.hJ`; secondary thickening `c6.r0`; crown expansion `r6.qMin`,
  `r6.leafArea`. **Not fitted:** `r3.c` (posture rate: form; it is in every round-5 list), the ten form knobs (fir
  and pine too), `c5.Trel` (ADR 0032), the cell (decision 5). No knob added.
- **Measurement** (`cli/allometry.ts`, the closed stand's measured trees at 60, 100, 150): DBH by phase 1's rule
  (`cylinders.dbh`, ported; parity 1e-9 on 67 trees, `test_level0_parity.py`), wood only, no bark (the same bias as
  Level 1's size matching); H the highest point above the root; CR the mean over ±x, ±z of the largest offset of a
  live-bud tip from the trunk at 1.3 m (the user). A codominant stem (a side child below the DBH cylinder holding ≥ half
  the continuing child's subtree volume) is counted, never pooled; if any occur, the user rules on √Σd². The core's
  metamer coordinates are continuous across the ring (no unwrap needed).
- **Loss** (the user): scored `stand.talloH`, `stand.talloCR` (median z of the comparable trees at 60, 100, 150, the
  three sharing weight 1), `stand.height`, `stand.lateShare`, `stand.lai`, `shade.survivalLight` and the death
  penalties. Reported, not scored: `lone.slenderness`, `stand.slenderness`, `stand.crownRatio`, `lone.earlyShare`.
  **An exception to ADR 0049 §1:** height at 60 and lateShare stay scored as the time anchors Tallo cannot give (it
  has no ages). Results give each trait's loss contribution.
- **Gate** (the user): z = (ln y − q50)/(q90 − q50) above the median, /(q50 − q10) below; out of support, not
  comparable. A seed passes when max(|median z_H|, |median z_CR|) ≤ T at every comparable season; a species on ≥ 15
  of seeds 1–20; no comparable season: not gateable. **T** per species is the 90th percentile of that statistic over
  2,000 pseudo-seeds of 4 real Tallo trees drawn from the whole support (no simulated DBH); self-consistency: 20 fresh
  pseudo-seeds judged by the gate's own rule, ≥ 15. **Coverage** per tercile of ln D is the conditionality
  diagnostic (near 0.8; outside 0.65–0.95 a note, never tuned on).
- **Thin species borrow T too** (the user, 06915ac): willow, rowan and holly take the pooled T of the broadleaves'
  controls (0.84, 12,000 pseudo-seeds of 12,537 trees), "borrowed T"; their own (0.97, 0.96, 0.51) are small-pool
  artefacts, kept as `T_own`.
- **The sweep** (the user): deep on three a night. `level0_sweep.sh night1` (beech, oak, birch; 1200 evaluations
  each), `night2` (hornbeam, maple, pine, fir; 900 each, four species), `night3` (willow, rowan, holly; 1200 each);
  12 workers (the knee is 6–8; 12 the fastest). A killed run resumes from its last whole generation: the partial
  generation is neither counted nor charged, and is redrawn identically (the CMA's RandomState is checkpointed).
- **The post-sweep session** (the user, 2026-11-03), per species:
  1. the gate (`level0_gate.py --fit`);
  2. **the gallery regression and `shapeFlag` on the fitted params before any are accepted** (ADR 0049 keeps the
     gallery as the regression set);
  3. the per-trait loss contributions, so the trade between height at age and Tallo is visible;
  4. the write-up (`docs/experiments/`).
- **The bound rule** (the user): if a species cannot reach the band at the full budget, the next step is a report on
  which knob is at its bound and why, never more generations.

### State
_(rewritten at the end of each session)_

**Crown competition diagnosed (2026-11-04, [note](../experiments/2026-11-04-crown-competition.md),
[ADR 0051](../decisions/0051-crown-competition.md), proposed).** Read-only on the core; no params accepted.
- **Overlap:** crowns interpenetrate in every species, hand and fit; 24–42% of live-bud tips lie on a neighbour's side.
- **The decomposition:** the gate's CR = the Voronoi ceiling (≈ 2.8 m, half the 5.25 m spacing) + the reach past the
  midpoint. Oak fit at 60: 4.92 = 2.83 + 2.1. A crown stopping at the midpoint would score z ≈ +0.46, so oak's whole
  binding term is the reach past the midpoint.
- **The tips that set CR:** young encroaching wood at 60; by 150 old limbs held as leafy short shoots. They sit inside
  the neighbour's foliage, with the same light as own-side tips (q ratio ≈ 1).
- **The mechanism:**
  - Nothing removes a lit limb inside another tree's crown: light, Borchert–Honda, R6, R4 and C5 are all ownerless.
  - R5's neighbour signal, the one owner-aware rule that is on, lengthens shoots.
  - §O2 abrasion is off (ADR 0013's 2D premise no longer holds).
- **Levers:** none brings oak fit's z_CR at 60 under T without collapsing LAI. The gate reads a maximum over ~2,000
  tips, which bulk processes move last:
  - O2 at ADR 0013's settings halves the foreign tips and trims CR ≈ 10%;
  - T_rel ×10 trims CR by losing crown;
  - qMin past its bound kills trees and widens beech.
- **Rivals:**
  - light resolution, excluded;
  - mortality, excluded for oak and birch, partial for beech;
  - the slab, excluded for oak, not for beech (six rows: z_CR +0.39 / +0.23 / +0.34);
  - the user's qMin premise, refuted.
- **Beech's spread:** CR at 60 shows no association with height rank at 150.
- **ADR 0051 recommends** A: the user rules on CR's reading (ADR 0050 ruling 2), then B (O2 on in the woods, ADR
  0013's settings, unfitted) if the max stays.
- **Next:** the user's rulings (CR's reading; ADR 0051; oak's CR, option C, rowan from night 1). Then nights 2–3 and
  1d-ii.

**Night 1 against v2 done and read (2026-11-04,
[note](../experiments/2026-11-04-level0-night1-v2.md)): beech 9/20, oak 0/20, birch 0/20; no gallery flag; no params
accepted.** Height is no longer what blocks. Oak's binding term is CR (every seed over T at 60). Birch's is the girth
trajectory (DBH +4.7 cm from 60 to 150; no r0 fits all three seasons): a case for ADR 0050's option C. Beech's medians
are in band; its H spread grows to 1.72× the real one at 150 (within ×2). The bound report: oak's r1.mf is flat (not
binding); birch's r6.qMin is the shade house against LAI. Height at 100 is scored three times (recorded, not changed).
The rest of this State is from the v2 session; its open points stand.

**Level 0 targets v2 registered (7615b01, 2026-11-03).**
- **Readings taken in the unattended session (the user's spec left these open; each is the narrower or the stated one):**
  - Thin and ungated are read from the subset's n_H alone.
  - The pool for the borrowed band and T is the six v1 broadleaves, each with n_H ≥ 100 in the subset.
  - The control's three pseudo-seasons are independent draws (lenient beside the gate's correlated seasons).
  - The audit's DBH window is the pooled median ÷/× 1.25.
  - Time anchors come from the NW-FVA species only (beech, oak, pine), with no extrapolation (no 150 for beech or pine).
  - The band is each species' own height-at-60 share: beech ± 26, the advisor's reading.
  - Only birch's lateShare becomes reported.
- **v2** ([note](../experiments/2026-11-03-level0-targets.md), "Level 0 targets v2"): Tallo in 45–58° N, 10° W–25° E for
  every species, chosen after the oak audit (Lines et al. 2012 gave 73% of oak's European H rows).
  - Oak's median H at 40 cm is 29.4 m (v1 16.0).
  - n_H: beech 5,149; oak 613; birch 275 (*pendula*, linear); hornbeam 1,038; maple 160; pine 2,765; fir 585; rowan 38
    (borrowed band).
  - Willow (6) and holly (0) are not gated at Level 0.
  - T (3 seasons × 4 trees, max |median z|) is 0.99–1.09; v1's statistic on the same trees gives 0.81–0.88.
  - Heights at 100 (beech 122 ± 26, oak 102 ± 17, pine 108 ± 18) and at 150 (oak 119 ± 20) are scored at Level 0, from
    `analysis/fit/sources/nwfva_h100.csv`.
  - Birch's lateShare is reported.
- **v1, archived:** `docs/experiments/fits/level0-v1/` (fits and v1 targets) and `runs/level0-v1/` (logs, checkpoints).
  v1's gate: beech 2/20, oak 0/20.
- **Ran (done 05:46, 2026-11-04):** tmux `level0` (systemd-inhibit), `analysis/experiments/level0_fit_gate.sh beech oak birch`. Each species
  runs 1200 evaluations on 12 workers, ≤ 3.5 h, then its gate.
  - Results: `docs/experiments/fits/level0/S.json` (+ `-best.json`, `-progress.csv`).
  - Logs: `runs/level0/S.log`. Gates: `runs/level0/S.gate.txt` and `.json`. The wrapper's log: `runs/level0/night1-v2.log`.
  - Status: `analysis/experiments/level0_status.sh`. `analysis/` must stay as committed until the night ends: each gate
    reads the targets when it starts.
- **Not done (the user's):** no gallery, no `shapeFlag`, no params accepted.
- **Open points for the user:**
  1. Rowan's borrowed T fails its own control (9/20; H coverage ≈ 0.5). Rowan is gated by the rule but could not pass.
     Night 3 is now rowan alone and waits on this ruling.
  2. Maple, rowan and holly's lateShare (and holly and rowan's height at 60) are "described" but still scored.
  3. H100 now enters the loss three times: height at 60, at 100, and lateShare.
  4. Beech and pine have no anchor at 150.
  5. ADR 0050's two oak rulings (Tallo against the yield tables; CR's definition) may be moot under v2. Re-read them on
     oak's v2 gate.
- **Next:** read the three gates. Then, per species, the post-sweep session (§k: gallery and `shapeFlag`, loss
  contributions, the D* split, write-up). Nights 2 (hornbeam, maple, pine, fir) and 3 (rowan) follow, against v2.
- **Standing rulings:** §k (as amended by v2); R2, R3 done; R5 as amended; §g reordered; ADR 0049 accepted;
  ADR 0050 and 0051 proposed.
