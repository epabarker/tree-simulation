"""The common cylinder table (docs/plans/2026-11-03-reference-fidelity.md §c, §j): one representation for a
real QSM and a simulated skeleton, so that one describe() reads both.

Per cylinder: start (x, y, z), a unit axis, length and radius in metres, **z up**; `radius_raw` is the radius
before any taper or parent correction (TreeQSM's UnmodRadius; rTwig's corrected radii are partly its own taper
model, so radius descriptors read raw, §c); `parent` is -1 at the root and always lower than the child.

Continuation and order come from geometry, the same on both sides, never from TreeQSM's BranchOrder or the
simulator's slot 0 (§c): at each node the child carrying the larger subtree wood volume Σπr²l continues (ties: the
smaller turn from the parent's axis), every other child starts an axis one order higher. Wood volume, not
cylinder count: a count depends on how finely a reconstruction cut its cylinders.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

BREAST_HEIGHT = 1.3
# Two subtree volumes this close (relative) count as a tie, settled by the turn from the parent's axis.
TIE = 1e-12


@dataclass(frozen=True)
class Cylinders:
    start: np.ndarray  # (n, 3)
    axis: np.ndarray  # (n, 3), unit
    length: np.ndarray
    radius: np.ndarray
    radius_raw: np.ndarray
    parent: np.ndarray  # int, -1 at the root

    def __len__(self) -> int:
        return len(self.length)

    @property
    def tip(self) -> np.ndarray:
        return self.start + self.axis * self.length[:, None]


def from_arrays(start, axis, length, radius, parent, radius_raw=None) -> tuple[Cylinders, dict]:
    """A validated table from a reader's arrays (parent -1 at the root). Keeps the component reachable from the
    first root and orders it parent-before-child (a stable breadth-first order from the root). QSMs carry orphan
    fragments, extra roots the reconstruction never attached (TreeML 000081: 51 roots; BioDiv HEW29_G_64: 18):
    they have no topology to read and are dropped. Returns the table and {"dropped": cylinders dropped,
    "dropped_volume": their share of the wood volume}."""
    start = np.asarray(start, float).reshape(-1, 3)
    axis = np.asarray(axis, float).reshape(-1, 3)
    length = np.asarray(length, float).ravel()
    radius = np.asarray(radius, float).ravel()
    radius_raw = radius if radius_raw is None else np.asarray(radius_raw, float).ravel()
    parent = np.asarray(parent, int).ravel()
    n = len(length)
    roots = np.flatnonzero(parent < 0)
    if n == 0 or len(roots) == 0:
        raise ValueError("no root cylinder")
    kids = children_of(parent)
    order = [int(roots[0])]
    k = 0
    while k < len(order):
        order.extend(kids[order[k]])
        k += 1
    order = np.array(order)
    remap = np.full(n, -1)
    remap[order] = np.arange(len(order))
    p = parent[order]
    new_parent = np.where(p >= 0, remap[np.maximum(p, 0)], -1)
    norm = np.linalg.norm(axis[order], axis=1)
    c = Cylinders(
        start=start[order],
        axis=axis[order] / np.where(norm > 0, norm, 1.0)[:, None],
        length=length[order],
        radius=radius[order],
        radius_raw=radius_raw[order],
        parent=new_parent,
    )
    check(c)
    vol = np.pi * radius * radius * length
    lost = (vol.sum() - vol[order].sum()) / vol.sum() if vol.sum() > 0 else 0.0
    return c, {"dropped": n - len(order), "dropped_volume": float(lost)}


def check(c: Cylinders) -> None:
    """The table's invariants: one root first, parent before child, unit axes, non-negative sizes."""
    if c.parent[0] != -1 or np.any(c.parent[1:] < 0):
        raise ValueError("the root must be the first and only cylinder without a parent")
    if np.any(c.parent[1:] >= np.arange(1, len(c))):
        raise ValueError("a parent follows its child")
    if not np.allclose(np.linalg.norm(c.axis, axis=1), 1.0, atol=1e-6):
        raise ValueError("axes must be unit")
    if np.any(c.length < 0) or np.any(c.radius < 0):
        raise ValueError("negative length or radius")


def children_of(parent: np.ndarray) -> list[list[int]]:
    kids: list[list[int]] = [[] for _ in range(len(parent))]
    for i, p in enumerate(parent):
        if p >= 0:
            kids[p].append(i)
    return kids


def subtree_volume(c: Cylinders, radius: np.ndarray | None = None) -> np.ndarray:
    """Σπr²l over each cylinder's subtree (itself included)."""
    r = c.radius if radius is None else radius
    v = np.pi * r * r * c.length
    for i in range(len(c) - 1, 0, -1):
        v[c.parent[i]] += v[i]
    return v


def continuation(c: Cylinders) -> np.ndarray:
    """Each cylinder's continuing child (-1 at a tip): the child with the larger subtree volume; within TIE, the
    smaller turn from the parent's axis; then the lower index."""
    vol = subtree_volume(c)
    nxt = np.full(len(c), -1)
    for p, kids in enumerate(children_of(c.parent)):
        if not kids:
            continue
        best = kids[0]
        for k in kids[1:]:
            vb, vk = vol[best], vol[k]
            if abs(vk - vb) <= TIE * max(vk, vb):
                if c.axis[k] @ c.axis[p] > c.axis[best] @ c.axis[p]:
                    best = k
            elif vk > vb:
                best = k
        nxt[p] = best
    return nxt


def order_and_axis(c: Cylinders, nxt: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Branch order (0 on the trunk) and an axis id per cylinder (shared along a continuation chain)."""
    nxt = continuation(c) if nxt is None else nxt
    order = np.zeros(len(c), int)
    axis = np.zeros(len(c), int)
    next_axis = 1
    for i in range(1, len(c)):
        p = c.parent[i]
        if nxt[p] == i:
            order[i], axis[i] = order[p], axis[p]
        else:
            order[i], axis[i] = order[p] + 1, next_axis
            next_axis += 1
    return order, axis


def trunk(c: Cylinders, nxt: np.ndarray | None = None) -> list[int]:
    """The trunk: the continuation chain from the root."""
    nxt = continuation(c) if nxt is None else nxt
    chain = [0]
    while nxt[chain[-1]] >= 0:
        chain.append(int(nxt[chain[-1]]))
    return chain


def dbh(c: Cylinders, nxt: np.ndarray | None = None) -> float:
    """Diameter at breast height, TreeQSM's DBHqsm rule: the trunk cylinder whose span along the stem holds 1.3 m
    of stem length from the base (the last one if the stem is shorter), ×2. The model's final radius, as
    TreeQSM's own DBHqsm uses."""
    chain = trunk(c, nxt)
    along = np.cumsum(c.length[chain])
    k = int(np.searchsorted(along, BREAST_HEIGHT))
    return 2.0 * float(c.radius[chain[min(k, len(chain) - 1)]])


def height(c: Cylinders) -> float:
    """Top minus base: the highest point of any cylinder above the root's base."""
    return float(max(c.start[:, 2].max(), c.tip[:, 2].max()) - c.start[0, 2])


def internal_checks(c: Cylinders, slack: float = 0.05) -> dict[str, bool]:
    """Height's checks where no published height can gate it (§j, B): the height is positive, the trunk's base
    is the lowest point within `slack` metres, and parent precedes child (from_arrays already enforces it)."""
    low = min(c.start[:, 2].min(), c.tip[:, 2].min())
    return {
        "height_positive": height(c) > 0,
        "base_lowest": c.start[0, 2] <= low + slack,
        "parent_before_child": bool(np.all(c.parent[1:] < np.arange(1, len(c)))),
    }
