"""Seed ranges (min-max over seeds 1-3) per species and condition, from summary.py's CSVs."""
import sys
import polars as pl
d = sys.argv[1]
pl.Config.set_tbl_rows(100); pl.Config.set_tbl_width_chars(260); pl.Config.set_tbl_cols(30)
def r(c, k=2):
    return (pl.col(c).min().round(k).cast(str) + "–" + pl.col(c).max().round(k).cast(str)).alias(c)
s = pl.read_csv(f"{d}/shape.csv").filter(pl.col.season == 100)
print(s.group_by("sp", "cond").agg(*[r(c) for c in ["H", "WH", "DH", "top5", "topW", "r45", "clear", "boleM", "lowXtrel", "lowPM", "limbs"]]).sort("sp", "cond"))
x = pl.read_csv(f"{d}/sheds.csv")
print(x.group_by("sp", "cond").agg(*[r(c, 4) for c in ["n", "pm", "light", "both", "leafless", "leafyPM", "leafyLight", "leaflessAge1", "leafPerSeason", "order1"]]).sort("sp", "cond"))
f = pl.read_csv(f"{d}/flank.csv")
print(f.group_by("sp", "cond", "sector").agg(*[r(c, 3) for c in ["leafShare", "qMed", "newShare"]]).sort("sp", "sector", "cond"))
b = pl.read_csv(f"{d}/box.csv")
print(b.group_by("sp", "cond").agg(*[r(c, 1) for c in ["outsideMax", "outsideSeasons", "reachX", "reachZ", "buds100", "H100"]]).sort("sp", "cond"))
