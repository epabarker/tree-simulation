"""Crown form and allometry: the one implementation of rust/core/src/form.rs's `form_metrics` in Python
(docs/plans/2026-11-03-reference-fidelity.md §j, amendment A). Gate b runs it on the simulator's skeletons with the
simulator's labels and `SIM` rules and must reproduce form.rs to 1e-9; describe() runs the same function on any
cylinder table with geometric labels and `DESCRIBE`'s rules. Nothing here knows which side a table came from.

The table is cylinders.Cylinders: metres, **z up** (form.rs's y is our z; its horizontal x and z are our x and y).
Heights are read from the root's base z (the simulator's is 0, so form.rs's absolute heights are the same numbers).

What the parameters change, and what each reproduces on the simulator's side:
- `labels` (Labels): which child continues its parent (form.rs: the child in slot 0), branch order, and axis ids.
- `Rules.min_subtree`, `min_limb`: form.rs's MIN_SUBTREE (5 metamers in the subtree) and MIN_LIMB (10 metamers on a
  first-order axis), as counts, or as wood length in metres (a QSM's cylinder count is its reconstruction's, not
  the tree's: 10 metamers ≈ 2.5 m at 0.25 m a cell).
- `Rules.bole_limb`: the crown base (the profile's foot, leaderDominance's floor) is the lowest first-order axis of
  any size in form.rs; a size here keeps a dead stub or an epicormic shoot, which a QSM keeps and the simulator
  sheds, from setting it.
- `Rules.window`: limb droop and upturn and branchAngle2 read each segment's own heading in form.rs; a length here
  reads the chord over consecutive stretches of that many metres along the axis instead (a QSM's first and last
  cylinders are its noisiest directions).
- `Rules.width`: a band's width is the larger of its x and y extents in form.rs ("axes"); "diameter" is the band's
  largest extent over all azimuths, which does not depend on where a scanner's x axis happened to point.

Summations run in table order, one term at a time, as the Rust loops do (Python's sum() compensates and numpy's is
pairwise: either can move a threshold that reads the sum, such as weighted_median's tie at half).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from treesim.cylinders import Cylinders

PROFILE_BANDS = 10
FORK_RATIO = 0.7
FORM_COLUMNS = (
    "widestAt", "profileCentre", "crownFullness", "forkHeight", "leaderDominance", "branchAngle2", "limbDroop",
    "limbUpturn", "junctionDelta", "ldSlope", "leafStemSlope", "limbElevation",
)
NAN = float("nan")


@dataclass(frozen=True)
class Labels:
    nxt: np.ndarray  # each cylinder's continuing child, -1 if none
    order: np.ndarray  # branch order, 0 on the trunk
    axis: np.ndarray  # an id shared along an axis


@dataclass(frozen=True)
class Rules:
    min_subtree: tuple[str, float] = ("count", 5)  # ("count", n) or ("length", metres)
    min_limb: tuple[str, float] = ("count", 10)
    bole_limb: tuple[str, float] | None = None
    window: float | None = None
    width: str = "axes"  # or "diameter"
    bands: int = PROFILE_BANDS


SIM = Rules()


def _ln(x: float) -> float:
    """libm's ln on the reals: -inf at 0, NaN below 0 and at NaN."""
    if x > 0:
        return math.log(x)
    return -math.inf if x == 0 else NAN


def median(xs: list[float]) -> float:
    if not xs:
        return NAN
    s = sorted(xs)
    k = len(s) >> 1
    return s[k] if len(s) % 2 else (s[k - 1] + s[k]) / 2.0


def ols_slope(x: list[float], y: list[float]) -> float:
    n = len(x)
    if n < 5:
        return NAN
    mx = my = 0.0
    for i in range(n):
        mx += x[i]
        my += y[i]
    mx /= n
    my /= n
    sxy = sxx = 0.0
    for i in range(n):
        dx = x[i] - mx
        sxy += dx * (y[i] - my)
        sxx += dx * dx
    return sxy / sxx if sxx > 1e-12 else NAN


def weighted_median(xs: list[tuple[float, float]]) -> float:
    total = 0.0
    for _, w in xs:
        total += w
    if not xs or total <= 0.0:
        return NAN
    xs = sorted(xs, key=lambda v: v[0])
    half = total / 2.0
    below = 0.0
    for k in range(len(xs)):
        below += xs[k][1]
        if abs(below - half) <= 1e-9 * total and k + 1 < len(xs):
            return (xs[k][0] + xs[k + 1][0]) / 2.0
        if below > half:
            return xs[k][0]
    return xs[-1][0]


def _elevation(a: np.ndarray) -> float:
    return math.atan2(a[2], math.hypot(a[0], a[1])) * 180.0 / math.pi


def _from_vertical(a: np.ndarray) -> float:
    return math.acos(max(-1.0, min(1.0, a[2]))) * (180.0 / math.pi)


def _stretches(c: Cylinders, members: list[int], window: float | None) -> list[np.ndarray]:
    """An axis's headings in order: each cylinder's own (window None), or the chord's over consecutive stretches
    of at least `window` metres. A shorter remainder joins the last stretch (alone it would be the axis's last,
    noisiest cylinders again); an axis shorter than `window` is one stretch."""
    if window is None:
        return [c.axis[i] for i in members]
    ends: list[tuple[np.ndarray, int]] = []  # (start, last member) per stretch
    run, start = 0.0, None
    for i in members:
        if start is None:
            start = c.start[i]
        run += c.length[i]
        if run >= window:
            ends.append((start, i))
            run, start = 0.0, None
    if start is not None:
        if ends:
            ends[-1] = (ends[-1][0], members[-1])
        else:
            ends.append((start, members[-1]))
    return [c.tip[last] - s for s, last in ends]


def _members(labels: Labels, order: int) -> list[tuple[int, list[int]]]:
    """The axes of an order, in order of first appearance, each with its cylinders in table order."""
    axes: dict[int, list[int]] = {}
    for i in range(len(labels.order)):
        if labels.order[i] == order:
            axes.setdefault(int(labels.axis[i]), []).append(i)
    return list(axes.items())


def _axis_size(c: Cylinders, members: list[int], rule: tuple[str, float]) -> bool:
    kind, n = rule
    if kind == "count":
        return len(members) >= n
    run = 0.0
    for i in members:
        run += c.length[i]
    return run >= n


def limb_shapes(c: Cylinders, labels: Labels, rules: Rules = SIM) -> list[tuple[float, float]]:
    out = []
    for _, members in _members(labels, 1):
        if not _axis_size(c, members, rules.min_limb):
            continue
        e = [_elevation(h) for h in _stretches(c, members, rules.window)]
        low = math.inf
        for v in e:
            low = min(low, v)
        out.append((e[0] - low, e[-1] - low))
    return out


def limb_elevation(c: Cylinders, labels: Labels) -> float:
    return weighted_median(
        [(_elevation(c.axis[i]), float(c.length[i])) for i in range(len(c)) if labels.order[i] == 1 and c.length[i] > 0]
    )


def _bole_axes(c: Cylinders, labels: Labels, rules: Rules) -> set[int] | None:
    """The first-order axes big enough to set the crown base (None: any)."""
    if rules.bole_limb is None:
        return None
    return {a for a, m in _members(labels, 1) if _axis_size(c, m, rules.bole_limb)}


def _band_width(xy: list[np.ndarray], how: str) -> float:
    if len(xy) < 2:
        return 0.0
    p = np.array(xy)
    if how == "axes":
        lo, hi = p.min(axis=0), p.max(axis=0)
        wx = hi[0] - lo[0] if hi[0] > lo[0] else 0.0
        wy = hi[1] - lo[1] if hi[1] > lo[1] else 0.0
        return float(max(wx, wy))
    # The largest extent over all azimuths: the diameter of the band's points.
    p = np.unique(p, axis=0)
    if len(p) > 64:
        from scipy.spatial import ConvexHull, QhullError

        try:
            p = p[ConvexHull(p).vertices]
        except QhullError:  # collinear: the extreme points are among the bounding box's
            pass
    d = p[:, None, :] - p[None, :, :]
    return float(np.sqrt((d * d).sum(axis=2)).max())


def crown_profile(c: Cylinders, labels: Labels, rules: Rules = SIM) -> list[float]:
    bands = rules.bands
    z0 = c.start[0, 2]
    tip = c.tip
    big = _bole_axes(c, labels, rules)
    height, bole = 0.0, math.inf
    for i in range(len(c)):
        y = tip[i, 2] - z0
        if y > height:
            height = y
        p = c.parent[i]
        if labels.order[i] == 1 and p >= 0 and labels.order[p] == 0 and (big is None or labels.axis[i] in big):
            bole = min(bole, c.start[i, 2] - z0)
    if not math.isfinite(bole) or bole >= height:
        bole = 0.0
    pts: list[list[np.ndarray]] = [[] for _ in range(bands)]
    span = height - bole
    if span > 0.0:
        for i in range(len(c)):
            y = tip[i, 2] - z0
            if y >= bole:
                k = int(min(bands - 1.0, math.floor(((y - bole) / span) * bands)))
                pts[k].append(tip[i, :2])
    widths = [_band_width(p, rules.width) for p in pts]
    widest = 0.0
    for w in widths:
        widest = max(widest, w)
    return [w / widest if widest > 0.0 else 0.0 for w in widths]


def junction_exponents(c: Cylinders, radius: np.ndarray) -> list[float]:
    """Δ at every node with two or more children: Σ (r_child / r_parent)^Δ = 1 by Newton from 0.5 (c6.rs)."""
    out = []
    kids: list[list[int]] = [[] for _ in range(len(c))]
    for i in range(1, len(c)):
        kids[c.parent[i]].append(i)
    for p in range(len(c)):
        if len(kids[p]) < 2:
            continue
        rp = radius[p]
        logs, solvable = [], True
        for k in kids[p]:
            x = radius[k] / rp if rp != 0 else (math.inf if radius[k] > 0 else NAN)
            if x >= 1.0 or x <= 0.0:
                solvable = False
            logs.append(_ln(x))
        if not solvable:
            continue

        def f(d: float) -> float:
            s = -1.0
            for v in logs:
                s += math.exp(d * v)
            return s

        if f(0.5) < 0.0 or f(8.0) > 0.0:
            continue
        d = 0.5
        for _ in range(100):
            fd, slope = -1.0, 0.0
            for v in logs:
                e = math.exp(d * v)
                fd += e
                slope += e * v
            step = fd / slope if slope != 0 else (NAN if fd == 0 else math.copysign(math.inf, fd) * math.copysign(1, slope))
            if not (step < 0.0) or step > -1e-13:
                break
            d -= step
        out.append(d)
    return out


def _big(count: np.ndarray, wood: np.ndarray, rule: tuple[str, float]) -> np.ndarray:
    kind, n = rule
    return count >= n if kind == "count" else wood >= n


def form(c: Cylinders, labels: Labels, rules: Rules = SIM, radius: np.ndarray | None = None,
         leaf: np.ndarray | None = None, pipe: np.ndarray | None = None) -> dict:
    """form.rs's form_metrics: FORM_COLUMNS and the width profile ("profile"). `radius` defaults to the table's
    radius; `leaf` is each cylinder's own leaf area (None: leafStemSlope is NaN); `pipe` the radius the leaf–section
    slope reads (form.rs: radius − stress wood; default `radius`)."""
    n = len(c)
    r = c.radius if radius is None else radius
    pipe = r if pipe is None else pipe
    z0 = c.start[0, 2]
    tipz = c.tip[:, 2] - z0
    order, axis, nxt = labels.order, labels.axis, labels.nxt
    parent, length = c.parent, c.length

    profile = crown_profile(c, labels, rules)
    widest_at, sum_w, sum_wh, best = NAN, 0.0, 0.0, -1.0
    for k, w in enumerate(profile):
        h = (k + 0.5) / len(profile)
        sum_w += w
        sum_wh += w * h
        if w > best:
            best, widest_at = w, h

    count = np.zeros(n, int)
    wood = np.zeros(n)  # subtree wood length, for length rules
    top = tipz.copy()
    leafs = np.zeros(n) if leaf is None else np.asarray(leaf, float).copy()
    dist = np.zeros(n)
    reach = np.zeros(n)
    for i in range(n):
        p = parent[i]
        dist[i] = (dist[p] if p >= 0 else 0.0) + length[i]
    for i in range(n - 1, -1, -1):
        count[i] += 1
        wood[i] += length[i]
        if dist[i] > reach[i]:
            reach[i] = dist[i]
        p = parent[i]
        if p < 0:
            continue
        count[p] += count[i]
        wood[p] += wood[i]
        top[p] = max(top[p], top[i])
        leafs[p] += leafs[i]
        if reach[i] > reach[p]:
            reach[p] = reach[i]
    big = _big(count, wood, rules.min_subtree)

    is_main = np.zeros(n, bool)
    for p in range(n):
        if nxt[p] >= 0:
            is_main[nxt[p]] = True
    bole_axes = _bole_axes(c, labels, rules)
    thickest = np.zeros(n)
    any_lateral = np.zeros(n, bool)
    height, bole = 0.0, math.inf
    for i in range(n):
        if tipz[i] > height:
            height = tipz[i]
        p = parent[i]
        if p < 0:
            continue
        if not is_main[i]:
            any_lateral[p] = True
            if big[i] and r[i] > thickest[p]:
                thickest[p] = r[i]
        if order[i] == 1 and order[p] == 0 and (bole_axes is None or axis[i] in bole_axes):
            bole = min(bole, c.start[i, 2] - z0)
    if not math.isfinite(bole):
        bole = height

    divides = np.zeros(n, bool)
    for i in range(n):
        p = parent[i]
        if p < 0 or is_main[i] or not big[i]:
            continue
        nx = nxt[p]
        if nx < 0:
            continue
        y = tipz[p]
        if r[i] >= FORK_RATIO * r[nx] and top[i] - y >= FORK_RATIO * (top[nx] - y):
            divides[p] = True

    fork_height, dominance = 1.0, []
    i = 0 if n > 0 else -1
    while i >= 0:
        nx = nxt[i]
        y = tipz[i]
        if nx < 0 or order[nx] != 0:
            if any_lateral[i] and fork_height == 1.0 and height > 0.0:
                fork_height = y / height
            break
        if divides[i] and fork_height == 1.0 and height > 0.0:
            fork_height = y / height
        if thickest[i] > 0.0 and y >= bole:
            dominance.append(r[nx] / thickest[i])
        i = nx

    log_d, log_l = [], []
    angle2, n2 = 0.0, 0.0
    starts2 = {}  # order-2 axes off order-1 parents: their first cylinder
    for i in range(n):
        p = parent[i]
        if p < 0 or is_main[i]:
            continue
        if order[i] == 2 and order[p] == 1:
            if rules.window is None:
                angle2 += _from_vertical(c.axis[i])
                n2 += 1.0
            else:
                starts2[int(axis[i])] = i
        if (order[i] == 1 or order[i] == 2) and big[i] and r[i] > 0.0:
            log_d.append(_ln(2.0 * r[i]))
            log_l.append(_ln(reach[i] - dist[p]))
    if starts2:
        for a, members in _members(labels, 2):
            if a in starts2 and members and members[0] == starts2[a]:
                h = _stretches(c, members, rules.window)[0]
                angle2 += _from_vertical(h / np.linalg.norm(h))
                n2 += 1.0

    log_a, log_leaf = [], []
    for i in range(n):
        rw = pipe[i]
        if not big[i] or leafs[i] <= 0.0 or rw <= 0.0:
            continue
        log_a.append(_ln(math.pi * rw * rw))
        log_leaf.append(_ln(leafs[i]))

    shapes = limb_shapes(c, labels, rules)
    nb = float(len(profile))
    values = [
        widest_at,
        sum_wh / sum_w if sum_w > 0.0 else NAN,
        sum_w / nb if nb > 0 else NAN,
        fork_height,
        median(dominance),
        angle2 / n2 if n2 > 0.0 else NAN,
        median([s[0] for s in shapes]),
        median([s[1] for s in shapes]),
        median(junction_exponents(c, r)),
        ols_slope(log_d, log_l),
        ols_slope(log_a, log_leaf),
        limb_elevation(c, labels),
    ]
    return {**{k: float(v) for k, v in zip(FORM_COLUMNS, values)}, "profile": [float(w) for w in profile]}
