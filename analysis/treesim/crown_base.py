"""Like-for-like cbG from native snapshots: lowest first-order limb reaching 2.5 m.

Promoted subset of night2/crownbase/limbs_rows.py; separate from leaf/5%-leaf metrics.
Returns None for a tree without a qualifying limb; caller reports the denominator.
"""
import numpy as np


def limb_base_ratio(rows, min_reach_cells=10.0):
    bid = np.asarray(rows['birthId'], int)
    parent = np.asarray(rows['parentBirthId'], int)
    order = np.asarray(rows['order'], int)
    start = np.column_stack([np.asarray(rows[k], float) for k in ('x0', 'y0', 'z0')])
    tip = np.column_stack([np.asarray(rows[k], float) for k in ('x1', 'y1', 'z1')])
    base = start[:, 1].min()
    height = tip[:, 1].max() - base
    if height <= 0:
        return None
    index = {b: i for i, b in enumerate(bid)}
    limb = np.full(len(bid), -1)
    for i in range(len(bid)):
        p = index.get(parent[i], -1)
        if p >= 0:
            if order[i] == 1 and order[p] == 0:
                limb[i] = i
            elif limb[p] >= 0:
                limb[i] = limb[p]
    bases = []
    for root in np.unique(limb[limb >= 0]):
        reach = np.linalg.norm(tip[limb == root] - start[root], axis=1).max()
        if reach >= min_reach_cells:
            bases.append((start[root, 1] - base) / height)
    return min(bases) if bases else None
