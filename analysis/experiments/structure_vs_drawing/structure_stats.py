"""Structural numbers for each skeleton (metres): leaf sites, total wood length, forks, Strahler
order, lateral branch angle, and straightness of the last 2 m of path below each tip."""
import json, sys
import numpy as np
for path in sys.argv[1:]:
    sk = json.load(open(path)); par = np.array(sk["parent"]); S = np.array(sk["seg"]).reshape(-1, 7)
    a, b, r = S[:, :3], S[:, 3:6], S[:, 6]; n = len(par)
    d = b - a; L = np.linalg.norm(d, axis=1); u = d / np.maximum(L, 1e-9)[:, None]
    kids = [[] for _ in range(n)]
    for i in range(n):
        if par[i] >= 0: kids[par[i]].append(i)
    tips = [i for i in range(n) if not kids[i]]
    forks = sum(1 for k in kids if len(k) >= 2)
    # Strahler order
    st = np.ones(n, int)
    for i in range(n - 1, -1, -1):
        if kids[i]:
            o = sorted((st[k] for k in kids[i]), reverse=True)
            st[i] = o[0] + 1 if len(o) > 1 and o[1] == o[0] else o[0]
    # Lateral angles: every child but the thickest, against the parent's direction; laterals of wood >= 2 cm.
    lat = []
    for i in range(n):
        if len(kids[i]) < 2: continue
        main = max(kids[i], key=lambda k: r[k])
        for k in kids[i]:
            if k != main and r[k] >= 0.01:
                lat.append(np.degrees(np.arccos(np.clip(u[i] @ u[k], -1, 1))))
    # Straightness: chord / path over the last 2 m of path below each tip.
    sts = []
    for t in tips:
        acc, i = 0.0, t
        while i >= 0 and acc < 2.0:
            acc += L[i]; j = i; i = par[i]
        if acc >= 2.0: sts.append(np.linalg.norm(b[t] - a[j]) / acc)
    H = b[:, 1].max()
    print(f"{sk['name']:10s} height {H:5.1f} m  leaf sites {len(sk['leafy']):5d}  tips {len(tips):5d}  forks {forks:5d}  "
          f"wood length {L.sum():6.0f} m  Strahler {st[0]}  lateral angle median {np.median(lat):4.0f}°  "
          f"last-2m straightness {np.median(sts):.2f}")
