"""One-knob probe: r3.c at the hand params, stand only, per-season DBH (no describe, no z)."""
import json, sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from treesim import level1 as l1
from treesim.fit_level1 import Pool, level1_spec
from treesim.host import scratch_root, workers_default
reg = l1.load("beech")
spec = level1_spec("beech", reg)
hand = {**spec.fixed, **spec.form}
seeds = [2001, 2002, 2003, 2004, 2005]
values = [0.022, 0.049, 0.10]
pool = Pool(workers_default())
try:
    reqs = [{"species": "beech", "assign": {**hand, "r3.c": v}, "seeds": [s], "trials": ["stand150"],
             "level1": {"scratch": f"{scratch_root()}/level1-probe", "key": f"r{v}", "dumpSeasons": []}} for v in values for s in seeds]
    replies = pool.map(reqs)
finally:
    pool.close()
for i, v in enumerate(values):
    per = [l1.seed_dbh(r["level1"][0]["allometry"]) for r in replies[i*5:(i+1)*5]]
    row = {s: round(float(np.median([d[s] for d in per if s in d])), 3) for s in (50, 60, 70, 80, 90, 100)}
    h = [r["stand"][0]["height"] for r in replies[i*5:(i+1)*5]]
    print(f"r3.c {v}: median DBH by season {row}; match {l1.match_season(per, reg['size_match']['dbh'])}; stand height at 60 {np.mean(h):.1f} cells")
