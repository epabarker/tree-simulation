"""Exploratory (seeds 1-3): does a falling lambda fill the open-grown oak's flank? Wayfinder #91.
A copy of #90's summary.py (oak-flank) with a stall table added at the end.

Reads runs/oak-lambda/out/<cond>-<sp>-s<seed>_*.csv (cond: head | dXXaYY, r2.dLambda 0.XX at aC
13.5 or 30; a trailing F adds the turgorLength patch at s* 0.5 friction-heavy; sp: oak | birch), written by rust/core/examples/flank_probe.rs on the 60 m
open-grown box (ADR 0062). The leader is the path from the root to the highest node each season;
"upper" means a leader node at >= 0.5 H. Crown geometry and the flank (shell rho >= 0.7, 30-60
degrees from vertical about the crown centre) follow the turgor-length summary.py.

    uv run --project analysis python docs/experiments/code/2026-11-08-oak-flank/summary.py runs/oak-lambda
"""
import sys, glob, os
import polars as pl

d = sys.argv[1]
M = 0.25
pl.Config.set_tbl_rows(400); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(260)
K = ["sp", "cond"]
WIN = pl.when(pl.col.season < 30).then(pl.lit("a 0-29")).when(pl.col.season < 60).then(pl.lit("b 30-59")) \
    .otherwise(pl.lit("c 60-100"))
SECT = pl.when(pl.col.theta < 30).then(pl.lit("1 top")).when(pl.col.theta < 60).then(pl.lit("2 flank")) \
    .when(pl.col.theta < 120).then(pl.lit("3 side")).otherwise(pl.lit("4 below"))
TAG = {0: "other", 1: "upper lateral", 2: "leader", 3: "lower lateral"}


def load(kind):
    out = []
    for f in sorted(glob.glob(f"{d}/out/*_{kind}.csv")):
        cond, sp, seed = os.path.basename(f).removesuffix(f"_{kind}.csv").split("-")
        df = pl.read_csv(f, infer_schema_length=None)
        if df.height:
            out.append(df.with_columns(cond=pl.lit(cond), sp=pl.lit(sp), seed=pl.lit(int(seed[1:]))))
    return pl.concat(out, how="vertical_relaxed")


S, L, B, R, D, N = (load(k) for k in ("season", "leader", "lbuds", "branches", "buds", "new"))
KS = [*K, "seed"]

print("== heights (m) and the tree's resource v_base")
print(S.filter(pl.col.season.is_in([30, 45, 60, 100])).group_by(*K, "season")
      .agg(H=pl.col.height.round(1).sort().str.join(" ") if False else pl.col.height.min().round(1),
           Hmax=pl.col.height.max().round(1), vBase=pl.col.vBase.median().round(0)).sort(*K, "season"))

print("== A. lateral buds on the upper leader: fate shares by window")
up = B.with_columns(rel=pl.col.h / pl.col.H, win=WIN).filter(pl.col.rel >= 0.5)
fates = up.group_by(*K, "win", "fate").len().with_columns(sh=(pl.col.len / pl.col.len.sum().over(*K, "win")).round(3)) \
    .pivot(on="fate", index=[*K, "win"], values="sh").sort(*K, "win")
print(fates)
print(up.group_by(*K, "win").agg(
    budsPerSeason=(pl.len() / pl.col.season.n_unique() / 3).round(1), v=pl.col.v.median().round(3),
    v90=pl.col.v.quantile(0.9).round(3), thr=pl.col.thr.median(), passFrac=(pl.col.v >= pl.col.thr).mean().round(3),
    qr=pl.col.qr.median().round(2)).sort(*K, "win"))
print("   grown shoots from upper-leader laterals: metamers, length (m), angle from vertical (deg)")
print(up.filter(pl.col.fate == "grew").group_by(*K, "win").agg(
    shoots=pl.len(), n=pl.col.n.mean().round(2), ext=pl.col.ext.median().round(2), ang=pl.col.ang.median().round(0))
      .sort(*K, "win"))

print("== B. C3 at the upper leader's nodes: the share of v_in sent to laterals, and the laterals' light share")
lu = L.with_columns(rel=pl.col.h / pl.col.H, win=WIN).filter(pl.col.rel >= 0.5)
print(lu.group_by(*K, "win").agg(
    nodes=(pl.len() / pl.col.season.n_unique() / 3).round(0), vIn=pl.col.vIn.median().round(0),
    vLatShare=(pl.col.vLat / pl.col.vIn).median().round(3), qLatShare=(pl.col.qLat / (pl.col.qLat + pl.col.qMain)).median().round(3),
    lamNom=pl.col.lamNom.median().round(3), lamEff=pl.col.lamEff.median().round(3),
    shade=pl.col.shade.max(), latKids=pl.col.latKids.mean().round(2)).sort(*K, "win"))
# Where along the leader the laterals' light share sits (season 60-100), by relative height.
print(L.filter(pl.col.season >= 60).with_columns(b=(pl.col.h / pl.col.H * 10).floor().clip(0, 9) / 10)
      .group_by(*K, "b").agg(qLatShare=(pl.col.qLat / (pl.col.qLat + pl.col.qMain)).median().round(3))
      .sort(*K, "b").pivot(on="b", index=K, values="qLatShare", sort_columns=True))

print("== C. lateral branches on the upper leader")
ru = R.with_columns(rel=pl.col.h / pl.col.H, win=WIN).filter(pl.col.rel >= 0.5)
print(ru.group_by(*K, "win").agg(
    perSeason=(pl.len() / pl.col.season.n_unique() / 3).round(1), n=pl.col.n.median(), n90=pl.col.n.quantile(0.9),
    leaf=pl.col.leaf.median().round(2), qr=pl.col.qr.median().round(2), pm=pl.col.pm.median().round(2),
    ang=pl.col.ang.median().round(0), cx=pl.col.cx.median().round(2), cy=pl.col.cy.median().round(2),
    reach=pl.col.reach.quantile(0.9).round(2), passFrac=(pl.col.budsPass.sum() / pl.col.budsLive.sum()).round(3),
    grownPerBranch=pl.col.grown.mean().round(2)).sort(*K, "win"))
print("   sheds of upper-leader branches, by cause (count over 3 seeds)")
print(ru.filter(pl.col.shed.is_not_null() & (pl.col.shed != "")).group_by(*K, "win", "shed").agg(
    k=pl.len(), n=pl.col.n.median(), pm=pl.col.pm.median().round(2), run=pl.col.run.median(), qr=pl.col.qr.median().round(2))
      .sort(*K, "win", "shed"))
# Life of a branch born on the upper half: max size reached, and seasons lived.
life = R.with_columns(rel=pl.col.h / pl.col.H).group_by(*KS, "bid").agg(
    born=pl.col.born.first(), relBorn=pl.col.rel.first(), last=pl.col.season.max(), nMax=pl.col.n.max(),
    reachMax=pl.col.reach.max(), shed=pl.col.shed.drop_nulls().filter(pl.col.shed.drop_nulls() != "").first())
print("   branches born above 0.5 H after season 20: life (seasons), max metamers, max reach (m)")
print(life.filter(pl.col.relBorn >= 0.5, pl.col.born >= 20).group_by(*K).agg(
    k=pl.len(), lived=(pl.col.last - pl.col.born).median(), nMax=pl.col.nMax.median(), nMax90=pl.col.nMax.quantile(0.9),
    reach90=pl.col.reachMax.quantile(0.9).round(2), shedFrac=pl.col.shed.is_not_null().mean().round(2)).sort(*K))

print("== D. who builds the flank: new metamers in the shell by origin (seasons 60-100) and where upper laterals' growth goes")
leafy = D.filter(pl.col.leaf > 0)
geo = leafy.group_by(*KS, "season").agg(leafLo=pl.col.dy.quantile(0.05), w=pl.col.dx.abs().quantile(0.95)) \
    .join(S.select(*KS, "season", (pl.col.height / M).alias("Hc")), on=[*KS, "season"]) \
    .with_columns(yc=(pl.col.leafLo + pl.col.Hc) / 2, hh=(pl.col.Hc - pl.col.leafLo) / 2)


def place(df):
    return df.join(geo, on=[*KS, "season"]).with_columns(u=pl.col.dx / pl.col.w, v=(pl.col.dy - pl.col.yc) / pl.col.hh) \
        .with_columns(rho=(pl.col.u ** 2 + pl.col.v ** 2).sqrt(), theta=pl.arctan2(pl.col.u.abs(), pl.col.v).degrees()) \
        .filter(pl.col.theta.is_not_nan()).with_columns(sector=SECT, shell=pl.col.rho >= 0.7,
                                                         origin=pl.col.tag.replace_strict(TAG))


nw = place(N.filter(pl.col.season >= 60))
lb = place(leafy.filter(pl.col.season >= 60))
fl = nw.filter(pl.col.shell, pl.col.sector == "2 flank")
print("   flank's share of all new metamers, and the flank's new metamers by origin")
print(nw.group_by(*K).agg(flankShare=(pl.col.shell & (pl.col.sector == "2 flank")).mean().round(3)).join(
    fl.group_by(*K, "origin").len().with_columns(sh=(pl.col.len / pl.col.len.sum().over(K)).round(2))
    .pivot(on="origin", index=K, values="sh"), on=K).sort(K))
print("   where the upper laterals' new metamers go (sector x shell share)")
print(nw.filter(pl.col.tag == 1).group_by(*K, "sector", "shell").len()
      .with_columns(sh=(pl.col.len / pl.col.len.sum().over(K)).round(3))
      .with_columns(cell=pl.col.sector + pl.when(pl.col.shell).then(pl.lit(" shell")).otherwise(pl.lit(" in")))
      .pivot(on="cell", index=K, values="sh", sort_columns=True).sort(K))
print("   leaf by origin and sector (shell), seasons 60-100")
print(lb.filter(pl.col.shell).group_by(*K, "sector", "origin").agg(leaf=pl.col.leaf.sum())
      .with_columns(sh=(pl.col.leaf / pl.col.leaf.sum().over(K)).round(3))
      .filter(pl.col.sector == "2 flank").pivot(on="origin", index=K, values="sh").sort(K))
print("   leaf by origin overall (share of the tree's leaf), seasons 60-100")
print(lb.group_by(*K, "origin").agg(leaf=pl.col.leaf.sum()).with_columns(sh=(pl.col.leaf / pl.col.leaf.sum().over(K)).round(3))
      .pivot(on="origin", index=K, values="sh").sort(K))

print("== E. shape and architecture at season 100: H, W/H, top-fifth leaf, axis switches on the leader path, flank share of new 60-100")
lb100 = place(leafy.filter(pl.col.season == 100)).with_columns(rel=pl.col.dy / pl.col.Hc)
sh = lb100.group_by(*KS).agg(top5=((pl.col.leaf * (pl.col.rel >= 0.8)).sum() / pl.col.leaf.sum()).round(2),
                             WH=((pl.col.dx.quantile(0.98) - pl.col.dx.quantile(0.02)) / pl.col.Hc.first()).round(2))
sw = L.filter(pl.col.season == 100).group_by(*KS).agg(switches=(pl.col.enter > 0).sum(), H=pl.col.H.first().round(1),
                                                      maxOrder=pl.col.order.max())
fs = nw.group_by(*KS).agg(flankNew=((pl.col.shell & (pl.col.sector == "2 flank")).mean() * 100).round(1))
print(sh.join(sw, on=KS).join(fs, on=KS).sort(*K, "seed"))

print("== F. height and the stall: height (m) by season, and the last season with >= 0.1 m/season of height gain")
st = S.sort(*KS, "season").with_columns(dH=pl.col.height.diff().over(KS))
last = st.filter(pl.col.dH >= 0.1).group_by(*KS).agg(lastGrow=pl.col.season.max())
hh = st.filter(pl.col.season.is_in([30, 45, 60, 80, 100])).pivot(on="season", index=KS, values="height")
print(hh.join(last, on=KS, how="left").with_columns(pl.exclude(*KS, "lastGrow").round(1)).sort(*K, "seed"))
