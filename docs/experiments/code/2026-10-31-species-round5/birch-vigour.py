"""Is the lone birch starving by 100? Its posture sheet showed few leaves at 100 in every cell.

The lone birch under round 2's form and physiology (FLORA), grown as the form sweep's cells (the
lone trial's world, natively, seed 1, snapshots at 60 and 100), with oak beside it as a crown that
kept its leaves. Per season from metrics.csv: live buds, dormant buds, the metamers, production,
maintenance, the reserve, the starved and shed counts; at 60 and 100 from buds.csv: buds bearing a
leaf, their leaf area, and their vigour v and light q.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/birch-vigour.py

prints the table and writes docs/experiments/figures/2026-10-31-birch-vigour.png.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("form_sweep", HERE / "form-sweep.py")
sweep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sweep)
REPO, WIDTH, TOP = sweep.REPO, sweep.WIDTH, sweep.TOP
SPECIES = ["birch", "oak"]
COLS = ["buds", "dormantBuds", "metamers", "production", "maintenance", "reserve", "starved", "shed", "height"]


def grow(species: str, patch: dict, raw: Path) -> None:
    params = {"world": {"width": WIDTH, "height": TOP, "walls": []},
              "trees": [{"x": WIDTH / 2, "species": species}], "species": {species: patch}}
    raw.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(sweep.TREESIM), "--preset", "oakOpen", "--params", "-", "--seed", "1", "--seasons", "100",
                    "--snapshots", "60", "--light", "--quiet", "--out", str(raw)],
                   input=json.dumps(params), text=True, check=True)


def main() -> None:
    subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                    "--target-dir", str(REPO / "rust" / "target" / "native")], cwd=REPO / "rust", check=True)
    ev = sweep.Evaluator()
    try:
        patches = {sp: ev.ask({"amend": sp, "assign": {}})["patch"] for sp in SPECIES}
    finally:
        ev.close()
    out = REPO / "runs" / "birch-vigour"
    fig, axes = plt.subplots(3, 1, figsize=(7, 8), sharex=True)
    for sp in SPECIES:
        raw = out / sp
        grow(sp, patches[sp], raw)
        m = pl.read_csv(raw / "metrics.csv", infer_schema_length=None).filter(pl.col("tree") == 0)
        b = pl.read_csv(raw / "buds.csv").filter(pl.col("tree") == 0)
        print(f"\n== {sp} (round 2, lone, seed 1)")
        print(m.filter(pl.col("season").is_in([20, 40, 60, 70, 80, 90, 100])).select("season", *COLS))
        print(b.group_by("season").agg(
            pl.len().alias("liveBuds"), (pl.col("leaf") > 0).sum().alias("leafy"),
            pl.col("leaf").sum().alias("leafArea"), pl.col("v").median().alias("vMedian"),
            pl.col("q").median().alias("qMedian"), (pl.col("v") <= 0).sum().alias("vZero"),
        ).sort("season"))
        s = m["season"]
        axes[0].plot(s, m["buds"], label=f"{sp} live buds")
        axes[1].plot(s, m["production"], label=f"{sp} production")
        axes[1].plot(s, m["maintenance"], ls="--", label=f"{sp} maintenance")
        axes[2].plot(s, m["reserve"], label=f"{sp} reserve")
    for ax in axes:
        ax.legend(fontsize=7)
        for x in (60, 100):
            ax.axvline(x, color="#999", lw=0.6)
    axes[2].set_xlabel("season")
    fig.suptitle("Lone birch and oak under round 2 (seed 1): buds, the balance, the reserve", fontsize=9)
    fig.tight_layout()
    fig.savefig(REPO / "docs" / "experiments" / "figures" / "2026-10-31-birch-vigour.png", dpi=110)


if __name__ == "__main__":
    main()
