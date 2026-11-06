"""BioDiv beech QSMs near 0.29 m measured DBH -> <out>/qsm.json (cylinders in metres, z up; labels).

  uv run --project analysis python -I docs/experiments/code/2026-11-05-render/qsm_export.py runs/beech-render [N=3]

The model is TreeQSM's own optimum (treesim.qsm.read: the user's ruling R1), the cylinders raw (no coarsening).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "analysis")
import numpy as np
from treesim import cylinders as cy
from treesim import qsm
from treesim import tolerance as tol

out = Path(sys.argv[1] if len(sys.argv) > 1 else "runs/beech-render")
n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
rows = [r for r in tol.real_sets() if r["dataset"] == "biodiv" and r["species"] == "Fagus_sylvatica"]
rows.sort(key=lambda r: abs(float(r["dbh_measured"]) - 0.29))
res = []
for r in rows[:n]:
    q = qsm.read(r["path"])
    c = q.cylinders
    res.append({
        "tree": r["tree"],
        "dbhMeasured": float(r["dbh_measured"]),
        "dbhQsm": float(q.meta["dbh_qsm"]),
        "dbhCyl": float(cy.dbh(c)),
        "height": float(cy.height(c)),
        "cylinders": len(c),
        "start": np.round(c.start, 4).tolist(),
        "axis": np.round(c.axis, 5).tolist(),
        "length": np.round(c.length, 4).tolist(),
        "radius": np.round(c.radius, 5).tolist(),
        "parent": c.parent.tolist(),
    })
    print(r["tree"], res[-1]["dbhMeasured"], res[-1]["height"], len(c))
(out / "qsm.json").write_text(json.dumps(res))
