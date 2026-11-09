"""Exploratory: the garden's demography at HEAD from metrics.csv (one row per tree per season).

Planted trees are the params' tree list (tree ids below its length); every later id is a
recruit (O4: a local seed or seed rain). "Drawn" stems are the live trees at a season: the page
draws every live tree, seedlings included. 4 cells = 1 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-garden-demography/summary.py runs/garden-demography
"""
import json
import sys

import polars as pl

d = sys.argv[1]
SEASONS = [50, 150, 300]
cases = [f"{k}-s{s}" for k in ["w160", "w66", "norain160"] for s in (1, 2, 3)]

rows = []
for case in cases:
    m = pl.read_csv(f"{d}/{case}/metrics.csv", infer_schema_length=None)
    p = json.load(open(f"{d}/{case}.json"))
    cap, planted = p["o4"]["maxTrees"], len(p["trees"])
    m = m.with_columns(recruit=pl.col.tree >= planted)
    live = m.filter(pl.col.alive == 1)
    born = m.filter(pl.col.recruit).group_by("tree").agg(
        pl.col.season.min().alias("born"), pl.col.species.first(), pl.col.height.max().alias("hmax")
    )
    n_live = live.group_by("season").len().sort("season")
    full = n_live.filter(pl.col.len >= cap)["season"]
    print(f"\n== {case}: planted {planted}, cap {cap}, recruits born {born.height}, "
          f"cap first full at season {full.min() if full.len() else 'never'}")
    print("  first seeds by species:",
          live.filter(pl.col.seeds > 0).group_by("species").agg(pl.col.season.min())
          .sort("season").rows())
    # Planted trees' deaths.
    last = m.filter(~pl.col.recruit, pl.col.alive == 1).group_by("tree", "species").agg(
        pl.col.season.max().alias("last"), pl.col.height.max().alias("hmax"))
    dead = last.filter(pl.col.last < 300).sort("last")
    print("  planted deaths (tree, species, last live season, max height m):",
          [(t, s, l, round(h / 4, 1)) for t, s, l, h in dead.rows()])
    print("  recruits reaching 5 m / 15 m (ever):",
          born.filter(pl.col.hmax >= 20).height, born.filter(pl.col.hmax >= 60).height)
    for s in SEASONS:
        a = live.filter(pl.col.season == s)
        r = a.filter(pl.col.recruit)
        row = dict(case=case, season=s, drawn=a.height, planted=a.height - r.height,
                   recruits=r.height, frac=round(r.height / max(a.height, 1), 2),
                   r_lt5m=r.filter(pl.col.height < 20).height,
                   r_5_15m=r.filter(pl.col.height.is_between(20, 60, closed="left")).height,
                   r_ge15m=r.filter(pl.col.height >= 60).height,
                   canopy10m=a.filter(pl.col.height >= 40).height,
                   born_by=born.filter(pl.col.born <= s).height)
        rows.append(row)
        sp = r.group_by("species").len().sort("len", descending=True).rows()
        print(f"  s{s}: drawn {a.height}, recruits {r.height} ({row['frac']}); "
              f"<5m {row['r_lt5m']}, 5-15m {row['r_5_15m']}, >=15m {row['r_ge15m']}; recruit species {sp}")

t = pl.DataFrame(rows)
pl.Config.set_tbl_rows(40)
pl.Config.set_tbl_cols(20)
print()
print(t)
