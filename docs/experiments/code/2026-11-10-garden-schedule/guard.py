"""The lone open-grown guard (#121's second probe round; EXPLORATORY): for a probe directory
(runs/probe/<label>), each seed's lone tree at season 100, HEAD against the patch: height,
crownWidth, liveCrownBase, w90 (metrics.csv) and the state hash (hash.txt).

    python3 docs/experiments/code/2026-11-10-garden-schedule/guard.py runs/probe/<label> ...
"""

import csv
import sys
from pathlib import Path

for probe in sys.argv[1:]:
    print(f"== {probe}")
    for arm in ("head", "patch"):
        for run in sorted(Path(probe, arm).glob("lone-seed*")):
            row = [r for r in csv.DictReader(open(run / "metrics.csv")) if r["season"] == "100" and r["tree"] == "0"]
            h = (run / "hash.txt").read_text().strip()
            if not row:
                print(f"  {arm} {run.name}: no season-100 row, hash {h}")
                continue
            r = row[0]
            print(f"  {arm} {run.name}: height {float(r['height']):.1f}, crownWidth {float(r['crownWidth']):.1f}, "
                  f"liveCrownBase {float(r['liveCrownBase']):.3f}, w90 {float(r['w90']):.3f}, hash {h}")
