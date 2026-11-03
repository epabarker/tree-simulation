"""The simulator's skeleton as the common cylinder table (cylinders.py), with what only the simulator knows: its own
labels (slot 0 continues; its order and axis columns), each metamer's leaf area from its live buds (form.rs, r6.rs),
and the pipe radius (radius − stress wood). Input: one tree of `cli/dump-trees.ts`'s JSON.

Cells are 0.25 m and the core is y up: (x, y, z)sim → (x, z, y) in metres, z up. The swap is a reflection, which no
descriptor reads (none is handed). Scaling by 0.25 is exact in binary, and the table is built directly, never
through from_arrays (whose axis renormalising and breadth-first reorder would move values by an ulp): the
simulator's rows are already parent-before-child with one root, row 0.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from treesim.cylinders import Cylinders, check
from treesim.form import Labels

CELL = 0.25
MAIN = 0
# rust/core/src/tree.rs's bud states that carry leaves (c3.rs's is_live_bud).
ACTIVE, DORMANT, SHORT_SHOOT = 1, 2, 5
DUMP = Path(__file__).resolve().parents[2] / "runs" / "gate-b" / "trees.json"


@dataclass(frozen=True)
class SimTree:
    cylinders: Cylinders
    labels: Labels
    leaf: np.ndarray
    pipe: np.ndarray
    meta: dict  # species, seed, trial, season, alive
    form: dict  # form.rs's own values and profile, as the core computed them


def _col(d: dict, k: str, dtype=float) -> np.ndarray:
    return np.array([np.nan if v is None else v for v in d[k]], dtype=dtype)


def from_dump(t: dict) -> SimTree:
    m = t["m"]
    base = np.stack([_col(m, "baseX"), _col(m, "baseZ"), _col(m, "baseY")], axis=1)
    head = np.stack([_col(m, "hx"), _col(m, "hz"), _col(m, "hy")], axis=1)
    if len(base) and base[0, 2] != 0.0:
        raise ValueError("the simulator's root stands at y 0")
    parent = _col(m, "parent", int)
    radius = _col(m, "radius") * CELL
    c = Cylinders(start=base * CELL, axis=head, length=_col(m, "length") * CELL, radius=radius,
                  radius_raw=radius, parent=parent)
    check(c)
    slot = _col(m, "slot", int)
    nxt = np.full(len(c), -1)
    for i in range(1, len(c)):
        if slot[i] == MAIN:
            nxt[parent[i]] = i
    leaf = np.zeros(len(c))
    enabled, area = t["r6"]["enabled"], t["r6"]["leafArea"]
    for j, s in zip(t["b"]["metamer"], t["b"]["state"]):
        if s in (ACTIVE, DORMANT, SHORT_SHOOT):
            leaf[j] += 1.0 if not enabled else area if s == SHORT_SHOOT else 1.0 if s == ACTIVE else 0.0
    form = {k: np.nan if v is None else v for k, v in t["form"].items()}
    form["profile"] = [np.nan if v is None else v for v in t["profile"]]
    return SimTree(
        cylinders=c,
        labels=Labels(nxt=nxt, order=_col(m, "order", int), axis=_col(m, "axis", int)),
        leaf=leaf,
        pipe=(_col(m, "radius") - _col(m, "stressWood")) * CELL,
        meta={k: t[k] for k in ("species", "seed", "trial", "season", "alive")},
        form=form,
    )


def load(path: Path = DUMP) -> list[SimTree]:
    with Path(path).open() as f:
        return [from_dump(t) for t in json.load(f)["trees"]]
