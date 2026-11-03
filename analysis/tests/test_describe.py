"""describe()'s descriptors on synthetic trees with known answers, and the rules that keep it measuring the tree and
not the reconstruction (describe.py's design table). No data needed.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import math

import numpy as np
import pytest

from treesim import cylinders as cy
from treesim import describe as ds
from treesim.form import Rules, crown_profile

UP = np.array([0.0, 0.0, 1.0])


class Tree:
    """Builds a table cylinder by cylinder; each starts at its parent's tip."""

    def __init__(self, base=(0.0, 0.0, 0.0)):
        self.rows = []
        self.base = np.array(base, float)

    def add(self, parent, direction, length, radius, start=None):
        d = np.array(direction, float)
        d /= np.linalg.norm(d)
        if start is None:
            start = self.base if parent < 0 else self.rows[parent][1] + self.rows[parent][2] * self.rows[parent][3]
        self.rows.append((parent, np.array(start, float), d, length, radius))
        return len(self.rows) - 1

    def chain(self, parent, direction, n, length, radius):
        for _ in range(n):
            parent = self.add(parent, direction, length, radius)
        return parent

    def table(self) -> cy.Cylinders:
        p, s, a, l, r = zip(*self.rows)
        r = np.array(r, float)
        return cy.Cylinders(np.array(s), np.array(a), np.array(l, float), r, r, np.array(p, int))


def trunk(n=10, length=1.0, radius=0.2):
    t = Tree()
    t.chain(-1, UP, n, length, radius)
    return t


def test_tortuosity_is_one_on_a_straight_limb_and_path_over_chord_on_a_zigzag():
    t = trunk()
    t.chain(2, [1, 0, 0], 4, 1.0, 0.05)
    assert ds.describe(t.table())["tortuosity"] == pytest.approx(1.0)
    t = trunk()
    p = 2
    for k in range(4):  # 45° up, 45° down: path 4, chord 4·cos 45°
        p = t.add(p, [1, 0, 1 if k % 2 == 0 else -1], 1.0, 0.05)
    assert ds.describe(t.table())["tortuosity"] == pytest.approx(math.sqrt(2))


def test_pendulous_fraction_is_the_length_share_of_tips_heading_down():
    t = trunk()
    t.chain(4, [1, 0, -1], 3, 1.0, 0.05)  # tip down, length 1
    t.add(t.chain(6, [-1, 0, 0.2], 2, 1.0, 0.05), [-1, 0, 1], 3.0, 0.05)  # tip up, length 3
    # Tips: the trunk's top (up, 1), the drooping limb's (1), the rising limb's (3).
    assert ds.describe(t.table())["pendulousFraction"] == pytest.approx(1 / 5)


def test_length_by_order_sums_to_one_and_lumps_three_and_above():
    # Each lateral leaves mid-axis and is lighter than the axis it leaves, so its order is unambiguous.
    t = trunk(8)
    l1 = t.add(3, [1, 0, 0], 1.0, 0.05)
    t.chain(t.add(l1, [1, 0, 0], 1.0, 0.05), [1, 0, 0], 2, 1.0, 0.05)  # order 1: 4 m
    l2 = t.add(l1, [0, 1, 0], 1.0, 0.02)
    t.add(l2, [0, 1, 0], 1.0, 0.02)  # order 2: 2 m
    l3 = t.add(l2, [0, 0, -1], 0.5, 0.01)
    t.add(l3, [0, 0, -1], 0.5, 0.01)  # order 3: 1 m
    t.add(l3, [1, 1, 0], 0.25, 0.005)  # order 4: 0.25 m
    d = ds.describe(t.table())
    total = 8 + 4 + 2 + 1 + 0.25
    assert [d[f"length{k}"] for k in range(4)] == pytest.approx([8 / total, 4 / total, 2 / total, 1.25 / total])


def test_taper_reads_the_trunk_at_half_height_over_dbh():
    t = Tree()
    p = -1
    for k in range(10):  # radius 0.2 falling by 0.015 a metre
        p = t.add(p, UP, 1.0, 0.2 - 0.015 * k)
    d = ds.describe(t.table())
    # Breast height 1.3 m lies in the second cylinder (0.185); half height, 5 m, ends the fifth (0.14).
    assert d["taper"] == pytest.approx(0.14 / 0.185)
    assert d["dbh"] == pytest.approx(0.37) and d["height"] == pytest.approx(10.0)


def test_centroid_height_is_length_weighted_over_h():
    t = trunk(10)
    t.chain(8, [1, 0, 0], 10, 1.0, 0.05)  # 10 m of limb at 9 m
    assert ds.describe(t.table())["centroidHeight"] == pytest.approx((5 * 10 + 9 * 10) / 20 / 10)


def test_a_full_binary_tree_bifurcates_by_two():
    t = Tree()

    def grow(parent, depth, direction):
        i = t.add(parent, direction, 1.0, 0.01 * 2**depth)
        if depth:
            grow(i, depth - 1, direction + np.array([0.3, 0, 0]))
            grow(i, depth - 1, direction - np.array([0.3, 0, 0]))

    grow(-1, 5, UP.copy())
    d = ds.describe(t.table())
    assert d["bifurcationRatio"] == pytest.approx(2.0) and d["bifurcationRatio2"] == pytest.approx(2.0)


def test_a_band_width_does_not_depend_on_the_scanners_azimuth():
    def crown(theta):
        t = trunk(10)
        rot = np.array([[math.cos(theta), -math.sin(theta), 0], [math.sin(theta), math.cos(theta), 0], [0, 0, 1]])
        for k, node in enumerate(range(3, 9)):
            for side in (1, -1):
                t.chain(node, rot @ [side * 1.0, side * 0.6 * (k % 3), 0.1], 3, 1.0, 0.03)
        c = t.table()
        return crown_profile(c, ds.geometric_labels(c), ds.DESCRIBE), crown_profile(
            c, ds.geometric_labels(c), Rules(width="axes", bands=4))

    (a0, x0), (a1, x1) = crown(0.0), crown(0.6)
    assert np.allclose(a0, a1)
    assert not np.allclose(x0, x1)  # form.rs's two-axis width moves with the frame


def test_the_crown_base_skips_a_stub_below_the_limbs():
    t = trunk(10)
    t.chain(0, [1, 0, 0], 1, 0.3, 0.01)  # a 0.3 m stub at 1 m
    for node in (5, 7):
        t.chain(node, [1, 0, 0.2], 6, 0.5, 0.04)  # 3 m limbs at 6 and 8 m
    d = ds.describe(t.table())
    assert d["crownBase"] == pytest.approx(0.6)


def test_droop_reads_stretches_not_the_last_cylinder():
    # A level limb of 3 m whose last cylinder, 0.1 m, kinks down 60°: per cylinder the limb droops 60°; over 0.5 m
    # stretches the kink joins the last stretch, whose chord dips atan(0.1 sin 60° / (0.5 + 0.1 cos 60°)).
    from treesim.form import limb_shapes

    t = trunk(10)
    p = t.chain(4, [1, 0, 0], 6, 0.5, 0.05)
    t.add(p, [1, 0, -math.sqrt(3)], 0.1, 0.02)
    c = t.table()
    lab = ds.geometric_labels(c)
    (per_cylinder, up1), = limb_shapes(c, lab, Rules(min_limb=("length", 2.5)))
    (droop, up), = limb_shapes(c, lab, Rules(min_limb=("length", 2.5), window=0.5))
    dip = math.degrees(math.atan2(0.1 * math.sin(math.pi / 3), 0.5 + 0.05))
    assert per_cylinder == pytest.approx(60.0) and up1 == pytest.approx(0.0)
    assert droop == pytest.approx(dip) and up == pytest.approx(0.0)
    assert ds.describe(c)["limbDroop"] == pytest.approx(dip)


def test_below_ground_subtrees_are_dropped_and_counted():
    # R4: a cylinder that starts or ends below the root's base goes, with its subtree.
    t = trunk(5)
    root_kid = t.add(0, [1, 0, -1], 1.0, 0.03)  # starts at 1 m, ends 0.29 m up: kept
    dive = t.add(root_kid, [1, 0, -1], 1.0, 0.02)  # starts above, ends below the base: dropped
    t.add(dive, [1, 0, 0], 0.5, 0.01, start=[1.0, 0.0, -0.3])  # starts below: dropped
    c, info = ds.drop_below_ground(t.table())
    assert info["below"] == 2 and info["below_start"] == 1 and len(c) == 6
    total = 0.04 * 5 + 0.03**2 + 0.02**2 + 0.01**2 * 0.5
    assert info["below_volume"] == pytest.approx((0.02**2 + 0.01**2 * 0.5) / total)
    assert ds.describe(t.table())["below"] == 2


def test_leaf_stem_slope_is_nan_without_leaves():
    assert math.isnan(ds.describe(trunk().table())["leafStemSlope"])


def test_the_profile_has_four_bands():
    d = ds.describe(trunk().table())
    assert [k for k in d if k.startswith("p") and k[1:].isdigit()] == ["p0", "p1", "p2", "p3"]



def test_tortuosity05_drops_zigzag_under_the_step_and_keeps_bends_over_it():
    t = trunk()
    p = 2
    for k in range(40):  # 0.1 m zigzag of ±10°: tortuosity reads it, the 0.5 m resampling mostly does not
        a = math.radians(10 if k % 2 == 0 else -10)
        p = t.add(p, [math.cos(a), 0, math.sin(a)], 0.1, 0.05)
    d = ds.describe(t.table())
    assert d["tortuosity"] == pytest.approx(1 / math.cos(math.radians(10)))
    assert 1.0 <= d["tortuosity05"] < 1.001
    t = trunk()
    p = 2
    for k in range(4):  # 1 m legs at ±45°: over the step, so both read path over chord
        p = t.add(p, [1, 0, 1 if k % 2 == 0 else -1], 1.0, 0.05)
    d = ds.describe(t.table())
    assert d["tortuosity05"] == pytest.approx(d["tortuosity"], rel=0.05)


def test_limb_elevation05_reads_resampled_stretches_not_cylinders():
    # A 3 m limb as a zigzag of 0.1 m cylinders at 50°, 10°, 10° (repeating): per cylinder the length-weighted median
    # is 10°; at 0.5 m the chords follow the mean heading, ≈ 23°.
    t = Tree()
    p = t.chain(-1, UP, 10, 0.25, 0.05)
    up, down = math.radians(50), math.radians(10)
    q = p - 3
    for k in range(30):
        e = up if k % 3 == 0 else down
        q = t.add(q, [math.cos(e), 0, math.sin(e)], 0.1, 0.01)
    c = t.table()
    labels = ds.geometric_labels(c)
    mean = math.degrees(math.atan2(math.sin(up) + 2 * math.sin(down), math.cos(up) + 2 * math.cos(down)))
    assert ds.limb_elevation05(c, labels) == pytest.approx(mean, abs=3.0)
    assert ds.describe(c)["limbElevation"] == pytest.approx(10.0)


def test_pendulous_fraction05_reads_each_axis_last_half_metre():
    # Two 2 m limbs: one ends in a 0.1 m cylinder heading down (its last 0.5 m still rises), one whose last 0.6 m
    # heads down.
    t = Tree()
    p = t.chain(-1, UP, 10, 0.25, 0.05)
    a = t.chain(p - 2, [1, 0, 0.3], 19, 0.1, 0.01)
    t.add(a, [1, 0, -0.5], 0.1, 0.01)
    b = t.chain(p - 4, [-1, 0, 0.3], 14, 0.1, 0.01)
    t.chain(b, [-1, 0, -0.5], 6, 0.1, 0.01)
    c = t.table()
    f = ds.pendulous_fraction05(c, ds.geometric_labels(c))
    assert f == pytest.approx(0.5, abs=1e-9)
    assert ds.describe(c)["pendulousFraction"] == pytest.approx(0.2 / 0.45)  # both limb tips and the trunk's
