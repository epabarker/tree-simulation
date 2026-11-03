"""Gate c's control and its d_min (v2; v3 prune only) (docs/plans/2026-11-03-reference-fidelity.md §j, the 1d brief, decision 1): each
dataset's own real QSMs coarsened at a grid of its own terminal diameters, so that d_min is the coarsest point at
which coarsen() leaves the real trees where they were. Real data only: nothing here reads a simulated tree.

v1 set d_min to the median terminal diameter and its control failed there (Demol 20 of 26 descriptors over
tolerance; the length-by-order descriptors and tortuosity on Wytham): pruning half a QSM's own tips is not "its
resolution". So v2 measures the curve. v2's curve failed at Wytham on the re-cut alone; v3 (the user, 2026-11-03)
withdraws the re-cut, so the operator is coarsen()'s prune (coarsen.py), and the control runs on that.

- **Grid:** the GRID percentiles of the dataset's pooled terminal raw diameters (coarsen.resolution's pool). The
  re-cut ratios stay the dataset's measured ones. STRESS (Demol et al. 2022's ≈ 5 cm completeness threshold) is
  reported beside the grid, never chosen.
- **Shift:** per tree, describe(coarsen(qsm)) − describe(qsm). Beech at BioDiv (v3): a tree's value is the median
  over its 5 repeats, coarsened and not alike (tolerance.py). A tree whose original is NaN leaves that descriptor;
  a NaN after coarsening counts as outside tolerance.
- **Neutral descriptor at a point:** ≥ TREES of the species' trees within tolerance (|shift| ≤ tolerance).
- **The rule at a point:** for every gated species of the dataset, ≥ DESCRIPTORS of its gated descriptors (not
  report-only, not H1, not held out by the noise floor) are neutral. A descriptor with no finite tree is not neutral.
- **d_min:** the largest grid point at which the rule holds (the brief's reading; a non-monotone curve is reported,
  not smoothed). None passes: d_min is None, and the plan stops for that dataset (never loosen).
"""

from __future__ import annotations

import math
from collections.abc import Sequence

import numpy as np

from treesim import cylinders as cy

GRID = (1, 2, 5, 10, 20, 50)
STRESS = 0.05  # metres
TREES = 0.9
DESCRIPTORS = 0.9
# Dataset → (species, the dataset's species code); gated sets d_min, reported only computes the curve.
GATED = {"wytham": (("oak", "QUERRO"), ("maple", "ACERPS")), "biodiv": (("beech", "Fagus_sylvatica"),)}
REPORTED = {"demol": (("beech", "FSYL"),)}


def terminal_diameters(tables: Sequence[cy.Cylinders]) -> np.ndarray:
    """Every terminal cylinder's raw diameter, pooled (coarsen.resolution's pool)."""
    out = []
    for c in tables:
        kids = cy.children_of(c.parent)
        out.append(2.0 * c.radius_raw[[not k for k in kids]])
    return np.concatenate(out)


def grid(diameters: np.ndarray) -> dict[int, float]:
    """Percentile → diameter (metres), numpy's default (linear) percentile."""
    return {p: float(np.percentile(diameters, p)) for p in GRID}


def share_within(original: Sequence[float], coarsened: Sequence[float], tolerance: float) -> float:
    """The share of trees whose shift is within tolerance; NaN originals leave, NaN after counts as outside. NaN when
    no tree has a finite original or the tolerance is undefined."""
    pairs = [(a, b) for a, b in zip(original, coarsened) if a is not None and math.isfinite(a)]
    if not pairs or not math.isfinite(tolerance):
        return math.nan
    ok = sum(b is not None and math.isfinite(b) and abs(b - a) <= tolerance for a, b in pairs)
    return ok / len(pairs)


def neutral(share: float) -> bool:
    return math.isfinite(share) and share >= TREES


def rule_holds(shares: dict[str, dict[str, float]]) -> bool:
    """shares: species → gated descriptor → share of trees within tolerance. Every species must have at least
    DESCRIPTORS of its gated descriptors neutral (a species with no gated descriptor fails)."""
    for by_descriptor in shares.values():
        if not by_descriptor:
            return False
        if sum(neutral(s) for s in by_descriptor.values()) < DESCRIPTORS * len(by_descriptor):
            return False
    return True


def choose(curve: dict[int, bool], points: dict[int, float]) -> float | None:
    """d_min: the diameter of the largest grid point at which the rule holds; None if none does."""
    passing = [points[p] for p, ok in curve.items() if ok]
    return max(passing) if passing else None
