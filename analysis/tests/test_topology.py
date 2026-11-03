"""Topology read from geometry (cylinders.py: continuation by subtree wood volume, order and axis; describe.py:
Strahler), and the simulator's own labels as simtree.py reads them. Synthetic trees only; no data needed.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import numpy as np

from treesim import cylinders as cy
from treesim import simtree
from treesim.describe import geometric_labels, strahler

UP = [0, 0, 1]
S = np.sqrt(0.5)


def table(rows):
    """rows: (parent, start, axis, length, radius)."""
    p, start, axis, length, radius = (np.array(x, dtype=float) for x in zip(*rows))
    return cy.Cylinders(start, axis, length, radius, radius, p.astype(int))


def fork(left_r, right_r, left_axis=(-S, 0, S), right_axis=(S, 0, S)):
    """A trunk cylinder, then two children from its tip."""
    return table([(-1, [0, 0, 0], UP, 1, 0.1), (0, [0, 0, 1], left_axis, 1, left_r),
                  (0, [0, 0, 1], right_axis, 1, right_r)])


def test_the_heavier_child_continues_whatever_its_index():
    assert cy.continuation(fork(0.05, 0.08))[0] == 2
    assert cy.continuation(fork(0.08, 0.05))[0] == 1
    order, axis = cy.order_and_axis(fork(0.05, 0.08))
    assert order.tolist() == [0, 1, 0] and axis[2] == axis[0] != axis[1]


def test_volume_is_the_subtree_not_the_first_cylinder():
    # Child 1 is thicker at its base, child 2 carries a long subtree: 2 continues.
    c = table([(-1, [0, 0, 0], UP, 1, 0.1), (0, [0, 0, 1], UP, 0.5, 0.06), (0, [0, 0, 1], [S, 0, S], 0.5, 0.05),
               (2, [0.35, 0, 1.35], [S, 0, S], 3, 0.05)])
    assert cy.continuation(c)[0] == 2


def test_a_tie_goes_to_the_smaller_turn():
    c = fork(0.05, 0.05, left_axis=(-0.6, 0, 0.8), right_axis=(S, 0, S))
    assert cy.continuation(c)[0] == 1  # 0.8 against 0.707 of the parent's axis


def test_the_trunk_is_the_continuation_from_the_root():
    c = table([(-1, [0, 0, 0], UP, 1, 0.1), (0, [0, 0, 1], UP, 1, 0.09), (0, [0, 0, 1], [1, 0, 0], 1, 0.02),
               (1, [0, 0, 2], UP, 1, 0.08)])
    assert cy.trunk(c) == [0, 1, 3]
    assert cy.order_and_axis(c)[0].tolist() == [0, 0, 1, 0]


def test_strahler_orders_a_binary_tree_and_a_multifurcation():
    # A full binary tree of depth 2: tips 1, their parents 2, the root 3.
    rows = [(-1, [0, 0, 0], UP, 1, 0.1)]
    for p in (0, 0, 1, 1, 2, 2):
        rows.append((p, [0, 0, 1], UP, 1, 0.01))
    assert strahler(table(rows)).tolist() == [3, 2, 2, 1, 1, 1, 1]
    # Three tips at one node: 2 (two or more share the largest); a chain keeps its child's order.
    c = table([(-1, [0, 0, 0], UP, 1, 0.1), (0, [0, 0, 1], UP, 1, 0.1)] + [(1, [0, 0, 2], UP, 1, 0.01)] * 3)
    assert strahler(c).tolist() == [2, 2, 1, 1, 1]


def dump(slots=(0, 0, 1), order=(0, 0, 1)):
    """A simulated tree as cli/dump-trees.ts writes it: a root, its main child, a lateral of the root (y up, cells)."""
    m = {"parent": [-1, 0, 0], "slot": list(slots), "order": list(order), "axis": [0, 0, 7],
         "baseX": [10, 10, 10], "baseY": [0, 1, 1], "baseZ": [32, 32, 32], "hx": [0, 0, 1], "hy": [1, 1, 0],
         "hz": [0, 0, 0], "length": [1, 1, 2], "radius": [0.4, 0.2, 0.3], "stressWood": [0.1, 0, 0]}
    return {"species": "oak", "seed": 1, "trial": "lone", "season": 60, "alive": True,
            "r6": {"enabled": True, "leafArea": 2.0}, "m": m,
            "b": {"metamer": [1, 2, 2, 1], "state": [1, 5, 2, 3]}, "form": {}, "profile": []}


def test_the_simulator_is_y_up_cells_and_becomes_z_up_metres():
    t = simtree.from_dump(dump())
    c = t.cylinders
    assert c.axis[0].tolist() == [0, 0, 1]  # its y (up) is our z
    assert c.start[0].tolist() == [2.5, 8.0, 0.0]  # (x, y, z) cells → (x, z, y) × 0.25
    assert c.tip[2].tolist() == [3.0, 8.0, 0.25]
    assert np.allclose(c.radius, [0.1, 0.05, 0.075]) and np.allclose(t.pipe, [0.075, 0.05, 0.075])
    # Leaves: active 1, a short shoot leafArea, dormant 0, terminated none.
    assert t.leaf.tolist() == [0.0, 1.0, 2.0]


def test_the_simulators_labels_come_from_its_slots_not_its_geometry():
    t = simtree.from_dump(dump())
    assert t.labels.nxt.tolist() == [1, -1, -1]
    # By geometry the lateral (radius 0.3, length 2) outweighs the main child and continues.
    assert geometric_labels(t.cylinders).nxt.tolist() == [2, -1, -1]
