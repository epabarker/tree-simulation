"""Level 0's measurement port (cli/allometry.ts) against phase 1's own (cylinders.dbh, cylinders.height) on the
simulator's trees: one rule, two languages, equal to 1e-9 (amendment A's one-implementation rule, applied to DBH).
The trees come from `node cli/level0-dump.ts`; skipped when that dump is missing."""

from __future__ import annotations

import json

import numpy as np
import pytest

from treesim import cylinders
from treesim.simtree import from_dump
from treesim.sweep import REPO

DUMP = REPO / "runs" / "level0-parity" / "trees.json"


@pytest.fixture(scope="module")
def trees():
    if not DUMP.exists():
        pytest.skip(f"no {DUMP.relative_to(REPO)}: run `node cli/level0-dump.ts`")
    return json.loads(DUMP.read_text())["trees"]


def close(a: float, b: float) -> bool:
    return abs(a - b) <= 1e-9 * max(1.0, abs(b))


def test_dbh_and_height_match_phase_one(trees):
    bad = []
    for t in trees:
        c = from_dump(t).cylinders
        ref = {"dbh": cylinders.dbh(c), "height": cylinders.height(c)}
        for k, v in ref.items():
            if not close(t["allometry"][k], v):
                bad.append((t["species"], t["seed"], t["season"], t["index"], k, t["allometry"][k], v))
    assert not bad, bad[:5]
    assert len(trees) >= 30


def test_crown_radius_reads_continuous_coordinates(trees):
    """The seam check. The core keeps metamer coordinates continuous across the periodic ring (only the root is
    wrapped at planting), so an offset is a true distance: some tips lie outside [0, 84) cells. A limb longer than
    half the ring (10.5 m) is real in those coordinates but meets its own crown across the seam: reported by the dry
    run, not an error here."""
    outside = 0
    for t in trees:
        a = t["allometry"]
        assert 0 < a["crownRadius"] <= a["maxOffset"]
        assert np.isfinite(a["dbh"]) and a["dbh"] > 0
        m = t["m"]
        tip = np.array(m["baseX"], float) + np.array(m["hx"], float) * np.array(m["length"], float)
        outside += int(np.any((tip < 0) | (tip >= 84)))
    assert outside > 0
