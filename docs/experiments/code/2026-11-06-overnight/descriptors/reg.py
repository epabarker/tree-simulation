"""A11: within-tree regularity descriptors, one code path for coarsened real QSMs and simulated tables."""
import sys, json, math
sys.path.insert(0, "/home/edbarker/Documents/Projects/tree-simulation/analysis")
import numpy as np
from treesim import cylinders as cy
from treesim.describe import geometric_labels, _resample, LIMB
from treesim.form import FORK_RATIO

SITE = 0.25
INS_WIN = 0.5


def _arc_pos(path_pts, s):
    seg = np.linalg.norm(np.diff(path_pts, axis=0), axis=1)
    along = np.concatenate([[0.0], np.cumsum(seg)])
    return np.array([np.interp(s, along, path_pts[:, k]) for k in range(3)])


def limbs(c, lab):
    """First-order axes (cylinder lists) of arc length >= LIMB."""
    ax = {}
    for i in range(len(c)):
        if lab.order[i] == 1:
            ax.setdefault(int(lab.axis[i]), []).append(i)
    return [m for m in ax.values() if c.length[m].sum() >= LIMB]


def sites(pos, gap=SITE):
    out, first = [], None
    grp = []
    for s in sorted(pos):
        if first is None or s - first >= gap:
            if grp: out.append(np.mean(grp))
            grp = [s]; first = s
        else:
            grp.append(s)
    if grp: out.append(np.mean(grp))
    return np.array(out)


def regularity(c, site_gap=SITE):
    lab = geometric_labels(c)
    kids = cy.children_of(c.parent)
    vol = cy.subtree_volume(c)
    top = c.tip[:, 2].copy()
    for i in range(len(c) - 1, 0, -1):
        top[c.parent[i]] = max(top[c.parent[i]], top[i])
    L = limbs(c, lab)
    trunk = cy.trunk(c, lab.nxt)
    tpts = np.vstack([c.start[trunk], c.tip[trunk[-1]]])
    tcum = np.concatenate([[0.0], np.cumsum(c.length[trunk])])
    tpos = {j: k for k, j in enumerate(trunk)}
    cv, nsite, tot_len, ins, elev, pers, fork = [], 0, 0.0, [], [], [], []
    for m in L:
        cum = np.concatenate([[0.0], np.cumsum(c.length[m])])
        pts = np.vstack([c.start[m], c.tip[m[-1]]])
        total = cum[-1]
        # attachments
        pos, forkpos = [], None
        for a, j in enumerate(m):
            cont = lab.nxt[j]
            for k in kids[j]:
                if k == cont: continue
                s = cum[a] + float(np.clip((c.start[k] - c.start[j]) @ c.axis[j], 0, c.length[j]))
                pos.append(s)
                if cont >= 0 and c.radius[k] >= FORK_RATIO * c.radius[cont] and \
                        top[k] - c.tip[j][2] >= FORK_RATIO * (top[cont] - c.tip[j][2]):
                    forkpos = s if forkpos is None else min(forkpos, s)
        st = sites(pos, site_gap)
        nsite += len(st); tot_len += total
        if len(st) >= 4:
            d = np.diff(st); cv.append(d.std() / d.mean())
        fork.append(float(forkpos is not None and forkpos <= total / 3))
        # insertion angle & elevation
        a0 = _arc_pos(pts, 0.0); a1 = _arc_pos(pts, INS_WIN)
        v = a1 - a0
        j0 = m[0]; p = c.parent[j0]
        if p in tpos and np.linalg.norm(v) > 0:
            k = tpos[p]; s_att = tcum[k] + float(np.clip((c.start[j0] - c.start[p]) @ c.axis[p], 0, c.length[p]))
            t0 = _arc_pos(tpts, max(s_att - 0.25, 0)); t1 = _arc_pos(tpts, s_att + 0.25)
            tv = t1 - t0
            if np.linalg.norm(tv) > 0:
                ins.append(math.degrees(math.acos(np.clip(v @ tv / np.linalg.norm(v) / np.linalg.norm(tv), -1, 1))))
        e0 = _arc_pos(pts, 0.5); e1 = _arc_pos(pts, 2.5)
        dv = e1 - e0
        elev.append(math.degrees(math.atan2(dv[2], math.hypot(dv[0], dv[1]))))
        # curvature persistence on 0.5 m resample
        r = _resample(pts)
        ch = np.diff(r, axis=0)
        n = np.linalg.norm(ch, axis=1)
        if len(ch) >= 5 and np.all(n > 1e-6):
            u = ch / n[:, None]
            dl = np.diff(u, axis=0); dn = np.linalg.norm(dl, axis=1)
            ok = dn[:-1] > 1e-4
            ok &= dn[1:] > 1e-4
            cs = np.einsum("ij,ij->i", dl[:-1], dl[1:])[ok] / (dn[:-1][ok] * dn[1:][ok])
            if len(cs) >= 3: pers.append(cs.mean())
    nl = len(L)
    f = lambda x, k=1: x if len(x) >= k else None
    return dict(
        nLimbs=nl,
        spacingCV=float(np.median(cv)) if len(cv) >= 2 else math.nan,
        attachPerM=nsite / tot_len if tot_len > 0 else math.nan,
        insertSD=float(np.std(ins, ddof=1)) if len(ins) >= 5 else math.nan,
        elevSD=float(np.std(elev, ddof=1)) if len(elev) >= 5 else math.nan,
        curvPersist=float(np.median(pers)) if len(pers) >= 2 else math.nan,
        earlyFork=float(np.mean(fork)) if nl >= 5 else math.nan,
    )
