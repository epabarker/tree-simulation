"""Night2 crown-shape instrument, recovered for day-3 N1.

Faithful D/shapeRatio/WH subset of T's crown.py; drops only the unrelated cbH
calculation and scratch imports. Source: night2 tool-history creation record,
agent T (2026-11-06); original source SHA-256: 70e2acda8101c982d333ca8fb3a1e1ff92fb1dd686cf2af6090c6f9753591cd1.
Definition/real bands: docs/experiments/code/2026-11-06-overnight/targets/targets-by-species.md.
Views use CRC32(key), four angles pi/4 apart; tips are cylinders without children.
The fixed witness JSON was evaluated by the recovered original before candidate D.
"""
import zlib
import numpy as np

def crown_shape(c, key):
    n = len(c)
    haschild = np.zeros(n, bool)
    haschild[c.parent[c.parent >= 0]] = True
    tips = c.tip[~haschild]
    z0 = c.start[0, 2]; x0 = c.start[0, :2]
    H = float(tips[:, 2].max() - z0) if len(tips) else np.nan
    z = tips[:, 2] - z0
    off = tips[:, :2] - x0
    rng = np.random.default_rng(zlib.crc32(key.encode()))
    th0 = rng.uniform(0, np.pi)
    Ds, drops4, drops6, Rs = [], [], [], []
    for k in range(4):
        th = th0 + k * np.pi / 4
        u = np.abs(off[:, 0] * np.cos(th) + off[:, 1] * np.sin(th))
        R = np.percentile(u, 98)
        if R <= 0: continue
        b = np.clip(np.floor(u / R * 8).astype(int), 0, 8)
        top = {}
        for r in (0, 4, 6):
            m = z[b == r]
            top[r] = np.percentile(m, 98) if len(m) >= 3 else np.nan
        Ds.append((top[0] - top[6]) / R)
        drops4.append(top[0] - top[4]); drops6.append(top[0] - top[6]); Rs.append(R)
    d6 = np.nanmean(drops6) if Ds else np.nan
    Rm = np.mean(Rs) if Rs else np.nan
    return dict(D=float(np.nanmean(Ds)) if Ds else np.nan,
                shapeRatio=float(np.nanmean(drops4) / d6) if Ds and d6 > 0.02 * Rm else np.nan,
                WH=float(2 * Rm / H) if Rs else np.nan, ntips=int(len(tips)), Hcrown=H)
