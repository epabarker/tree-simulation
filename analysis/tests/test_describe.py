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


# --- crownBase80 and trunkTortuosity05 (2026-11-05) ---------------------------------------------------------------


def _crown(t: Tree, heights, length=2.0, radius=0.03, direction=(1, 0, 0)):
    """A level limb of `length` from each trunk node at the given heights (a 1 m trunk node per metre)."""
    for h in heights:
        t.chain(h - 1, direction, 1, length, radius)


def test_crown_base80_is_the_length_weighted_quantile_of_level_limbs():
    # Ten level limbs of 2 m at 1..10 m on a 12 m trunk: 80% of the length lies above 3 m exactly (limbs at 3..10 are
    # 8 of 10; a level limb is a point mass, so the quantile sits at the jump, 3 m).
    t = trunk(n=12)
    _crown(t, range(1, 11))
    d = ds.describe(t.table())
    assert d["height"] == pytest.approx(12.0)
    assert d["crownBase80"] * 12.0 == pytest.approx(3.0, abs=1e-6)
    assert d["crownBase70"] * 12.0 == pytest.approx(4.0, abs=1e-6)
    assert d["crownBase90"] * 12.0 == pytest.approx(2.0, abs=1e-6)


def test_crown_base80_spreads_a_sloping_cylinder_over_its_height():
    # One limb rising 45° from 2 m, 4 m long: its z runs 2 → 2 + 4·cos 45° uniformly; 80% lies above
    # 2 + 0.2·(4 cos 45°).
    t = trunk(n=12)
    t.add(1, [1, 0, 1], 4.0, 0.05)
    d = ds.describe(t.table())
    assert d["crownBase80"] * d["height"] == pytest.approx(2.0 + 0.2 * 4.0 * math.sqrt(0.5), abs=1e-6)


def test_one_low_stub_moves_crown_base80_by_its_share_while_the_lowest_limb_jumps():
    t = trunk(n=20)
    _crown(t, range(11, 19), length=3.0)  # 24 m of crown limbs from 11 to 18 m
    before = ds.describe(t.table())
    t.chain(1, [1, 0, 0], 1, 2.6, 0.03)  # a 2.6 m stub at 2 m: just over the 2.5 m limb rule
    after = ds.describe(t.table())
    assert after["crownBase"] * after["height"] == pytest.approx(2.0)
    assert before["crownBase"] * before["height"] == pytest.approx(11.0)
    # 26.6 m in all, 80% = 21.28 m above: the limbs at 13..18 hold 18 m, the limb at 12 brings it to 21 m, so the
    # base falls from 12 m (without the stub: 80% of 24 = 19.2, reached at 12) to 11 m.
    assert before["crownBase80"] * before["height"] == pytest.approx(12.0, abs=1e-6)
    assert after["crownBase80"] * after["height"] == pytest.approx(11.0, abs=1e-6)
    # below 11 m only the stub (the limb at 11 is level, a point at the cut, so above it): all of it a stub
    assert after["stubShareBelow"] == pytest.approx(1.0)
    t.chain(4, [0, 1, 0], 1, 1.0, 0.03)  # a second low limb at 5 m, 2 m long, with a 0.5 m branch: not a stub
    q = t.chain(len(t.rows) - 1, [0, 1, 0], 1, 1.0, 0.02)
    t.add(q - 1, [0, 0, 1], 0.5, 0.01)
    mixed = ds.describe(t.table())
    assert 0.0 < mixed["stubShareBelow"] < 1.0


def test_many_low_stubs_pull_crown_base80_down():
    t = trunk(n=20)
    _crown(t, range(11, 19), length=3.0)
    for h in range(2, 10):
        t.chain(h - 1, [0, 1, 0], 1, 3.0, 0.03)  # eight 3 m stubs at 2..9 m: 48 m in all, 80% above = 38.4
    d = ds.describe(t.table())
    # above 3 m: the stubs at 3..9 (21 m) and the crown (24 m) = 45 ≥ 38.4; above 5 m: 15 + 24 = 39; above 6 m: 36.
    assert d["crownBase80"] * d["height"] == pytest.approx(5.0, abs=1e-6)
    assert d["stubShareBelow"] == pytest.approx(1.0)


def test_pruning_top_twigs_lowers_crown_base80_by_the_computed_amount():
    t = trunk(n=12)
    _crown(t, range(1, 11))
    full = ds.describe(t.table())
    for h in (9, 10):  # thin twigs on the top two limbs, gone at a 10 mm d_min
        t.chain(h - 1, [0, 1, 0], 1, 2.0, 0.002)
    with_twigs = ds.describe(t.table())
    pruned = ds.describe(__import__("treesim.coarsen", fromlist=["prune"]).prune(t.table(), 0.010))
    assert pruned["crownBase80"] == pytest.approx(full["crownBase80"], abs=1e-9)
    # 24 m with the twigs: 80% = 19.2 above, reached at 2 m less a 0.8 m share... level limbs: above 2 m holds 22,
    # above 3 m holds 20 ≥ 19.2, above 4 m 18: the base is 3 m, the same; the twigs sit high, so it can only rise.
    assert with_twigs["crownBase80"] >= full["crownBase80"] - 1e-9


def test_trunk_tortuosity05_is_one_on_a_straight_trunk_and_cut_at_crown_base80():
    t = trunk(n=12)
    _crown(t, range(5, 11))
    d = ds.describe(t.table())
    assert d["trunkTortuosity05"] == pytest.approx(1.0)
    assert d["trunkStretch"] == pytest.approx(d["crownBase80"] * d["height"])


def test_trunk_tortuosity05_reads_a_metres_scale_zigzag_and_drops_a_shoot_scale_one_at_one_metre():
    # A trunk of 2 m segments alternately 30° either side of vertical, then a straight top: path over chord 1/cos 30°
    # at 0.5 m (the step divides each 2 m segment exactly) and at 1 m.
    t = Tree()
    p = -1
    for k in range(6):
        p = t.add(p, [math.sin(math.radians(30)) * (1 if k % 2 == 0 else -1), 0, math.cos(math.radians(30))], 2.0, 0.2)
    top = t.chain(p, UP, 4, 1.0, 0.15)
    for node in (top - 2, top - 1, top):  # three level limbs on the straight top, above the zigzag
        t.chain(node, [1, 0, 0], 1, 2.0, 0.03)
    d = ds.describe(t.table())
    zig_top = 12 * math.cos(math.radians(30))
    assert d["crownBase80"] * d["height"] > zig_top
    straight = d["crownBase80"] * d["height"] - zig_top
    expected = (12.0 + straight) / (zig_top + straight)
    assert d["trunkTortuosity05"] == pytest.approx(expected, rel=1e-3)
    assert d["trunkTortuosity1"] == pytest.approx(expected, rel=1e-3)
    # 0.25 m segments alternating ±30°: zigzag under the 0.5 m step mostly drops out
    t = Tree()
    p = -1
    for k in range(48):
        p = t.add(p, [math.sin(math.radians(30)) * (1 if k % 2 == 0 else -1), 0, math.cos(math.radians(30))], 0.25, 0.2)
    top = t.chain(p, UP, 4, 1.0, 0.15)
    for node in (top - 2, top - 1, top):
        t.chain(node, [1, 0, 0], 1, 2.0, 0.03)
    d = ds.describe(t.table())
    assert d["trunkTortuosity05"] < 1.0 + 0.2 * (1 / math.cos(math.radians(30)) - 1)


def test_trunk_tortuosity05_is_nan_on_a_short_stretch_and_without_limbs():
    t = trunk(n=12)
    _crown(t, [1, 2, 3])  # crownBase80 near 1 m: a stretch under 2.5 m
    assert math.isnan(ds.describe(t.table())["trunkTortuosity05"])
    assert math.isnan(ds.describe(trunk(n=12).table())["crownBase80"])
    assert math.isnan(ds.describe(trunk(n=12).table())["trunkTortuosity05"])


def _bow(deg: float) -> dict:
    """3 m out at `deg` from vertical, 3 m back, then a straight top carrying three level limbs."""
    t = Tree()
    a = math.radians(deg)
    p = t.chain(-1, [math.sin(a), 0, math.cos(a)], 3, 1.0, 0.2)
    p = t.chain(p, [-math.sin(a), 0, math.cos(a)], 3, 1.0, 0.2)
    top = t.chain(p, UP, 6, 1.0, 0.15)
    for node in (top - 2, top - 1, top):
        t.chain(node, [1, 0, 0], 1, 2.0, 0.03)
    return ds.describe(t.table())


def test_bole_sway_is_zero_on_a_straight_trunk_and_the_offset_per_metre_on_a_bow():
    t = trunk(n=12)
    _crown(t, range(5, 11))
    assert ds.describe(t.table())["boleSway"] == pytest.approx(0.0, abs=1e-12)
    d = _bow(10)
    a = math.radians(10)
    zc = d["crownBase80"] * d["height"]
    kink = np.array([3 * math.sin(a), 0.0, 3 * math.cos(a)])
    end = np.array([0.0, 0.0, zc])  # the bow returns to x = 0, so the chord is vertical
    off = np.linalg.norm(np.cross(kink, end)) / np.linalg.norm(end)
    assert d["boleSway"] == pytest.approx(off / d["trunkStretch"], rel=1e-6)


def test_bole_sway_reads_a_bow_to_first_order_and_tortuosity_to_second():
    big, small = _bow(10), _bow(5)
    assert small["boleSway"] / big["boleSway"] == pytest.approx(0.5, rel=0.02)
    assert (small["trunkTortuosity05"] - 1) / (big["trunkTortuosity05"] - 1) == pytest.approx(0.25, rel=0.05)


def _tilted(deg: float, toward: tuple[float, float] = (1.0, 0.0)) -> dict:
    """A straight trunk 12 m long at `deg` from vertical toward (x, y), with three level limbs at its top."""
    t = Tree()
    a = math.radians(deg)
    p = t.chain(-1, [math.sin(a) * toward[0], math.sin(a) * toward[1], math.cos(a)], 12, 1.0, 0.2)
    for node in (p - 2, p - 1, p):
        t.chain(node, [1, 0, 0], 1, 2.0, 0.03)
    return ds.describe(t.table())


def test_lean_angle_reads_a_straight_trunks_tilt_whatever_its_azimuth():
    assert _tilted(0)["leanAngle"] == pytest.approx(0.0, abs=1e-9)
    for deg in (5, 12, 25):
        assert _tilted(deg)["leanAngle"] == pytest.approx(deg, abs=1e-9)
        assert _tilted(deg, (0.0, 1.0))["leanAngle"] == pytest.approx(deg, abs=1e-9)
        assert _tilted(deg, (-0.6, 0.8))["leanAngle"] == pytest.approx(deg, abs=1e-9)


def test_lean_angle_is_near_zero_on_a_bow_that_returns_and_nan_without_a_stretch():
    # The bow returns to x = 0 below crownBase80, so the chord is vertical: sway without lean.
    assert _bow(10)["leanAngle"] == pytest.approx(0.0, abs=1e-9)
    t = trunk(n=12)
    _crown(t, [1, 2, 3])  # a stretch under 2.5 m
    assert math.isnan(ds.describe(t.table())["leanAngle"])
    assert math.isnan(ds.describe(trunk(n=12).table())["leanAngle"])
