"""Level 0 v2, night 1: the bound report's first half (the plan's §k bound rule; the user, 2026-11-04). From the search's
own candidate log (runs/level0/<species>/log.parquet: every candidate, its 5-seed mean traits), each knob's position
in its bounds, and the Spearman association of the knob at its bound with the loss and the traits that carry it.
Associations, not causes: the probe (level0_bounds_probe.py) moves the knob alone.

    uv run --project analysis python -I analysis/experiments/level0_bounds.py oak r1.mf
"""

import sys

import numpy as np
import polars as pl
from scipy.stats import spearmanr

species, knob = sys.argv[1], sys.argv[2]
d = pl.read_parquet(f"runs/level0/{species}/log.parquet").filter(pl.col("loss").is_finite())
cols = ["loss"] + [c for c in d.columns if c.startswith("trait:stand.") and any(
    k in c for k in ("tallo", "height", "lai", "lateShare", "dbh.", "CR.", "alive"))] + ["trait:shade.survivalLight"]
cols = [c for c in cols if c in d.columns and d[c].null_count() < len(d) // 2]
x = d[knob].to_numpy()
print(f"{species}, {knob}: {len(d)} candidates; knob range {x.min():.4g}–{x.max():.4g}")
best = d.sort("loss").head(30)
print(f"  the 30 lowest-loss candidates: {knob} median {best[knob].median():.4g} (all: {np.median(x):.4g})")
print("| trait | Spearman ρ with the knob | n |\n|---|---|---|")
for c in cols:
    y = d[c].to_numpy().astype(float)
    ok = np.isfinite(y)
    r = spearmanr(x[ok], y[ok]).statistic
    if abs(r) >= 0.25 or c == "loss":
        print(f"| {c.removeprefix('trait:')} | {r:+.2f} | {ok.sum()} |")
