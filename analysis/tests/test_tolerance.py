"""Gate c's pre-registration (treesim/tolerance.py): the size-detrended between-tree SD, its χ² interval, the minimum
sample, and the gate's refusal to run on changed code. No data needed.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import importlib.util
import math

import numpy as np
import pytest
from scipy import stats

from treesim import tolerance as tol
from treesim.fetch import ROOT


def rows(dbh, values):
    return [{"dbh_measured": d, "d": {"x": v}} for d, v in zip(dbh, values)]


def test_between_tree_sd_is_the_residual_sd_on_log_dbh():
    rng = np.random.default_rng(1)
    dbh = np.exp(rng.uniform(np.log(0.1), np.log(1.0), 15))
    noise = rng.normal(0, 0.05, 15)
    y = 0.3 + 0.2 * np.log(dbh) + noise
    bt = tol.between_tree(rows(dbh, y), "x")
    fit = np.polyfit(np.log(dbh), y, 1)
    res = y - np.polyval(fit, np.log(dbh))
    assert bt["n"] == 15
    assert bt["slope"] == pytest.approx(fit[0])
    assert bt["sd"] == pytest.approx(math.sqrt((res**2).sum() / 13))
    assert bt["sd_lo"] == pytest.approx(bt["sd"] * math.sqrt(13 / stats.chi2.ppf(0.975, 13)))
    assert 0.70 < bt["sd_lo"] / bt["sd"] < 0.75 and 1.55 < bt["sd_hi"] / bt["sd"] < 1.65


def test_a_size_trend_alone_leaves_no_between_tree_sd():
    dbh = np.linspace(0.1, 1.0, 12)
    bt = tol.between_tree(rows(dbh, 2.0 * np.log(dbh)), "x")
    assert bt["sd"] == pytest.approx(0.0, abs=1e-12)


def test_too_few_finite_trees_leave_the_tolerance_undefined():
    dbh = np.linspace(0.1, 1.0, 12)
    y = list(np.linspace(0, 1, 12))
    y[:3] = [math.nan, None, math.nan]
    bt = tol.between_tree(rows(dbh, y), "x")
    assert bt["n"] == 9 < tol.MIN_TREES and math.isnan(bt["sd"])
    r = rows(dbh, np.linspace(0, 1, 12))
    r[0]["dbh_measured"] = math.nan  # no measured DBH (R2): the tree leaves the fit
    assert tol.between_tree(r, "x")["n"] == 11


def test_the_gate_refuses_to_run_when_hashed_code_has_changed():
    spec = importlib.util.spec_from_file_location("p1", ROOT / "analysis" / "experiments" / "phase1_degradation.py")
    p1 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(p1)
    p1._check_hashes({"hashes": tol.file_hashes()})
    with pytest.raises(SystemExit, match="describe.py"):
        p1._check_hashes({"hashes": {**tol.file_hashes(), "analysis/treesim/describe.py": "0" * 64}})


def test_v2_hashes_every_file_the_gate_reads():
    for f in ("analysis/treesim/control.py", "analysis/treesim/tiers.py", "analysis/treesim/simtree.py",
              "analysis/treesim/fetch.py", "analysis/treesim/tolerance.py", "cli/dump-trees.ts",
              "analysis/fit/sources/reference-manifest.csv"):
        assert f in tol.file_hashes()


def test_v2_verdicts_report_only_before_h1_before_noise():
    assert tol._verdict("beech", "biodiv", "ldSlope", 53, 0.1) == "report-only"
    assert tol._verdict("oak", "wytham", "junctionDelta", 34, 0.1) == "report-only"
    assert tol._verdict("oak", "wytham", "taper", 34, 0.1) == "excluded (H1)"
    assert tol._verdict("beech", "biodiv", "taper", 53, 0.6) == "held out (noise)"
    assert tol._verdict("beech", "biodiv", "taper", 9, 0.1) == "held out (too few trees)"
    assert tol._verdict("beech", "biodiv", "p0", 53, math.nan) == "not measured"
    assert tol._verdict("beech", "biodiv", "p0", 53, 0.49) == "clear"
