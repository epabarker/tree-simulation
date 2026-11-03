# 0049: Species fidelity from measured reference data, with held-out perceptual tests

- **Status:** proposed (drafted 2026-11-03 from the reference-fidelity plan's a, b and h; the user decides).
- **Date:** 2026-11-03
- **Amends:** ADR 0029 (form by hand), ADR 0028 §6 (the acceptance rule), STATUS's "ship, no round-5 fit"
  (2026-11-02).
- **Plan, audit and source:** [the plan](../plans/2026-11-03-reference-fidelity.md);
  [the audit](../plans/reference-audit/); [the reference document](../research/2026-11-03-reference-data-and-evaluation.md).

## Context
Rounds 2–4 fitted species to described shape targets, and each round's search found the free direction the
loss did not read (round 3's tiered beech cone, round 4's birch pagoda). ADR 0029 held the ten form knobs by hand
and left shape reported, "until a shape target is measured" (routes C and D). The judging since has rested on
blind namers. Their verdicts did not replicate across namer sets: v3 read the beech stand as beech 9 of 15, the
stems-bark set 0 of 9. The user has changed direction: fidelity is to come from measured reference data on
three levels (allometry, branching statistics, perception), with the perceptual tests held out.

The audit (2026-11-03) found leaf-off QSMs for oak (BioDiv 88, Wytham 37), beech (BioDiv 1,659, Demol 15),
hornbeam (38), sycamore (Wytham 541, BioDiv 42) and birch (15). It found forest-grown allometry in Tallo for all
eleven species (thin for willow, rowan, holly), and open-grown structure only in TreeML's pruned street trees
(≤ 41 per species). Lone trees exceed the slab's 16 m depth (ADR 0024), so they compare frontally only.

## Decision (proposed)
1. **Measured targets re-open the form knobs.** The ten form knobs of ADR 0029 may be fitted again, against
   measured Level 1 descriptors only. These are distributions over real trees at a matched size class, read by
   one `describe()` applied identically to the model's skeleton and to the real cylinder tables. Described shape
   targets stay reported, never scored. The gallery stays the regression set and `shapeFlag` stays.
2. **The principle line.** Fitting the parameters of local growth rules is in. Out:
   - envelopes, and shape targets that act as one (the crown profile at most 4 bands, never fitted alone);
   - per-species hand shapes or code paths;
   - any knob added to serve a fit.
   3D asymmetry and projected crown area are never fitted (they belong to the slab, not the species).
3. **Held-out tests never become targets.** The FOR-species20K classifier (DetailView) and the user's 2AFC never
   enter a loss or a candidate's selection. The classifier is read only after real QSMs, sampled the same way,
   classify correctly. The blind namers move to the held-out set and are recalibrated before any further use:
   a pinned model id, a calibration set with known answers, a stated pass rate. Within Level 1, a third of the
   descriptors and one site per species stay out of the loss. They are named before the first fit.
4. **Acceptance.** A species' fit is accepted when the held-out descriptors are within |z| ≤ 2 at matched size,
   on ≥ 15 of 20 fresh seeds, and the simulated between-tree spread is within a factor of 2 of the real one.
   ADR 0028 §6's line-up panel, judged by the user, remains the last step.
5. **The ordering** (ship first with overrides, or pause shipping) is the user's, recorded when decided.

## Consequences
- Phase 1 builds the converter and `describe()` before any fit. Its gates are deterministic: QSM DBH and height
  against Wytham's `tls_summary.csv` and Demol's felled heights, and a degradation test showing which
  descriptors survive QSM resolution.
- Leaf-dependent definitions (`limbCrownRatio`, `leafBase`, `leafStemSlope`) need wood-only versions. Crown base
  comes from field measurements (Weiser), not from QSM wood.
- Per-tree tables derived from GPL (FOR-species20K) or CC-BY-SA (Weiser) data are not committed; summary
  statistics are.
- All pre-phase-1 shape targets and `hand-overrides.toml` are in simulator-label coordinates (slot 0 continues);
  fitted Level 1 values use geometric labels (the heavier subtree continues) and are not comparable to them.
- Willow, rowan and holly have no 3D data. They are fitted at Level 0 and judged at Level 2 only, as are fir and
  pine (Level 0).
