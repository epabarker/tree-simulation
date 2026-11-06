"""Gate b (docs/plans/2026-11-03-reference-fidelity.md §j, amendment A): form.py with the simulator's labels and
form.rs's rules reproduces the Rust core's form metrics on 30 trees, all 12 values and 10 bands within
1e-9·max(1, |rust|), NaN equal to NaN. Reads runs/gate-b/trees.json (`node cli/dump-trees.ts`, ≈ 90 s; the dump
carries the core's own values, so it is never stale against itself) and skips without it.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import pytest

from treesim import form_gate, simtree

pytestmark = pytest.mark.skipif(not simtree.DUMP.exists(), reason="no runs/gate-b/trees.json: node cli/dump-trees.ts")


@pytest.fixture(scope="module")
def trees():
    return simtree.load()


def test_the_dump_is_gate_bs_thirty_trees(trees):
    keys = sorted((t.meta["species"], t.meta["seed"], t.meta["trial"], t.meta["season"]) for t in trees)
    want = sorted([(s, seed, "lone", 60) for s in ("oak", "beech", "birch") for seed in (1, 2)]
                  + [(s, seed, "stand", 100) for s in ("oak", "beech", "birch") for seed in (1, 2)] * 4)
    assert keys == want


def test_form_py_reproduces_form_rs(trees):
    rows = form_gate.gate(trees)
    failed = [(r["species"], r["seed"], r["trial"], r["fails"]) for r in rows if r["fails"]]
    assert not failed, failed


def test_the_tolerance_tells_nan_and_numbers_apart():
    nan = float("nan")
    assert form_gate.close(nan, nan) and not form_gate.close(nan, 1.0) and not form_gate.close(1.0, nan)
    assert form_gate.close(1e3 + 1e-7, 1e3) and not form_gate.close(1e3 + 1e-5, 1e3)
    assert form_gate.close(1e-10, 0.0) and not form_gate.close(2e-9, 0.0)
