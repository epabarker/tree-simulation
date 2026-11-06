"""Crown competition diagnosis (2026-11-04), step 3's rivals read from the stand dumps (crown_overlap.py):
mortality and release (CR of measured trees with and without a dead neighbour among their six nearest; deaths per
seed), the slab's edges (the outer rows' lean toward the middle; the middle row's ±z against ±x reach; the largest
offset against half the ring), and spacing (the crowns' implied spacing, 2·CR, against the stand's 5.25 m).
The probes that change the slab or the light (open faces, a 6-row slab, K 32, sky p 0.5) are cells of crown_levers.py.

  uv run --project analysis python -I analysis/experiments/crown_rivals.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from crown_overlap import DUMPS, RUNS, outer_lean  # noqa: E402

pl.Config.set_tbl_cols(30)
pl.Config.set_tbl_width_chars(220)
pl.Config.set_tbl_rows(40)
pl.Config.set_float_precision(2)
df = pl.read_csv(RUNS / "trees.csv").filter(pl.col("seed") <= 5)

print("## Mortality and release: CR (gate) by dead neighbours among the six nearest")
print(df.with_columns((pl.col("dead_neighbours") > 0).alias("dead_nb")).group_by("species", "set", "season", "dead_nb")
      .agg(pl.len().alias("n"), pl.col("cr_gate").median(), pl.col("cr_own").median(), pl.col("foreign").mean())
      .sort("species", "set", "season", "dead_nb"))

print("## Edges: middle row's reach in ±x (in-row neighbours at 5.25 m) against ±z (rows toward the faces)")
print(df.group_by("species", "set", "season").agg(
    pl.mean_horizontal("ext+x", "ext-x").median().alias("reach_x"),
    pl.mean_horizontal("ext+z", "ext-z").median().alias("reach_z"),
    pl.col("maxOffset").max().alias("maxOffset_max"),
    (2 * pl.col("cr_gate")).median().alias("implied_spacing"),
    (2 * pl.col("cr_own")).median().alias("implied_spacing_own")).sort("species", "set", "season"))

rows, deaths = [], []
for p in sorted(DUMPS.glob("*-*-*.json")):
    if p.name.endswith(".job.json"):
        continue
    sp, st, seed = p.stem.rsplit("-", 2)
    if int(seed) > 5:
        continue
    d = json.loads(p.read_text())
    for r in outer_lean(d):
        rows.append({"species": sp, "set": st, "seed": int(seed), **r,
                     "row": "outer" if abs(r["rootZ"] - d["depth"] / 2) > 5 else "middle"})
    for snap in d["snaps"]:
        deaths.append({"species": sp, "set": st, "seed": int(seed), "season": snap["season"],
                       "dead": sum(not t["alive"] for t in snap["trees"]),
                       "dead_measured": sum(not t["alive"] for t in snap["trees"] if t["index"] in (4, 5, 6, 7))})
lean = pl.DataFrame(rows)
print("## Lean: leafy-crown centroid offset toward the slab's middle, m (outer rows lean in if > 0)")
print(lean.group_by("species", "set", "season", "row").agg(pl.len().alias("n"), pl.col("lean_in").median(),
                                                           pl.col("cr").median(), pl.col("H").median())
      .sort("species", "set", "season", "row"))
print("## Deaths of the 12 (and of the 4 measured), mean over seeds 1–5")
print(pl.DataFrame(deaths).group_by("species", "set", "season").agg(pl.col("dead").mean(), pl.col("dead_measured").mean())
      .sort("species", "set", "season"))
