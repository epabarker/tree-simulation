"""Gate c v2's rules (treesim/control.py, treesim/tiers.py), on synthetic numbers: the grid, the 90/90 rule and the
choice of d_min, NaN handling, the two tiers and the evaluation points. No data needed.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import math

import numpy as np
import pytest

from treesim import control as ct
from treesim import tiers as ti


def test_the_grid_is_the_percentiles_of_the_terminal_diameters():
    d = np.linspace(0.001, 0.1, 1000)
    g = ct.grid(d)
    assert list(g) == [1, 2, 5, 10, 20, 50]
    assert g[50] == pytest.approx(np.median(d))
    assert all(a < b for a, b in zip(list(g.values()), list(g.values())[1:]))


def test_share_within_drops_nan_originals_and_counts_nan_after_as_outside():
    assert ct.share_within([0.0, 0.0, math.nan, None], [0.05, 0.2, 0.0, 0.0], 0.1) == pytest.approx(0.5)
    assert ct.share_within([0.0, 0.0], [math.nan, 0.0], 0.1) == pytest.approx(0.5)
    assert math.isnan(ct.share_within([math.nan], [0.0], 0.1))
    assert math.isnan(ct.share_within([0.0], [0.0], math.nan))


def test_the_rule_needs_ninety_percent_of_descriptors_at_ninety_percent_of_trees_for_every_species():
    ten = {f"d{k}": 0.95 for k in range(10)}
    assert ct.rule_holds({"oak": ten})
    assert ct.rule_holds({"oak": {**ten, "d0": 0.5}})  # 9 of 10 neutral
    assert not ct.rule_holds({"oak": {**ten, "d0": 0.5, "d1": 0.89}})  # 8 of 10
    assert not ct.rule_holds({"oak": ten, "maple": {"a": 0.95, "b": math.nan}})  # NaN is not neutral
    assert not ct.rule_holds({"oak": {}})
    assert ct.neutral(0.9) and not ct.neutral(0.8999)


def test_d_min_is_the_largest_passing_point_even_on_a_non_monotone_curve():
    points = {1: 0.002, 2: 0.003, 5: 0.005, 10: 0.008, 20: 0.012, 50: 0.02}
    assert ct.choose({1: True, 2: True, 5: True, 10: False, 20: False, 50: False}, points) == 0.005
    assert ct.choose({1: True, 2: False, 5: True, 10: False, 20: False, 50: False}, points) == 0.005
    assert ct.choose({p: False for p in points}, points) is None


def _values(fine, versions, seeds=20, trees=3):
    """Every seed alike: each version's trees at fine + the given offset."""
    return {s: {ti.FINE: [fine] * trees, **{v: [fine + off] * trees for v, off in versions.items()}}
            for s in range(1, seeds + 1)}


def test_tier_a_is_the_shift_from_fine_at_every_point_and_inflated():
    pts = ["dmin", "p20", "2dmin"]
    ok = _values(1.0, {"dmin": 0.05, "p20": 0.08, "2dmin": 0.09, "inflated": 0.0})
    assert ti.assign(ok, pts, 0.1, control_neutral=False) == "A"
    far = _values(1.0, {"dmin": 0.05, "p20": 0.08, "2dmin": 0.2, "inflated": 0.0})
    assert not ti.tier_a(far, pts, 0.1)
    infl = _values(1.0, {"dmin": 0.0, "p20": 0.0, "2dmin": 0.0, "inflated": 0.3})
    assert not ti.tier_a(infl, pts, 0.1)


def test_tier_b_is_stability_from_d_min_and_needs_a_neutral_control():
    pts = ["dmin", "2dmin"]
    v = _values(1.0, {"dmin": 0.5, "2dmin": 0.55, "inflated": 0.45})
    assert not ti.tier_a(v, pts, 0.1)
    assert ti.assign(v, pts, 0.1, control_neutral=True) == "B"
    assert ti.assign(v, pts, 0.1, control_neutral=False) == "held out"
    drift = _values(1.0, {"dmin": 0.5, "2dmin": 0.7, "inflated": 0.5})
    assert ti.assign(drift, pts, 0.1, control_neutral=True) == "held out"


def test_the_seed_statistic_is_the_median_of_signed_differences_then_its_size():
    # Trees shift +0.2, −0.2, +0.05: the median of signed shifts is 0.05 (within 0.1); the median of |shift| is 0.2.
    v = {s: {ti.FINE: [0.0, 0.0, 0.0], "dmin": [0.2, -0.2, 0.05], "inflated": [0.0] * 3} for s in range(1, 21)}
    assert ti.seeds_within(v, "dmin", ti.FINE, 0.1) == 20


def test_fifteen_of_twenty_seeds_and_failing_seeds():
    v = _values(1.0, {"dmin": 0.0, "inflated": 0.0})
    for s in range(1, 6):
        v[s]["dmin"] = [1.5] * 3  # five seeds out
    assert ti.seeds_within(v, "dmin", ti.FINE, 0.1) == 15 and ti.tier_a(v, ["dmin"], 0.1)
    v[6]["dmin"] = [1.0, math.nan, 1.0]  # a NaN fails the seed
    v[7] = {ti.FINE: [], "dmin": [], "inflated": []}  # a seed with no live tree fails
    assert ti.seeds_within(v, "dmin", ti.FINE, 0.1) == 13 and not ti.tier_a(v, ["dmin"], 0.1)


def test_evaluation_points_span_d_min_to_twice_d_min_with_the_grid_inside():
    grid = {1: 0.004, 2: 0.006, 5: 0.009, 10: 0.012, 20: 0.02, 50: 0.03}
    assert ti.evaluation_points(grid, 0.006) == [("dmin", 0.006), ("p5", 0.009), ("2dmin", 0.012)]
    assert ti.evaluation_points(grid, 0.03) == [("dmin", 0.03), ("2dmin", 0.06)]
