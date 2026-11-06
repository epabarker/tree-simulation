"""coarsen(): a simulated skeleton brought to a QSM's resolution, for gate c (docs/plans/2026-11-03-reference-fidelity.md
§j, the 1c brief; ADR 0049). A descriptor that moves more than its tolerance when a simulated tree is coarsened to a
dataset's resolution measures the reconstruction, not the tree, and is held out.

The resolution is measured from each dataset's own cylinders, separately per dataset (`resolution`): the
median diameter of its terminal cylinders, and the median length over radius of its cylinders by radius class
(reported only, since v3). d_min itself is chosen by the control (control.py). In order:

1. `inflate` (the inflation point only): every radius × f(d), Demol et al. 2022's small-branch bias
   (*Silva Fennica* 56(1) 10550, leaf-off *Fraxinus*, two trees, Grid 10): diameters +73% under 2.5 cm and +4% over
   10 cm (§3.2, both measured); between, f is interpolated in log d between the two (not measured). Before pruning: a
   reconstruction reads a twig large first, and keeps it for that.
2. `prune`: every cylinder whose diameter is under d_min goes, with its subtree (per cylinder, not per axis, so that
   every surviving cylinder is at least d_min and a second pass prunes nothing).

**v3 (the user, 2026-11-03): prune only.** v1 and v2 also re-cut each axis to the dataset's length/radius ratio. The
re-cut is withdrawn: it was a second answer to segmentation, which describe() already handles at its fixed 0.5 m
step, and v2's control showed it non-neutral on Wytham's own QSMs (tortuosity, tortuosity05, forkHeight). It is in
git at commit 3f13c29.

Coarsening twice changes nothing (test_coarsen.py). Inflation is outside that promise: inflating twice inflates
twice.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from treesim import cylinders as cy
from treesim.describe import subset

# Radius classes for the length/radius ratio (metres, raw radius): doublings from 5 mm.
EDGES = (0.0, 0.005, 0.01, 0.02, 0.04, 0.08, 0.16, math.inf)
# Demol et al. 2022 §3.2: relative diameter overestimate by QSM, d < 2.5 cm and d > 10 cm.
INFLATE_SMALL = (0.025, 0.73)
INFLATE_LARGE = (0.10, 0.04)


@dataclass(frozen=True)
class Resolution:
    d_min: float  # metres
    ratio: tuple[float, ...]  # median length / raw radius per class of EDGES (NaN where the class is empty)
    count: tuple[int, ...]


def radius_class(r: float) -> int:
    for k in range(len(EDGES) - 1):
        if r < EDGES[k + 1]:
            return k
    return len(EDGES) - 2


def resolution(tables: list[cy.Cylinders]) -> Resolution:
    """A dataset's resolution from its own cylinders, pooled over its trees: d_min is the median raw diameter of
    every terminal cylinder; the ratio is the median length over raw radius in each radius class."""
    tips, cls, lr = [], [], []
    for c in tables:
        kids = cy.children_of(c.parent)
        tips.append(2.0 * c.radius_raw[[not k for k in kids]])
        ok = c.radius_raw > 0
        cls.append(np.array([radius_class(r) for r in c.radius_raw[ok]], int))
        lr.append(c.length[ok] / c.radius_raw[ok])
    cls_all, lr_all = np.concatenate(cls), np.concatenate(lr)
    ratio, count = [], []
    for k in range(len(EDGES) - 1):
        sel = lr_all[cls_all == k]
        ratio.append(float(np.median(sel)) if len(sel) else math.nan)
        count.append(int(len(sel)))
    return Resolution(float(np.median(np.concatenate(tips))), tuple(ratio), tuple(count))


def inflation_factor(d: np.ndarray) -> np.ndarray:
    """1 + Demol et al. 2022's diameter overestimate at diameter d (metres), log-interpolated between its two
    measured classes and held flat beyond them."""
    (d0, e0), (d1, e1) = INFLATE_SMALL, INFLATE_LARGE
    t = np.clip((np.log(np.maximum(d, 1e-12)) - math.log(d0)) / (math.log(d1) - math.log(d0)), 0.0, 1.0)
    return 1.0 + e0 + (e1 - e0) * t


def inflate(c: cy.Cylinders) -> cy.Cylinders:
    f = inflation_factor(2.0 * c.radius_raw)
    return cy.Cylinders(c.start, c.axis, c.length, c.radius * f, c.radius_raw * f, c.parent)


def prune(c: cy.Cylinders, d_min: float) -> cy.Cylinders:
    """Drops every cylinder of raw diameter under d_min with its subtree (the root stays)."""
    gone = 2.0 * c.radius_raw < d_min
    gone[0] = False
    for i in range(1, len(c)):
        gone[i] |= gone[c.parent[i]]
    return subset(c, ~gone) if gone.any() else c


def coarsen(c: cy.Cylinders, res: Resolution, inflated: bool = False) -> cy.Cylinders:
    """A table at `res`'s resolution: (inflate,) prune at d_min (the module's docstring)."""
    if inflated:
        c = inflate(c)
    return prune(c, res.d_min)
