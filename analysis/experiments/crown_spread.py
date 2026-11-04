"""Crown competition diagnosis (2026-11-04), step 4: in beech's stand, are the trees that spread furthest sideways at 60
the ones whose height pulls ahead by 150? Per measured tree, CR at 60 (the gate's reading) against height rank at 150
within its seed; seeds 1–20, hand and fit, from crown_overlap.py's records (runs/crown-competition/trees.csv).

  uv run --project analysis python -I analysis/experiments/crown_spread.py
"""

import sys
from pathlib import Path

import polars as pl
from scipy.stats import spearmanr

sys.path.insert(0, str(Path(__file__).resolve().parent))
from crown_overlap import RUNS  # noqa: E402

df = pl.read_csv(RUNS / "trees.csv").filter(pl.col("species") == "beech")
for st in ["hand", "fit"]:
    d = df.filter(pl.col("set") == st)
    a = d.filter(pl.col("season") == 60).select("seed", "tree", pl.col("cr_gate").alias("cr60"), pl.col("H").alias("h60"),
                                                pl.col("foreign").alias("f60"))
    b = d.filter(pl.col("season") == 150).select("seed", "tree", pl.col("H").alias("h150"))
    j = a.join(b, on=["seed", "tree"], how="left")
    died = j.filter(pl.col("h150").is_null()).height
    j = j.drop_nulls().with_columns(
        pl.col("cr60").rank().over("seed").alias("r_cr60"), pl.col("h150").rank().over("seed").alias("r_h150"),
        pl.col("h60").rank().over("seed").alias("r_h60"), (pl.col("h150") - pl.col("h60")).alias("dh"),
    ).with_columns(pl.col("dh").rank().over("seed").alias("r_dh"))
    # Within-seed ranks pooled over seeds (seeds with ≥ 3 survivors).
    j = j.filter(pl.len().over("seed") >= 3)
    for x, y in [("r_cr60", "r_h150"), ("r_cr60", "r_dh"), ("r_h60", "r_h150"), ("r_cr60", "r_h60")]:
        rho, p = spearmanr(j[x], j[y])
        print(f"beech {st}: {x} vs {y}: rho {rho:+.2f} (p {p:.3f}), n {j.height} trees, {j['seed'].n_unique()} seeds")
    per = [spearmanr(g["cr60"], g["h150"])[0] for _, g in j.group_by("seed") if g.height >= 3]
    pos = sum(r > 0 for r in per if r == r)
    print(f"beech {st}: per-seed rho(cr60, h150) median {pl.Series(per).median():+.2f}, positive in {pos} of {len(per)}; "
          f"measured trees dead by 150: {died}")
