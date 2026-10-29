"""Turn per metre along thick limbs (r ≥ 5 cm) at chord lengths 0.5, 1 and 2 m, resampled every 0.25 m
(ADR 0024): how turn per metre falls as the chord lengthens tells steady wander from jagged noise.

    uv run --no-project --with numpy python multiscale.py <label> <skel.json>...
"""
import json, sys
import numpy as np
def run(path):
    sk = json.load(open(path)); par = np.array(sk["parent"]); S = np.array(sk["seg"]).reshape(-1, 7)
    a, b, r = S[:, :3], S[:, 3:6], S[:, 6]; n = len(par)
    dom = np.full(n, -1)
    for i in range(1, n):
        p = par[i]
        if p >= 0 and (dom[p] < 0 or r[i] > r[dom[p]]): dom[p] = i
    out = {0.5: [], 1.0: [], 2.0: []}
    for s in range(n):
        if r[s] < 0.05 or (par[s] >= 0 and dom[par[s]] == s): continue
        ch = [s]
        while dom[ch[-1]] >= 0 and r[dom[ch[-1]]] >= 0.05: ch.append(dom[ch[-1]])
        pts = np.vstack([a[s], b[ch]]); cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
        if cum[-1] < 3: continue
        q = np.arange(0, cum[-1], 0.25); P = np.stack([np.interp(q, cum, pts[:, k]) for k in range(3)], 1)
        for L in out:
            k = int(L / 0.25); D = P[k::k] - P[:-k:k]; D = D / np.maximum(np.linalg.norm(D, axis=1)[:, None], 1e-12)
            if len(D) > 1: out[L] += list(np.degrees(np.arccos(np.clip((D[1:] * D[:-1]).sum(1), -1, 1))) / L)
    return {L: np.median(v) for L, v in out.items() if v}
rows = [run(p) for p in sys.argv[2:]]
label = sys.argv[1]
m = {L: np.mean([r[L] for r in rows if L in r]) for L in (0.5, 1.0, 2.0)}
print(f"{label:22s} turn °/m at 0.5 m {m[0.5]:5.1f}   1 m {m[1.0]:5.1f}   2 m {m[2.0]:5.1f}   (n {len(rows)})")
