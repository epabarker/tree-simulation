"""describe(): the Level 1 descriptors of one cylinder table, read identically from a real QSM and a simulated
skeleton (docs/plans/2026-11-03-reference-fidelity.md §c, §j; ADR 0049). The form.rs descriptors are form.py's,
the one implementation (amendment A), here with geometric labels (continuation by subtree wood volume, cylinders.py)
and `DESCRIBE`'s rules; the new ones are below. Wood only: QSMs are leaf-off.

Measurement design: what each descriptor depends on beyond the tree.

| descriptor | labels | resolution | referenced to |
|---|---|---|---|
| junctionDelta | none | high: twig radii read large; a child at or over its parent's radius is skipped | parent radius |
| bifurcationRatio | none (Strahler) | stream counts high, the slope moderate | topology |
| leaderDominance, forkHeight, taper, lengthByOrder | trunk, order | moderate | parent radius; heights to base z |
| branchAngle2 | order 1 → 2 | high (the branch's first 0.5 m) | gravity: from vertical, not the insertion angle |
| limbDroop, limbUpturn | order-1 axes | highest (first, last and lowest 0.5 m stretch) | gravity |
| limbElevation | order 1 | low (length-weighted) | gravity |
| profile p0–p3, widestAt, profileCentre, crownFullness | the crown base via order | low | gravity; azimuth-free |
| pendulousFraction | none | high: a QSM's terminal cylinder is where its reconstruction stopped | gravity |
| limbElevation05 | order 1 | moderate: each path resampled at 0.5 m (v3) | gravity |
| pendulousFraction05 | axes | moderate: each axis's last 0.5 m of arc (v3) | gravity |
| tortuosity | axes | high, and 1c's re-cut flattens it by construction | none |
| tortuosity05 | axes | moderate: each path resampled at 0.5 m (H3), so zigzag under the step drops out | none |
| centroidHeight | none | low | base z, H |
| crownBase80 (70, 90) | trunk | low (length quantile; a stub counts by its length) | base z, H |
| trunkTortuosity05 | trunk | moderate: the trunk's path resampled at 0.5 m, to crownBase80's height | none |

- **The fixed 0.5 m step (v3, the user, 2026-11-03):** every descriptor that depends on segment length is read at
  RESAMPLE on both sides (a QSM's cylinders and a simulator's metamers alike): droop, upturn and branchAngle2 as 0.5 m
  chords (`Rules.window`), tortuosity05, limbElevation05 and pendulousFraction05 on paths resampled at 0.5 m of arc.
  The per-cylinder versions (tortuosity, limbElevation, pendulousFraction) stay computed, report-only.

- **Rules (form.py):** subtrees of ≥ 1.25 m of wood and limbs of ≥ 2.5 m (form.rs's 5 and 10 metamers at 0.25 m a
  cell); the crown base is the lowest first-order axis of ≥ 2.5 m (form.rs: any); headings read as chords over
  0.5 m stretches; a band's width is its diameter over all azimuths (a scanner's x axis is arbitrary). 4 bands
  (the principle line, §b), so widestAt takes four values only: a quantised descriptor.
- **Radii:** descriptors read `radius_raw` (TreeQSM's UnmodRadius; rTwig's corrected radii are partly its taper
  model); the labels' continuation uses the table's `radius`. On the simulator both are the one radius.
- **Strahler:** a tip is order 1; a node takes its children's largest order, plus one where two or more children
  share it (the simulator's nodes carry up to eight). A stream is a run of cylinders of one order. The ratio is
  exp(−slope) of ln N_ω on ω, over every order and, beside it, without order 1 (the twigs a QSM loses first).
- **crownBase80 (2026-11-05, docs/experiments/2026-11-05-crown-base-and-bole.md):** the height above the root's base,
  over H, above which 80% of the non-trunk wood length (order ≥ 1) lies: the length-weighted 20% quantile of z, each
  cylinder's length spread evenly over its z-extent (a level cylinder is a point). **The 80% is a convention**;
  crownBase70 and crownBase90 are read beside it. Unlike `crownBase` (the lowest ≥ 2.5 m limb), one dead stub moves it
  only by its share of the length. On the simulator it is read after coarsening, as every descriptor is.
- **trunkTortuosity05:** the trunk's path (its chain by continuation, the starts and the last tip) from the root to
  where it first reaches crownBase80's height, resampled at 0.5 m, over its chord; NaN under 2.5 m or without a
  crownBase80. Diagnostics beside it (`DIAGNOSTIC`, not descriptors): the same at a 1 m step, the stretch's arc length
  in metres, and the share of the non-trunk length below crownBase80 on order-1 axes that carry no branch (stubs).
- **Report-only:** `leafStemSlope` (NaN without leaf area: no wood proxy, tip counts being the most
  resolution-dependent quantity there is), `crownBase` / H by wood (the field's crown base is Weiser's, §c).
- **Below ground (R4, the user's ruling 2026-11-03: start or tip):** a cylinder that starts or ends below the
  root's base z is dropped with its subtree, counted per tree (`below`, `below_volume`); `below_start` counts what
  the start-only rule would have dropped. No tree of the four datasets has either under R1's models.
"""

from __future__ import annotations

import math

import numpy as np

from treesim import cylinders as cy
from treesim.form import FORM_COLUMNS, Labels, Rules, form, weighted_median

DESCRIBE = Rules(min_subtree=("length", 1.25), min_limb=("length", 2.5), bole_limb=("length", 2.5), window=0.5,
                 width="diameter", bands=4)
LIMB = 2.5
NEW = ("bifurcationRatio", "bifurcationRatio2", "tortuosity", "tortuosity05", "length0", "length1", "length2", "length3",
       "pendulousFraction", "taper", "centroidHeight", "limbElevation05", "pendulousFraction05",
       "crownBase80", "crownBase70", "crownBase90", "trunkTortuosity05")
REPORT = ("leafStemSlope", "crownBase")
DIAGNOSTIC = ("trunkTortuosity1", "trunkStretch", "stubShareBelow")


def subset(c: cy.Cylinders, keep: np.ndarray) -> cy.Cylinders:
    """The rows in `keep` (a boolean mask closed under ancestry), in their order, parents remapped."""
    idx = np.flatnonzero(keep)
    remap = np.full(len(c), -1)
    remap[idx] = np.arange(len(idx))
    p = c.parent[idx]
    out = cy.Cylinders(c.start[idx], c.axis[idx], c.length[idx], c.radius[idx], c.radius_raw[idx],
                       np.where(p >= 0, remap[np.maximum(p, 0)], -1))
    cy.check(out)
    return out


def _below(c: cy.Cylinders, low: np.ndarray) -> np.ndarray:
    """`low`'s cylinders and their subtrees (the root never)."""
    out = low.copy()
    out[0] = False
    for i in range(1, len(c)):
        out[i] |= out[c.parent[i]]
    return out


def drop_below_ground(c: cy.Cylinders) -> tuple[cy.Cylinders, dict]:
    z0 = c.start[0, 2]
    vol = np.pi * c.radius**2 * c.length
    by_start = _below(c, c.start[:, 2] < z0)
    by_tip = _below(c, (c.start[:, 2] < z0) | (c.tip[:, 2] < z0))
    info = {"below": int(by_tip.sum()), "below_volume": float(vol[by_tip].sum() / vol.sum()),
            "below_start": int(by_start.sum())}
    return (subset(c, ~by_tip) if by_tip.any() else c), info


def geometric_labels(c: cy.Cylinders) -> Labels:
    nxt = cy.continuation(c)
    order, axis = cy.order_and_axis(c, nxt)
    return Labels(nxt=nxt, order=order, axis=axis)


def strahler(c: cy.Cylinders) -> np.ndarray:
    kids = cy.children_of(c.parent)
    w = np.ones(len(c), int)
    for i in range(len(c) - 1, -1, -1):
        if kids[i]:
            orders = [w[k] for k in kids[i]]
            top = max(orders)
            w[i] = top + (orders.count(top) >= 2)
    return w


def _ratio(counts: dict[int, int]) -> float:
    """exp(−slope) of ln N on order, by least squares (NaN with fewer than three orders)."""
    ks = sorted(counts)
    if len(ks) < 3:
        return math.nan
    x = np.array(ks, float)
    y = np.log([counts[k] for k in ks])
    return float(np.exp(-np.polyfit(x, y, 1)[0]))


def bifurcation(c: cy.Cylinders) -> tuple[float, float]:
    w = strahler(c)
    counts: dict[int, int] = {}
    for i in range(len(c)):
        if i == 0 or w[c.parent[i]] != w[i]:
            counts[int(w[i])] = counts.get(int(w[i]), 0) + 1
    return _ratio(counts), _ratio({k: v for k, v in counts.items() if k > 1})


def tortuosity(c: cy.Cylinders, labels: Labels) -> float:
    """The median over first- and higher-order axes of ≥ LIMB metres: path length over chord."""
    axes: dict[int, list[int]] = {}
    for i in range(len(c)):
        if labels.order[i] >= 1:
            axes.setdefault(int(labels.axis[i]), []).append(i)
    vals = []
    for members in axes.values():
        path = float(c.length[members].sum())
        chord = float(np.linalg.norm(c.tip[members[-1]] - c.start[members[0]]))
        if path >= LIMB and chord > 0:
            vals.append(path / chord)
    return float(np.median(vals)) if vals else math.nan


RESAMPLE = 0.5


def _resample(points: np.ndarray, at: np.ndarray | None = None, step: float = RESAMPLE) -> np.ndarray:
    """A polyline's points every `step` metres of arc and at its end (or at the arc lengths `at`)."""
    seg = np.linalg.norm(np.diff(points, axis=0), axis=1)
    along = np.concatenate([[0.0], np.cumsum(seg)])
    if at is None:
        at = np.append(np.arange(0.0, along[-1], step), along[-1])
    return np.stack([np.interp(at, along, points[:, k]) for k in range(3)], axis=1)


def _resampled_length(points: np.ndarray, step: float = RESAMPLE) -> float:
    """The length of a polyline resampled at `step` metres of arc: the chords between points every `step` along it,
    and the last to its end (H3: a QSM's cylinder zigzag and a metamer's wobble under the step drop out alike)."""
    return float(np.linalg.norm(np.diff(_resample(points, step=step), axis=0), axis=1).sum())


def _paths(c: cy.Cylinders, labels: Labels, keep) -> list[np.ndarray]:
    """Each axis whose order passes `keep`, as its polyline: its cylinders' starts and its last tip."""
    axes: dict[int, list[int]] = {}
    for i in range(len(c)):
        if keep(labels.order[i]):
            axes.setdefault(int(labels.axis[i]), []).append(i)
    return [np.vstack([c.start[m], c.tip[m[-1]]]) for m in axes.values()]


def limb_elevation05(c: cy.Cylinders, labels: Labels) -> float:
    """The length-weighted median elevation (degrees) of the 0.5 m stretches of every first-order path: resampled
    first, then each chord weighted by its length (v3; limbElevation reads each cylinder)."""
    xs = []
    for points in _paths(c, labels, lambda o: o == 1):
        for d in np.diff(_resample(points), axis=0):
            n = float(np.linalg.norm(d))
            if n > 0:
                xs.append((math.degrees(math.atan2(d[2], math.hypot(d[0], d[1]))), n))
    return weighted_median(xs)


def pendulous_fraction05(c: cy.Cylinders, labels: Labels) -> float:
    """The share of first- and higher-order length on axes whose last 0.5 m of arc heads below horizontal (the
    chord over that stretch, or the whole axis if shorter; v3; pendulousFraction reads terminal cylinders)."""
    down = total = 0.0
    for points in _paths(c, labels, lambda o: o >= 1):
        length = float(np.linalg.norm(np.diff(points, axis=0), axis=1).sum())
        if length <= 0:
            continue
        end = _resample(points, at=np.array([max(0.0, length - RESAMPLE), length]))
        total += length
        down += length if end[1, 2] - end[0, 2] < 0 else 0.0
    return down / total if total > 0 else math.nan


def tortuosity05(c: cy.Cylinders, labels: Labels) -> float:
    """tortuosity() with each axis's path (its cylinders' starts and its last tip) resampled at RESAMPLE metres."""
    axes: dict[int, list[int]] = {}
    for i in range(len(c)):
        if labels.order[i] >= 1:
            axes.setdefault(int(labels.axis[i]), []).append(i)
    vals = []
    for members in axes.values():
        if float(c.length[members].sum()) < LIMB:
            continue
        points = np.vstack([c.start[members], c.tip[members[-1]]])
        chord = float(np.linalg.norm(points[-1] - points[0]))
        if chord > 0:
            vals.append(_resampled_length(points) / chord)
    return float(np.median(vals)) if vals else math.nan


def length_above(c: cy.Cylinders, rows: np.ndarray, z: float) -> float:
    """The length of the cylinders `rows` above height z, each cylinder's length spread evenly over its z-extent."""
    lo = np.minimum(c.start[rows, 2], c.tip[rows, 2])
    hi = np.maximum(c.start[rows, 2], c.tip[rows, 2])
    span = hi - lo
    frac = np.where(span > 0, np.clip((hi - z) / np.where(span > 0, span, 1.0), 0.0, 1.0), (lo >= z).astype(float))
    return float((c.length[rows] * frac).sum())


def crown_base_at(c: cy.Cylinders, labels: Labels, share: float) -> float:
    """The height above the base z, over H, above which `share` of the non-trunk length lies (bisection on the
    monotone length above; NaN without non-trunk wood)."""
    rows = np.flatnonzero(labels.order >= 1)
    h = cy.height(c)
    if len(rows) == 0 or h <= 0:
        return math.nan
    total = float(c.length[rows].sum())
    z0 = c.start[0, 2]
    lo = float(min(c.start[rows, 2].min(), c.tip[rows, 2].min()))
    hi = float(max(c.start[rows, 2].max(), c.tip[rows, 2].max()))
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if length_above(c, rows, mid) >= share * total:
            lo = mid
        else:
            hi = mid
    return (0.5 * (lo + hi) - z0) / h


def trunk_stretch(c: cy.Cylinders, labels: Labels, base: float) -> np.ndarray | None:
    """The trunk's polyline from the root to where it first reaches z0 + base·H (the whole chain if it never does)."""
    if not math.isfinite(base):
        return None
    chain = trunk_chain(labels)
    points = np.vstack([c.start[chain], c.tip[chain[-1]]])
    cut = c.start[0, 2] + base * cy.height(c)
    above = np.flatnonzero(points[:, 2] >= cut)
    if len(above) == 0 or above[0] == 0:
        return points if len(above) == 0 else points[:1]
    k = int(above[0])
    a, b = points[k - 1], points[k]
    t = (cut - a[2]) / (b[2] - a[2]) if b[2] != a[2] else 1.0
    return np.vstack([points[:k], a + t * (b - a)])


def trunk_tortuosity(points: np.ndarray | None, step: float = RESAMPLE) -> float:
    """Path (resampled at `step`) over chord of a trunk stretch; NaN under LIMB metres or without one."""
    if points is None or len(points) < 2:
        return math.nan
    arc = float(np.linalg.norm(np.diff(points, axis=0), axis=1).sum())
    chord = float(np.linalg.norm(points[-1] - points[0]))
    if arc < LIMB or chord <= 0:
        return math.nan
    return _resampled_length(points, step) / chord


def stub_share_below(c: cy.Cylinders, labels: Labels, base: float) -> float:
    """Of the non-trunk length below z0 + base·H, the share on order-1 axes that carry no branch (dead-stub proxy)."""
    if not math.isfinite(base):
        return math.nan
    rows = np.flatnonzero(labels.order >= 1)
    cut = c.start[0, 2] + base * cy.height(c)
    below = float(c.length[rows].sum()) - length_above(c, rows, cut)
    if below <= 0:
        return math.nan
    branched = {int(labels.axis[c.parent[i]]) for i in range(1, len(c))
                if labels.order[c.parent[i]] == 1 and labels.axis[i] != labels.axis[c.parent[i]]}
    stubs = np.array([i for i in rows if labels.order[i] == 1 and int(labels.axis[i]) not in branched], int)
    if len(stubs) == 0:
        return 0.0
    return (float(c.length[stubs].sum()) - length_above(c, stubs, cut)) / below


def _dbh_index(c: cy.Cylinders, chain: list[int]) -> int:
    along = np.cumsum(c.length[chain])
    return chain[min(int(np.searchsorted(along, cy.BREAST_HEIGHT)), len(chain) - 1)]


def taper(c: cy.Cylinders, labels: Labels, height: float) -> float:
    """The trunk's raw diameter where it crosses half the height over its raw DBH (NaN if the trunk ends lower)."""
    chain = trunk_chain(labels)
    half = c.start[0, 2] + 0.5 * height
    at = next((i for i in chain if c.tip[i, 2] >= half), None)
    if at is None:
        return math.nan
    return float(c.radius_raw[at] / c.radius_raw[_dbh_index(c, chain)])


def describe(c: cy.Cylinders, leaf: np.ndarray | None = None) -> dict:
    """Every descriptor of one tree (FORM_COLUMNS but leafStemSlope, p0–p3, NEW), REPORT, and its meta: DBH, H,
    the below-ground counts and the internal checks."""
    c, below = drop_below_ground(c)
    labels = geometric_labels(c)
    f = form(c, labels, DESCRIBE, radius=c.radius_raw, leaf=leaf)
    h = cy.height(c)
    z0 = c.start[0, 2]
    total = float(c.length.sum())
    by_order = [float(c.length[np.minimum(labels.order, 3) == k].sum()) / total for k in range(4)]
    kids = cy.children_of(c.parent)
    tips = np.array([not k for k in kids])
    tip_len = float(c.length[tips].sum())
    down = float(c.length[tips & (c.axis[:, 2] < 0)].sum())
    mid = c.start[:, 2] + 0.5 * c.axis[:, 2] * c.length - z0
    big = {a for a in set(labels.axis[labels.order == 1].tolist())
           if c.length[labels.axis == a].sum() >= LIMB}
    bases = [c.start[i, 2] - z0 for i in range(1, len(c))
             if labels.order[i] == 1 and labels.order[c.parent[i]] == 0 and labels.axis[i] in big]
    r2, r2_no_twigs = bifurcation(c)
    cb = {k: crown_base_at(c, labels, k / 100.0) for k in (70, 80, 90)}
    stretch = trunk_stretch(c, labels, cb[80])
    out = {k: f[k] for k in FORM_COLUMNS if k != "leafStemSlope"}
    out.update({f"p{k}": w for k, w in enumerate(f["profile"])})
    out.update({
        "bifurcationRatio": r2, "bifurcationRatio2": r2_no_twigs, "tortuosity": tortuosity(c, labels),
        "tortuosity05": tortuosity05(c, labels),
        **{f"length{k}": v for k, v in enumerate(by_order)},
        "pendulousFraction": down / tip_len if tip_len > 0 else math.nan,
        "taper": taper(c, labels, h),
        "centroidHeight": float((c.length * mid).sum() / total / h) if h > 0 and total > 0 else math.nan,
        "limbElevation05": limb_elevation05(c, labels), "pendulousFraction05": pendulous_fraction05(c, labels),
        "leafStemSlope": f["leafStemSlope"],
        **{f"crownBase{k}": v for k, v in cb.items()},
        "trunkTortuosity05": trunk_tortuosity(stretch), "trunkTortuosity1": trunk_tortuosity(stretch, 1.0),
        "trunkStretch": float(np.linalg.norm(np.diff(stretch, axis=0), axis=1).sum()) if stretch is not None
        else math.nan,
        "stubShareBelow": stub_share_below(c, labels, cb[80]),
        "crownBase": min(bases) / h if bases and h > 0 else math.nan,
        "dbh": 2.0 * float(c.radius_raw[_dbh_index(c, trunk_chain(labels))]), "height": h,
        **below, **{f"check_{k}": bool(v) for k, v in cy.internal_checks(c).items()},
    })
    return out


def trunk_chain(labels: Labels) -> list[int]:
    chain = [0]
    while labels.nxt[chain[-1]] >= 0:
        chain.append(int(labels.nxt[chain[-1]]))
    return chain

