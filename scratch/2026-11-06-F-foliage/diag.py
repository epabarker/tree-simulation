"""diag.py RUNSDIR: the foliage budget of each run under RUNSDIR/runs/<kind>-<arg>-s<seed>/.
Per run: metamers, leaf area, LAI (leaf area per cell column), trees, canopy trees (H >= 10 m) at 60/100/150;
metamers born and lost 0-150 by cause: carbon deficit only, light (T_rel Q_top) only, both, R3 breaks,
O2 abrasion, whole-tree deaths (starved / other).
"""
import sys, glob, json, os
from collections import defaultdict
import polars as pl

D = sys.argv[1]
SNAP = (60, 100, 150)
COLS = "season tree species H nm def light both other rdef rlight rboth low area q alo qtop P M nout aout".split()


def load_diag(path):
    rows = []
    for line in open(path):
        if not line.startswith("SHED "):
            continue
        f = line.split()[1:]
        rows.append([float(f[0]), int(f[1]), f[2]] + [float(x) for x in f[3:]])
    return pl.DataFrame(rows, schema=COLS, orient="row").with_columns((pl.col("season") + 1).cast(pl.Int64))


out = []
for run in sorted(glob.glob(f"{D}/runs/*")):
    name = os.path.basename(run)
    kind, arg, seed = name.split("-")
    p = json.load(open(f"{run}/params.json"))
    W, Dz = p["world"]["width"], p["world"]["depth"]
    n_planted = len(p["trees"])
    mpath = f"{run}/run/metrics.csv"
    if not os.path.exists(mpath) or not os.path.exists(f"{run}/diag.txt"):
        continue
    met = pl.read_csv(mpath, infer_schema_length=0)
    met = met.select(
        pl.col("season").cast(pl.Int64), pl.col("tree").cast(pl.Int64), pl.col("species"),
        *[pl.col(c).cast(pl.Float64) for c in ("alive", "metamers", "height", "shed", "broken", "abraded", "starved", "production", "maintenance")])
    dg = load_diag(f"{run}/diag.txt")
    alive = met.filter(pl.col("alive") == 1)
    rec = dict(run=name, kind=kind if kind != "stand" else f"stand-{arg}", seed=int(seed[1:]))
    for s in SNAP:
        a = alive.filter(pl.col("season") == s)
        g = dg.filter(pl.col("season") == s)
        rec[f"m{s}"] = a["metamers"].sum()
        rec[f"trees{s}"] = a.height
        rec[f"canopy{s}"] = a.filter(pl.col("height") >= 40).height
        rec[f"lai{s}"] = g["area"].sum() / (W * Dz)
        rec[f"area{s}"] = g["area"].sum()
        rec[f"aPerM{s}"] = g["area"].sum() / max(1, a["metamers"].sum())
        rec[f"lowA{s}"] = g["alo"].sum() / max(1e-9, g["area"].sum())
        rec[f"q{s}"] = (g["q"] * g["area"]).sum() / max(1e-9, g["area"].sum())
        rec[f"PM{s}"] = a["production"].sum() / max(1e-9, a["maintenance"].sum())
        rec[f"aOut{s}"] = g["aout"].sum() / max(1e-9, g["area"].sum())
        rec[f"mPerCell{s}"] = a["metamers"].sum() / (W * (Dz if kind == "stand" else 28))
        rec[f"laiT{s}"] = g["area"].sum() / (W * (Dz if kind == "stand" else 28))
    # losses 1..150
    dl = dg.filter(pl.col("season") <= 150)
    for c in ("def", "light", "both", "other", "low", "nout"):
        rec[f"L_{c}"] = dl[c].sum()
    al = alive.filter(pl.col("season") <= 150)
    rec["L_broken"] = al["broken"].sum()
    rec["L_abraded"] = al["abraded"].sum()
    # whole-tree deaths: the row where alive flips 1 -> 0 (dead trees keep frozen rows)
    srt = met.sort(["tree", "season"]).with_columns(pl.col("alive").shift(1).over("tree").alias("prev"))
    flip = srt.filter((pl.col("alive") == 0) & (pl.col("prev") == 1) & (pl.col("season") <= 150))
    starved = flip.filter(pl.col("starved") >= 3)
    thrown = flip.filter((pl.col("starved") < 3) & (pl.col("broken") >= pl.col("metamers")) & (pl.col("metamers") > 0))
    other = flip.filter((pl.col("starved") < 3) & ~((pl.col("broken") >= pl.col("metamers")) & (pl.col("metamers") > 0)))
    rec["deaths"] = flip.height
    rec["deathsStarved"] = starved.height; rec["deathsThrown"] = thrown.height; rec["deathsM0"] = other.height
    rec["L_starved"] = starved["metamers"].sum(); rec["L_thrown"] = thrown["metamers"].sum(); rec["L_m0"] = other["metamers"].sum()
    rec["bigDeaths"] = flip.filter(pl.col("metamers") > 1000).height
    # births from metrics alone: per live tree-season, delta metamers + shed + broken + abraded
    lv = srt.filter(pl.col("alive") == 1).with_columns(pl.col("metamers").shift(1).over("tree").fill_null(0).alias("m_prev"))
    lv = lv.with_columns(((pl.col("metamers") - pl.col("m_prev")) + pl.col("shed") + pl.col("broken") + pl.col("abraded")).alias("b"))
    rec["born"] = lv.filter(pl.col("season") <= 150)["b"].sum()
    rec["bornPerCell"] = rec["born"] / (W * (Dz if kind == "stand" else 28))
    rec["Pcum"] = al["production"].sum()
    rec["PcumPerCell"] = rec["Pcum"] / (W * (Dz if kind == "stand" else 28))
    # check: diag shed == metrics shed
    j = dl.with_columns((pl.col("def") + pl.col("light") + pl.col("both") + pl.col("other")).alias("dsum")).select("season", "tree", "dsum")
    for off in (0, 1):
        jj = j.with_columns((pl.col("season") + off).alias("season")).join(lv.select("season", "tree", "shed"), on=["season", "tree"])
        rec[f"chk{off}"] = (jj["dsum"] - jj["shed"]).abs().sum() / max(1, jj["shed"].sum())
    lost = sum(rec[k] for k in ("L_def", "L_light", "L_both", "L_other", "L_broken", "L_abraded", "L_starved", "L_thrown", "L_m0"))
    rec["lost"] = lost
    rec["bal"] = rec["born"] - lost - rec["m150"]
    for s in SNAP:
        rec[f"laiB{s}"] = rec[f"area{s}"] / (W * 28)
    out.append(rec)

df = pl.DataFrame(out)
df.write_csv(f"{D}/diag_summary.csv")
pl.Config.set_tbl_rows(100); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(250)
num = [c for c in df.columns if c not in ("run", "kind", "seed")]
agg = df.group_by("kind").agg(pl.len().alias("n"), *[pl.col(c).median().round(3) for c in num]).sort("kind")
for cols in (["m150", "mPerCell150", "laiT100", "laiT150", "bornPerCell", "PcumPerCell", "aOut100", "aOut150", "L_nout"], ["m60", "m100", "m150", "trees150", "canopy100", "canopy150", "lai100", "lai150", "aPerM150", "lowA150", "q150", "PM150"],
             ["born", "lost", "bal", "chk0", "chk1", "L_def", "L_light", "L_both", "L_other", "L_low", "L_broken", "L_abraded"],
             ["L_starved", "L_thrown", "L_m0", "deaths", "deathsStarved", "deathsThrown", "deathsM0", "bigDeaths", "laiB100", "laiB150", "area150"]):
    print(agg.select(["kind", "n"] + cols))
