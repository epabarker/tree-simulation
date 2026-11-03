"""coarsen(): a simulated skeleton brought to a QSM's resolution, for gate c (docs/plans/2026-11-03-reference-fidelity.md
§j, the 1c brief; ADR 0049). A descriptor that moves more than its tolerance when a simulated tree is coarsened to a
dataset's resolution measures the reconstruction, not the tree, and is held out.

The resolution is measured from each dataset's own cylinders, separately per dataset (`resolution`): d_min, the
median diameter of its terminal cylinders, and the median length over radius of its cylinders by radius class. The
paper is the bracket, not the parameter. In order:

1. `inflate` (the bracket's inflation variant only): every radius × f(d), Demol et al. 2022's small-branch bias
   (*Silva Fennica* 56(1) 10550, leaf-off *Fraxinus*, two trees, Grid 10): diameters +73% under 2.5 cm and +4% over
   10 cm (§3.2, both measured); between, f is interpolated in log d between the two (not measured). Before pruning: a
   reconstruction reads a twig large first, and keeps it for that.
2. `prune`: every cylinder whose diameter is under d_min goes, with its subtree (per cylinder, not per axis, so that
   every surviving cylinder is at least d_min and a second pass prunes nothing).
3. `recut`: each continuation axis (geometric labels, cylinders.py) is re-cut greedily from its base: a segment closes
   at the first cylinder where the merged cylinder it would make (the chord from its first base to its last tip,
   r = √(Σr²l / chord), so its volume is the members') is as long as the dataset's ratio for its radius class times
   its radius. A segment of one cylinder is the cylinder, unchanged. No cylinder is split: a straight cylinder cut in
   two changes no descriptor.
4. Continuation and order are re-derived by whoever reads the result (describe() always does).

Coarsening twice changes nothing (test_coarsen.py): after a pass every cylinder is at least d_min (a merged radius
is at least its smallest member's, since chord ≤ path), and every segment but an axis's last already meets its
ratio alone, so it closes alone; the last stays alone at the axis's end. Volumes, and so subtree volumes and the
continuation, are kept. Inflation is outside that promise: inflating twice inflates twice.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from treesim import cylinders as cy
from treesim.describe import geometric_labels, subset

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


def scaled(res: Resolution, factor: float) -> Resolution:
    """The bracket: d_min × factor, the ratios as measured."""
    return Resolution(res.d_min * factor, res.ratio, res.count)


def target_ratio(res: Resolution, r: float) -> float:
    """The class's ratio; an empty class takes the nearest class that has one."""
    k = radius_class(r)
    filled = [j for j, v in enumerate(res.ratio) if math.isfinite(v)]
    return res.ratio[min(filled, key=lambda j: (abs(j - k), j))]


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


def _axes(c: cy.Cylinders) -> list[list[int]]:
    """Each continuation axis from its base, as cylinder indices (geometric labels)."""
    nxt = geometric_labels(c).nxt
    out = []
    for i in range(len(c)):
        if i == 0 or nxt[c.parent[i]] != i:
            chain = [i]
            while nxt[chain[-1]] >= 0:
                chain.append(int(nxt[chain[-1]]))
            out.append(chain)
    return out


def _merged(c: cy.Cylinders, members: list[int]) -> tuple[np.ndarray, float, float, float]:
    """The cylinder a segment would make: unit axis, length (the chord), radius and raw radius (volume kept)."""
    if len(members) == 1:
        i = members[0]
        return c.axis[i], float(c.length[i]), float(c.radius[i]), float(c.radius_raw[i])
    chord = c.tip[members[-1]] - c.start[members[0]]
    length = float(np.linalg.norm(chord))
    if length <= 0:
        return c.axis[members[0]], 0.0, math.inf, math.inf
    l = c.length[members]
    return (chord / length, length, math.sqrt(float((c.radius[members] ** 2 * l).sum()) / length),
            math.sqrt(float((c.radius_raw[members] ** 2 * l).sum()) / length))


def recut(c: cy.Cylinders, res: Resolution) -> cy.Cylinders:
    segments: list[tuple[list[int], tuple]] = []
    for chain in _axes(c):
        k = 0
        while k < len(chain):
            j = k
            while True:
                m = _merged(c, chain[k : j + 1])
                if j == len(chain) - 1 or m[1] >= target_ratio(res, m[3]) * m[3]:
                    break
                j += 1
            segments.append((chain[k : j + 1], m))
            k = j + 1
    segments.sort(key=lambda s: s[0][0])
    seg_of = np.empty(len(c), int)
    for s, (members, _) in enumerate(segments):
        seg_of[members] = s
    n = len(segments)
    start, axis = np.empty((n, 3)), np.empty((n, 3))
    length, radius, raw, parent = np.empty(n), np.empty(n), np.empty(n), np.empty(n, int)
    for s, (members, (a, l, r, rr)) in enumerate(segments):
        first = members[0]
        start[s], axis[s], length[s], radius[s], raw[s] = c.start[first], a, l, r, rr
        parent[s] = -1 if c.parent[first] < 0 else seg_of[c.parent[first]]
    out = cy.Cylinders(start, axis, length, radius, raw, parent)
    cy.check(out)
    return out


def coarsen(c: cy.Cylinders, res: Resolution, inflated: bool = False) -> cy.Cylinders:
    """A table at `res`'s resolution: (inflate,) prune at d_min, re-cut to the ratios (the module's docstring)."""
    if inflated:
        c = inflate(c)
    return recut(prune(c, res.d_min), res)
