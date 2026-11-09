"""Exploratory (seeds 1-3): does the overtop relay let the open-grown oak divide its top while it keeps
its young spire and wide low limbs? Wayfinder #94. Reads runs/oak-relay/out/<cond>-oak-s<seed>_*.csv, written by
rust/core/examples/flank_probe.rs (#90's; the core carries r2.relayOvertop) on the 60 m open-grown box.

Per run: height at 30/60/100 and the last season with >= 0.1 m of gain; axis switches on the
leader path at 100 (its `enter` column); the leader's order and nominal lambda on its upper half;
the flank's share of new metamers 60-100 (shell rho >= 0.7, 30-60 deg from vertical: #91's
measure, unchanged); W/H; the low limbs (lateral branches rooted on the leader below 6 m: their
share of the tree's leaf and the half-width of the leafy crown below 8 m); the old top-fifth
leaf share; and the outline measure proposed here, w90 = the crown's leafy width in the slice at
0.9 of its depth (leaf base to top) over its widest slice. An ellipse gives 0.6 there; a spire
goes low, a lid towards 1.

    uv run --project analysis python docs/experiments/code/2026-11-08-oak-relay/summary.py runs/oak-relay [oak|birch|beech]
"""
import sys, glob, os
import polars as pl

d = sys.argv[1]
SP = sys.argv[2] if len(sys.argv) > 2 else "oak"
M = 0.25  # metres per cell
pl.Config.set_tbl_rows(400); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(260)
ORDER = ["head", "R", "k101", "Rk101", "Rk100", "Rk101r40", "Rd12a13", "Rk101A", "Rd12a13A"]
KS = ["cond", "seed"]


def load(kind):
    out = []
    for f in sorted(glob.glob(f"{d}/out/*-{SP}-*_{kind}.csv")):
        cond, _, seed = os.path.basename(f).removesuffix(f"_{kind}.csv").split("-")
        df = pl.read_csv(f, infer_schema_length=None)
        if df.height:
            out.append(df.with_columns(cond=pl.lit(cond), seed=pl.lit(int(seed[1:]))))
    return pl.concat(out, how="vertical_relaxed")


S, L, R, D, N = (load(k) for k in ("season", "leader", "branches", "buds", "new"))
leafy = D.filter(pl.col.leaf > 0)

# Crown box each dumped season: leaf base (5th percentile), top (tree height), half-width.
geo = leafy.group_by(*KS, "season").agg(leafLo=pl.col.dy.quantile(0.05), w=pl.col.dx.abs().quantile(0.95)) \
    .join(S.select(*KS, "season", (pl.col.height / M).alias("Hc")), on=[*KS, "season"]) \
    .with_columns(yc=(pl.col.leafLo + pl.col.Hc) / 2, hh=(pl.col.Hc - pl.col.leafLo) / 2)


def place(df):
    return df.join(geo, on=[*KS, "season"]).with_columns(u=pl.col.dx / pl.col.w, v=(pl.col.dy - pl.col.yc) / pl.col.hh) \
        .with_columns(rho=(pl.col.u ** 2 + pl.col.v ** 2).sqrt(), theta=pl.arctan2(pl.col.u.abs(), pl.col.v).degrees()) \
        .filter(pl.col.theta.is_not_nan())


def outline(season):
    """w90 and w80: leafy width (2nd-98th percentile of dx) in a slice of 5% of crown depth centred
    at 0.9 / 0.8 of the depth, over the widest of the 20 slices; plus top-fifth leaf by height."""
    b = leafy.filter(pl.col.season == season).join(geo, on=[*KS, "season"]) \
        .with_columns(f=((pl.col.dy - pl.col.leafLo) / (pl.col.Hc - pl.col.leafLo)))
    sl = b.filter(pl.col.f.is_between(0, 1)).with_columns(k=(pl.col.f * 20).floor().clip(0, 19)) \
        .group_by(*KS, "k").agg(wd=pl.col.dx.quantile(0.98) - pl.col.dx.quantile(0.02), n=pl.len())
    wmax = sl.filter(pl.col.n >= 20).group_by(KS).agg(wmax=pl.col.wd.max())
    at = lambda k, name: sl.filter(pl.col.k == k).select(*KS, pl.col.wd.alias(name))
    top5 = b.group_by(KS).agg(top5=((pl.col.leaf * (pl.col.dy / pl.col.Hc >= 0.8)).sum() / pl.col.leaf.sum()),
                              WH=(pl.col.dx.quantile(0.98) - pl.col.dx.quantile(0.02)) / pl.col.Hc.first())
    # Shoulder: how far the upper surface (98th percentile of dy among leafy buds at |u| 0.4-0.6,
    # u = dx over the crown's 95% half-width, each side apart) sits below the top, in half-depths
    # of the crown. An ellipse gives 1 - sqrt(0.75) = 0.13; a lid ~0; a spire well above.
    sh = b.with_columns(u=pl.col.dx / pl.col.w).filter(pl.col.u.abs().is_between(0.4, 0.6)) \
        .with_columns(side=pl.col.u > 0).group_by(*KS, "side") \
        .agg(s=(pl.col.Hc.first() - pl.col.dy.quantile(0.98)) / pl.col.hh.first()) \
        .group_by(KS).agg(shoulder=pl.col.s.mean())
    return wmax.join(at(17, "w") , on=KS, how="left").join(at(15, "w8"), on=KS, how="left").join(top5, on=KS) \
        .join(sh, on=KS, how="left") \
        .with_columns(w90=(pl.col.w / pl.col.wmax).fill_null(0), w80=(pl.col.w8 / pl.col.wmax).fill_null(0)) \
        .select(*KS, pl.lit(season).alias("season"), "w90", "w80", "shoulder", "top5", "WH")


# Height, the young spire and the stall.
st = S.sort(*KS, "season").with_columns(dH=pl.col.height.diff().over(KS))
last = st.filter(pl.col.dH >= 0.1).group_by(KS).agg(lastGrow=pl.col.season.max())
hh = st.filter(pl.col.season.is_in([30, 60, 100])).pivot(on="season", index=KS, values="height") \
    .rename({"30": "H30", "60": "H60", "100": "H100"})

# Leader at 100: axis switches, and on its upper half the order (clamped to pa) and nominal lambda.
sw = L.filter(pl.col.season == 100).group_by(KS).agg(switches=(pl.col.enter > 0).sum())
up = L.filter(pl.col.season == 100, pl.col.h >= 0.5 * pl.col.H).group_by(KS).agg(
    paUp=pl.col.pa.clip(0, 2).mode().first(), lamUp=pl.col.lamNom.median())
up30 = L.filter(pl.col.season == 30, pl.col.h >= 0.5 * pl.col.H).group_by(KS).agg(lamUp30=pl.col.lamNom.median())

# Flank share of new metamers, seasons 60-100 (#91's measure).
nw = place(N.filter(pl.col.season >= 60))
fs = nw.group_by(KS).agg(flank=((pl.col.rho >= 0.7) & pl.col.theta.is_between(30, 60, closed="left")).mean() * 100)

# Low limbs at 30 and 100.
def low(season):
    r = R.filter(pl.col.season == season, pl.col.h < 6).group_by(KS).agg(limbLeaf=pl.col.leaf.sum())
    tot = leafy.filter(pl.col.season == season).group_by(KS).agg(tot=pl.col.leaf.sum(),
        halfLow=pl.col.dx.filter(pl.col.dy < 8 / M).abs().quantile(0.98) * M)
    return r.join(tot, on=KS).select(*KS, (pl.col.limbLeaf / pl.col.tot).alias(f"limbLeaf{season}"),
                                     pl.col.halfLow.alias(f"halfLow{season}"))


t = hh.join(last, on=KS, how="left").join(sw, on=KS).join(up, on=KS).join(up30, on=KS).join(fs, on=KS) \
    .join(low(30), on=KS).join(low(100), on=KS).join(outline(100).drop("season"), on=KS)
t = t.with_columns(o=pl.col.cond.replace_strict({c: i for i, c in enumerate(ORDER)}, default=99)).sort("o", "seed").drop("o")
print("== per run (heights m; flank % of new metamers 60-100; limbLeaf = leaf share in limbs rooted < 6 m;"
      " halfLow = leafy half-width below 8 m, m; w90/w80 = outline width at 0.9/0.8 depth over max; at 100)")
print(t.with_columns(pl.col(pl.Float64).round(2)))

print("== by condition: min-max over seeds")
cols = ["H30", "H100", "lastGrow", "switches", "lamUp30", "lamUp", "flank", "limbLeaf100", "halfLow100",
        "WH", "top5", "w90", "w80", "shoulder"]
agg = t.group_by("cond").agg(*[(pl.col(c).min().round(2).cast(pl.String) + "–" + pl.col(c).max().round(2).cast(pl.String)).alias(c) for c in cols],
                             passFlank=(pl.col.flank >= 5).sum())
print(agg.with_columns(o=pl.col.cond.replace_strict({c: i for i, c in enumerate(ORDER)}, default=99)).sort("o").drop("o"))

print("== outline over time (w90 median over seeds) at 30/60/100")
ot = pl.concat([outline(s) for s in (30, 60, 100)])
print(ot.group_by("cond", "season").agg(w90=pl.col.w90.median().round(2), shoulder=pl.col.shoulder.median().round(2), top5=pl.col.top5.median().round(2))
      .pivot(on="season", index="cond", values=["w90", "shoulder", "top5"])
      .with_columns(o=pl.col.cond.replace_strict({c: i for i, c in enumerate(ORDER)}, default=99)).sort("o").drop("o"))
