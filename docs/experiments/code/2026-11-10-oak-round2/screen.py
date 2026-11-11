"""#124 round two: score the screen (conditions.py) on its 8 seeds, beside d12a13 (round one).

The bars are cli/oak-crown-score.ts' (flank mean 60-100 >= 5 %, w90 at 100 in 0.38-0.85); top3,
the reported outline measure (diagnose.py), is read at season 100 from the leafy buds.

    uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/screen.py [arm ...]
"""

import sys
from pathlib import Path

import polars as pl

sys.path.insert(0, str(Path(__file__).parent))
from conditions import CANDIDATES, SCREEN  # noqa: E402
from diagnose import outline  # noqa: E402

CELL = 0.25
TOP3_BOX = 0.64


def leafy(dir: Path, season: int) -> tuple[pl.DataFrame, float]:
    """The crown's shoot tips (metamers with no child) stand in for its leafy buds: oak-crown.ts'
    snapshots carry no buds.csv (that needs --light). On round one's d12a13 arm the tips' top3 is
    the leafy buds' + 0.00-0.05 (runs/oak-round2/tipcheck.py), and both split the eye's boxes 1, 9,
    10, 16 from every dome at 0.64."""
    m = pl.read_csv(dir / "metamers.csv", columns=["season", "tree", "birthId", "parentBirthId", "x1", "y1"]).filter(
        (pl.col.season == season) & (pl.col.tree == 0)
    )
    tips = m.filter(~pl.col.birthId.is_in(m["parentBirthId"].implode())).select(
        pl.col.x1.alias("x"), pl.col.y1.alias("y")
    )
    return tips, m["y1"].max()


def score(arm: str, seed: int, metrics_dir: Path, snap_dir: Path) -> dict:
    mt = pl.read_csv(metrics_dir / "metrics.csv", infer_schema_length=0).filter(pl.col.tree == "0").select(
        pl.col.season.cast(pl.Int32),
        *[pl.col(c).cast(pl.Float64, strict=False) for c in ["height", "crownWidth", "upperFlankNew", "w90", "budsOutside"]],
    )
    flank = mt.filter(pl.col.season.is_between(60, 100))["upperFlankNew"].drop_nans().mean()
    at = lambda s, c: mt.filter(pl.col.season == s)[c][0]
    w90 = at(100, "w90")
    leaf, H = leafy(snap_dir, 100)
    top3 = outline(leaf, H)["top3"]
    return {
        "arm": arm, "seed": seed, "held": mt["budsOutside"].max() == 0,
        "flank%": 100 * flank, "w90": w90, "top3": top3,
        "flankOK": flank >= 0.05, "w90OK": 0.38 <= w90 <= 0.85, "box": top3 >= TOP3_BOX,
        "H30": at(30, "height") * CELL, "reach30": at(30, "crownWidth") * CELL / 2,
        "H60": at(60, "height") * CELL, "reach60": at(60, "crownWidth") * CELL / 2,
    }


def main():
    pl.Config.set_tbl_rows(200).set_tbl_cols(30).set_tbl_width_chars(250).set_float_precision(2)
    arms = sys.argv[1:] or ["d12a13", *CANDIDATES]
    rows = []
    for arm in arms:
        for seed in SCREEN:
            if arm == "d12a13":  # round one's arm; its snapshots are the probe sheet's runs
                rows.append(score(arm, seed, Path(f"runs/oak-crown/patch/oak-s{seed}"),
                                  Path(f"runs/probe/oak124-sheet/patch/lone-seed{seed}")))
            else:
                d = Path(f"runs/oak-crown/{arm}/oak-s{seed}")
                if (d / "metamers.csv").exists():
                    rows.append(score(arm, seed, d, d))
    df = pl.DataFrame(rows)
    df.write_csv("runs/oak-round2/screen.csv")
    print(df.select("arm", "seed", "held", "flank%", "w90", "top3", "H30", "H60").pivot(
        on="seed", index="arm", values="flank%").sort("arm"))
    print("== top3 by seed")
    print(df.pivot(on="seed", index="arm", values="top3").sort("arm"))
    print("== w90 by seed")
    print(df.pivot(on="seed", index="arm", values="w90").sort("arm"))
    summ = df.group_by("arm").agg(
        n=pl.len(), held=pl.col.held.sum(), flank=pl.col.flankOK.sum(), w90=pl.col.w90OK.sum(),
        both=(pl.col.flankOK & pl.col.w90OK & pl.col.held).sum(), notBox=(~pl.col.box).sum(),
        flankMean=pl.col("flank%").mean(), H30=pl.col.H30.mean(), reach30=pl.col.reach30.mean(),
        H60=pl.col.H60.mean(), reach60=pl.col.reach60.mean(),
    ).sort(["both", "notBox", "H30"], descending=True)
    print("== ranked (both bars, then no box by top3, then height at 30)")
    print(summ)


if __name__ == "__main__":
    main()
