"""coarsen() (gate c's degradation, coarsen.py) on synthetic trees with known answers: pruning, re-cutting, volume,
the bracket's inflation, and that coarsening twice changes nothing. No data needed.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import math

import numpy as np
import pytest
from test_describe import UP, Tree

from treesim import coarsen as co
from treesim import cylinders as cy

# A dataset-like resolution: d_min 2 cm, every class's cylinders ten radii long.
RES = co.Resolution(0.02, tuple([10.0] * (len(co.EDGES) - 1)), tuple([1] * (len(co.EDGES) - 1)))


def tree() -> cy.Cylinders:
    """A 4 m trunk of 0.1 m cylinders tapering 10 → 6 cm, a 2 m limb of 0.25 m metamers (3 → 1.6 cm) with a bend,
    and a twig of 12 mm on the limb (2.08 cm inflated)."""
    t = Tree()
    p = -1
    for k in range(40):
        p = t.add(p, UP, 0.1, 0.10 - 0.001 * k)
    limb = 20
    q = limb
    for k in range(8):
        q = t.add(q, [1, 0, 0.5 if k < 4 else 0.1], 0.25, 0.015 - 0.0006 * k)
    t.chain(q - 3, [0, 1, 0], 3, 0.25, 0.006)
    return t.table()


def volume(c):
    return float((np.pi * c.radius**2 * c.length).sum())


def test_prune_drops_every_cylinder_under_d_min_with_its_subtree():
    c = tree()
    out = co.prune(c, RES.d_min)
    assert np.all(2 * out.radius_raw[1:] >= RES.d_min)
    # The twig (12 mm) goes, and the limb's tip where it thins under 2 cm.
    assert len(out) == len(c) - 3 - sum(2 * (0.015 - 0.0006 * k) < 0.02 for k in range(8))


def test_recut_merges_to_the_ratio_and_keeps_volume():
    c = co.prune(tree(), RES.d_min)
    out = co.recut(c, RES)
    assert len(out) < len(c)
    assert volume(out) == pytest.approx(volume(c), rel=1e-12)
    trunk = cy.trunk(out)
    # Every trunk segment but the last is at least ten of its radii long, built from 0.1 m cylinders.
    for i in trunk[:-1]:
        assert out.length[i] >= 10 * out.radius_raw[i] - 1e-12
    assert out.start[0] == pytest.approx(c.start[0])
    assert cy.height(out) == pytest.approx(cy.height(c), abs=1e-9)


def test_a_cylinder_already_long_enough_is_kept_unchanged():
    t = Tree()
    t.chain(-1, UP, 3, 2.0, 0.05)
    c = t.table()
    out = co.recut(c, RES)
    for f in ("start", "axis", "length", "radius", "radius_raw", "parent"):
        assert np.array_equal(getattr(out, f), getattr(c, f))


def test_coarsening_twice_changes_nothing():
    once = co.coarsen(tree(), RES)
    twice = co.coarsen(once, RES)
    for f in ("start", "axis", "length", "radius", "radius_raw", "parent"):
        assert np.array_equal(getattr(once, f), getattr(twice, f)), f


def test_coarsening_twice_changes_nothing_on_a_branching_crown():
    rng = np.random.default_rng(3)
    t = Tree()
    p = t.chain(-1, UP, 20, 0.25, 0.08)
    tips = [p]
    for gen in range(4):  # a pipe-model crown: each tip forks twice, radius × 0.7 a generation
        new = []
        for q in tips:
            r = t.rows[q][4] * 0.7
            for _ in range(2):
                d = UP + rng.normal(0, 0.6, 3)
                new.append(t.chain(q, d, 6, 0.25, r))
        tips = new
    c = t.table()
    for factor in (0.5, 1.0, 2.0):
        res = co.scaled(RES, factor)
        once = co.coarsen(c, res)
        twice = co.coarsen(once, res)
        assert len(once) < len(c)
        for f in ("start", "axis", "length", "radius", "radius_raw", "parent"):
            assert np.array_equal(getattr(once, f), getattr(twice, f)), (factor, f)


def test_inflation_follows_demol_2022_at_its_measured_ends():
    f = co.inflation_factor(np.array([0.005, 0.025, 0.05, 0.10, 0.5]))
    assert f[0] == pytest.approx(1.73) and f[1] == pytest.approx(1.73)
    assert f[3] == pytest.approx(1.04) and f[4] == pytest.approx(1.04)
    assert 1.04 < f[2] < 1.73
    assert f[2] == pytest.approx(1.385)  # halfway in log d between 2.5 and 10 cm


def test_inflation_lets_thin_twigs_survive_pruning():
    c = tree()
    assert len(co.coarsen(c, RES, inflated=True)) >= len(co.coarsen(c, RES))
    assert len(co.prune(co.inflate(c), RES.d_min)) > len(co.prune(c, RES.d_min))


def test_resolution_reads_terminal_diameters_and_ratios_per_class():
    c = tree()
    res = co.resolution([c])
    kids = cy.children_of(c.parent)
    tips = [2 * c.radius_raw[i] for i in range(len(c)) if not kids[i]]
    assert res.d_min == pytest.approx(float(np.median(tips)))
    k = co.radius_class(0.006)
    assert res.ratio[k] == pytest.approx(0.25 / 0.006)
    assert sum(res.count) == len(c)
    assert math.isnan(res.ratio[-1])
    assert co.target_ratio(res, 1.0) == res.ratio[max(j for j, v in enumerate(res.ratio) if math.isfinite(v))]
