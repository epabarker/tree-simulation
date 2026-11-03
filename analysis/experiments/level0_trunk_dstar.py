"""Level 0 trunk diagnosis (docs/experiments/2026-11-03-level0-trunk.md, step 4, rival 1): one cause or two?

Both residuals are positive. If DBH alone is too small, the DBH that Tallo's median line gives the simulated H (D*_H) and
the DBH it gives the simulated CR (D*_CR) agree, and both exceed the simulated DBH. If H and CR are wrong on their own,
they disagree. Read from the stand's median traits (stand.dbh.k, stand.H.k, stand.CR.k at 60, 100, 150).

  uv run --project analysis python -I analysis/experiments/level0_trunk_dstar.py [results.json ...]

Each file is a fit (docs/experiments/fits/level0/<species>.json: hand and fit) or a probe (level0_trunk_probe.py).
"""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from treesim import tallo  # noqa: E402

CURVES = tallo.load_targets()["species"]


def d_star(curve, y):
    """The DBH (cm) at which Tallo's median line reaches y, by bisection in ln D over 1–300 cm (None if outside)."""
    lo, hi = np.log(1.0), np.log(300.0)
    f = lambda ld: tallo.predict(curve, np.exp(ld))[0][1] - np.log(y)  # noqa: E731
    if f(lo) > 0 or f(hi) < 0:
        return None
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        lo, hi = (mid, hi) if f(mid) < 0 else (lo, mid)
    return float(np.exp(0.5 * (lo + hi)))


def rows(species, label, traits):
    out = []
    for k, season in enumerate((60, 100, 150)):
        d = traits.get(f"stand.dbh.{k}")
        h, cr = traits.get(f"stand.H.{k}"), traits.get(f"stand.CR.{k}")
        if not d:
            continue
        dcm = 100 * d
        dh, dc = d_star(CURVES[species]["H"], h), d_star(CURVES[species]["CR"], cr)
        out.append(
            {
                "species": species, "label": label, "season": season, "dbh": dcm, "H": h, "CR": cr,
                "zH": traits.get(f"stand.talloH.{k}"), "zCR": traits.get(f"stand.talloCR.{k}"),
                "DstarH": dh, "DstarCR": dc,
            }
        )
    return out


def load(path):
    d = json.load(open(path))
    if "hand" in d:
        return rows(d["species"], "hand", d["hand"]["traits"]) + rows(d["species"], "fit", d["fit"]["traits"])
    return [r for c in d["conditions"] for r in rows(d["species"], c["label"], c["traits"])]


def main(paths):
    print("species label            season | DBH cm   H m  CR m | zH    zCR  | D*_H/DBH  D*_CR/DBH")
    for p in paths:
        for r in load(p):
            ratio = lambda x: f"{x / r['dbh']:.2f}" if x else "  – "  # noqa: E731
            z = lambda x: f"{x:+.2f}" if x is not None else "  – "  # noqa: E731
            print(
                f"{r['species']:6} {r['label']:16} {r['season']:4} | {r['dbh']:5.1f} {r['H']:5.1f} {r['CR']:4.1f} |"
                f" {z(r['zH'])} {z(r['zCR'])} | {ratio(r['DstarH']):>8}  {ratio(r['DstarCR']):>8}"
            )


if __name__ == "__main__":
    main(sys.argv[1:] or [f"docs/experiments/fits/level0/{s}.json" for s in ("beech", "oak")])
