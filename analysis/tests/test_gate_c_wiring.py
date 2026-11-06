"""Gate c v3.1's wiring (analysis/experiments/phase1_degradation.py) reproduces the registered tier rules
(treesim/tiers.py, the JSON's rules.tier_a / tier_b / assign) on synthetic numbers and on a synthetic tree through the
real describe() and coarsen(), before any simulated tree is run. No data needed.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import importlib.util
import json
import math
from pathlib import Path

import pytest
from test_coarsen import tree

from treesim import tiers as ti
from treesim import tolerance as tol
from treesim.describe import describe
from treesim.simtree import SimTree

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("p1", ROOT / "analysis" / "experiments" / "phase1_degradation.py")
p1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p1)

POINTS = ["dmin", "upper"]
VERSIONS = [ti.FINE, *POINTS, ti.INFLATED]
SEEDS = range(1, 21)


def row(key: str, verdict: str = "clear", tolerance: float = 0.1) -> dict:
    return {"species": "x", "descriptor": key, "tolerance": tolerance, "noise_ratio": 0.2, "noise_verdict": verdict}


def described(by_version: dict, fail_seeds: int = 0, trees: int = 4) -> dict:
    """seed → trees → version → {k: value}; the first `fail_seeds` seeds get `by_version`'s 'fail' values instead."""
    out = {}
    for n, seed in enumerate(SEEDS):
        use = by_version["fail"] if n < fail_seeds else by_version["ok"]
        out[seed] = [{v: {"k": use[v]} for v in VERSIONS} for _ in range(trees)]
    return out


FLAT = {v: 0.0 for v in VERSIONS}
STEP = {ti.FINE: 0.0, "dmin": 1.0, "upper": 1.0, ti.INFLATED: 1.0}  # coarsening moves the value once, then it is stable


def run(by_version, shares=1.0, fail_seeds=0, tolerance=0.1, key="k"):
    d = described(by_version, fail_seeds)
    return p1.evaluate("x", [row(key, tolerance=tolerance)], d, POINTS, {key: shares}, [key])[0]


def test_tier_a_when_every_point_stays_within_tolerance_of_the_fine_value():
    r = run({"ok": FLAT})
    assert r["tier"] == "A" and r["verdict"] == "tier A"


def test_tier_b_when_the_value_moves_once_and_then_holds_and_the_control_is_neutral():
    r = run({"ok": STEP}, shares=0.95)
    assert r["tier"] == "B" and r["verdict"] == "tier B"
    assert r["A:dmin"] == 0 and r["B:upper"] == 20  # tier A fails at d_min; tier B compares with d_min


def test_a_control_not_neutral_at_d_min_leaves_only_tier_a():
    r = run({"ok": STEP}, shares=0.85)
    assert r["tier"] == "–" and r["verdict"] == "held out (resolution-sensitive)" and "not neutral" in r["reason"]
    assert run({"ok": FLAT}, shares=0.85)["tier"] == "A"  # tier A does not read the control


def test_a_value_that_keeps_moving_across_the_bracket_is_held_out_under_both_tiers():
    drift = {ti.FINE: 0.0, "dmin": 1.0, "upper": 2.0, ti.INFLATED: 1.0}
    r = run({"ok": drift}, shares=1.0)
    assert r["tier"] == "–" and r["B:upper"] == 0 and "B fails (upper" in r["reason"]


def test_inflation_is_gated_in_both_tiers():
    infl = {**STEP, ti.INFLATED: 3.0}  # stable across the bracket, but inflation moves it away from d_min
    assert run({"ok": infl}, shares=1.0)["tier"] == "–"
    infl_a = {**FLAT, ti.INFLATED: 0.5}  # tier A: inflation moves it more than the tolerance
    assert run({"ok": infl_a})["tier"] == "–"


def test_fifteen_seeds_pass_and_fourteen_do_not():
    bad = {"ok": FLAT, "fail": {**FLAT, "upper": 1.0}}
    assert run(bad, fail_seeds=5)["tier"] == "A"
    assert run(bad, fail_seeds=6)["tier"] == "–"


def test_a_nan_on_one_tree_fails_the_seed_and_an_absent_tree_does_too():
    nan = {"ok": FLAT, "fail": {**FLAT, "dmin": math.nan}}
    assert run(nan, fail_seeds=5)["tier"] == "A"
    assert run(nan, fail_seeds=6)["tier"] == "–"
    d = described({"ok": FLAT})
    for seed in range(1, 7):
        d[seed] = []  # seeds with no live measured tree
    assert p1.evaluate("x", [row("k")], d, POINTS, {"k": 1.0}, ["k"])[0]["tier"] == "–"


def test_standings_before_the_tiers_pass_through_untouched():
    for verdict in ("report-only", "excluded (H1)", "held out (noise)", "held out (too few trees)", "not measured"):
        r = p1.evaluate("x", [row("k", verdict)], described({"ok": FLAT}), POINTS, {}, ["k"])[0]
        assert r["tier"] == "–" and r["verdict"] == verdict


def test_amendment_e_stops_below_half_of_the_floor_clear_descriptors():
    rows = ([{"floor": "clear", "tier": "A"} for _ in range(10)] + [{"floor": "clear", "tier": "–"} for _ in range(11)]
            + [{"floor": "report-only", "tier": "–"}])
    assert p1.amendment_e(rows) == (21, 10, True)  # beech: 21 clear, stops below 11
    rows[10]["tier"] = "B"
    assert p1.amendment_e(rows) == (21, 11, False)


def test_size_match_takes_the_first_season_at_which_the_median_reaches_the_reference():
    by = {50: [0.20, 0.25, 0.30], 60: [0.29, 0.30, 0.31], 70: [0.40, 0.40, 0.40]}
    assert p1.match_season(by, 0.29, (50, 60, 70)) == 60  # 0.30 median at 60; 0.25 at 50
    assert p1.match_season(by, 0.5, (50, 60, 70)) is None
    assert p1.match_season({50: [math.nan, 0.3, 0.4]}, 0.35, (50,)) == 50  # NaN leaves the median
    assert p1.match_season({50: []}, 0.1, (50,)) is None


def test_the_registered_file_is_v3_1_and_the_wiring_reads_its_layout():
    t = json.loads(tol.TOLERANCES.read_text())
    assert t["version"] == 3.1 and t["rules"]["pass_seeds"] == ti.PASS_SEEDS
    for dataset in ("wytham", "biodiv"):
        r = t["resolution"][dataset]
        grid = {int(k): v for k, v in r["grid"].items()}
        pts = ti.evaluation_points(grid, r["d_min"], r["upper_end"]["d"])
        assert [n for n, _ in pts][0] == "dmin" and pts[-1][0] == "upper" and pts[0][1] < pts[-1][1]
    assert {c["species"] for c in t["candidates"]} == {"oak", "maple", "beech"}


def test_a_synthetic_tree_goes_through_the_real_describe_and_coarsen():
    c = tree()
    st = SimTree(cylinders=c, labels=None, leaf=None, pipe=None, meta={"trial": "stand", "alive": True}, form={})
    points = [("dmin", 0.02), ("upper", 0.03)]
    out = p1._describe_tree((st, points, 0.02))
    assert set(out) == set(VERSIONS)
    ref = describe(c)
    assert all(_same(out[ti.FINE][k], ref[k]) for k in ref)
    # Nothing under d_min = 1 mm: coarsening prunes nothing, so every version equals the fine one.
    quiet = p1._describe_tree((st, [("dmin", 0.001), ("upper", 0.002)], 0.001))
    assert all(_same(quiet["dmin"][k], ref[k]) and _same(quiet["upper"][k], ref[k]) for k in ref)
    # The twig (12 mm) and the limb's thin tip go at 2 cm: the crown changes.
    assert any(not _same(out["dmin"][k], ref[k]) for k in ref)
    # The lone tree is described fine only (reported, never gated).
    lone = SimTree(cylinders=c, labels=None, leaf=None, pipe=None, meta={"trial": "lone", "alive": True}, form={})
    assert set(p1._describe_tree((lone, points, 0.02))) == {ti.FINE}


def _same(a, b) -> bool:
    if isinstance(a, float) and isinstance(b, float) and math.isnan(a) and math.isnan(b):
        return True
    return a == pytest.approx(b, rel=1e-12, abs=1e-12) if isinstance(a, (int, float)) else a == b
