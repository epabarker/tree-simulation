"""Level 1's rules (treesim/level1.py) on synthetic numbers, and its describe path against gate c's own values.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import csv
import json
import math
import sys
import warnings
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import pytest

from treesim import fit_level1 as f1
from treesim import level1 as l1

ROOT = Path(__file__).resolve().parents[2]
GATE_C = ROOT / "runs" / "gate-c"


def reg_of(fitted, held_out=(), real=None, at=0.3, weights=None):
    real = real or {k: {"median": 0.0, "sd": 1.0, "slope": 0.0} for k in [*fitted, *held_out]}
    names = [*fitted, *held_out]
    return {"fitted": list(fitted), "held_out": list(held_out), "real": real, "size_match": {"dbh": at},
            "descriptors": {k: "A" for k in names}, "location_weights": weights or {k: 1.0 for k in names}}


def test_correlation_pairwise_complete_and_symmetric():
    rng = np.random.default_rng(0)
    a = rng.normal(size=40)
    x = np.column_stack([a, 2 * a + rng.normal(0, 0.1, 40), rng.normal(size=40)])
    x[3, 1] = np.nan
    r, n = l1.correlation(x)
    assert np.allclose(r, r.T) and np.all(np.diag(r) == 1.0)
    assert n[0, 1] == n[1, 0] == 39 and n[0, 2] == 40 and n[1, 1] == 39
    assert r[0, 1] > 0.99 and abs(r[0, 2]) < 0.4
    ok = np.isfinite(x[:, 1])
    assert math.isclose(r[0, 1], np.corrcoef(x[ok, 0], x[ok, 1])[0, 1])


def test_r_critical_and_weights_zero_the_noise():
    assert math.isclose(l1.r_critical(53), 0.2706, abs_tol=5e-4)
    r = np.array([[1.0, 0.8, 0.2], [0.8, 1.0, -0.3], [0.2, -0.3, 1.0]])
    w = l1.location_weights(r, ["a", "b", "c"], 0.27)
    assert math.isclose(w["a"], 1 / 1.8)  # 0.2 is under the critical value: zeroed
    assert math.isclose(w["b"], 1 / 2.1) and math.isclose(w["c"], 1 / 1.3)
    assert l1.location_weights(np.eye(2), ["a", "b"], 0.27) == {"a": 1.0, "b": 1.0}


def test_clusters_canonical_and_the_draw_takes_whole_clusters():
    names = ["a", "b", "c", "d", "e", "f"]
    r = np.eye(6)
    r[0, 3] = r[3, 0] = 0.9   # a–d one cluster
    r[1, 4] = r[4, 1] = -0.7  # b–e one cluster (|r|)
    r[2, 5] = r[5, 2] = 0.3   # c, f apart
    cl = l1.clusters(r, names)
    assert cl == [["a", "d"], ["b", "e"], ["c"], ["f"]]
    held, order, taken = l1.cluster_held_out(cl, seed=1)
    assert sorted(order) == [0, 1, 2, 3] and len(held) >= 2  # round(6/3) = 2
    assert held == sorted(m for i in order[:taken] for m in cl[i])
    for c in cl:  # a cluster is never split
        assert set(c) <= set(held) or not set(c) & set(held)
    assert l1.cluster_held_out(cl, seed=1) == (held, order, taken)


def test_search_seeds_fixed_and_disjoint():
    s = l1.search_seeds()
    d5, d10 = l1.noise_draws()
    assert s == l1.search_seeds() and len(s) == l1.SEARCH_COUNT == len(set(s))
    assert not set(s) & ({x for d in d5 + d10 for x in d} | set(l1.GALLERY_SEEDS) | set(l1.GATE_SEEDS)
                         | set(l1.FINAL_SEEDS))
    reg = {"loss": {"seeds_per_candidate": 5}, "seeds": {"search": {"list": s}}}
    assert l1.fit_seeds(reg) == s[:5]
    with pytest.raises(SystemExit, match="seeds_per_candidate"):
        l1.fit_seeds({"loss": {"seeds_per_candidate": None}, "seeds": {"search": {"list": s}}})


def test_distribution_detrends_to_the_matched_dbh():
    rng = np.random.default_rng(0)
    d = np.exp(rng.uniform(math.log(0.1), math.log(0.7), 60))
    y = 2.0 + 0.5 * np.log(d) + rng.normal(0, 0.1, 60)
    r = l1.distribution(list(y), list(d), 0.3)
    assert r["n"] == 60 and abs(r["slope"] - 0.5) < 0.1
    assert abs(r["median"] - (2.0 + 0.5 * math.log(0.3))) < 0.05
    assert 0.07 < r["sd"] < 0.13 and r["sd_lo95"] < r["sd"] < r["sd_hi95"]
    assert l1.detrend(1.0, 0.3, 0.5, 0.3) == 1.0
    assert math.isclose(l1.detrend(1.0, 0.3 * math.e, 0.5, 0.3), 0.5)
    assert math.isnan(l1.distribution([1.0] * 5, [0.3] * 5, 0.3)["sd"])  # fewer than MIN_TREES


def test_size_match_first_season_median_over_seeds():
    sizes = [{"season": 50, "trees": [{"alive": True, "dbh": 0.2}, {"alive": False}]},
             {"season": 60, "trees": [{"alive": True, "dbh": 0.28}, {"alive": True, "dbh": 0.32}]}]
    assert l1.seed_dbh(sizes) == pytest.approx({50: 0.2, 60: 0.30})
    per_seed = [{50: 0.25, 60: 0.29, 70: 0.31}, {50: 0.26, 60: 0.30, 70: 0.33}, {50: 0.24, 60: 0.292, 70: 0.3}]
    assert l1.match_season(per_seed, 0.291) == 60
    assert l1.match_season([{50: 0.4}], 0.291) == 50  # at the first season: a match (flagged by the fit)
    assert l1.match_season([{50: 0.1, 150: 0.2}], 0.291) is None


def trees_of(k, values, dbh=0.3):
    return [{"dbh": dbh, k: v} for v in values]


def test_score_z_and_spread():
    real = {"median": 1.0, "sd": 0.5, "slope": 0.0}
    vals = list(np.linspace(0.0, 2.0, 20))
    s = l1.score(vals, real)
    assert s["n"] == 20 and math.isclose(s["z"], 0.0, abs_tol=1e-12)
    assert math.isclose(s["s"], math.log(np.std(vals, ddof=1) / 0.5) / math.log(2))
    assert math.isnan(l1.score(vals[:9], real)["z"])  # fewer than MIN_TREES


def test_contributions_location_only_weighted_and_missing():
    reg = reg_of(["p0", "p2", "forkHeight"], weights={"p0": 0.5, "p2": 0.25, "forkHeight": 1.0})
    t = {"l1.p0.z": 2.0, "l1.p0.s": 1.0, "l1.p2.z": float("nan"), "l1.p2.s": 0.3, "l1.forkHeight.z": 1.0,
         "l1.forkHeight.s": 0.5}
    c = l1.level1_contributions(reg, t)
    assert c == {"l1.p0.loc": 2.0, "l1.p2.loc": 0.25 * l1.MISSING_PENALTY, "l1.forkHeight.loc": 1.0}  # no spread
    unmatched = l1.level1_contributions(reg, {"l1.season": None})
    assert unmatched == {"l1.p0.loc": 2.0, "l1.p2.loc": 1.0, "l1.forkHeight.loc": 4.0}


def test_traits_never_carry_held_out():
    reg = reg_of(["forkHeight"], held_out=["length0"])
    trees = [{"dbh": 0.3, "forkHeight": x, "length0": x} for x in np.linspace(0, 1, 12)]
    t = l1.level1_traits(reg, trees, 70, [])
    assert "l1.forkHeight.z" in t and not any("length0" in k for k in t)
    f1.assert_no_held_out(reg, {"traits": t})
    with pytest.raises(AssertionError):
        f1.assert_no_held_out(reg, {"l1.length0.z": 0.1})
    reg = reg_of(["forkHeight"], held_out=["widestAt"])
    rows = [{"trait:stand.widestAt": 0.4, "trait:lone.widestAt100": 0.5, "trait:stand.height": 80}]
    with pytest.raises(AssertionError):
        f1.assert_no_held_out(reg, rows)
    assert f1.held_out_key(reg, "trait:lone.widestAt100")
    kept = f1.without_held_out(reg, {"stand.widestAt": 0.4, "stand.height": 80, "lone.profile.3": 0.9})
    assert kept == {"stand.height": 80, "lone.profile.3": 0.9}


def test_seed_rule_and_spread_rule():
    reg = reg_of([], held_out=["a", "b"])
    assert l1.seed_passes(l1.seed_z(reg, [{"dbh": 0.3, "a": 1.5, "b": -1.9}], ["a", "b"]))
    assert not l1.seed_passes(l1.seed_z(reg, [{"dbh": 0.3, "a": 2.1, "b": 0.0}], ["a", "b"]))
    assert not l1.seed_passes({"a": float("nan")})
    assert l1.spread_passes({"a": 1.9, "b": 0.51}) and not l1.spread_passes({"a": 2.1})
    assert l1.spread_names(reg_of(["x"], held_out=["a", "b"])) == ["a", "b", "x"]  # v3: fitted and held out


def test_load_refuses_a_changed_file(tmp_path, monkeypatch):
    reg = {"hashes": {"analysis/treesim/level1.py": "0" * 64}}
    path = tmp_path / "level1-x.json"
    path.write_text(json.dumps(reg))
    monkeypatch.setattr(l1, "registration_path", lambda species: path)
    with pytest.raises(SystemExit, match="refusing"):
        l1.load("x")
    reg["hashes"] = l1.file_hashes(("analysis/treesim/level1.py",))
    path.write_text(json.dumps(reg))
    assert l1.load("x")["hashes"] == reg["hashes"]


#: Darwin's allowance against gate c's x86 values (the user, 2026-11-04); Linux stays exact.
DARWIN_ULPS = 2


def _same(a: float, b: float) -> bool:
    return (math.isnan(a) and math.isnan(b)) or a == b


def _ulps(a: float, b: float) -> float:
    """Distance between two values in units in the last place of `b` (inf if either is not finite)."""
    if math.isnan(a) or math.isnan(b) or math.isinf(a) or math.isinf(b):
        return math.inf
    return round(abs(a - b) / math.ulp(b), 3) if b != 0 else math.inf


def _gate_c_inflated(seed: int) -> dict[int, dict]:
    with (GATE_C / "sim-describe.csv").open() as f:
        return {int(r["tree"]): r for r in csv.DictReader(f)
                if r["species"] == "beech" and r["trial"] == "stand" and r["version"] == "inflated"
                and int(r["seed"]) == seed}


def _gate_c_fine(seed: int) -> dict[int, dict]:
    with (GATE_C / "sim-describe.csv").open() as f:
        return {int(r["tree"]): r for r in csv.DictReader(f)
                if r["species"] == "beech" and r["trial"] == "stand" and r["version"] == "fine"
                and int(r["seed"]) == seed}


@pytest.mark.skipif(not (GATE_C / "sim-describe.csv").exists(), reason="no gate c run under runs/gate-c")
def test_describe_pool_equals_gate_c():
    allowed = DARWIN_ULPS if sys.platform == "darwin" else 0
    diffs: list[tuple] = []
    """Level 1's describe path, serial and across a process pool, equals gate c's `inflated` values: exactly on Linux
    (gate c ran on x86 Linux); within DARWIN_ULPS on Darwin (arm64's numpy/libm differ in the last bit or two, 2026-11-04:
    1 of 54 values, 1 ulp). Every differing value is logged with its distance in ulps."""
    tol = json.loads((ROOT / "analysis" / "fit" / "sources" / "phase1-tolerances.json").read_text())
    d_min = tol["resolution"]["biodiv"]["d_min"]
    names = ["widestAt", "forkHeight", "limbDroop", "p1", "tortuosity05", "length0", "pendulousFraction05",
             "limbElevation05", "centroidHeight"]
    seeds = (1, 2)
    jobs = [(str(GATE_C / "trees" / f"beech-{s}.json"), s, d_min, names) for s in seeds]
    serial = l1.describe_files(jobs)
    with ProcessPoolExecutor(2) as ex:
        pooled = l1.describe_files(jobs, ex)
    assert json.dumps(serial) == json.dumps(pooled)
    for s, ts in zip(seeds, serial):
        ref = _gate_c_inflated(s)
        # gate c's `tree` is the position in the dump; its rows are the live stand trees
        dumped = json.loads(Path(jobs[seeds.index(s)][0]).read_text())["trees"]
        live = [k for k, t in enumerate(dumped) if t["trial"] == "stand" and t["alive"]]
        assert len(ts) == len(live) == len(ref)
        for k_tree, t in zip(live, ts):
            row = ref[k_tree]
            for k in names:
                want = float(row[k]) if row[k] not in ("", "nan") else math.nan
                if not _same(t[k], want):
                    diffs.append((s, k_tree, k, t[k], want, _ulps(t[k], want)))
            # describe()'s DBH of the uncoarsened tree
            dbh = float(_gate_c_fine(s)[k_tree]["dbh"])
            if not _same(t["dbh"], dbh):
                diffs.append((s, k_tree, "dbh", t["dbh"], dbh, _ulps(t["dbh"], dbh)))
    report = "; ".join(f"seed {s} tree {i} {k}: {got!r} vs gate c {want!r} ({u} ulp)" for s, i, k, got, want, u in diffs)
    if diffs:
        warnings.warn(f"{len(diffs)} value(s) differ from gate c on {sys.platform}: {report}")
    assert all(u <= allowed for *_, u in diffs), f"beyond {allowed} ulp on {sys.platform}: {report}"


def test_registration_v3_loads_reproduces_its_draw_and_starts_at_the_hand():
    """The committed registration passes its own hash check (it refuses once a hashed file changes: re-register, never
    edit), freezes r3.c at the species' value (v2), and its stored real matrix gives back its clusters, its draw and
    its weights by level1's rules (v3); its start decodes to the hand."""
    from treesim import fit

    reg = l1.load("beech")
    assert reg["version"] == 3 and reg["prior"]["version"] == 2 and reg["prior"]["prior"]["version"] == 1
    assert reg["prior"]["held_out"] == ["length0", "p1", "pendulousFraction05", "tortuosity05", "widestAt"]
    paths = [p["path"] for p in reg["knobs"]]
    assert "r3.c" not in paths and len(paths) == 10
    assert reg["fixed"]["r3.c"] == reg["frozen_form"]["r3.c"] == 0.04879
    names = reg["correlation"]["names"]
    r = np.array(reg["correlation"]["r"])
    assert names == sorted(reg["descriptors"])
    cl = l1.clusters(r, names)
    assert cl == reg["clusters"]["list"]
    held, order, taken = l1.cluster_held_out(cl)
    assert held == reg["held_out"] and [cl[i] for i in order] == reg["clusters"]["draw_order"]
    assert len(held) >= round(len(names) / 3) and sorted(reg["fitted"] + held) == names
    w = l1.location_weights(r, names, reg["weights"]["r_crit"])
    assert w == reg["location_weights"]
    assert reg["loss"]["spread_in_loss"] is False
    assert reg["seeds"]["search"]["list"] == l1.search_seeds()
    spec = f1.level1_spec("beech", reg)
    hand = {**spec.fixed, **spec.form}
    assert fit.decode(spec, fit.encode(spec, reg["start"])) == hand
