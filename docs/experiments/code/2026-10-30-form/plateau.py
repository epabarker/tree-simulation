"""Form step 5's plateau check: the stand median's gain over 250–300 (evidence.py's measure) against
the same trees' own gains (planted trees alive at both), and the deaths in between. A median can
rise because short trees die, not because the survivors grow.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/plateau.py runs/evidence
"""

import json
import sys
from statistics import median

import polars as pl

d = sys.argv[1] if len(sys.argv) > 1 else "runs/evidence"
for tau in ("t0", "t02"):
    print(f"τ {'0' if tau == 't0' else '0.2'}: seed | median 250 → 300 | same trees: median gain, max gain, n | died 250–300 (their median height at 250)")
    passes = 0
    for s in range(1, 21):
        run = f"{d}/forest/{tau}-s{s}"
        n = len(json.load(open(f"{run}/run.json"))["params"]["trees"])
        m = pl.read_csv(f"{run}/metrics.csv", infer_schema_length=0).with_columns(pl.exclude("species").cast(pl.Float64))
        m = m.filter((pl.col("tree") < n) & (pl.col("alive") == 1))
        a = {r["tree"]: r["height"] for r in m.filter(pl.col("season") == 250).iter_rows(named=True)}
        b = {r["tree"]: r["height"] for r in m.filter(pl.col("season") == 300).iter_rows(named=True)}
        gains = [b[t] - a[t] for t in a if t in b]
        died = [a[t] for t in a if t not in b]
        same = median(gains)
        passes += same < 2 and median(b.values()) < 180
        print(f"  {s:2d} | {median(a.values()):.1f} → {median(b.values()):.1f} ({median(b.values()) - median(a.values()):+.1f}) | "
              f"{same:+.1f}, {max(gains):+.1f}, {len(gains)} | {len(died)} ({median(died) if died else float('nan'):.0f})")
    print(f"  same trees' median gain < 2 and height < 180: {passes} of 20")
