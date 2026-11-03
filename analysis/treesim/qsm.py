"""Readers for real QSMs into the common cylinder table (cylinders.py; docs/plans/2026-11-03-reference-fidelity.md
§c, §j): TreeQSM `.mat` in three layouts and TreeML's `optcsv`.

| layout | where | cylinders | the model's own DBH, height |
|---|---|---|---|
| TreeQSM 2.0 | Wytham | top-level `Sta`, `Axe`, `Len`, `Rad`, `CPar` (1-based, 0 = none) | `TreeData[9]` cm, `TreeData[3]` m |
| TreeQSM 2.3 | Demol | `qsm.cylinder.{start, axis, length, radius, UnmodRadius, parent}` | `qsm.treedata.DBHqsm`, `.TreeHeight` (m) |
| TreeQSM 2.4.1 | BioDiv `all/` | `QSMs[k]`, as 2.3, 80 candidate models a tree | as 2.3 |
| TreeML optcsv | TreeML | `start_*`, `axis_*`, `length`, `radius`, `cylinderID`, `parentCylID` (0 = none) | none |

TreeQSM 2.0's TreeData order (total, trunk and branch volume; tree height; trunk and branch length; number of
branches; max order; total area; DBHqsm; DBHcyl, …) is read off tree 8357: index 3 is 4.84 m, its cylinders' top
minus base; index 9 is 5.71 cm against `DBH_QSM_avg` 5.72 cm. All layouts are metres, z up. Branch order and
branch ids are never read: continuation and order come from geometry (cylinders.py).

A 2.4.1 `all.mat` holds every candidate model; the one read is the median-size model by cylinder count (§j, the
user's decision 3; Wytham's rule, never TreeQSM's select_optimum).

Parsed tables are cached as .npz beside the source (a derived file under the git-ignored data/reference/).
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import scipy.io as sio

from treesim.cylinders import Cylinders, from_arrays
from treesim.fetch import lower_median

CACHE_VERSION = 1


@dataclass(frozen=True)
class QSM:
    cylinders: Cylinders
    meta: dict  # format, version, model, models, dbh_qsm (m), height_qsm (m), dropped, dropped_volume


def _vec(x) -> np.ndarray:
    return np.atleast_1d(np.asarray(x, float))


def _parent(p) -> np.ndarray:
    """TreeQSM's 1-based parents (0 = none) → 0-based, -1 at the root."""
    return np.atleast_1d(np.asarray(p, int)) - 1


def _from_struct(q, layout: str, model: int | None, models: int) -> QSM:
    c = q.cylinder
    radius = _vec(c.radius)
    raw = _vec(c.UnmodRadius) if "UnmodRadius" in c._fieldnames else radius
    cyl, dropped = from_arrays(c.start, c.axis, _vec(c.length), radius, _parent(c.parent), raw)
    version = getattr(getattr(q, "rundata", None), "version", "")
    return QSM(
        cyl,
        {
            "format": layout,
            "version": str(version),
            "model": model,
            "models": models,
            "dbh_qsm": float(q.treedata.DBHqsm),
            "height_qsm": float(q.treedata.TreeHeight),
            **dropped,
        },
    )


def parse_treeqsm(path: Path, model: int | None = None) -> QSM:
    d = sio.loadmat(path, squeeze_me=True, struct_as_record=False)
    if "QSMs" in d:  # TreeQSM 2.4.1, every candidate model (BioDiv all/)
        qs = list(np.atleast_1d(d["QSMs"]))
        k = model if model is not None else qs.index(lower_median(qs, key=lambda q: np.size(q.cylinder.radius)))
        return _from_struct(qs[k], "treeqsm-2.4", k, len(qs))
    if "qsm" in d:  # TreeQSM 2.3 (Demol): one model
        return _from_struct(d["qsm"], "treeqsm-2.3", None, 1)
    if "Rad" in d:  # TreeQSM 2.0 (Wytham): one model, top-level arrays
        td = _vec(d["TreeData"])
        cyl, dropped = from_arrays(d["Sta"], d["Axe"], _vec(d["Len"]), _vec(d["Rad"]), _parent(d["CPar"]))
        return QSM(
            cyl,
            {"format": "treeqsm-2.0", "version": "2.0", "model": None, "models": 1,
             "dbh_qsm": float(td[9]) / 100.0, "height_qsm": float(td[3]), **dropped},
        )
    raise ValueError(f"{path}: not a TreeQSM layout this reader knows")


def parse_optcsv(path: Path) -> QSM:
    with Path(path).open() as f:
        rows = list(csv.DictReader(f))
    ids = {int(r["cylinderID"]): k for k, r in enumerate(rows)}
    col = lambda name: np.array([float(r[name]) for r in rows])  # noqa: E731
    start = np.stack([col("start_x"), col("start_y"), col("start_z")], axis=1)
    axis = np.stack([col("axis_x"), col("axis_y"), col("axis_z")], axis=1)
    parent = np.array([ids.get(int(r["parentCylID"]), -1) for r in rows])
    cyl, dropped = from_arrays(start, axis, col("length"), col("radius"), parent)
    return QSM(cyl, {"format": "treeml-optcsv", "version": "", "model": None, "models": 1,
                     "dbh_qsm": float("nan"), "height_qsm": float("nan"), **dropped})


def read(path: str | Path, model: int | None = None, cache: bool = True) -> QSM:
    """A QSM file (TreeQSM .mat or TreeML optcsv) as the common table; cached as .npz beside it."""
    path = Path(path)
    store = path.with_name(f".{path.name}.m{'' if model is None else model}.v{CACHE_VERSION}.npz")
    stamp = f"{path.stat().st_size}:{path.stat().st_mtime_ns}"
    if cache and store.exists():
        z = np.load(store)
        meta = json.loads(str(z["meta"]))
        if meta.pop("stamp", None) == stamp:
            c = Cylinders(z["start"], z["axis"], z["length"], z["radius"], z["radius_raw"], z["parent"])
            return QSM(c, meta)
    q = parse_optcsv(path) if path.suffix == ".csv" else parse_treeqsm(path, model)
    if cache:
        c = q.cylinders
        np.savez(store, start=c.start, axis=c.axis, length=c.length, radius=c.radius, radius_raw=c.radius_raw,
                 parent=c.parent, meta=json.dumps({**q.meta, "stamp": stamp}))
    return q
