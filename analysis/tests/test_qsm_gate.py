"""Phase 1's gate a (docs/plans/2026-11-03-reference-fidelity.md §j; analysis/treesim/qsm_gate.py): DBH and height
recomputed from the cylinders against each publisher's own QSM-derived values, ≥ 95% of trees within 5%, per
dataset. Felled and point-cloud values are ceilings, reported by `python -I -m treesim.qsm_gate`, never gated.
Skips a dataset whose QSMs are not under data/reference/ (python -I -m treesim.fetch). Never touches the network.
Not in `npm run check`:  uv run --project analysis --with pytest pytest analysis/tests -q"""

import pytest

from treesim import qsm_gate as gate

GATED = ["demol", "wytham", "biodiv"]


class _Rows(dict):
    """Each dataset's rows, read on first use: one dataset's trouble does not fail the others."""

    def __missing__(self, source):
        self[source] = gate.SOURCES[source]()
        return self[source]


@pytest.fixture(scope="module")
def rows():
    return _Rows()


@pytest.mark.parametrize("source", GATED)
def test_dbh_and_height_match_the_publishers_qsm_values(rows, source):
    r = rows[source]
    if not r:
        pytest.skip(f"no {source} QSMs under data/reference/")
    dbh, height = gate.within(r, "dbh_err"), gate.within(r, "height_err")
    worst = sorted(r, key=lambda x: -max(abs(x["dbh_err"]), abs(x["height_err"])))[:3]
    detail = [(x["tree"], round(x["dbh_err"], 3), round(x["height_err"], 3)) for x in worst]
    assert dbh >= gate.PASS, f"{source}: DBH within 5% for {dbh:.0%} of {len(r)}; worst {detail}"
    assert height >= gate.PASS, f"{source}: height within 5% for {height:.0%} of {len(r)}; worst {detail}"


# The internal checks stand in for a height gate only where the files carry no published height (§j, B); on the
# gated datasets they are reported by `python -I -m treesim.qsm_gate` (BioDiv's HEW21_GD_117 fails one: an artifact).
UNGATED_HEIGHT = ["treeml"]


@pytest.mark.parametrize("source", UNGATED_HEIGHT)
def test_every_tree_passes_the_internal_checks(rows, source):
    r = rows[source]
    if not r:
        pytest.skip(f"no {source} QSMs under data/reference/")
    failed = [(x["tree"], k) for x in r for k, v in x.items() if k.startswith("check_") and not v]
    assert not failed, failed
