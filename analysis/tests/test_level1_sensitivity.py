"""The Level 1 sensitivity experiment's grid and rules (analysis/experiments/level1_sensitivity.py), on the registration
and on synthetic numbers. Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import importlib.util
import math
from pathlib import Path

import numpy as np

from treesim import level1 as l1

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("sens", ROOT / "analysis" / "experiments" / "level1_sensitivity.py")
sens = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sens)

REG = l1.load("beech", check=False)


def test_eighteen_knobs_in_two_families():
    kn = sens.knobs(REG)
    assert len(kn) == 18
    assert [p["family"] for p in kn].count("form") == 10
    assert [p["family"] for p in kn].count("physiology") == 8
    assert {p["path"] for p in kn if p["family"] == "physiology"} == {*REG["frozen_level0"], "r3.c"}
    assert next(p for p in kn if p["path"] == "r3.c")["log"]


def test_hand_round_trips_through_the_fits_encoding():
    """decode(encode(hand)) is the hand for every knob, postureSetPoint 34.32 included: the hand condition is
    the v3 hand verbatim and its grid sits at u_h."""
    hand = sens.hand_of(REG)
    assert hand["r2.levels.1.postureSetPoint"] == 34.32
    for p in sens.knobs(REG):
        v = hand[p["path"]]
        assert sens.value_at(p, sens.u_of(p, v)) == v, p["path"]


def test_grid_five_points_hand_in_the_middle_log_geometric():
    hand = sens.hand_of(REG)
    for p in sens.knobs(REG):
        g = sens.grid(p, hand[p["path"]])
        assert list(g) == list(sens.POINTS)
        us = [g[k][0] for k in sens.POINTS]
        vs = [g[k][1] for k in sens.POINTS]
        assert us[0] == 0 and us[-1] == 1 and us == sorted(us)
        assert vs == sorted(vs) and len(set(vs)) == 5
        assert vs[2] == hand[p["path"]]
        assert math.isclose(vs[0], p["lo"], rel_tol=1e-3) and math.isclose(vs[-1], p["hi"], rel_tol=1e-3)
        if p.get("log"):
            assert math.isclose(vs[1], math.sqrt(vs[0] * vs[2]), rel_tol=2e-3)
        else:
            assert math.isclose(vs[1], (vs[0] + vs[2]) / 2, rel_tol=2e-3, abs_tol=1e-6)


def test_73_distinct_conditions_each_moving_one_knob():
    conds = sens.conditions(REG)
    hand = sens.hand_of(REG)
    assert len(conds) == 73 and len({c["id"] for c in conds}) == 73
    assert conds[0]["assign"] == hand
    for c in conds[1:]:
        diff = [k for k in hand if c["assign"][k] != hand[k]]
        assert diff == [c["knob"]]


def test_toward_and_fraction():
    assert sens.toward(1.0, 0.4) == 0.6
    assert sens.toward(-1.0, -0.4) == 0.6
    assert sens.toward(1.0, 1.5) == -0.5
    assert sens.fraction(-2.0, 0.5) == 1.25  # overshoot: crosses the target
    assert math.isnan(sens.toward(0.0, 0.3))
    assert math.isnan(sens.fraction(1.0, math.nan))
    assert math.isnan(sens.toward(None, 0.3))


def test_bracket_walks_out_from_the_hand():
    f = {"lo": 0.2, "lo_mid": 0.1, "hand": 0.0, "hi_mid": 0.6, "hi": 1.4}
    assert sens.bracket(f, "hi") == ("hi_mid", "hi")
    f["hi_mid"] = 1.1
    assert sens.bracket(f, "hi") == ("hand", "hi_mid")
    assert sens.bracket(f, "lo") is None
    assert sens.bracket({"lo": 1.2, "lo_mid": math.nan, "hand": 0.0}, "lo") == ("lo_mid", "lo")


def test_remaining_gap_and_verdicts():
    assert sens.remaining_gap(-1.2, 0.5) == 0.7
    assert sens.remaining_gap(1.0, 1.4) == 0.0
    assert sens.remaining_gap(1.0, -0.3) == 1.0
    assert sens.remaining_gap(1.0, math.nan) == 1.0
    assert sens.reach_verdict(True, 2.0, 0.0) == "at target within noise"
    assert sens.reach_verdict(False, 0.5, 0.0) == "unreachable by single-knob moves"
    assert sens.reach_verdict(False, 0.8, 2.5) == "reachable at cost"
    assert sens.reach_verdict(False, 0.8, 1.0) == "reachable"
    un = "unreachable by single-knob moves"
    assert sens.three_source(un, None, None) == "not reached by the knobs tested; joint moves untested"
    assert sens.three_source(un, 0.3, None) == "needs a rule rather than a knob"
    assert sens.three_source(un, None, 0.4) == "needs a rule rather than a knob"
    assert sens.three_source(un, 0.3, 0.7) == "reached jointly (pilot v2 envelope)"
    assert sens.three_source(un, 0.6, 0.1) == "reached jointly (pair check)"
    assert sens.three_source("reachable", None, None) == "reached by a single knob (reachable)"


def test_pair_conditions_rule():
    kn = {}
    for path, lo, hi in (("a", 0.0, 1.0), ("b", 0.0, 10.0), ("c", 1.0, 2.0), ("d", 0.0, 1.0)):
        p = {"path": path, "lo": lo, "hi": hi}
        kn[path] = {**p, "points": {lab: (u, sens.value_at(p, u)) for lab, u in
                                    zip(sens.POINTS, (0.0, 0.25, 0.5, 0.75, 1.0))}}
    moves = {"x": {"a": {"hi": 0.9, "hi_mid": 0.4}, "b": {"lo": 0.5}, "c": {"hi": 0.7}, "d": {"lo": -0.2}},
             "y": {"a": {"lo": 0.1}}, "w": {}}
    conds = sens.pair_conditions(["x", "y", "w"], moves, kn, {"a": 0.5, "b": 5.0, "c": 1.5, "d": 0.5})
    xs = [c for c in conds if "x" in c["for"]]
    assert len(xs) == 9  # top three movers a (0.9), c (0.7), b (0.5); d moves away
    assert {(c["a"], c["b"]) for c in xs} == {("a", "c"), ("a", "b"), ("c", "b")}
    ac = {(c["a_level"], c["b_level"]): (c["a_value"], c["b_value"]) for c in xs if (c["a"], c["b"]) == ("a", "c")}
    assert ac == {("best", "best"): (1.0, 2.0), ("best", "half"): (1.0, 1.75), ("half", "best"): (0.75, 2.0)}
    assert all(c["assign"][c["a"]] == c["a_value"] and c["assign"]["d"] == 0.5 for c in xs)
    assert not [c for c in conds if "y" in c["for"]]  # one mover: no pair


def test_boot_index_is_paired_and_fixed():
    a, b = sens.boot_index(10), sens.boot_index(10)
    assert a.shape == (sens.BOOT_N, 10) and np.array_equal(a, b)
