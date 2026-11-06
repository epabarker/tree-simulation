"""Like-for-like sheet (2026-11-05, the user; docs/experiments/2026-11-05-crown-base-and-bole.md): simulated trees and
real QSMs as the same thing, cylinder tables in metres, drawn by one path (page.ts's qsmSnapshot).

- Simulated: the hand, pilot v3's and pilot v4's finalists, seed 101, the closed stand's four measured trees at the
  size-matched season (70), from crownbase_sim's dumps (runs/crown-base/dumps/<set>/101.json), coarsened as
  registration v5's sim_rule (inflate, prune at BioDiv's d_min, 8.6 mm).
- Real: nine BioDiv beeches at crownBase80's deciles 10-90 (the tree nearest each decile of the 53 trees' medians over
  repeats, runs/crown-base/real.json), TreeQSM's optimum model, raw cylinders (no coarsening: they are the reference).

  uv run --project analysis python -I docs/experiments/code/2026-11-05-like-for-like-render/export.py runs/like-for-like-render
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, "analysis")
import numpy as np
from treesim import coarsen as co
from treesim import cylinders as cy
from treesim import qsm, simtree
from treesim import tolerance as tol
from treesim.describe import describe

out = Path(sys.argv[1] if len(sys.argv) > 1 else "runs/like-for-like-render")
out.mkdir(parents=True, exist_ok=True)
reg = json.loads(Path("analysis/fit/sources/level1-beech.json").read_text())
d_min = reg["d_min_m"]
SEASON, SEED = 70, 101


def table(c: cy.Cylinders, **meta) -> dict:
    d = describe(c)
    return {**meta, "height": float(cy.height(c)), "cylinders": len(c),
            "crownBase80": d["crownBase80"], "boleSway": d.get("boleSway", math.nan),
            "start": np.round(c.start, 4).tolist(), "axis": np.round(c.axis, 5).tolist(),
            "length": np.round(c.length, 4).tolist(), "radius": np.round(c.radius, 5).tolist(),
            "parent": c.parent.tolist()}


sim = {}
for s in ("hand", "v3", "v4"):
    dump = json.loads(Path(f"runs/crown-base/dumps/{s}/{SEED}.json").read_text())
    trees = [t for t in dump["trees"] if t["trial"] == "stand" and t["season"] == SEASON and t["alive"]]
    sim[s] = []
    for t in trees:
        st = simtree.from_dump(t)
        c = co.coarsen(st.cylinders, co.Resolution(d_min, (), ()), inflated=True)
        sim[s].append(table(c, tree=f"{s} tree {t['index']}", dbh=float(cy.dbh(st.cylinders))))
        print(s, t["index"], len(st.cylinders), "->", len(c))
(out / "sim.json").write_text(json.dumps(sim))

real = json.loads(Path("runs/crown-base/real.json").read_text())
rows = {r["tree"]: r for r in tol.real_sets() if r["dataset"] == "biodiv" and r["species"] == "Fagus_sylvatica"}
vals = sorted((v["crownBase80"], k) for k, v in real.items() if v.get("crownBase80") is not None)
picked = []
for q in range(10, 100, 10):
    target = float(np.percentile([v for v, _ in vals], q))
    k = min((t for t in vals if t[1] not in [p[1] for p in picked]), key=lambda t: abs(t[0] - target))[1]
    picked.append((q, k, target))
res = []
for q, k, target in picked:
    c = qsm.read(rows[k]["path"]).cylinders
    res.append(table(c, tree=k, decile=q, decileValue=target, medianOverRepeats=real[k]["crownBase80"],
                     dbhMeasured=float(rows[k]["dbh_measured"])))
    print("decile", q, k, round(real[k]["crownBase80"], 3), "dbh", rows[k]["dbh_measured"])
(out / "qsm.json").write_text(json.dumps(res))
