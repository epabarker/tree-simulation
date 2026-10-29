"""usage: uv run --no-project --with numpy python slab.py runs/structure-vs-drawing/data/real-*.skel.json

Tips and wood of a real oak inside a vertical slab |z - z_trunk| < w/2 (side view plane)."""
import json, sys
import numpy as np
for path in sys.argv[1:]:
    sk = json.load(open(path)); par = np.array(sk["parent"]); S = np.array(sk["seg"]).reshape(-1, 7)
    a, b = S[:, :3], S[:, 3:6]; n = len(par)
    has = np.zeros(n, bool); has[par[par >= 0]] = True; tip = ~has
    zc = a[0, 2]; L = np.linalg.norm(b - a, axis=1); mid = (a[:, 2] + b[:, 2]) / 2
    row = [f"{sk['name']}: all {tip.sum()} tips, {L.sum():.0f} m"]
    for w in [0.5, 1, 2, 4]:
        inside = np.abs(mid - zc) < w / 2
        row.append(f"slab {w} m: {np.sum(tip & inside)} tips, {L[inside].sum():.0f} m")
    print(" | ".join(row))
