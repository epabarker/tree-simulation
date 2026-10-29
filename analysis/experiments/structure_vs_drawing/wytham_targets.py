"""Fit targets from laser-scanned oaks (ADR 0024): per tree, limb shape as form.ts measures it
(`limbCurves`: straightness of 3 m windows, turn per metre, along thick wood following each
node's thickest child) and fork height (form.ts `forkHeight`: walking up the trunk, the first
node whose thickest lateral with ≥ 1.25 m of wood above it — form.ts's 5 metamers — reaches 0.7 of
the continuation's radius, or where the trunk ends under laterals; relative to height). The trunk
continuation is TreeQSM's extension cylinder, the trunk its order-0 branch.

usage: uv run --no-project --with numpy python wytham_targets.py <skel.json>...  (qsm_export.py output)
Prints one row per tree, then the mean and standard deviation over trees.
"""

import json
import sys

import numpy as np

LIMB_R, STEP, WINDOW, CHORD = 0.05, 0.5, 6, 2  # metres; window and chord in steps (3 m, 1 m)
FORK_RATIO, MIN_WOOD = 0.7, 1.25


def limb_curves(par, a, b, r):
    n = len(par)
    dom = np.full(n, -1)
    for i in range(1, n):
        p = par[i]
        if p >= 0 and (dom[p] < 0 or r[i] > r[dom[p]]):
            dom[p] = i
    straight, turn = [], []
    for s in range(n):
        if r[s] < LIMB_R or (par[s] >= 0 and dom[par[s]] == s):
            continue
        chain = [s]
        while dom[chain[-1]] >= 0 and r[dom[chain[-1]]] >= LIMB_R:
            chain.append(dom[chain[-1]])
        pts = np.vstack([a[s], b[chain]])
        cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
        if cum[-1] < WINDOW * STEP:
            continue
        q = np.arange(0, cum[-1], STEP)
        P = np.stack([np.interp(q, cum, pts[:, k]) for k in range(3)], 1)
        for i in range(0, len(q) - WINDOW, CHORD):
            straight.append(np.linalg.norm(P[i + WINDOW] - P[i]) / (WINDOW * STEP))
        D = P[CHORD::CHORD] - P[:-CHORD:CHORD]
        D = D / np.maximum(np.linalg.norm(D, axis=1)[:, None], 1e-12)
        if len(D) > 1:
            turn += list(np.degrees(np.arccos(np.clip((D[1:] * D[:-1]).sum(1), -1, 1))) / (CHORD * STEP))
    return straight, turn


def fork_height(par, ext, order, a, b, r):
    n = len(par)
    L = np.linalg.norm(b - a, axis=1)
    wood = L.copy()  # wood length above and including each cylinder
    for i in range(n - 1, 0, -1):
        if par[i] >= 0:
            wood[par[i]] += wood[i]
    lateral = np.zeros(n)
    any_lateral = np.zeros(n, bool)
    for i in range(1, n):
        p = par[i]
        if p < 0 or ext[p] == i:
            continue
        any_lateral[p] = True
        if wood[i] >= MIN_WOOD:
            lateral[p] = max(lateral[p], r[i])
    height = b[:, 1].max()
    i = 0
    while True:
        nxt = ext[i]
        y = b[i, 1]
        if nxt < 0 or order[nxt] != 0:
            return y / height if any_lateral[i] else 1.0
        if lateral[i] > 0 and lateral[i] / r[nxt] >= FORK_RATIO:
            return y / height
        i = nxt


rows = []
for path in sys.argv[1:]:
    sk = json.load(open(path))
    par, ext, order = np.array(sk["parent"]), np.array(sk["ext"]), np.array(sk["order"])
    S = np.array(sk["seg"]).reshape(-1, 7)
    a, b, r = S[:, :3], S[:, 3:6], S[:, 6]
    st, tu = limb_curves(par, a, b, r)
    fh = fork_height(par, ext, order, a, b, r)
    row = dict(tree=sk["name"], height=b[:, 1].max(), windows=len(st), straightness=np.median(st),
               turn=np.median(tu), turnP90=np.quantile(tu, 0.9), forkHeight=fh)
    rows.append(row)
    print(f"{row['tree']:>10} H {row['height']:5.1f} m  windows {row['windows']:4d}  straightness "
          f"{row['straightness']:.3f}  turn {row['turn']:5.1f}°/m  p90 {row['turnP90']:5.1f}°/m  fork {fh:.2f}")
for k in ["straightness", "turn", "turnP90", "forkHeight"]:
    v = np.array([row[k] for row in rows if row["windows"] >= 10 or k == "forkHeight"])
    print(f"{k:13} mean {v.mean():.3f}  sd {v.std(ddof=1):.3f}  median {np.median(v):.3f}  n {len(v)}")
