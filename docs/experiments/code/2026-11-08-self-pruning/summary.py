"""Exploratory: per tree, the lowest limb's C5 ratio and the clear bole over time; sheds by rule."""
import sys, glob, os
import polars as pl
d = sys.argv[1]
pl.Config.set_tbl_rows(200); pl.Config.set_tbl_cols(30); pl.Config.set_tbl_width_chars(250)
S, X = [], []
for f in sorted(glob.glob(f"{d}/*_season.csv")):
    case = os.path.basename(f).removesuffix("_season.csv")
    S.append(pl.read_csv(f, infer_schema_length=None).with_columns(case=pl.lit(case)))
    X.append(pl.read_csv(f.replace("_season", "_sheds"), infer_schema_length=None).with_columns(case=pl.lit(case)))
s = pl.concat(S, how="vertical_relaxed"); x = pl.concat(X, how="vertical_relaxed")
focus = ["beech", "hornbeam", "holly"]
# planted trees: those alive at season 1
planted = s.filter(pl.col.season == 1).select("case", "tree")
s = s.join(planted.with_columns(planted=True), on=["case", "tree"], how="left").with_columns(pl.col.planted.fill_null(False))
s = s.with_columns(clear=pl.col.boleLow / pl.col.height, lowOverTrel=pl.col.lowRatio / pl.col.trel)
cum = s.sort("season").with_columns(
    cumP=pl.col.shedFirstP.cum_sum().over("case", "tree"),
    cumQ=pl.col.shedFirstQ.cum_sum().over("case", "tree"),
    cumB=pl.col.shedFirstBoth.cum_sum().over("case", "tree"),
    cumBr=pl.col.brokenFirst.cum_sum().over("case", "tree"),
)
t = cum.filter(pl.col.species.is_in(focus), pl.col.planted, pl.col.season.is_in([20, 40, 60, 80, 100, 120, 149]))
print(t.select("case", "tree", "species", "season", pl.col.height.round(1), "limbs", pl.col.boleLow.round(2),
               pl.col.clear.round(3), pl.col.lowRatio.round(3), "trel", pl.col.lowOverTrel.round(1),
               pl.col.lowPM.round(2), "lowRun", pl.col.medRatio.round(3), "cumP", "cumQ", "cumB", "cumBr"))
# first season any first-order limb is shed, and by which rule (planted focus trees)
fs = cum.filter(pl.col.species.is_in(focus), pl.col.planted, pl.col.shedFirst > 0).group_by("case", "tree", "species").agg(
    firstShed=pl.col.season.min(), n=pl.col.shedFirst.sum(), P=pl.col.shedFirstP.sum(), Q=pl.col.shedFirstQ.sum(), both=pl.col.shedFirstBoth.sum(), broken=pl.col.brokenFirst.sum())
print(fs.sort("case", "tree"))
# all shed events: first-order limbs, rule, the ratio and P/M at shedding
xf = x.filter(pl.col.species.is_in(focus), pl.col.firstOrder)
print(xf.group_by("case", "species", "why").agg(n=pl.len(), ratioMed=pl.col.ratio.median(), ratioMax=pl.col.ratio.max(),
      pmMed=pl.col.pm.median(), baseMed=pl.col.baseHeight.median(), sizeMed=pl.col.metamers.median()).sort("case", "species", "why"))
print(x.filter(pl.col.species.is_in(focus)).group_by("case", "species", "why").agg(n=pl.len(), metamers=pl.col.metamers.sum()).sort("case", "species", "why"))
cum.write_csv(f"{d}/all_season.csv")
