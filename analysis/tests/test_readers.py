"""The QSM readers (analysis/treesim/qsm.py) on synthetic files in each layout, and the up axis of every format
(the plan §j, amendment C: QSMs are z-up metres). Real files are checked too where data/reference/ holds them.
Not in `npm run check`:  uv run --project analysis --with pytest pytest analysis/tests -q"""

import csv
from pathlib import Path

import numpy as np
import pytest
import scipy.io as sio

from treesim import cylinders as cy
from treesim import qsm, qsm_gate
from treesim.fetch import DATA, lower_median

# A trunk of three cylinders up z (0.5 m each, radius 0.10 → 0.08), a branch of two from the second, and an
# orphan root (a fragment the reconstruction never attached). TreeQSM numbering: 1-based, parent 0 = none.
START = np.array([[0, 0, 0], [0, 0, 0.5], [0, 0, 1.0], [0, 0, 0.9], [0.35, 0, 1.25], [3, 3, 2]], float)
AXIS = np.array([[0, 0, 1], [0, 0, 1], [0, 0, 1], [0.70710678, 0, 0.70710678], [0.70710678, 0, 0.70710678],
                 [1, 0, 0]], float)
LENGTH = np.array([0.5, 0.5, 0.5, 0.5, 0.4, 0.2])
RADIUS = np.array([0.10, 0.09, 0.08, 0.03, 0.02, 0.01])
UNMOD = RADIUS * 1.1
PARENT = np.array([0, 1, 2, 2, 4, 0])  # 1-based; the last is the orphan
TREE_HEIGHT, DBH = 1.6, 0.18
TOP = 1.25 + 0.4 * 0.70710678  # the branch tip stands above the trunk's 1.5 m


def _struct(radius=RADIUS):
    n = len(radius)
    return {
        "cylinder": {"radius": radius, "length": LENGTH[:n], "start": START[:n], "axis": AXIS[:n],
                     "parent": PARENT[:n].astype(float), "extension": np.zeros(n), "added": np.zeros(n),
                     "UnmodRadius": UNMOD[:n], "BranchOrder": np.zeros(n)},
        "treedata": {"DBHqsm": DBH, "TreeHeight": TREE_HEIGHT},
        "rundata": {"version": "2.x"},
    }


def _check_synthetic(q: qsm.QSM, raw=True):
    c = q.cylinders
    assert len(c) == 5 and q.meta["dropped"] == 1
    assert q.meta["dropped_volume"] == pytest.approx(
        np.pi * 0.01**2 * 0.2 / float(np.sum(np.pi * RADIUS**2 * LENGTH)))
    assert list(c.parent) == [-1, 0, 1, 1, 3]
    assert np.allclose(c.radius_raw, UNMOD[:5] if raw else RADIUS[:5])
    # Up is z: the root heads up; the top is the branch tip, at x 0.63.
    assert c.axis[0, 2] == 1.0
    assert cy.height(c) == pytest.approx(TOP)
    assert c.tip[4] == pytest.approx([0.35 + 0.4 * 0.70710678, 0, 1.25 + 0.4 * 0.70710678])
    assert q.meta["dbh_qsm"] == pytest.approx(DBH) and q.meta["height_qsm"] == pytest.approx(TREE_HEIGHT)
    # Breast height (1.3 m of stem) falls in the trunk's third cylinder (1.0 to 1.5 m), radius 0.08.
    assert cy.dbh(c) == pytest.approx(0.16)
    assert cy.order_and_axis(c)[0].tolist() == [0, 0, 0, 1, 1]
    assert all(cy.internal_checks(c).values())


def test_treeqsm_2_3_reads_the_qsm_struct(tmp_path):
    p = tmp_path / "t.mat"
    sio.savemat(p, {"qsm": _struct()})
    q = qsm.read(p, cache=False)
    assert q.meta["format"] == "treeqsm-2.3"
    _check_synthetic(q)


def test_treeqsm_2_4_takes_the_median_size_model(tmp_path):
    # Three candidates of 4, 6 and 5 cylinders: the median-size model is the one of 5 (index 2).
    models = np.empty(3, dtype=object)
    for k, n in enumerate([4, 6, 5]):
        s = _struct(RADIUS[:n])
        s["treedata"] = {"DBHqsm": DBH + k, "TreeHeight": TREE_HEIGHT}
        models[k] = s
    p = tmp_path / "t_all.mat"
    sio.savemat(p, {"QSMs": models})
    q = qsm.read(p, cache=False)
    assert q.meta["format"] == "treeqsm-2.4" and q.meta["model"] == 2 and q.meta["models"] == 3
    assert q.meta["dbh_qsm"] == pytest.approx(DBH + 2)
    assert len(q.cylinders) == 5 and q.meta["dropped"] == 0
    assert qsm.read(p, model=1, cache=False).meta["dbh_qsm"] == pytest.approx(DBH + 1)


def test_treeqsm_2_0_reads_top_level_arrays_and_its_treedata_vector(tmp_path):
    td = np.zeros(33)
    td[3], td[9] = TREE_HEIGHT, DBH * 100  # height in m, DBH in cm
    p = tmp_path / "t.mat"
    sio.savemat(p, {"Sta": START, "Axe": AXIS, "Len": LENGTH, "Rad": RADIUS, "CPar": PARENT.astype(float),
                    "CExt": np.zeros(6), "TreeData": td})
    q = qsm.read(p, cache=False)
    assert q.meta["format"] == "treeqsm-2.0"
    _check_synthetic(q, raw=False)


def test_treeml_optcsv_maps_its_columns(tmp_path):
    p = tmp_path / "OptQSM_x.csv"
    cols = ["date", "projectID", "treeID", "branchID", "branchOrder", "cylinderID", "posInBranch", "parentCylID",
            "childCyID", "start_x", "start_y", "start_z", "axis_x", "axis_y", "axis_z", "length", "radius",
            "addedVirtual"]
    with p.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for i in range(6):
            w.writerow(["2023-01-13", "p", "x", 1, 0, i + 1, 1, PARENT[i], 0, *START[i], *AXIS[i], LENGTH[i],
                        RADIUS[i], "false"])
    q = qsm.read(p, cache=False)
    assert q.meta["format"] == "treeml-optcsv"
    c = q.cylinders
    assert len(c) == 5 and q.meta["dropped"] == 1 and c.axis[0, 2] == 1.0
    assert cy.height(c) == pytest.approx(TOP)


def test_a_child_listed_before_its_parent_is_reordered():
    # The branch (index 0 here) is listed before the trunk cylinder it grows from.
    start = [[0, 0, 0.5], [0, 0, 0], [0, 0, 0.5]]
    axis = [[1, 0, 0], [0, 0, 1], [0, 0, 1]]
    c, lost = cy.from_arrays(start, axis, [0.3, 0.5, 0.5], [0.02, 0.1, 0.09], [1, -1, 1])
    assert list(c.parent) == [-1, 0, 0] and lost["dropped"] == 0
    assert c.radius[0] == 0.1


def test_the_lower_median_is_never_the_smallest():
    assert lower_median([5, 1, 9, 3], key=lambda x: x) == 3
    assert lower_median([4, 6, 5], key=lambda x: x) == 5
    assert lower_median([7], key=lambda x: x) == 7


REAL = {
    "demol": sorted((DATA / "demol" / "qsm").glob("*.mat"))[:3],
    "wytham": sorted((DATA / "wytham" / "qsm").glob("wytham_winter_*.mat"))[:3],
    "biodiv": sorted((DATA / "biodiv" / "qsm-all").rglob("*_all.mat"))[:3],
    "treeml": sorted((DATA / "treeml" / "optcsv").glob("OptQSM_*.csv")),
}


@pytest.mark.parametrize("source", sorted(REAL))
def test_real_files_are_z_up_metres(source):
    if not REAL[source]:
        pytest.skip(f"no {source} QSMs under data/reference/ (python -I -m treesim.fetch {source})")
    failing = {}
    for path in REAL[source]:
        c = qsm.read(path).cylinders
        rise = c.tip[:, 2].max() - c.start[0, 2]
        spread = np.ptp(np.concatenate([c.start, c.tip])[:, :2], axis=0)
        bad = [k for k, v in cy.internal_checks(c).items() if not v]
        if not c.axis[0, 2] > 0.5:
            bad.append("the root does not head up z")
        if not 2.0 < rise < 60.0:
            bad.append(f"a height of {rise:.1f} is not a tree in metres")
        if not rise > 0.5 * spread.max():
            bad.append("wider than tall twice over: is z up?")
        if bad:
            failing[path.stem.removeprefix("OptQSM_")] = bad
    # Only TreeML's recorded exclusions may fail (qsm_gate.TREEML_EXCLUDED), and each still does (never stale).
    excluded = set(qsm_gate.TREEML_EXCLUDED) if source == "treeml" else set()
    present = {p.stem.removeprefix("OptQSM_") for p in REAL[source]}
    assert {k: v for k, v in failing.items() if k not in excluded} == {}
    assert excluded & present <= set(failing), sorted((excluded & present) - set(failing))


def test_treeqsm_2_4_takes_treeqsms_default_optimum(tmp_path):
    # Two input sets of two repeats: set A's mean pmdistance (0.010, 0.030) is 0.020, set B's (0.012, 0.014) 0.013.
    # select_optimum picks set B, then its smaller model (index 2), though index 0 has the smallest distance of all.
    models = np.empty(4, dtype=object)
    for k, (diam, dist) in enumerate([(0.05, 0.010), (0.05, 0.030), (0.08, 0.012), (0.08, 0.014)]):
        s = _struct()
        s["treedata"] = {"DBHqsm": DBH + k, "TreeHeight": TREE_HEIGHT}
        s["pmdistance"] = {"mean": dist}
        s["rundata"] = {"version": "2.4.1", "inputs": {"PatchDiam1": diam, "PatchDiam2Min": 0.01, "PatchDiam2Max": 0.03}}
        models[k] = s
    p = tmp_path / "t_all.mat"
    sio.savemat(p, {"QSMs": models})
    q = qsm.read(p, cache=False)
    assert q.meta["model"] == 2 and q.meta["dbh_qsm"] == pytest.approx(DBH + 2)


def test_the_simulator_is_y_up_and_becomes_z_up():
    # Amendment C's simulator case: a metamer heading up the core's y reads up our z, in metres.
    from treesim import simtree

    m = {"parent": [-1], "slot": [0], "order": [0], "axis": [0], "baseX": [4], "baseY": [0], "baseZ": [8],
         "hx": [0], "hy": [1], "hz": [0], "length": [4], "radius": [0.5], "stressWood": [0]}
    t = simtree.from_dump({"species": "oak", "seed": 1, "trial": "lone", "season": 1, "alive": True,
                           "r6": {"enabled": False, "leafArea": 1}, "m": m, "b": {"metamer": [], "state": []},
                           "form": {}, "profile": []})
    assert t.cylinders.axis[0].tolist() == [0, 0, 1] and cy.height(t.cylinders) == 1.0
