"""Exploratory: the crown's shape, light, growth and shedding by position (wayfinder flat cap).

Every dump season, each case's leafy buds define the crown: leafLo (5th percentile of the leaf's
height), H (the tree's height) and the half-width w (95th percentile of |dx|, frontal). Positions
become u = dx / w, v = (dy - yc) / hh with yc the middle of [leafLo, H] and hh half its depth, so
an ellipse fills rho <= 1 and a box fills the corners (rho up to 1.41 at 45 degrees). theta is
the angle from vertical (0 the top). Sectors: top < 30, flank 30-60, side 60-120, below > 120.
Bud light is normalised by the 0.9 quantile of the leafy buds' Q (C5's topQuantile) that season.

    uv run --project analysis python docs/experiments/code/2026-11-08-flat-cap/summary.py runs/flat-cap
"""
import sys, glob, os
import numpy as np
import polars as pl

d = sys.argv[1]
pl.Config.set_tbl_rows(300); pl.Config.set_tbl_cols(30); pl.Config.set_tbl_width_chars(250)
SECT = pl.when(pl.col.theta < 30).then(pl.lit("1 top")).when(pl.col.theta < 60).then(pl.lit("2 flank")) \
    .when(pl.col.theta < 120).then(pl.lit("3 side")).otherwise(pl.lit("4 below"))


def load(kind):
    out = []
    for f in sorted(glob.glob(f"{d}/*_{kind}.csv")):
        case = os.path.basename(f).removesuffix(f"_{kind}.csv")
        df = pl.read_csv(f, infer_schema_length=None)
        if df.height:
            out.append(df.with_columns(case=pl.lit(case)))
    return pl.concat(out, how="vertical_relaxed")


S, B, N, X = load("season"), load("buds"), load("new"), load("sheds")
leafy = B.filter(pl.col.leaf > 0)
geo = leafy.group_by("case", "season").agg(
    leafLo=pl.col.dy.quantile(0.05), w=pl.col.dx.abs().quantile(0.95), q90=pl.col.q.quantile(0.9),
    leaf=pl.col.leaf.sum(), wL=pl.col.dx.quantile(0.02), wR=pl.col.dx.quantile(0.98),
).join(S.select("case", "season", "height"), on=["case", "season"])
geo = geo.with_columns(yc=(pl.col.leafLo + pl.col.height) / 2, hh=(pl.col.height - pl.col.leafLo) / 2)


def place(df, on="season"):
    df = df.join(geo.select("case", pl.col.season.alias(on), "w", "yc", "hh", "height", "q90", "leafLo"), on=["case", on])
    u = (pl.col.dx / pl.col.w); v = (pl.col.dy - pl.col.yc) / pl.col.hh
    return df.with_columns(u=u, v=v).with_columns(
        rho=(pl.col.u ** 2 + pl.col.v ** 2).sqrt(),
        theta=pl.arctan2(pl.col.u.abs(), pl.col.v).degrees(),
        rel=pl.col.dy / pl.col.height,
    ).filter(pl.col.theta.is_not_nan()).with_columns(sector=SECT, shell=pl.col.rho >= 0.7)


lb = place(leafy).with_columns(qn=pl.col.q / pl.col.q90)
nw = place(N)
# sheds: geometry of the dump season at or before
X = X.with_columns(dump=(pl.col.season // 10) * 10)
xs = place(X, on="dump")

SEAS = [50, 100, 140]
print("== crown shape (lone: shedding at HEAD; noshed: C5 off, R1 not carbon)")
top5 = lb.group_by("case", "season").agg(top5=(pl.col.leaf * (pl.col.rel >= 0.8)).sum() / pl.col.leaf.sum())
# envelope: 95th percentile of rho per 15-degree sector, leaf buds
env = lb.with_columns(sec15=(pl.col.theta // 15 * 15).cast(pl.Int32)).group_by("case", "season", "sec15").agg(
    r95=pl.col.rho.quantile(0.95))
envw = env.filter(pl.col.sec15.is_in([0, 30, 45, 90])).pivot(on="sec15", index=["case", "season"], values="r95")
# width at 0.9 H over the widest band (10 bands of the leaf's depth)
band = lb.with_columns(b=((pl.col.dy - pl.col.leafLo) / (pl.col.height - pl.col.leafLo) * 10).floor().clip(0, 9)) \
    .group_by("case", "season", "b").agg(bw=pl.col.dx.quantile(0.98) - pl.col.dx.quantile(0.02))
flat = band.group_by("case", "season").agg(
    topW=pl.col.bw.filter(pl.col.b == 9).first() / pl.col.bw.max(),
    widest=pl.col.b.sort_by(pl.col.bw).last())
shape = geo.join(top5, on=["case", "season"]).join(flat, on=["case", "season"]).join(envw, on=["case", "season"]) \
    .with_columns(WH=(pl.col.wR - pl.col.wL) / pl.col.height).filter(pl.col.season.is_in(SEAS + [90])) \
    .select("case", "season", pl.col.height.round(0), pl.col.WH.round(2), pl.col.top5.round(2),
            pl.col.topW.round(2), "widest", *[pl.col(c).round(2).alias(f"r{c}") for c in ["0", "30", "45", "90"]]) \
    .sort("case", "season")
print(shape)
shape.write_csv(f"{d}/shape.csv")

print("== leaf, light and new growth by sector (outer shell rho >= 0.7), seasons 50-140")
win = pl.col.season.is_between(50, 140)
L = lb.filter(win).group_by("case", "sector", "shell").agg(
    leafShare=pl.col.leaf.sum(), qMed=pl.col.qn.median(), qP10=pl.col.qn.quantile(0.1))
L = L.with_columns(leafShare=pl.col.leafShare / pl.col.leafShare.sum().over("case"))
G = nw.filter(win).group_by("case", "sector", "shell").agg(new=pl.len())
G = G.with_columns(newShare=pl.col.new / pl.col.new.sum().over("case"))
Xs = xs.filter(win).group_by("case", "sector", "shell").agg(
    sheds=pl.len(), shedLeaf=pl.col.leaf.sum(), shedRatio=pl.col.ratio.median(), shedPM=pl.col.pm.median(),
    pmOnly=(pl.col.why == "P<M").mean(), light=(pl.col.why == "light").sum(), order1=(pl.col.order == 1).sum())
Xs = Xs.with_columns(shedShare=pl.col.shedLeaf / pl.col.shedLeaf.sum().over("case"))
T = L.join(G, on=["case", "sector", "shell"], how="left").join(Xs, on=["case", "sector", "shell"], how="left")
T = T.with_columns(pl.col(pl.Float64).round(3)).sort("case", "shell", "sector", descending=[False, True, False])
print(T.select("case", "sector", "shell", "leafShare", "newShare", "shedShare", "qMed", "qP10", "sheds",
               "shedRatio", "shedPM", "pmOnly", "light", "order1"))
T.write_csv(f"{d}/sectors.csv")

print("== shed per season ÷ leaf, outer upper crown (top + flank, shell) vs the rest, seasons 50-140")
# turnover: leaf shed per 10-season dump window / standing leaf there
st = lb.filter(win).group_by("case", "season", "sector", "shell").agg(standing=pl.col.leaf.sum())
sh = xs.filter(win).group_by("case", "dump", "sector", "shell").agg(lost=pl.col.leaf.sum()).rename({"dump": "season"})
tv = st.join(sh, on=["case", "season", "sector", "shell"], how="left").fill_null(0) \
    .with_columns(zone=pl.when(pl.col.shell & pl.col.sector.is_in(["1 top", "2 flank"])).then(pl.lit("outer upper"))
                  .otherwise(pl.lit("rest"))) \
    .group_by("case", "zone").agg(lostPerSeason=pl.col.lost.sum() / 10 / pl.col.standing.sum())
print(tv.with_columns(pl.col.lostPerSeason.round(4)).sort("case", "zone"))

print("== sheds: rule and the shed root's light, all seasons, by species")
print(X.filter(pl.col.season >= 20).group_by("case", "why").agg(
    n=pl.len(), leaf=pl.col.leaf.sum(), ratio=pl.col.ratio.median(), pm=pl.col.pm.median(),
    order=pl.col.order.median(), metamers=pl.col.metamers.median()).sort("case", "why"))
