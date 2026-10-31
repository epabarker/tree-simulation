"""The flat cap: where a crown's leaves, buds, light and bud deaths sit by height, and which rule holds it.

Hornbeam at `r2.ramp` 25 (the dome sweep's crown on a trunk), round 2's otherwise, seed 1, the lone
trial's world. At 60 and 100, ten height bands of the tree's height: leaf area, live buds, mean
light Q at live buds, and the share of the band's buds aborted in the preceding ten seasons
(aborted over the band's live buds ten seasons before, both placed by height against the tree at
the season read). R4 aborts a resting bud older than l_dorm that rests as dormant (Q < Q_ss, R6):
a bud is counted aborted at t when it was live at t − 1 with age ≥ l_dorm, is gone at t, and its
metamer is still there (`r4::aborts`). A bud released into a shoot at that age would count too, so
the sum is checked against metrics' `aborted` and `released`.
Then the same tree with one rule relaxed at a time: Q_ss (r6.qMin) 0.01, C5 off (and, since R1's
carbon shedding sheds regardless, r1.shed "c5" with C5 off: no shedding), k_ext 0.25, L_h doubled. Then the closed stand of hornbeam (cli/trials.ts standParams) at 100, the middle row's
four trees, each banded by its own height and summed.

`--birch`: of the lone birch's buds aborted between 60 and 100 (round 2's form and physiology), the
share whose light in the last season they were seen live was below Q_ss (its own, and round 3's
0.1995). In the season they abort it is below Q_ss by the rule; the season before says whether
they were dormant buds or short shoots that lost their light.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/cap.py [--birch]

prints the tables; the lone trees are drawn to docs/experiments/figures/2026-10-31-cap-hornbeam-{60,100}.png.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import polars as pl

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("form_grid", HERE / "form-grid.py")
grid = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(grid)
sweep, REPO, FIGURES, Evaluator = grid.sweep, grid.REPO, grid.FIGURES, grid.Evaluator

OUT = REPO / "runs" / "cap"
BANDS = 10
READ = (60, 100)
#: Seasons written: the ten before each read and the read itself.
SNAPS = sorted({s for r in READ for s in range(r - 10, r + 1)})
#: The closed stand (cli/trials.ts standParams, presets.ts perArea): four a row at 21, three rows
#: across the depth 64, staggered by 7; the middle row (trees 4–7) is measured.
STAND_WIDTH, STAND_ROW, MEASURED = 84, [10.5, 31.5, 52.5, 73.5], [4, 5, 6, 7]
STAND_TREES = [{"x": (x + r * 7) % STAND_WIDTH, "z": 64 * (r + 0.5) / 3} for r in range(3) for x in STAND_ROW]


def grow(name: str, species: str, patch: dict, world: dict, trees: list, top: dict | None = None) -> Path:
    raw = OUT / name
    raw.mkdir(parents=True, exist_ok=True)
    params = {"world": {"height": sweep.TOP, "walls": [], **world},
              "trees": [{**t, "species": species} for t in trees], "species": {species: patch}, **(top or {})}
    subprocess.run([str(sweep.TREESIM), "--preset", "oakOpen", "--params", "-", "--seed", "1", "--seasons", "100",
                    "--snapshots", ",".join(map(str, SNAPS)), "--light", "--quiet", "--out", str(raw)],
                   input=json.dumps(params), text=True, check=True)
    return raw


def load(raw: Path, trees: list[int]) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    keep = pl.col("tree").is_in(trees)
    b = pl.read_csv(raw / "buds.csv").filter(keep)
    m = pl.read_csv(raw / "metamers.csv", columns=["season", "tree", "birthId", "parentBirthId", "birthSeason"]).filter(keep)
    # A bud's metamer is its row within the tree's table that season (metamers.csv is in row order).
    m = m.with_columns(pl.int_range(pl.len()).over("season", "tree").alias("metamer"))
    mt = pl.read_csv(raw / "metrics.csv", infer_schema_length=None).filter(keep)
    b = b.join(m.rename({"birthId": "metamerId"}), on=["season", "tree", "metamer"], how="left")
    return b, m, mt


def aborted(b: pl.DataFrame, m: pl.DataFrame, l_dorm: float, seasons: range) -> pl.DataFrame:
    """The buds aborted at each season t in `seasons`, as last seen at t − 1: live then with age ≥
    l_dorm, gone at t, on a metamer still there. A released bud (R4) also leaves its slot: it is told
    apart by the new shoot on its metamer, so on each metamer as many of the gone buds as it grew new
    children are taken as released, the brightest first (release needs light, q ≥ q_rel)."""
    out = []
    for t in seasons:
        prev = b.filter((pl.col("season") == t - 1) & (pl.col("age") >= l_dorm))
        now = b.filter(pl.col("season") == t).select("tree", "birthId")
        mt = m.filter(pl.col("season") == t)
        alive_m = mt.select("tree", pl.col("birthId").alias("metamerId"))
        born = (mt.filter(pl.col("birthSeason") == t).group_by("tree", pl.col("parentBirthId").alias("metamerId"))
                .agg(pl.len().alias("children")))
        gone = (prev.join(now, on=["tree", "birthId"], how="anti").join(alive_m, on=["tree", "metamerId"], how="semi")
                .join(born, on=["tree", "metamerId"], how="left").with_columns(pl.col("children").fill_null(0))
                .with_columns(pl.col("q").rank("ordinal", descending=True).over("tree", "metamerId").alias("rank"))
                .filter(pl.col("rank") > pl.col("children")).drop("children", "rank"))
        out.append(gone.with_columns(pl.lit(t).alias("abortedAt")))
    return pl.concat(out)


def band_table(b: pl.DataFrame, m: pl.DataFrame, mt: pl.DataFrame, s: int, l_dorm: float) -> pl.DataFrame:
    """Ten bands of each tree's height at s, summed over the trees: leaf, live buds, mean Q, aborted share."""
    h = mt.filter(pl.col("season") == s).select("tree", pl.col("height").alias("H"))

    def banded(df: pl.DataFrame) -> pl.DataFrame:
        return df.join(h, on="tree").with_columns(
            (pl.col("y") / pl.col("H") * BANDS).floor().clip(0, BANDS - 1).cast(pl.Int32).alias("band"))

    live = banded(b.filter(pl.col("season") == s))
    before = banded(b.filter(pl.col("season") == s - 10))
    dead = banded(aborted(b, m, l_dorm, range(s - 9, s + 1)))
    t = (live.group_by("band").agg(pl.col("leaf").sum().alias("leafArea"), pl.len().alias("liveBuds"),
                                   pl.col("q").mean().alias("meanQ"))
         .join(before.group_by("band").agg(pl.len().alias("buds10Before")), on="band", how="full", coalesce=True)
         .join(dead.group_by("band").agg(pl.len().alias("aborted10")), on="band", how="full", coalesce=True)
         .with_columns(pl.col("aborted10").fill_null(0)))
    t = t.with_columns((pl.col("aborted10") / pl.col("buds10Before")).alias("abortedShare"),
                       (pl.col("leafArea") / pl.col("leafArea").sum()).alias("leafShare"))
    return pl.DataFrame({"band": list(range(BANDS))}, schema={"band": pl.Int32}).join(t, on="band", how="left").sort(
        "band", descending=True)


def check(mt: pl.DataFrame, found: int, seasons: range) -> str:
    rows = mt.filter(pl.col("season").is_in(list(seasons)))
    return (f"aborted found {found}, metrics' aborted {int(rows['aborted'].sum())}, "
            f"released {int(rows['released'].sum())}")


def md(df: pl.DataFrame) -> str:
    """A markdown table, bands as tenths of the height, top first."""
    rows = ["| band (of H) | leaf area | leaf share | live buds | mean Q | aborted in 10 seasons | share |",
            "|---|---|---|---|---|---|---|"]
    for r in df.iter_rows(named=True):
        f = lambda v, d: "–" if v is None or (isinstance(v, float) and not np.isfinite(v)) else f"{v:.{d}f}"
        rows.append(f"| {r['band'] / 10:.1f}–{(r['band'] + 1) / 10:.1f} | {f(r['leafArea'], 0)} | {f(r['leafShare'], 2)} | "
                    f"{r['liveBuds'] or 0} | {f(r['meanQ'], 3)} | {r['aborted10']} | {f(r['abortedShare'], 2)} |")
    return "\n".join(rows)


def hornbeam(workers: int) -> None:
    sp = "hornbeam"
    spec = __import__("tomllib").loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    fixed = spec.get("fixed", {})
    ev = Evaluator()
    try:
        hand = ev.ask({"describe": sp, "paths": ["r4.lDorm", "r6.qMin", "r1.Lh", "c2.kExt"]})["values"]
        base = {**fixed, "r2.ramp": 25}
        cases = {"base": (base, None), "qSs0.01": ({**base, "r6.qMin": 0.01}, None),
                 "c5off": ({**base, "c5.enabled": False}, None),
                  # R1's carbon shedding (r1.shed "carbon") sheds whatever C5's flag says (c5.rs
                 # shed_branches); with r1.shed "c5" and C5 off no branch is shed.
                 "noShed": ({**base, "c5.enabled": False, "r1.shed": "c5"}, None),
                 "kExt0.25": (base, {"c2": {"kExt": 0.25}}),
                 "Lh2x": ({**base, "r1.Lh": 2 * hand["r1.Lh"]}, None)}
        patches = {k: (ev.ask({"amend": sp, "assign": a})["patch"], top) for k, (a, top) in cases.items()}
    finally:
        ev.close()
    l_dorm = hand["r4.lDorm"]
    lone = {"width": sweep.WIDTH}
    stand = {"width": STAND_WIDTH, "sides": "periodic", "faces": [0, 0]}
    jobs = [(f"lone-{k}", p, lone, [{"x": sweep.WIDTH / 2}], top) for k, (p, top) in patches.items()]
    jobs.append(("stand-base", patches["base"][0], stand, STAND_TREES, None))
    with ThreadPoolExecutor(workers) as pool:
        raws = dict(zip([j[0] for j in jobs], pool.map(lambda j: grow(j[0], sp, j[1], j[2], j[3], j[4]), jobs)))
    print(f"hornbeam: r2.ramp 25, l_dorm {l_dorm}, Q_ss {hand['r6.qMin']}, L_h {hand['r1.Lh']}, k_ext {hand['c2.kExt']}")
    for name, raw in raws.items():
        trees = MEASURED if name.startswith("stand") else [0]
        b, m, mt = load(raw, trees)
        for s in READ:
            if name.startswith("stand") and s != 100:
                continue
            t = band_table(b, m, mt, s, l_dorm)
            top2 = t.filter(pl.col("band") >= 8)["leafShare"].sum()
            print(f"\n### {name} at {s}: leaf share in the top fifth {top2:.2f}; "
                  f"{check(mt, int(t['aborted10'].sum()), range(s - 9, s + 1))}")
            print(md(t))
    # The lone trees drawn as the form sweep's cells (a second run each, reduced to an npz).
    cells = OUT / "cells"
    cells.mkdir(exist_ok=True)
    with ThreadPoolExecutor(workers) as pool:
        list(pool.map(lambda kv: sweep.run_cell(sp, kv[1][0], cells / f"{kv[0]}.npz", top=kv[1][1]),
                      patches.items()))
    (cells / "hand.npz").unlink(missing_ok=True)
    (cells / "hand.npz").symlink_to(cells / "base.npz")
    rows = [[(k, k, None) for k in patches]]
    for s in READ:
        head = (f"hornbeam at ramp 25, season {s}: one rule relaxed at a time (lone tree, seed 1)",
                "base = round 2's with r2.ramp 25")
        print(grid.draw_cells(s, rows, head, "base: ramp 25", {}, cells,
                              "uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/cap.py",
                              FIGURES / f"2026-10-31-cap-hornbeam-{s}.png", ref_title="base (ramp 25)"))


def birch() -> None:
    sp = "birch"
    ev = Evaluator()
    try:
        hand = ev.ask({"describe": sp, "paths": ["r4.lDorm", "r6.qMin"]})["values"]
        patch = ev.ask({"amend": sp, "assign": {}})["patch"]
    finally:
        ev.close()
    global SNAPS
    SNAPS = list(range(59, 101))
    raw = grow("birch-lone", sp, patch, {"width": sweep.WIDTH}, [{"x": sweep.WIDTH / 2}])
    b, m, mt = load(raw, [0])
    dead = aborted(b, m, hand["r4.lDorm"], range(61, 101))
    q = dead["q"]
    h = mt.select(pl.col("season").alias("seen"), pl.col("height").alias("H"))
    rel = dead.with_columns((pl.col("abortedAt") - 1).alias("seen")).join(h, on="seen").select(pl.col("y") / pl.col("H"))["y"]
    print(f"birch, lone, round 2 (l_dorm {hand['r4.lDorm']}, Q_ss {hand['r6.qMin']}): aborted 61–100: {dead.height} "
          f"({check(mt, dead.height, range(61, 101))})")
    for thr in (hand["r6.qMin"], 0.1995):
        print(f"  light in the last season below {thr}: {(q < thr).sum()} ({(q < thr).mean():.1%})")
    print("  their state the season before:", dict(dead.group_by("state").len().sort("state").iter_rows()))
    print(f"  their light: median {q.median():.3f}, 90th percentile {q.quantile(0.9):.3f}, max {q.max():.3f}; "
          f"their height over H: median {rel.median():.2f}")
    live = b.filter(pl.col("season").is_between(60, 100))
    print(f"  every live bud 60–100 for comparison: median Q {live['q'].median():.3f}, "
          f"below {hand['r6.qMin']}: {(live['q'] < hand['r6.qMin']).mean():.1%}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--birch", action="store_true")
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()
    subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                    "--target-dir", str(REPO / "rust" / "target" / "native")], cwd=REPO / "rust", check=True)
    birch() if args.birch else hornbeam(args.workers)


if __name__ == "__main__":
    main()
