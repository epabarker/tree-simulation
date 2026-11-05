"""Weiser et al. 2022's field crown base for beech against BioDiv's crownBase70/80/90 (2026-11-05;
docs/experiments/2026-11-05-crown-base-and-bole.md). Reported only, never a target: Weiser's crown base is the field
inventory's (FI) height of the crown's base (and of its first green branch, `crown_base_height_green_m`), a reading by
eye of a first branch, not a length quantile of wood; no Weiser tree has a QSM, so the two sets meet in DBH only.
Summary statistics only (CC-BY-SA 4.0: no per-tree table is written).

  uv run --project analysis python -I analysis/experiments/crownbase_weiser.py
"""

import collections
import glob
import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "runs/crown-base"


def weiser_fi() -> list[dict]:
    out = []
    for f in sorted(glob.glob(str(ROOT / "data/reference/weiser/geojsons/FagSyl*.geojson"))):
        d = json.load(open(f))
        d = d.get("properties", d)
        fi = [m for m in d["measurements"] if m.get("source") == "FI"]
        for m in fi[:1]:  # one inventory record per tree
            out.append({"dbh": m["DBH_cm"] / 100.0, "h": m["height_m"], "cbh": m.get("crown_base_height_m"),
                        "green": m.get("crown_base_height_green_m"), "state": m.get("state"),
                        "leaf": m.get("canopy_condition")})
    return out


def q(v) -> dict:
    v = np.array([x for x in v if x is not None and math.isfinite(x)])
    if len(v) == 0:
        return {"n": 0}
    return {"n": int(len(v)), "median": float(np.median(v)), "q25": float(np.percentile(v, 25)),
            "q75": float(np.percentile(v, 75))}


def main() -> None:
    trees = weiser_fi()
    states = collections.Counter(t["state"] for t in trees)
    real = json.loads((OUT / "real.json").read_text())
    bd = [r["dbh"] for r in real.values()]
    lo, hi = float(min(bd)), float(max(bd))
    windows = {"BioDiv's DBH range": (lo, hi), "0.25-0.35 m": (0.25, 0.35)}
    res = {"states": dict(states), "fi_trees": len(trees), "biodiv": {}, "weiser": {}}
    for name, (a, b) in windows.items():
        w = [t for t in trees if a <= t["dbh"] <= b and t["h"] and t["h"] > 0]
        res["weiser"][name] = {
            "cbh/H": q([t["cbh"] / t["h"] for t in w if t["cbh"] is not None]),
            "green/H": q([t["green"] / t["h"] for t in w if t["green"] is not None]),
            "H": q([t["h"] for t in w]), "dbh": q([t["dbh"] for t in w])}
        sel = [r for r in real.values() if a <= r["dbh"] <= b]
        res["biodiv"][name] = {k: q([r.get(k) for r in sel]) for k in
                               ("crownBase70", "crownBase80", "crownBase90")}
        res["biodiv"][name]["dbh"] = q([r["dbh"] for r in sel])
    (OUT / "weiser.json").write_text(json.dumps(res, indent=1))
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
