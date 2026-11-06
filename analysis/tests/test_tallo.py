"""Level 0's targets (analysis/treesim/tallo.py): the quantile regression, z, and the committed targets file."""

from __future__ import annotations

import numpy as np
import pytest

from treesim import tallo


def test_quantreg_recovers_known_quantiles():
    rng = np.random.default_rng(1)
    lnd = rng.uniform(1, 4, 4000)
    y = 0.5 + 0.7 * lnd + rng.normal(0, 0.2, len(lnd))
    x = tallo.design(lnd, 1)
    for tau, z in ((0.1, -1.2816), (0.5, 0.0), (0.9, 1.2816)):
        b = tallo.quantreg(x, y, tau)
        assert b[1] == pytest.approx(0.7, abs=0.03)
        assert b[0] == pytest.approx(0.5 + 0.2 * z, abs=0.06)


def curve(band="own"):
    c = {"support": [5.0, 50.0], "band": band, "coef": {"0.1": [-0.2, 1.0], "0.5": [0.0, 1.0], "0.9": [0.3, 1.0]}}
    if band == "borrowed":
        c["coef"] = {"0.5": [0.0, 1.0]}
        c["borrowed"] = {"r10": -0.2, "r90": 0.3}
    return c


@pytest.mark.parametrize("band", ["own", "borrowed"])
def test_z_is_zero_at_the_median_and_one_at_the_curves(band):
    c = curve(band)
    d = 20.0
    assert tallo.z_score(c, d, d) == pytest.approx(0.0)
    assert tallo.z_score(c, d, d * np.exp(0.3)) == pytest.approx(1.0)
    assert tallo.z_score(c, d, d * np.exp(-0.2)) == pytest.approx(-1.0)
    assert tallo.z_score(c, 4.0, 4.0) is None and tallo.z_score(c, 60.0, 60.0) is None


def test_crossing_curves_are_rearranged():
    c = curve()
    c["coef"]["0.9"] = [-0.5, 1.0]  # below the median everywhere
    q = tallo.predict(c, np.array([10.0, 30.0]))
    assert np.all(np.diff(q, axis=1) >= 0)


def test_committed_targets_hold_the_registered_rule():
    if not tallo.TARGETS.exists():
        pytest.skip("no targets file")
    t = tallo.load_targets()
    assert t["meta"]["version"] == tallo.VERSION
    assert set(t["species"]) == set(tallo.TAXA)
    thin = t["meta"]["thin"]
    for s, e in t["species"].items():
        # v2: thin and ungated are read from REGION's height rows, never named.
        n = e["n_H_region"]
        assert (s in thin["species"]) == (n < tallo.SMALL_N) and (s in thin["ungated"]) == (n < tallo.UNGATED_N)
        assert e["gated"] == (s not in tallo.REFERENCE_ONLY and n >= tallo.UNGATED_N)
        assert (e["control"] is None) == (n < tallo.UNGATED_N)
        for trait in tallo.TRAITS:
            if "support" not in e[trait]:
                assert e[trait]["band"] == "none" and not e["gated"]
                continue
            assert e[trait]["band"] == ("borrowed" if s in thin["species"] else "own")
            lo, hi = e[trait]["support"]
            q = tallo.predict(e[trait], np.exp(np.linspace(np.log(lo), np.log(hi), 20)))
            assert np.all(np.diff(q, axis=1) >= 0)
        if e["control"] is not None:
            assert 0 < e["control"]["T"] < 3
    assert set(thin["pool"]) <= set(tallo.BROADLEAVES)
