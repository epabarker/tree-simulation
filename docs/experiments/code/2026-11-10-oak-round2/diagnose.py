"""#124 round two, step 1 and 3: what separates the box-leaning and flank-failing seeds of round one's
d12a13 arm from the clean domes, and which outline measure separates the by-eye boxes from domes.

Reads round one's runs (git-ignored):
  runs/oak-crown/<arm>/oak-s<seed>/metrics.csv            every season (cli/oak-crown.ts)
  runs/probe/oak124-sheet/<arm>/lone-seed<seed>/{metamers,buds}.csv   seasons 30/60/100 (cli/probe.ts)
Or, with --snap DIR, another set of probe-like snapshot dirs <DIR>/<cond>/lone-seed<seed>/.

    uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/diagnose.py
"""

import sys
from pathlib import Path

import polars as pl

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
CELL = 0.25
# The agent's by-eye reading of round one's season-100 sheet (d12a13 arm), and the flank fails.
BOX = {1, 6, 9, 10, 16, 18}
BORDER = {12, 19}
FLANK_FAIL = {4, 5, 6, 7, 8, 17, 18}


def eye(seed: int) -> str:
    return "box" if seed in BOX else "border" if seed in BORDER else "dome"


def group(seed: int) -> str:
    if seed in BOX:
        return "box"
    if seed in FLANK_FAIL:
        return "thin-flank dome"
    if seed in BORDER:
        return "border"
    return "clean dome"


def outline(leaf: pl.DataFrame, H: float) -> dict:
    """Outline measures from leafy buds (x, y), in the frame of the metrics' w90: base the 5th
    percentile of leafy y, top the tree's height, 20 slices, a slice's width its 2nd-98th
    percentile of x."""
    base = leaf["y"].quantile(0.05)
    d = leaf.with_columns(k=((20 * (pl.col.y - base) / (H - base)).floor().clip(0, 19)).cast(pl.Int32)).filter(
        pl.col.y >= base
    )
    w = (
        d.group_by("k")
        .agg(w=pl.col.x.quantile(0.98) - pl.col.x.quantile(0.02), n=pl.len())
        .sort("k")
    )
    widths = {r["k"]: (r["w"] if r["n"] >= 20 else None) for r in w.iter_rows(named=True)}
    full = [widths.get(k) or 0.0 for k in range(20)]
    wmax = max(full) or float("nan")
    w50 = full[10]
    return {
        # the box's straight sides and flat top: mean slice width over the widest
        "fill": sum(full) / (20 * wmax),
        # width at 0.80-0.95 of depth (slices 16-18) over the widest: a flat top stays wide
        "top3": sum(full[16:19]) / (3 * wmax),
        # width at 0.9 over width at 0.5
        "w90_50": full[17] / w50 if w50 else float("nan"),
    }


def snapshot(dir: Path) -> pl.DataFrame:
    m = pl.read_csv(dir / "metamers.csv", columns=["season", "tree", "birthId", "parentBirthId", "axis", "order", "x1", "y1"])
    b = pl.read_csv(dir / "buds.csv", columns=["season", "tree", "metamer", "y", "leaf"])
    rows = []
    for season in sorted(m["season"].unique().to_list()):
        # a bud's `metamer` is its metamer's row within (season, tree), in file order
        ms = m.filter((pl.col.season == season) & (pl.col.tree == 0)).with_row_index("idx")
        H = ms["y1"].max()
        parent = dict(zip(ms["birthId"].to_list(), ms["parentBirthId"].to_list()))
        axis = dict(zip(ms["birthId"].to_list(), ms["axis"].to_list()))
        y = dict(zip(ms["birthId"].to_list(), ms["y1"].to_list()))
        top = ms.sort("y1", descending=True)["birthId"][0]
        path = []
        node = top
        while node != -1 and node in parent:
            path.append(node)
            node = parent[node]
        path.reverse()  # root first
        trunk = axis[path[0]]
        switches = sum(1 for a, c in zip(path, path[1:]) if axis[a] != axis[c])
        on_trunk = [y[p] for p in path if axis[p] == trunk]
        division = max(on_trunk) if on_trunk else 0.0
        has_child = set(parent.values())
        tips = ms.filter(~pl.col.birthId.is_in(list(has_child)) & (pl.col.y1 >= 0.9 * H))
        xs = ms.select("x1").to_series()
        leaf = (
            b.filter((pl.col.season == season) & (pl.col.tree == 0) & (pl.col.leaf > 0))
            .join(ms.select(pl.col.idx.cast(pl.Int64).alias("metamer"), pl.col.x1.alias("x")), on="metamer")
        )
        o = outline(leaf, H)
        rows.append(
            {
                "season": season,
                "Hm": H * CELL,
                "switches": switches,
                "divisionM": division * CELL,
                "divRel": division / H,
                "topTips": tips.height,
                "topSpread": (tips["x1"].quantile(0.98) - tips["x1"].quantile(0.02)) / (xs.quantile(0.98) - xs.quantile(0.02))
                if tips.height
                else 0.0,
                **o,
            }
        )
    return pl.DataFrame(rows)


def metrics(arm: str, seed: int) -> pl.DataFrame:
    p = ROOT / "runs/oak-crown" / arm / f"oak-s{seed}" / "metrics.csv"
    return pl.read_csv(p, infer_schema_length=0).filter(pl.col.tree == "0").select(
        pl.col.season.cast(pl.Int32),
        *[pl.col(c).cast(pl.Float64, strict=False) for c in ["height", "crownWidth", "crownLength", "topFifthLeaf", "upperFlankNew", "w90"]],
    )


def main():
    pl.Config.set_tbl_rows(100).set_tbl_cols(30).set_tbl_width_chars(250).set_float_precision(2)
    snap_root = ROOT / "runs/probe/oak124-sheet"
    out = []
    for arm in ["head", "patch"]:
        for seed in range(1, 21):
            mt = metrics(arm, seed)
            fin = mt["height"].max()
            # the season the leader is within 1 m of its final height (the stall)
            stall = mt.filter(pl.col.height >= fin - 4)["season"].min()
            fl = lambda a, b: mt.filter(pl.col.season.is_between(a, b))["upperFlankNew"].drop_nans().mean()
            row = {"arm": arm, "seed": seed, "group": group(seed) if arm == "patch" else "head", "stall": stall,
                   "flank30_60": fl(30, 59), "flank60_100": fl(60, 100)}
            for s in [30, 60, 100]:
                r = mt.filter(pl.col.season == s).row(0, named=True)
                row[f"L/W{s}"] = r["crownLength"] / r["crownWidth"]
                row[f"top5_{s}"] = r["topFifthLeaf"]
            sn = snapshot(snap_root / arm / f"lone-seed{seed}")
            for r in sn.iter_rows(named=True):
                s = r["season"]
                for k in ["switches", "divisionM", "divRel", "topTips", "topSpread", "fill", "top3", "w90_50"]:
                    row[f"{k}{s}"] = r[k]
            out.append(row)
    df = pl.DataFrame(out)
    df.write_csv(ROOT / "runs/oak-round2-diagnose.csv")
    print("== per seed, patch arm (d12a13)")
    cols = ["seed", "group", "stall", "flank30_60", "flank60_100", "switches30", "divisionM30", "divisionM60", "divRel100",
            "switches100", "topTips100", "topSpread100", "top5_60", "top5_100", "L/W30", "L/W60", "L/W100", "fill100", "top3100", "w90_50100"]
    print(df.filter(pl.col.arm == "patch").select(cols).sort("group", "seed"))
    print("== group medians (patch arm) and HEAD")
    num = [c for c in cols if c not in ("seed", "group")]
    print(df.group_by("group").agg([pl.col(c).median() for c in num]).sort("group"))


if __name__ == "__main__":
    main()
