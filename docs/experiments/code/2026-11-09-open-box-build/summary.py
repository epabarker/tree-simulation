"""Build (a)'s evidence (#98): the six exemplars in the built open box, seeds 1-20, 100 seasons.

uv run --project analysis python docs/experiments/code/2026-11-09-open-box-build/summary.py runs/open-box-build

Reads each run's metrics.csv (every season) and form.csv (season 100) and prints:
1. the hard check: live buds past the box (budsOutside) at season 100 and in any season;
2. the re-check of the half-walled findings ADR 0062 lists, as seed ranges and medians:
   height and its stall (H100 - H60), W/H and D/H, the clear bole (lowest live limb / H),
   the crown ratio by leaf, and the top width (form.csv's profile, top two of ten bands);
3. native cost per season over seasons 91-100 and peak memory (12 runs at once, so loaded).
"""

import sys
from pathlib import Path

import polars as pl

CELL = 0.25
root = Path(sys.argv[1] if len(sys.argv) > 1 else "runs/open-box-build")
SPECIES = ["oak", "maple", "birch", "beech", "hornbeam", "holly"]

rows = []
for d in sorted(p for p in root.iterdir() if (p / "hash.txt").exists()):
    sp, seed = d.name.rsplit("-s", 1)
    m = pl.read_csv(d / "metrics.csv", infer_schema_length=0).with_columns(
        pl.exclude("species").cast(pl.Float64)
    )
    m = m.filter(pl.col("tree") == 0).sort("season")
    f = pl.read_csv(d / "form.csv").filter(pl.col("tree") == 0)
    last = m.row(-1, named=True)
    h60 = m.filter(pl.col("season") == 60)["height"].item()
    out = m.filter(pl.col("budsOutside") > 0)
    secs, kb = (d.parent / f"{d.name}.time").read_text().split()[0::2]
    prof = f.row(-1, named=True) if f.height else {}
    rows.append(
        {
            "species": sp,
            "seed": int(seed),
            "alive": last["alive"] == 1,
            "outside100": last["budsOutside"],
            "outsideSeasons": out.height,
            "outsideMax": out["budsOutside"].max() if out.height else 0.0,
            "outsideFirst": out["season"].min() if out.height else None,
            "maxH_m": m["height"].max() * CELL,
            "H_m": last["height"] * CELL,
            "stall_m": (last["height"] - h60) * CELL,
            "W/H": last["crownWidth"] / last["height"],
            "D/H": last["crownDepth"] / last["height"],
            "spread_m": max(last["crownWidth"], last["crownDepth"]) * CELL,
            "bole/H": last["boleHeight"] / last["height"],
            "leafCR": last["leafCrownRatio"],
            "topWidth": max(prof.get("p8", float("nan")), prof.get("p9", float("nan"))),
            "secs": float(secs),
            "MB": float(kb) / 1024,
        }
    )

df = pl.DataFrame(rows).sort("species", "seed")
pl.Config.set_tbl_rows(200)
pl.Config.set_tbl_cols(30)
pl.Config.set_fmt_str_lengths(60)

print("== The hard check: live buds past the box")
print(
    df.group_by("species")
    .agg(
        pl.len().alias("seeds"),
        (pl.col("outside100") == 0).sum().alias("zero at 100"),
        (pl.col("outsideSeasons") == 0).sum().alias("zero every season"),
        pl.col("outsideSeasons").max().alias("most seasons outside"),
        pl.col("outsideMax").max().alias("most buds outside"),
        pl.col("maxH_m").max().round(1).alias("tallest ever (m)"),
    )
    .sort("species")
)
print(df.filter(pl.col("outsideSeasons") > 0).select(
    "species", "seed", "outside100", "outsideSeasons", "outsideMax", "outsideFirst", "maxH_m", "H_m"
))
n = df.height
print(f"all: zero at 100 in {(df['outside100'] == 0).sum()} of {n}; "
      f"zero every season in {(df['outsideSeasons'] == 0).sum()} of {n}")


def rng(c: str, digits: int = 2) -> list[pl.Expr]:
    return [
        pl.format(
            "{}–{} ({})",
            pl.col(c).min().round(digits),
            pl.col(c).max().round(digits),
            pl.col(c).median().round(digits),
        ).alias(c)
    ]


print("\n== Season 100, seeds 1-20: min–max (median)")
print(
    df.group_by("species")
    .agg(
        *rng("H_m", 1),
        *rng("stall_m", 1),
        *rng("W/H"),
        *rng("D/H"),
        *rng("spread_m", 1),
        *rng("bole/H", 3),
        *rng("leafCR"),
        *rng("topWidth"),
    )
    .sort("species")
)

print("\n== Native cost, 12 runs at once (loaded): whole run (s) and peak memory (MB)")
print(df.group_by("species").agg(*rng("secs", 0), *rng("MB", 0)).sort("species"))
