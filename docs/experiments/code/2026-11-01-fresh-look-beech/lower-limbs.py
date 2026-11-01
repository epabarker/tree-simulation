"""Why the lone beech's lower limbs survive (overnight, 2026-11-01): the user's observation that the
lower branches always survive and the lower trunk never clears, read from the 20-seed runs.

For each first-order limb (order 1 on the trunk) that leaves the trunk below H/6, at 60 and 100:
its light per metamer (C5's measure, qSum/nSum) against beech's T_rel·Q_top (0.008 × the crown top's
90% bud-light quantile), and its production against its upkeep (R1's carbon test, pSum/mSum). A limb
is shed when P < M (k_shed 1) or its light < T_rel·Q_top; the table says which test it passes by how
much. Runs: evidence20.py's (today's beech, the round's rules absent; and the repair's).

    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/lower-limbs.py \
        runs/fresh-look/evidence20-today runs/fresh-look/evidence20-repair
"""

from __future__ import annotations

import sys
from pathlib import Path

import polars as pl

TREL, TOPQ = 0.008, 0.9


def limbs(run: Path, season: int) -> pl.DataFrame:
    m = pl.read_csv(run / "metamers.csv", infer_schema_length=None).filter(pl.col("season") == season)
    b = pl.read_csv(run / "buds.csv", infer_schema_length=None).filter(pl.col("season") == season)
    h = float(m["y1"].max())
    q_top = float(b.filter(pl.col("state") != 3)["q"].quantile(TOPQ)) if b.height else float("nan")
    order = dict(zip(m["birthId"].to_list(), m["order"].to_list()))
    m = m.with_columns(pl.col("parentBirthId").replace_strict(order, default=-1).alias("parentOrder"))
    first = m.filter((pl.col("order") == 1) & (pl.col("parentOrder") == 0) & (pl.col("y0") < h / 6))
    return first.select(
        pl.lit(run.name).alias("run"),
        pl.lit(season).alias("season"),
        (pl.col("y0") / h).alias("base/H"),
        (pl.col("qSum") / pl.col("nSum")).alias("light"),
        pl.lit(TREL * q_top).alias("TrelQtop"),
        (pl.col("pSum") / pl.col("mSum")).alias("P/M"),
        pl.col("nSum").alias("metamers"),
    )


def main() -> None:
    for root in map(Path, sys.argv[1:]):
        rows = []
        for d in sorted(root.glob("lone-*")):
            for season in (60, 100):
                rows.append(limbs(d, season))
        df = pl.concat(rows)
        s = df.group_by("season").agg(
            pl.len().alias("lower limbs (all seeds)"),
            pl.col("metamers").median().alias("median metamers"),
            (pl.col("light") / pl.col("TrelQtop")).median().alias("median light ÷ T_rel·Q_top"),
            (pl.col("light") / pl.col("TrelQtop")).min().alias("min light ÷ T_rel·Q_top"),
            pl.col("P/M").median().alias("median P/M"),
            pl.col("P/M").min().alias("min P/M"),
            (pl.col("light") < pl.col("TrelQtop")).sum().alias("below T_rel·Q_top"),
            (pl.col("P/M") < 1).sum().alias("P < M"),
            pl.col("light").median().alias("median light"),
        ).sort("season")
        print(root.name)
        with pl.Config(tbl_cols=20, tbl_width_chars=250):
            print(s)


if __name__ == "__main__":
    main()
