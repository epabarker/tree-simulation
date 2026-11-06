"""Gate c's pass rule, the two tiers (docs/plans/2026-11-03-reference-fidelity.md §j, the 1d brief, decision 2),
as a pure function over described values. Written and hashed in session 1d-i (v3); v3.1 (session 1d-ii, before any
simulated tree was measured against it) changes only `evaluation_points`, to the user's bracket ruling of
2026-11-03: [d_min, the first grid point above d_min at which the dataset's control fails]. Set from the control
curves alone, after seeing them; the criterion is "first failing grid point", not a chosen width; no simulated value
entered. 1d-ii feeds the module the simulated trees and must not change it again.

Per descriptor, at one dataset, the input is `values[seed][version]`: the descriptor on each live measured stand tree
(the same trees, in the same order, in every version). Versions: FINE (uncoarsened), one key per evaluation point
(`points`: d_min, every grid point strictly inside (d_min, upper), the upper end), and INFLATED (Demol 2022's
inflation at d_min, the user's ruling 2026-11-03: gated). `points[0]` is d_min. Tier A's rule is unchanged; it reads
the same evaluation points.

- **Tier A** (resolution-independent; v1's criterion read strictly across the bracket): per seed the median over trees
  of the signed coarsened − fine, and |median| ≤ tolerance on ≥ PASS_SEEDS seeds, at every point and INFLATED.
- **Tier B** (valid at matched resolution): per seed the median of the signed v(p) − v(d_min), and |median| ≤
  tolerance on ≥ PASS_SEEDS seeds at every other point and INFLATED; and the descriptor's own control is neutral at
  d_min (control.py: ≥ 90% of real trees within tolerance).
- A seed with no tree, or a NaN anywhere in the differences, fails that seed (v1's rule).
- Assignment: "A" if tier A passes, else "B" if tier B passes, else "held out". The fit compares the coarsened
  simulator with the real QSMs under both tiers.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence

import numpy as np

FINE = "fine"
INFLATED = "inflated"
PASS_SEEDS = 15


def _seed_median(a: Sequence[float], b: Sequence[float]) -> float:
    """Median over trees of a − b; NaN with no tree or any non-finite difference."""
    if not a or len(a) != len(b):
        return math.nan
    d = [x - y if x is not None and y is not None else math.nan for x, y in zip(a, b)]
    return float(np.median(d)) if all(math.isfinite(v) for v in d) else math.nan


def seeds_within(values: Mapping[int, Mapping[str, Sequence[float]]], version: str, reference: str,
                 tolerance: float) -> int:
    """Seeds whose median over trees of version − reference lies within tolerance."""
    n = 0
    for by_version in values.values():
        m = _seed_median(by_version.get(version, []), by_version.get(reference, []))
        n += math.isfinite(m) and math.isfinite(tolerance) and abs(m) <= tolerance
    return n


def tier_a(values, points: Sequence[str], tolerance: float) -> bool:
    return all(seeds_within(values, p, FINE, tolerance) >= PASS_SEEDS for p in [*points, INFLATED])


def tier_b(values, points: Sequence[str], tolerance: float, control_neutral: bool) -> bool:
    if not control_neutral:
        return False
    return all(seeds_within(values, p, points[0], tolerance) >= PASS_SEEDS for p in [*points[1:], INFLATED])


def assign(values, points: Sequence[str], tolerance: float, control_neutral: bool) -> str:
    if tier_a(values, points, tolerance):
        return "A"
    if tier_b(values, points, tolerance, control_neutral):
        return "B"
    return "held out"


def upper_end(grid: Mapping[int, float], curve: Mapping[int, bool], d_min: float) -> tuple[str, float]:
    """The first grid point (ascending percentile) with diameter above d_min at which the control fails: (name,
    diameter). `curve` is the dataset's control verdict per grid percentile (control.py). No such point: the bracket
    is undefined and the dataset stops (nothing is invented)."""
    for p in sorted(grid):
        if grid[p] > d_min and not curve[p]:
            return f"p{p}", grid[p]
    raise ValueError("the control passes at every grid point above d_min: tier B's bracket has no upper end")


def evaluation_points(grid: Mapping[int, float], d_min: float, upper: float) -> list[tuple[str, float]]:
    """(name, diameter): d_min, the grid points strictly inside (d_min, upper), the upper end (named "upper")."""
    inside = [(f"p{p}", d) for p, d in sorted(grid.items(), key=lambda kv: kv[1]) if d_min < d < upper]
    return [("dmin", d_min), *inside, ("upper", upper)]
