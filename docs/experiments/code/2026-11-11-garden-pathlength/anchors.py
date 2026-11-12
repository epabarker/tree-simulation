"""The crown-width anchors of the crown-extent research note (docs/research/2026-11-11-crown-extent-
and-canopy-density.md, section 2.1), as functions of DBH in cm. Crown DIAMETER in metres.

- pretzsch95: Pretzsch et al. 2015's open-grown upper edge, 2 * exp(a) * d^alpha (the 95%
  quantile; coefficients from docs/research/2026-11-08-crown-rounding.md section 3). The field
  maple is not in the paper: the sycamore's line stands in, flagged where printed. No holly.
- hemery: Hemery et al. 2005's woodland mean, K = a + b * d (d in m); most reliable at 20-50 cm.
- tallo: the forest-grown quantile curves in analysis/fit/sources/tallo-level0-curves.csv (crown
  radius; doubled here), interpolated in DBH; None outside the curve's support.
"""

import csv
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PRETZSCH = {
    "oak": (-1.437, 0.816),
    "beech": (0.011, 0.471),
    "hornbeam": (-0.174, 0.547),
    "maple": (-0.445, 0.534),  # sycamore's, a stand-in
    "birch": (-0.969, 0.648),
}
HEMERY = {"oak": (1.717, 15.62), "beech": (1.133, 15.23), "maple": (0.692, 18.68), "birch": (0.975, 16.15)}
STAND_IN = {"maple": "sycamore's line"}


def pretzsch95(species, d):
    if species not in PRETZSCH:
        return None
    a, alpha = PRETZSCH[species]
    return 2 * math.exp(a) * d**alpha


def hemery(species, d):
    if species not in HEMERY:
        return None
    a, b = HEMERY[species]
    return a + b * d / 100


_curves = {}


def tallo(species, d):
    """(q10, q50, q90) of the crown diameter at DBH d, or None outside the support."""
    if not _curves:
        with open(ROOT / "analysis/fit/sources/tallo-level0-curves.csv") as f:
            for r in csv.DictReader(f):
                if r["trait"] == "CR":
                    _curves.setdefault(r["species"], []).append(
                        (float(r["dbh_cm"]), float(r["q10"]), float(r["q50"]), float(r["q90"]))
                    )
    c = _curves.get(species)
    if not c or d < c[0][0] or d > c[-1][0]:
        return None
    for lo, hi in zip(c, c[1:]):
        if lo[0] <= d <= hi[0]:
            f = (d - lo[0]) / (hi[0] - lo[0]) if hi[0] > lo[0] else 0.0
            return tuple(2 * (lo[k] + f * (hi[k] - lo[k])) for k in (1, 2, 3))
    return None


def support(species):
    tallo(species, 0)
    c = _curves.get(species)
    return (c[0][0], c[-1][0]) if c else None
