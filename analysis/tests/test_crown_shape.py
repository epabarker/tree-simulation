"""Migration witnesses from the recovered pre-existing night2 instrument, before candidate measurement."""
import json
from pathlib import Path

import numpy as np
import pytest

from treesim.crown_shape import crown_shape
from treesim.cylinders import Cylinders


def synthetic_shape(kind):
    grid = np.linspace(-1, 1, 61)
    x, y = np.meshgrid(grid, grid)
    x, y = x.ravel(), y.ravel()
    inside = x*x + y*y <= 1
    x, y = x[inside], y[inside]
    radial = np.sqrt(x*x + y*y)
    z = np.ones(len(x)) if kind == 'flat' else 1 + np.sqrt(np.maximum(0, 1-radial*radial)) if kind == 'dome' else 2-radial
    tips = np.column_stack([x, y, z])
    length = np.linalg.norm(tips, axis=1)
    n = len(tips) + 1
    return Cylinders(np.zeros((n, 3)), np.vstack([[0, 0, 1], tips/length[:, None]]),
                     np.r_[0., length], np.full(n, .01), np.full(n, .01), np.r_[-1, np.zeros(n-1, int)])


@pytest.mark.parametrize('kind', ['flat', 'dome', 'cone'])
def test_recovered_instrument_matches_frozen_original_witnesses(kind):
    witness = json.loads((Path(__file__).with_name('fixtures') / 'crown-night2-witness.json').read_text())
    for key, expected in witness['values'][kind].items():
        got = crown_shape(synthetic_shape(kind), key)
        for field, value in expected.items():
            if value is None:
                assert np.isnan(got[field])
            else:
                assert got[field] == pytest.approx(value, abs=1e-12)


def test_dome_measure_is_scale_and_vertical_origin_invariant():
    c = synthetic_shape('dome')
    shifted = Cylinders(c.start*4 + [0, 0, 8], c.axis, c.length*4,
                        c.radius*4, c.radius_raw*4, c.parent)
    a, b = crown_shape(c, 'beech-1-150'), crown_shape(shifted, 'beech-1-150')
    for field in ('D', 'WH', 'shapeRatio'):
        assert a[field] == pytest.approx(b[field], abs=1e-12)


def test_crown_base_uses_subtree_reach_not_a_twig_or_leaf_proxy():
    from treesim.crown_base import limb_base_ratio
    # A 20-cell stem, a low short twig at 2, and a higher limb whose two pieces reach 11 cells.
    rows = {'birthId': [0, 1, 2, 3, 4], 'parentBirthId': [-1, 0, 0, 0, 3], 'order': [0, 0, 1, 1, 1],
            'x0': [0, 0, 0, 0, 6], 'y0': [0, 10, 2, 8, 8], 'z0': [0]*5,
            'x1': [0, 0, 2, 6, 11], 'y1': [10, 20, 2, 8, 8], 'z1': [0]*5}
    assert limb_base_ratio(rows) == pytest.approx(.4)
